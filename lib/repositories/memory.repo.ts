import { prisma } from "../prisma"

export const memoryRepo = {
  async getByUser(userId: string, limit = 10) {
    return prisma.memory.findMany({
      where: { userId },
      orderBy: [{ importance: "desc" }, { lastUsedAt: "desc" }],
      take: limit,
    })
  },

  async getForInjection(userId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [longTerm, dailyLog] = await Promise.all([
      prisma.memory.findMany({
        where: { userId, layer: "long_term" },
        orderBy: { importance: "desc" },
        take: 20,
      }),
      prisma.memory.findMany({
        where: { userId, layer: "daily_log", createdAt: { gte: today } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ])

    return { longTerm, dailyLog }
  },

  async create(data: {
    userId: string
    type: string
    content: string
    importance: number
    layer?: string
  }) {
    return prisma.memory.create({ data })
  },

  async update(id: string, data: { content?: string; importance?: number }) {
    return prisma.memory.update({
      where: { id },
      data: { ...data, lastUsedAt: new Date() },
    })
  },

  async delete(id: string) {
    return prisma.memory.delete({ where: { id } })
  },

  async getAll(userId: string) {
    return prisma.memory.findMany({ where: { userId } })
  },
}
