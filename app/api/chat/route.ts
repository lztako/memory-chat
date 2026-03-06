import Anthropic from "@anthropic-ai/sdk"
import { anthropic } from "@/lib/claude"
import { memoryRepo } from "@/lib/repositories/memory.repo"
import { conversationRepo } from "@/lib/repositories/conversation.repo"
import { buildSystemPrompt } from "@/lib/memory/inject"
import { extractAndSaveMemories } from "@/lib/memory/extract"
import { generateAndSaveTitle } from "@/lib/memory/title"
import { toolDefinitions } from "@/lib/tools/definitions"
import { executeToolCall } from "@/lib/tools/handlers"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

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

  const { message, conversationId } = await req.json()

  const [{ longTerm, dailyLog }, dbMessages] = await Promise.all([
    memoryRepo.getForInjection(USER_ID),
    conversationRepo.getMessages(conversationId),
  ])

  await conversationRepo.addMessage({
    conversationId,
    role: "user",
    content: message,
  })

  const systemPrompt = buildSystemPrompt(longTerm, dailyLog)

  const apiMessages: Anthropic.MessageParam[] = [
    ...dbMessages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ]

  let fullResponse = ""

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      try {
        while (true) {
          const stream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 2048,
            system: systemPrompt,
            messages: apiMessages,
            tools: toolDefinitions,
            tool_choice: { type: "auto" },
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
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                fullResponse += event.delta.text
                controller.enqueue(encoder.encode(event.delta.text))
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

          if (finalMsg.stop_reason === "tool_use") {
            apiMessages.push({ role: "assistant", content: finalMsg.content })

            const toolResults: Anthropic.ToolResultBlockParam[] = []
            for (const block of toolUseBlocks) {
              const input = JSON.parse(block.inputStr || "{}")
              const result = await executeToolCall(
                block.name,
                input,
                conversationId
              )
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: JSON.stringify(result),
              })
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

      controller.close()

      if (!req.signal.aborted) {
        await conversationRepo.addMessage({
          conversationId,
          role: "assistant",
          content: fullResponse,
        })

        const allMemories = [...longTerm, ...dailyLog]
        const conversationText = [
          ...dbMessages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: message },
          { role: "assistant", content: fullResponse },
        ]
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")

        extractAndSaveMemories(USER_ID, conversationText, allMemories).catch(
          console.error
        )

        if (dbMessages.length === 0) {
          generateAndSaveTitle(conversationId, message).catch(console.error)
        }
      }
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
