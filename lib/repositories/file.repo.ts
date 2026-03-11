import { prisma } from "../prisma"

export const fileRepo = {
  async create(data: {
    userId: string
    fileName: string
    fileType?: string
    description?: string
    mimeType: string
    size: number
    rowCount: number
    columns: string[]
    data: unknown[]
  }) {
    return prisma.userFile.create({ data: { ...data, data: data.data as object[] } })
  },

  async listByUser(userId: string, fileType?: string) {
    return prisma.userFile.findMany({
      where: { userId, ...(fileType ? { fileType } : {}) },
      select: { id: true, fileName: true, fileType: true, description: true, mimeType: true, size: true, rowCount: true, columns: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })
  },

  async listSummaryByUser(userId: string) {
    return prisma.userFile.findMany({
      where: { userId },
      select: { id: true, fileName: true, fileType: true, description: true, rowCount: true, columns: true },
      orderBy: { createdAt: "desc" },
    })
  },

  async getById(id: string, userId: string) {
    return prisma.userFile.findFirst({ where: { id, userId } })
  },

  async rename(id: string, userId: string, newName: string) {
    return prisma.userFile.updateMany({ where: { id, userId }, data: { fileName: newName } })
  },

  async delete(id: string, userId: string) {
    return prisma.userFile.deleteMany({ where: { id, userId } })
  },
}
