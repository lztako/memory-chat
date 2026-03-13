import { prisma } from '@/lib/prisma'

export type GlobalDocCategory = 'company' | 'knowledge'
export type GlobalDocType = 'overview' | 'history' | 'service' | 'reference' | 'workflow'

export interface CreateGlobalDocInput {
  category: GlobalDocCategory
  docType: GlobalDocType
  title: string
  content: string
  sortOrder?: number
}

export const globalDocRepo = {
  // index สำหรับ inject ใน system prompt — title only, no content
  async listIndex() {
    return prisma.globalDoc.findMany({
      select: { id: true, category: true, docType: true, title: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    })
  },

  async listAll() {
    return prisma.globalDoc.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    })
  },

  async listByCategory(category: GlobalDocCategory) {
    return prisma.globalDoc.findMany({
      where: { category },
      orderBy: { sortOrder: 'asc' },
    })
  },

  // full content สำหรับ on-demand fetch ผ่าน read_global_doc tool
  async getContent(id: string) {
    return prisma.globalDoc.findUnique({
      where: { id },
      select: { id: true, title: true, content: true, docType: true, category: true },
    })
  },

  async create(input: CreateGlobalDocInput) {
    return prisma.globalDoc.create({ data: input })
  },

  async update(id: string, data: Partial<Omit<CreateGlobalDocInput, 'category'>>) {
    return prisma.globalDoc.update({ where: { id }, data })
  },

  async delete(id: string) {
    return prisma.globalDoc.delete({ where: { id } })
  },
}
