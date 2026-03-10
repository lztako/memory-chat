import { memoryRepo } from "@/lib/repositories/memory.repo"
import { queryAttachedFile } from "@/lib/session/attached-files"
import { contextRepo } from "@/lib/repositories/context.repo"
import { fileRepo } from "@/lib/repositories/file.repo"
import { taskRepo } from "@/lib/repositories/task.repo"
import { skillRepo } from "@/lib/repositories/skill.repo"
import { tradeDataRepo } from "@/lib/repositories/trade-data.repo"
import { Prisma } from "@prisma/client"

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
      const file = await fileRepo.getById(fileId, userId)
      if (!file) {
        return { error: "ไม่พบไฟล์ กรุณาตรวจสอบ fileId อีกครั้ง" }
      }
      return {
        fileName: file.fileName,
        columns: file.columns,
        rowCount: file.rowCount,
        data: file.data,
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

    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}
