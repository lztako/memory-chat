import { prisma } from "../prisma"
import { embedText, toVectorString } from "@/lib/ai/embeddings"

type MemoryRow = {
  id: string
  userId: string
  type: string
  content: string
  importance: number
  layer: string
  lastUsedAt: Date
  createdAt: Date
  updatedAt: Date
}

async function embedAndSaveMemory(id: string, content: string) {
  const embedding = await embedText(content)
  if (!embedding) return
  const vec = toVectorString(embedding)
  await prisma.$executeRaw`UPDATE "Memory" SET embedding = ${vec}::vector WHERE id = ${id}`
}

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

    const [longTerm, dailyLog, userConfig] = await Promise.all([
      prisma.memory.findMany({
        where: { userId, layer: "long_term", type: { not: "user_config" } },
        orderBy: { importance: "desc" },
        take: 20,
      }),
      prisma.memory.findMany({
        where: { userId, layer: "daily_log", createdAt: { gte: today } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.memory.findMany({
        where: { userId, type: "user_config" },
        orderBy: { importance: "desc" },
      }),
    ])

    return { longTerm, dailyLog, userConfig }
  },

  async getForInjectionSemantic(userId: string, query: string) {
    const embedding = await embedText(query)
    if (!embedding) return this.getForInjection(userId)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const vec = toVectorString(embedding)

    const [longTermSemantic, longTermFallback, dailyLogSemantic, dailyLogFallback, userConfig] = await Promise.all([
      // Semantic: records with embeddings, ordered by similarity
      prisma.$queryRaw<MemoryRow[]>`
        SELECT id, "userId", type, content, importance, layer, "lastUsedAt", "createdAt", "updatedAt"
        FROM "Memory"
        WHERE "userId" = ${userId}
          AND layer = 'long_term'
          AND type != 'user_config'
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${vec}::vector
        LIMIT 10
      `,
      // Fallback: high-importance records without embeddings yet
      prisma.memory.findMany({
        where: { userId, layer: "long_term", type: { not: "user_config" } },
        orderBy: { importance: "desc" },
        take: 5,
      }),
      // Semantic daily log
      prisma.$queryRaw<MemoryRow[]>`
        SELECT id, "userId", type, content, importance, layer, "lastUsedAt", "createdAt", "updatedAt"
        FROM "Memory"
        WHERE "userId" = ${userId}
          AND layer = 'daily_log'
          AND "createdAt" >= ${today}
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${vec}::vector
        LIMIT 5
      `,
      // Fallback: recent daily log without embeddings
      prisma.memory.findMany({
        where: { userId, layer: "daily_log", createdAt: { gte: today } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.memory.findMany({
        where: { userId, type: "user_config" },
        orderBy: { importance: "desc" },
      }),
    ])

    // Merge semantic + fallback, deduplicate by id
    const seenIds = new Set<string>()
    const longTerm: MemoryRow[] = []
    for (const m of [...longTermSemantic, ...longTermFallback]) {
      if (!seenIds.has(m.id) && longTerm.length < 15) {
        seenIds.add(m.id)
        longTerm.push(m)
      }
    }

    const seenDailyIds = new Set<string>()
    const dailyLog: MemoryRow[] = []
    for (const m of [...dailyLogSemantic, ...dailyLogFallback]) {
      if (!seenDailyIds.has(m.id) && dailyLog.length < 8) {
        seenDailyIds.add(m.id)
        dailyLog.push(m)
      }
    }

    return { longTerm, dailyLog, userConfig }
  },

  async create(data: {
    userId: string
    type: string
    content: string
    importance: number
    layer?: string
  }) {
    const memory = await prisma.memory.create({ data })
    embedAndSaveMemory(memory.id, data.content).catch(() => {})
    return memory
  },

  async update(id: string, data: { content?: string; importance?: number }) {
    const memory = await prisma.memory.update({
      where: { id },
      data: { ...data, lastUsedAt: new Date() },
    })
    if (data.content) {
      embedAndSaveMemory(id, data.content).catch(() => {})
    }
    return memory
  },

  async delete(id: string) {
    return prisma.memory.delete({ where: { id } })
  },

  async getAll(userId: string) {
    return prisma.memory.findMany({ where: { userId } })
  },

  async clearOldDailyLog(userId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return prisma.memory.deleteMany({
      where: { userId, layer: "daily_log", createdAt: { lt: today } },
    })
  },
}
