import { prisma } from "@/lib/prisma"

export const dashboardRepo = {
  async getByUser(userId: string) {
    return prisma.userDashboard.findUnique({ where: { userId } })
  },

  async upsert(userId: string, widgets: unknown[]) {
    return prisma.userDashboard.upsert({
      where: { userId },
      update: { widgets },
      create: { userId, widgets },
    })
  },
}
