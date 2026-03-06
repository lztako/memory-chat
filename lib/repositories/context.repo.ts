import { prisma } from "../prisma"
import { Prisma } from "@prisma/client"

export const contextRepo = {
  async getOrCreate(conversationId: string) {
    return prisma.conversationContext.upsert({
      where: { conversationId },
      update: {},
      create: { conversationId },
    })
  },

  async update(
    conversationId: string,
    data: {
      currentTask?: string
      quizState?: Prisma.InputJsonValue
      pendingItems?: string[]
    }
  ) {
    return prisma.conversationContext.upsert({
      where: { conversationId },
      update: data,
      create: { conversationId, ...data },
    })
  },
}
