import { prisma } from "@/lib/prisma"

export const dashboardRepo = {
  async getByUser(userId: string) {
    return prisma.userDashboard.findUnique({ where: { userId } })
  },

  async upsert(userId: string, widgets: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = widgets as any
    return prisma.userDashboard.upsert({
      where: { userId },
      update: { widgets: w },
      create: { userId, widgets: w },
    })
  },
}
