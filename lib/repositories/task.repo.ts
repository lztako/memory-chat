import { prisma } from "../prisma"

export const taskRepo = {
  async create(data: {
    userId: string
    title: string
    description?: string
    priority?: string
    dueDate?: Date
    linkedCompany?: string
  }) {
    return prisma.task.create({ data })
  },

  async update(id: string, userId: string, data: {
    title?: string
    description?: string
    status?: string
    priority?: string
    dueDate?: Date | null
    linkedCompany?: string
  }) {
    return prisma.task.updateMany({
      where: { id, userId },
      data: { ...data, updatedAt: new Date() },
    })
  },

  async list(userId: string, filters?: {
    status?: string
    overdue?: boolean
    upcoming?: boolean // due within 7 days
  }) {
    const now = new Date()
    const in7days = new Date(now)
    in7days.setDate(in7days.getDate() + 7)

    return prisma.task.findMany({
      where: {
        userId,
        ...(filters?.status ? { status: filters.status } : { status: { not: "done" } }),
        ...(filters?.overdue ? { dueDate: { lt: now } } : {}),
        ...(filters?.upcoming ? { dueDate: { gte: now, lte: in7days } } : {}),
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "asc" }],
    })
  },

  async getById(id: string, userId: string) {
    return prisma.task.findFirst({ where: { id, userId } })
  },

  async getReminders(userId: string) {
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000)
    return prisma.task.findMany({
      where: {
        userId,
        status: { notIn: ["done", "cancelled"] },
        dueDate: { lte: in24h },
      },
      orderBy: [{ dueDate: "asc" }],
    })
  },
}
