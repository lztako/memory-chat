import { prisma } from "@/lib/prisma"

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export const tendataUsageRepo = {
  async getPoints(userId: string, date = todayUTC()): Promise<number> {
    const row = await prisma.tendataUsage.findUnique({
      where: { userId_date: { userId, date } },
      select: { points: true },
    })
    return row?.points ?? 0
  },

  async incrementPoints(userId: string, points: number, date = todayUTC()): Promise<number> {
    const row = await prisma.tendataUsage.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, points },
      update: { points: { increment: points } },
    })
    return row.points
  },

  async getHistory(userId: string, days = 30) {
    const since = new Date()
    since.setUTCDate(since.getUTCDate() - days)
    const sinceStr = since.toISOString().slice(0, 10)
    return prisma.tendataUsage.findMany({
      where: { userId, date: { gte: sinceStr } },
      orderBy: { date: "desc" },
      select: { date: true, points: true },
    })
  },
}
