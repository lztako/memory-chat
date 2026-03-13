import { prisma } from "@/lib/prisma"

type GlobalInfoRow = { id: string; key: string; value: string; sortOrder: number }
let cache: GlobalInfoRow[] | null = null
let cachedAt = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function invalidate() { cache = null }

export const globalInfoRepo = {
  async list() {
    if (cache && Date.now() - cachedAt < CACHE_TTL) return cache
    const result = await prisma.globalInfo.findMany({ orderBy: { sortOrder: "asc" } })
    cache = result
    cachedAt = Date.now()
    return result
  },

  async upsert(key: string, value: string, sortOrder?: number) {
    invalidate()
    return prisma.globalInfo.upsert({
      where: { key },
      update: { value, ...(sortOrder !== undefined ? { sortOrder } : {}) },
      create: { key, value, sortOrder: sortOrder ?? 0 },
    })
  },

  async update(id: string, data: Partial<{ key: string; value: string; sortOrder: number }>) {
    invalidate()
    return prisma.globalInfo.update({ where: { id }, data })
  },

  async delete(id: string) {
    invalidate()
    return prisma.globalInfo.delete({ where: { id } })
  },
}
