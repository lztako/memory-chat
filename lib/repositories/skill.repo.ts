import { prisma } from "@/lib/prisma"

export const skillRepo = {
  async create(data: {
    userId: string
    name: string
    trigger: string
    solution: string
  }) {
    return prisma.userSkill.create({ data })
  },

  async listByUser(userId: string) {
    return prisma.userSkill.findMany({
      where: { userId },
      orderBy: { usageCount: "desc" },
    })
  },

  async incrementUsage(id: string) {
    return prisma.userSkill.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    })
  },

  async findByName(userId: string, name: string) {
    return prisma.userSkill.findFirst({
      where: { userId, name },
    })
  },
}
