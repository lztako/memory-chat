import { prisma } from "@/lib/prisma"
import { embedText, toVectorString } from "@/lib/ai/embeddings"

type SkillRow = {
  id: string
  userId: string
  name: string
  trigger: string
  solution: string
  tools: string[]
  usageCount: number
  createdAt: Date
  updatedAt: Date
}

async function embedAndSaveSkill(id: string, text: string) {
  const embedding = await embedText(text)
  if (!embedding) return
  const vec = toVectorString(embedding)
  await prisma.$executeRaw`UPDATE "UserSkill" SET embedding = ${vec}::vector WHERE id = ${id}`
}

export const skillRepo = {
  async create(data: {
    userId: string
    name: string
    trigger: string
    solution: string
    tools?: string[]
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
    embedAndSaveSkill(skill.id, `${data.trigger} ${data.solution}`).catch(() => {})
    return skill
  },

  async listByUser(userId: string) {
    return prisma.userSkill.findMany({
      where: { userId },
      orderBy: { usageCount: "desc" },
    })
  },

  async listByUserSemantic(userId: string, query: string) {
    const embedding = await embedText(query)
    if (!embedding) return this.listByUser(userId)

    const vec = toVectorString(embedding)
    const skills = await prisma.$queryRaw<SkillRow[]>`
      SELECT id, "userId", name, trigger, solution, tools, "usageCount", "createdAt", "updatedAt"
      FROM "UserSkill"
      WHERE "userId" = ${userId}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vec}::vector
      LIMIT 5
    `
    // Fallback: no embeddings yet → return all and let keyword filter handle it
    if (skills.length === 0) return this.listByUser(userId)
    return skills
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
