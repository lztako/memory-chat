import { prisma } from "@/lib/prisma"

export const skillRepo = {
  async create(data: {
    userId: string
    name: string
    trigger: string
    solution: string
  }) {
    const skill = await prisma.userSkill.create({ data })
    // LRU eviction: keep max 30 skills per user (drop least used)
    const count = await prisma.userSkill.count({ where: { userId: data.userId } })
    if (count > 30) {
      const oldest = await prisma.userSkill.findFirst({
        where: { userId: data.userId },
        orderBy: [{ usageCount: "asc" }, { createdAt: "asc" }],
      })
      if (oldest && oldest.id !== skill.id) {
        await prisma.userSkill.delete({ where: { id: oldest.id } })
      }
    }
    return skill
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
