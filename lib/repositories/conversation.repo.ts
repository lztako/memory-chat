import { prisma } from "../prisma"

export const conversationRepo = {
  async create(userId: string) {
    return prisma.conversation.create({ data: { userId } })
  },

  async getAll(userId: string) {
    return prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    })
  },

  async getById(conversationId: string) {
    return prisma.conversation.findUnique({ where: { id: conversationId } })
  },

  async getMessages(conversationId: string, limit = 20) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: limit,
    })
  },

  async addMessage(data: {
    conversationId: string
    role: string
    content: string
  }) {
    return prisma.message.create({ data })
  },

  async updateTitle(id: string, title: string) {
    return prisma.conversation.update({ where: { id }, data: { title } })
  },

  async delete(id: string) {
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { conversationId: id } }),
      prisma.conversationContext.deleteMany({ where: { conversationId: id } }),
      prisma.conversation.deleteMany({ where: { id } }),
    ])
  },
}
