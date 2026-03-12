import { prisma } from "@/lib/prisma"

export const globalInfoRepo = {
  async list() {
    return prisma.globalInfo.findMany({ orderBy: { sortOrder: "asc" } })
  },

  async upsert(key: string, value: string, sortOrder?: number) {
    return prisma.globalInfo.upsert({
      where: { key },
      update: { value, ...(sortOrder !== undefined ? { sortOrder } : {}) },
      create: { key, value, sortOrder: sortOrder ?? 0 },
    })
  },

  async update(id: string, data: Partial<{ key: string; value: string; sortOrder: number }>) {
    return prisma.globalInfo.update({ where: { id }, data })
  },

  async delete(id: string) {
    return prisma.globalInfo.delete({ where: { id } })
  },
}
