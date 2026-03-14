import Anthropic from "@anthropic-ai/sdk"
import { anthropic } from "@/lib/claude"
import { memoryRepo } from "@/lib/repositories/memory.repo"
import { queryAttachedFile } from "@/lib/session/attached-files"
import { contextRepo } from "@/lib/repositories/context.repo"
import { fileRepo } from "@/lib/repositories/file.repo"
import { taskRepo } from "@/lib/repositories/task.repo"
import { skillRepo } from "@/lib/repositories/skill.repo"
import { tradeDataRepo } from "@/lib/repositories/trade-data.repo"
import { agentRepo } from "@/lib/repositories/agent.repo"
import { userDocRepo } from "@/lib/repositories/userDoc.repo"
import { globalDocRepo } from "@/lib/repositories/globalDoc.repo"
import { toolDefinitions } from "@/lib/tools/definitions"
import { recordTokenUsage } from "@/lib/ai/token-usage"
import { Prisma } from "@prisma/client"

// ── File query helpers ────────────────────────────────────────────────────
type Row = Record<string, string>

// Safe arithmetic expression evaluator — replaces column names with values, then evals pure math
function evaluateExpr(expr: string, row: Row): number {
  const substituted = expr.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (match) => {
    const val = parseFloat(row[match] ?? "0")
    return isNaN(val) ? "0" : String(val)
  })
  if (!/^[\d\s+\-*/().]+$/.test(substituted)) return NaN
  try {
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${substituted})`)() as number
  } catch { return NaN }
}

function applyOneFilter(rows: Row[], filter: string): Row[] {
  const match = filter.match(/^(.+?)\s*(>=|<=|!=|>|<|=|contains)\s*(.+)$/)
  if (!match) return rows
  const [, colRaw, op, rawVal] = match
  const col = colRaw.trim()
  const val = rawVal.trim().replace(/^["']|["']$/g, "")
  return rows.filter((row) => {
    const cell = row[col]
    if (cell === undefined) return false
    const strCell = String(cell).toLowerCase()
    const strVal = val.toLowerCase()
    const numCell = parseFloat(String(cell))
    const numVal = parseFloat(val)
    switch (op) {
      case "=":        return strCell === strVal
      case "!=":       return strCell !== strVal
      case ">":        return !isNaN(numCell) && !isNaN(numVal) && numCell > numVal
      case "<":        return !isNaN(numCell) && !isNaN(numVal) && numCell < numVal
      case ">=":       return !isNaN(numCell) && !isNaN(numVal) && numCell >= numVal
      case "<=":       return !isNaN(numCell) && !isNaN(numVal) && numCell <= numVal
      case "contains": return strCell.includes(strVal)
      default:         return true
    }
  })
}

function applyFileFilter(rows: Row[], filter: string): Row[] {
  const conditions = filter.split(/\s+AND\s+/i)
  return conditions.reduce((r, cond) => applyOneFilter(r, cond.trim()), rows)
}

function applyGroupAggregate(
  rows: Row[],
  groupBy: string,
  agg: Array<{ column: string; fn: string }>
): Row[] {
  const groups = new Map<string, Row[]>()
  for (const row of rows) {
    const key = row[groupBy] ?? "Unknown"
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }
  return Array.from(groups.entries()).map(([key, groupRows]) => {
    const result: Row = { [groupBy]: key }
    for (const { column, fn } of agg) {
      const nums = groupRows.map(r => parseFloat(r[column] ?? "")).filter(v => !isNaN(v))
      const total = nums.reduce((a, b) => a + b, 0)
      switch (fn) {
        case "sum":   result[`${column}_sum`]   = String(Math.round(total * 100) / 100); break
        case "count": result[`${column}_count`] = String(groupRows.filter(r => (r[column] ?? "") !== "").length); break
        case "avg":   result[`${column}_avg`]   = String(nums.length ? Math.round(total / nums.length * 100) / 100 : 0); break
        case "min":   result[`${column}_min`]   = String(nums.length ? Math.min(...nums) : 0); break
        case "max":   result[`${column}_max`]   = String(nums.length ? Math.max(...nums) : 0); break
      }
    }
    return result
  })
}

// ── File data cache — shared across requests on the same server instance ──
type FileCacheEntry = {
  fileName: string
  columns: string[]
  rowCount: number
  data: unknown
  expiresAt: number
}
const _fileCache = new Map<string, FileCacheEntry>()
const FILE_CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

export async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  conversationId: string,
  userId: string
): Promise<unknown> {
  const USER_ID = userId
  switch (toolName) {
    case "save_memory": {
      const memory = await memoryRepo.create({
        userId: USER_ID,
        type: toolInput.type as string,
        content: toolInput.content as string,
        importance: toolInput.importance as number,
        layer: toolInput.layer as string,
      })
      return { success: true, id: memory.id }
    }

    case "get_context_state": {
      const ctx = await contextRepo.getOrCreate(conversationId)
      return ctx
    }

    case "update_context_state": {
      const ctx = await contextRepo.update(conversationId, {
        currentTask: toolInput.currentTask as string | undefined,
        quizState: toolInput.quizState as Prisma.InputJsonValue | undefined,
        pendingItems: toolInput.pendingItems as string[] | undefined,
      })
      return { success: true, context: ctx }
    }

    case "create_task": {
      const task = await taskRepo.create({
        userId,
        title: toolInput.title as string,
        description: toolInput.description as string | undefined,
        priority: toolInput.priority as string | undefined,
        dueDate: toolInput.dueDate ? new Date(toolInput.dueDate as string) : undefined,
        linkedCompany: toolInput.linkedCompany as string | undefined,
      })
      return { success: true, task }
    }

    case "update_task": {
      const taskId = toolInput.taskId as string
      const existing = await taskRepo.getById(taskId, userId)
      if (!existing) return { error: "ไม่พบ task กรุณาตรวจสอบ taskId" }

      const dueDateRaw = toolInput.dueDate as string | null | undefined
      await taskRepo.update(taskId, userId, {
        title: toolInput.title as string | undefined,
        status: toolInput.status as string | undefined,
        priority: toolInput.priority as string | undefined,
        dueDate: dueDateRaw === null ? null : dueDateRaw ? new Date(dueDateRaw) : undefined,
      })
      return { success: true }
    }

    case "list_tasks": {
      const tasks = await taskRepo.list(userId, {
        status: toolInput.status as string | undefined,
        overdue: toolInput.overdue as boolean | undefined,
        upcoming: toolInput.upcoming as boolean | undefined,
      })
      if (tasks.length === 0) return { tasks: [], message: "ไม่มี task ที่ตรงเงื่อนไข" }
      return { tasks }
    }

    case "list_user_files": {
      const fileType = toolInput.fileType as string | undefined
      const files = await fileRepo.listByUser(userId, fileType)
      if (files.length === 0) {
        return { files: [], message: fileType ? `ยังไม่มีไฟล์ประเภท '${fileType}' กรุณาอัปโหลดก่อน` : "ยังไม่มีไฟล์ที่ upload ไว้ กรุณาอัปโหลดไฟล์ CSV ก่อน" }
      }
      return { files }
    }

    case "query_user_file": {
      const fileId = toolInput.fileId as string

      // Load from cache or DB
      const cacheKey = `${userId}:${fileId}`
      const cached = _fileCache.get(cacheKey)
      let entry: FileCacheEntry
      if (cached && cached.expiresAt > Date.now()) {
        entry = cached
      } else {
        const file = await fileRepo.getById(fileId, userId)
        if (!file) return { error: "ไม่พบไฟล์ กรุณาตรวจสอบ fileId อีกครั้ง" }
        entry = { fileName: file.fileName, columns: file.columns, rowCount: file.rowCount, data: file.data, expiresAt: Date.now() + FILE_CACHE_TTL_MS }
        _fileCache.set(cacheKey, entry)
      }

      let rows = entry.data as Row[]

      // Apply filter
      const filterStr = toolInput.filter as string | undefined
      if (filterStr) rows = applyFileFilter(rows, filterStr)

      // Apply groupBy + aggregate
      const groupBy = toolInput.groupBy as string | undefined
      const aggregate = toolInput.aggregate as Array<{ column: string; fn: string }> | undefined
      if (aggregate?.length) {
        if (groupBy) {
          rows = applyGroupAggregate(rows, groupBy, aggregate)
        } else {
          // Grand total — no groupBy, aggregate all rows into one result row
          const result: Row = {}
          for (const { column, fn } of aggregate) {
            const nums = rows.map(r => parseFloat(r[column] ?? "")).filter(v => !isNaN(v))
            const total = nums.reduce((a, b) => a + b, 0)
            switch (fn) {
              case "sum":   result[`${column}_sum`]   = String(Math.round(total * 100) / 100); break
              case "count": result[`${column}_count`] = String(rows.filter(r => (r[column] ?? "") !== "").length); break
              case "avg":   result[`${column}_avg`]   = String(nums.length ? Math.round(total / nums.length * 100) / 100 : 0); break
              case "min":   result[`${column}_min`]   = String(nums.length ? Math.min(...nums) : 0); break
              case "max":   result[`${column}_max`]   = String(nums.length ? Math.max(...nums) : 0); break
            }
          }
          rows = [result]
        }
      }

      // Apply column selection
      const columns = toolInput.columns as string[] | undefined
      if (columns?.length) rows = rows.map(r => Object.fromEntries(columns.map(c => [c, r[c] ?? ""])) as Row)

      // Apply orderBy
      const orderBy = toolInput.orderBy as string | undefined
      if (orderBy) {
        const [col, dirStr] = orderBy.trim().split(/\s+/)
        const desc = dirStr?.toLowerCase() === "desc"
        rows = [...rows].sort((a, b) => {
          const an = parseFloat(a[col] ?? ""), bn = parseFloat(b[col] ?? "")
          const cmp = (!isNaN(an) && !isNaN(bn)) ? an - bn : String(a[col] ?? "").localeCompare(String(b[col] ?? ""))
          return desc ? -cmp : cmp
        })
      }

      // Apply compute fields (derived from aggregate results)
      const compute = toolInput.compute as Record<string, string> | undefined
      if (compute && Object.keys(compute).length > 0) {
        rows = rows.map(row => {
          const out = { ...row }
          for (const [fieldName, expr] of Object.entries(compute)) {
            const val = evaluateExpr(expr, row)
            out[fieldName] = isNaN(val) ? "N/A" : String(Math.round(val * 10000) / 10000)
          }
          return out
        })
      }

      // Apply limit (default 50)
      const totalFiltered = rows.length
      const limit = (toolInput.limit as number | undefined) ?? 50
      const sliced = rows.slice(0, limit)

      const resultColumns = sliced.length > 0
        ? Object.keys(sliced[0])
        : (columns ?? entry.columns)

      return {
        fileName: entry.fileName,
        totalRows: entry.rowCount,
        filtered: totalFiltered,
        returned: sliced.length,
        columns: resultColumns,
        data: sliced,
      }
    }

    case "rename_user_file": {
      const fileId = toolInput.fileId as string
      const newName = toolInput.newName as string
      const file = await fileRepo.getById(fileId, userId)
      if (!file) return { error: "ไม่พบไฟล์ กรุณาตรวจสอบ fileId อีกครั้ง" }
      await fileRepo.rename(fileId, userId, newName)
      return { success: true, message: `เปลี่ยนชื่อไฟล์จาก "${file.fileName}" เป็น "${newName}" เรียบร้อยแล้ว` }
    }

    case "update_user_config": {
      const key = toolInput.key as string
      const value = toolInput.value as string
      const content = `${key}: ${value}`

      const existing = await memoryRepo.getAll(USER_ID)
        .then(mems => mems.find(m => m.type === "user_config" && m.content.startsWith(`${key}:`)))

      if (existing) {
        await memoryRepo.update(existing.id, { content })
      } else {
        await memoryRepo.create({
          userId: USER_ID,
          type: "user_config",
          content,
          importance: 5,
          layer: "long_term",
        })
      }
      return { success: true, key, value }
    }

    case "search_market_data": {
      const skuTag = toolInput.skuTag as string
      const tradeDirection = toolInput.tradeDirection as string | undefined
      const country = toolInput.country as string | undefined
      const dataType = toolInput.dataType as string | undefined

      const results = await tradeDataRepo.search(userId, { skuTag, tradeDirection, country, dataType })

      if (results.length === 0) {
        return {
          found: false,
          message: `ยังไม่มีข้อมูลตลาดสำหรับ "${skuTag}" ในฐานข้อมูล กรุณาแจ้งทีมงานเพื่อรวบรวมข้อมูลนี้`,
          skuTag,
        }
      }

      const staleItems = results.filter((r) => r.stale)
      return {
        found: true,
        count: results.length,
        staleCount: staleItems.length,
        staleNote: staleItems.length > 0 ? `ข้อมูล ${staleItems.length} รายการอาจล้าสมัย (เกิน 90 วัน) — แนะนำให้แจ้งทีมงานอัปเดต` : undefined,
        data: results.map((r) => ({
          dataType: r.dataType,
          tradeDirection: r.tradeDirection,
          country: r.country,
          fetchedAt: r.fetchedAt,
          stale: r.stale,
          content: r.content,
        })),
      }
    }

    case "save_skill": {
      const name = toolInput.name as string
      const existing = await skillRepo.findByName(userId, name)
      if (existing) {
        return { success: true, message: `Skill "${name}" มีอยู่แล้ว ไม่ได้บันทึกซ้ำ`, id: existing.id }
      }
      const skill = await skillRepo.create({
        userId,
        name,
        trigger: toolInput.trigger as string,
        solution: toolInput.solution as string,
        tools: (toolInput.tools as string[] | undefined) ?? [],
      })
      return { success: true, id: skill.id, message: `บันทึก skill "${name}" แล้ว` }
    }

    case "query_attached_file": {
      const fileId = toolInput.fileId as string
      const result = queryAttachedFile(conversationId, fileId, {
        filter: toolInput.filter as string | undefined,
        limit: toolInput.limit as number | undefined,
        offset: toolInput.offset as number | undefined,
      })
      return result
    }

    case "render_artifact": {
      return {
        __isArtifact: true,
        type: toolInput.type as string,
        title: toolInput.title as string,
        data: toolInput.data as Record<string, unknown>,
      }
    }

    case "read_global_doc": {
      const docId = toolInput.docId as string
      const doc = await globalDocRepo.getContent(docId)
      if (!doc) return { error: "ไม่พบ GlobalDoc กรุณาตรวจสอบ docId จาก system prompt" }
      return {
        id: doc.id,
        title: doc.title,
        category: doc.category,
        docType: doc.docType,
        content: doc.content,
      }
    }

    case "read_resource": {
      const docId = toolInput.docId as string
      const doc = await userDocRepo.getContent(userId, docId)
      if (!doc) return { error: "ไม่พบ resource กรุณาตรวจสอบ docId จาก system prompt" }
      return {
        id: doc.id,
        title: doc.title,
        docType: doc.docType,
        parentType: doc.parentType,
        content: doc.content,
      }
    }

    case "use_agent": {
      const agentName = toolInput.agentName as string
      const task = toolInput.task as string
      const context = toolInput.context as string | undefined

      // 1. หา agent จาก DB (global หรือ per-user)
      const agent = await agentRepo.getByName(agentName, userId)
      if (!agent || !agent.isActive) {
        return { error: `Agent "${agentName}" ไม่พบหรือ inactive — agents ที่มี: Trade Data Analyst, File Processor, Task Manager` }
      }

      // 2. กรอง tools เฉพาะที่ agent นี้ใช้ได้
      const agentTools = toolDefinitions.filter(t => agent.tools.includes(t.name))

      // 3. Preload user skills + agent memory docs — inject เข้า agent system prompt
      const [userSkills, agentDocs] = await Promise.all([
        skillRepo.listByUser(userId),
        agent.id ? userDocRepo.listByParent(userId, agent.id) : Promise.resolve([]),
      ])
      const skillsText = userSkills.length > 0
        ? `\n\n## User Skills (patterns ที่เรียนรู้จาก user นี้):\n${userSkills.slice(0, 10).map(s => `- [${s.name}] เมื่อ: ${s.trigger} → ${s.solution}`).join("\n")}`
        : ""
      const agentDocsText = agentDocs.length > 0
        ? `\n\n## Agent Memory (เอกสารที่บันทึกไว้สำหรับ agent นี้):\n${agentDocs.map(d => `### ${d.title} [${d.docType}]\n${d.content}`).join("\n\n")}`
        : ""
      const agentSystemPrompt = agent.systemPrompt + skillsText + agentDocsText

      // 4. สร้าง isolated message thread
      const agentMessages: Anthropic.MessageParam[] = [
        { role: "user", content: context ? `${task}\n\nContext: ${context}` : task },
      ]

      let result = ""
      const maxTurns = agent.maxTurns ?? 5

      for (let i = 0; i < maxTurns; i++) {
        const response = await anthropic.messages.create({
          model: agent.model,
          max_tokens: 1024,
          system: agentSystemPrompt,
          messages: agentMessages,
          ...(agentTools.length > 0 && {
            tools: agentTools,
            tool_choice: { type: "auto" },
          }),
        })

        recordTokenUsage(userId, response.usage.input_tokens, response.usage.output_tokens)

        if (response.stop_reason === "end_turn") {
          result = response.content
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map(b => b.text)
            .join("")
          break
        }

        if (response.stop_reason === "tool_use") {
          agentMessages.push({ role: "assistant", content: response.content })

          const toolResults: Anthropic.ToolResultBlockParam[] = []
          for (const block of response.content) {
            if (block.type !== "tool_use") continue
            const toolResult = await executeToolCall(
              block.name,
              block.input as Record<string, unknown>,
              conversationId,
              userId
            )
            // ถ้า sub-agent render artifact ให้ unwrap แล้วส่งเป็น text แทน
            const r = toolResult as Record<string, unknown>
            const content = r.__isArtifact
              ? JSON.stringify({ success: true, artifactRendered: true, ...r })
              : JSON.stringify(toolResult)
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content })
          }
          agentMessages.push({ role: "user", content: toolResults })
        } else {
          break
        }
      }

      return {
        agent: agentName,
        result: result || `Agent "${agentName}" ไม่ส่งผลลัพธ์กลับมา`,
      }
    }

    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}
