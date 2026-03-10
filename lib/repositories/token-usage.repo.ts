import { prisma } from "@/lib/prisma"

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export const tokenUsageRepo = {
  async getUsage(userId: string, date = todayUTC()) {
    const row = await prisma.tokenUsage.findUnique({
      where: { userId_date: { userId, date } },
      select: { inputTokens: true, outputTokens: true },
    })
    return row ?? { inputTokens: 0, outputTokens: 0 }
  },

  async incrementUsage(userId: string, inputTokens: number, outputTokens: number, date = todayUTC()) {
    return prisma.tokenUsage.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, inputTokens, outputTokens },
      update: {
        inputTokens: { increment: inputTokens },
        outputTokens: { increment: outputTokens },
      },
    })
  },

  async getHistory(userId: string, days = 30) {
    const since = new Date()
    since.setUTCDate(since.getUTCDate() - days)
    const sinceStr = since.toISOString().slice(0, 10)
    return prisma.tokenUsage.findMany({
      where: { userId, date: { gte: sinceStr } },
      orderBy: { date: "desc" },
      select: { date: true, inputTokens: true, outputTokens: true },
    })
  },
}
