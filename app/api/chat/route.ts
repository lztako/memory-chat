import Anthropic from "@anthropic-ai/sdk"
import { anthropic } from "@/lib/claude"
import { memoryRepo } from "@/lib/repositories/memory.repo"
import { conversationRepo } from "@/lib/repositories/conversation.repo"
import { buildSystemPrompt } from "@/lib/memory/inject"
import { extractAndSaveMemories } from "@/lib/memory/extract"
import { generateAndSaveTitle } from "@/lib/memory/title"
import { toolDefinitions, localFolderToolDefinitions } from "@/lib/tools/definitions"
import { executeToolCall } from "@/lib/tools/handlers"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { recordTokenUsage } from "@/lib/ai/token-usage"
import { taskRepo } from "@/lib/repositories/task.repo"
import { skillRepo } from "@/lib/repositories/skill.repo"
import { fileRepo } from "@/lib/repositories/file.repo"
import { getAttachedFiles } from "@/lib/session/attached-files"
import { globalInfoRepo } from "@/lib/repositories/globalInfo.repo"
import { userDocRepo } from "@/lib/repositories/userDoc.repo"
import { globalDocRepo } from "@/lib/repositories/globalDoc.repo"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const USER_ID = user.id
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, email: user.email ?? '', name: user.email ?? '' },
  })

  const { message, conversationId, folderContext, imageAttachments } = await req.json() as {
    message: string
    conversationId: string
    folderContext?: { tree: string; files: Array<{ path: string; content: string }> }
    imageAttachments?: Array<{ name: string; data: string; mimeType: string }>
  }

  // Verify conversation exists before doing anything
  const conversation = await conversationRepo.getById(conversationId)
  if (!conversation) {
    return new Response(JSON.stringify({ error: "Conversation not found" }), { status: 404 })
  }

  const [{ longTerm, dailyLog, userConfig }, dbMessages, reminderTasks, skills, userFiles, activeTasks, globalInfo, resources, globalDocs] = await Promise.all([
    memoryRepo.getForInjectionSemantic(USER_ID, message),
    conversationRepo.getMessages(conversationId),
    taskRepo.getReminders(USER_ID),
    skillRepo.listByUserSemantic(USER_ID, message),
    fileRepo.listSummaryByUser(USER_ID),
    taskRepo.listActive(USER_ID),
    globalInfoRepo.list(),
    userDocRepo.listIndex(USER_ID, 'resource'),
    globalDocRepo.listIndex(),
  ])

  const attachedFiles = getAttachedFiles(conversationId)

  await conversationRepo.addMessage({
    conversationId,
    role: "user",
    content: message,
  })

  const systemPrompt = buildSystemPrompt({
    longTerm, dailyLog, reminderTasks, userConfig, skills, message,
    attachedFiles, skillsPreFiltered: true, userFiles, activeTasks, globalInfo, resources, globalDocs,
    hasFolderContext: !!folderContext,
  })

  // Build enriched user message — append folder context if available
  let enrichedMessage = message
  if (folderContext?.tree) {
    enrichedMessage += `\n\n[FOLDER: ${folderContext.tree.split('\n')[0] || 'workspace'}]\n${folderContext.tree}`
  }
  if (folderContext?.files?.length) {
    for (const f of folderContext.files) {
      enrichedMessage += `\n\n[FILE: ${f.path}]\n${f.content}\n[/FILE]`
    }
  }

  const activeTools = folderContext
    ? [...toolDefinitions, ...localFolderToolDefinitions]
    : toolDefinitions

  // Build user message content — text only or text + images
  type UserContent = string | Anthropic.ContentBlockParam[]
  let userContent: UserContent
  if (imageAttachments?.length) {
    const blocks: Anthropic.ContentBlockParam[] = [{ type: "text", text: enrichedMessage }]
    for (const img of imageAttachments) {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: img.data,
        },
      })
    }
    userContent = blocks
  } else {
    userContent = enrichedMessage
  }

  // Truncate old history messages — keep last 4 messages (2 turns) full,
  // compress older ones to avoid context bloat in long conversations
  const KEEP_FULL_LAST_N = 4
  const MAX_OLD_MSG_CHARS = 800
  const apiMessages: Anthropic.MessageParam[] = [
    ...dbMessages.map((m: { role: string; content: string }, i: number) => {
      const isRecent = i >= dbMessages.length - KEEP_FULL_LAST_N
      const content = isRecent || m.content.length <= MAX_OLD_MSG_CHARS
        ? m.content
        : m.content.slice(0, MAX_OLD_MSG_CHARS) + `\n…[ตัดทอน — ดูรายละเอียดใน response ก่อนหน้า]`
      return { role: m.role as "user" | "assistant", content }
    }),
    { role: "user", content: userContent },
  ]

  let fullResponse = ""

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const sse = (type: string, value: unknown) =>
        encoder.encode(`data: ${JSON.stringify({ t: type, v: value })}\n\n`)

      const MAX_TOOL_ITERATIONS = 10
      let toolIterations = 0

      // ── Mock mode (MOCK_AI=true in .env.local) ──────────────────
      if (process.env.MOCK_AI === "true") {
        await new Promise(r => setTimeout(r, 800))
        controller.enqueue(sse("tool_start", { id: "mock-1", name: "query_user_file" }))
        await new Promise(r => setTimeout(r, 1200))
        controller.enqueue(sse("tool_done", { id: "mock-1" }))
        await new Promise(r => setTimeout(r, 300))
        const mockText = `นี่คือผลลัพธ์จาก mock mode ครับ\n\nระบบกำลังทดสอบ UI โดยไม่เรียก Claude API\n\n**ข้อมูลทดสอบ:**\n- รายการ 1: White Sugar 45 ICUMSA\n- รายการ 2: Raw Sugar 600 ICUMSA\n- รายการ 3: Brown Sugar\n\nสามารถทดสอบ streaming, tool badges, และ markdown rendering ได้ครับ`
        for (const char of mockText) {
          controller.enqueue(sse("text", char))
          await new Promise(r => setTimeout(r, 18))
        }
        fullResponse = mockText
        await conversationRepo.addMessage({ conversationId, role: "assistant", content: fullResponse })
        controller.close()
        return
      }
      // ────────────────────────────────────────────────────────────

      try {
        while (true) {
          if (toolIterations >= MAX_TOOL_ITERATIONS) {
            controller.enqueue(sse("text", "\n\n[หยุดการทำงานอัตโนมัติ — เกิน 10 รอบ กรุณาสั่งใหม่อีกครั้ง]"))
            break
          }
          // Force tool call on first iteration when user has files — prevents Sonnet
          // from generating text (e.g. "Let me calculate...") before querying data
          const toolChoice: Anthropic.Messages.ToolChoiceAuto | Anthropic.Messages.ToolChoiceAny =
            toolIterations === 0 && userFiles.length > 0
              ? { type: "any" }
              : { type: "auto" }

          // Cache system prompt + tool definitions to reduce input token processing
          // on repeated requests. Cache TTL = 5 min (Anthropic ephemeral cache).
          const cachedTools = activeTools.map((t, i) =>
            i === activeTools.length - 1
              ? { ...t, cache_control: { type: "ephemeral" as const } }
              : t
          )

          const stream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 2048,
            system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
            messages: apiMessages,
            tools: cachedTools,
            tool_choice: toolChoice,
          })

          const toolUseBlocks: Array<{
            id: string
            name: string
            inputStr: string
          }> = []
          let currentBlock: {
            id: string
            name: string
            inputStr: string
          } | null = null

          for await (const event of stream) {
            if (req.signal.aborted) break

            if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                currentBlock = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  inputStr: "",
                }
                controller.enqueue(sse("tool_start", { id: event.content_block.id, name: event.content_block.name }))
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                fullResponse += event.delta.text
                controller.enqueue(sse("text", event.delta.text))
              } else if (
                event.delta.type === "input_json_delta" &&
                currentBlock
              ) {
                currentBlock.inputStr += event.delta.partial_json
              }
            } else if (event.type === "content_block_stop") {
              if (currentBlock) {
                toolUseBlocks.push(currentBlock)
                currentBlock = null
              }
            }
          }

          if (req.signal.aborted) break

          const finalMsg = await stream.finalMessage()
          recordTokenUsage(USER_ID, finalMsg.usage.input_tokens, finalMsg.usage.output_tokens)

          // Truncate large tool results before pushing to next iteration context
          // query_user_file is exempt — AI needs full data for analysis
          const MAX_TOOL_RESULT_CHARS = 8000
          const truncateToolResult = (toolName: string, content: string) => {
            if (toolName === "query_user_file") return content
            return content.length <= MAX_TOOL_RESULT_CHARS
              ? content
              : content.slice(0, MAX_TOOL_RESULT_CHARS) + `\n…[ตัดทอนเพื่อประหยัด context]`
          }

          if (finalMsg.stop_reason === "tool_use") {
            toolIterations++
            apiMessages.push({ role: "assistant", content: finalMsg.content })

            const toolResults: Anthropic.ToolResultBlockParam[] = []
            for (const block of toolUseBlocks) {
              const input = JSON.parse(block.inputStr || "{}")

              // ── Local Folder Tools (client-side execution) ──
              if (["list_folder_tree", "read_local_file", "write_local_file", "move_local_file"].includes(block.name)) {
                if (block.name === "list_folder_tree") {
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: folderContext?.tree ?? "ไม่มี folder ที่เปิดอยู่" })
                } else if (block.name === "read_local_file") {
                  const path = input.path as string
                  const found = folderContext?.files?.find(f => f.path === path || f.path.endsWith(path) || path.endsWith(f.path))
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: found?.content ?? `ไฟล์ "${path}" ไม่ได้อยู่ใน context — ลองพูดถึงชื่อไฟล์ในข้อความ เช่น "ดูไฟล์ ${path} ให้หน่อย"` })
                } else if (block.name === "write_local_file") {
                  controller.enqueue(sse("folder_write", { path: input.path, content: input.content }))
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify({ success: true, path: input.path }) })
                } else if (block.name === "move_local_file") {
                  controller.enqueue(sse("folder_move", { from: input.from, to: input.to }))
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify({ success: true }) })
                }
                controller.enqueue(sse("tool_done", { id: block.id }))
                continue
              }

              // ── Server-side Tools ──
              const result = await executeToolCall(
                block.name,
                input,
                conversationId,
                USER_ID
              )
              const r = result as Record<string, unknown>
              if (r.__isArtifact) {
                const { __isArtifact: _, ...artifactData } = r
                controller.enqueue(sse("artifact", artifactData))
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify({ success: true, message: "Artifact rendered in panel" }),
                })
              } else {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: truncateToolResult(block.name, JSON.stringify(result)),
                })
              }
              controller.enqueue(sse("tool_done", { id: block.id }))
            }

            apiMessages.push({ role: "user", content: toolResults })
          } else {
            break
          }
        }
      } catch (err) {
        if (!req.signal.aborted) {
          controller.error(err)
          return
        }
      }

      if (dbMessages.length === 0 && !req.signal.aborted) {
        try {
          const title = await generateAndSaveTitle(conversationId, message)
          controller.enqueue(sse("title_update", title))
        } catch { /* ignore */ }
      }

      controller.close()

      if (!req.signal.aborted) {
        await conversationRepo.addMessage({
          conversationId,
          role: "assistant",
          content: fullResponse,
        })

        const allMemories = [...longTerm, ...dailyLog]
        const conversationText = [
          ...dbMessages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
          { role: "user", content: message },
          { role: "assistant", content: fullResponse },
        ]
          .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
          .join("\n")

        extractAndSaveMemories(USER_ID, conversationText, allMemories).catch(
          console.error
        )
      }
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8" },
  })
}
