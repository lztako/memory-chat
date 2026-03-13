import { prisma } from '@/lib/prisma'

export type UserDocParentType = 'skill' | 'agent' | 'resource'
export type UserDocType = 'reference' | 'example' | 'workflow' | 'overview' | 'contact' | 'product'

export interface CreateUserDocInput {
  userId: string
  parentId?: string
  parentType: UserDocParentType
  docType: UserDocType
  title: string
  content: string
}

export const userDocRepo = {
  async create(input: CreateUserDocInput) {
    return prisma.userDoc.create({ data: input })
  },

  async getById(id: string) {
    return prisma.userDoc.findUnique({ where: { id } })
  },

  // index สำหรับ inject ใน system prompt (~50 tok) — title only, no content
  async listIndex(userId: string, parentType: UserDocParentType) {
    return prisma.userDoc.findMany({
      where: { userId, parentType },
      select: { id: true, parentId: true, parentType: true, docType: true, title: true },
      orderBy: { createdAt: 'asc' },
    })
  },

  // ดึงทุก doc ของ parent (skill หรือ agent)
  async listByParent(userId: string, parentId: string) {
    return prisma.userDoc.findMany({
      where: { userId, parentId },
      orderBy: { createdAt: 'asc' },
    })
  },

  // ดึง full content สำหรับ on-demand fetch ผ่าน read_resource tool
  async getContent(userId: string, id: string) {
    return prisma.userDoc.findFirst({
      where: { id, userId },
      select: { id: true, title: true, content: true, docType: true, parentType: true },
    })
  },

  async update(id: string, userId: string, data: Partial<Pick<CreateUserDocInput, 'title' | 'content' | 'docType'>>) {
    return prisma.userDoc.updateMany({
      where: { id, userId },
      data,
    })
  },

  async delete(id: string, userId: string) {
    return prisma.userDoc.deleteMany({ where: { id, userId } })
  },

  // ลบทุก doc ของ parent เมื่อ skill/agent ถูกลบ
  async deleteByParent(userId: string, parentId: string) {
    return prisma.userDoc.deleteMany({ where: { userId, parentId } })
  },
}
