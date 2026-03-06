import { memoryRepo } from "@/lib/repositories/memory.repo"
import { contextRepo } from "@/lib/repositories/context.repo"
import { Prisma } from "@prisma/client"

const USER_ID = "test-user-001"

export async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  conversationId: string
): Promise<unknown> {
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

    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}
