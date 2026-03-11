import { prisma } from "@/lib/prisma";

export const agentRepo = {
  // ดึง agents ที่ user ใช้ได้ = global (userId null) + per-user
  async getForUser(userId: string) {
    return prisma.userAgent.findMany({
      where: {
        isActive: true,
        OR: [{ userId: null }, { userId }],
      },
      orderBy: { createdAt: "asc" },
    });
  },

  // ดึง agent เดียวโดย name (global หรือ per-user)
  async getByName(name: string, userId: string) {
    return prisma.userAgent.findFirst({
      where: {
        name,
        isActive: true,
        OR: [{ userId: null }, { userId }],
      },
    });
  },

  // list สำหรับ Admin UI
  async listGlobal() {
    return prisma.userAgent.findMany({
      where: { userId: null },
      orderBy: { createdAt: "asc" },
    });
  },

  async listByUser(userId: string) {
    return prisma.userAgent.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  },

  async create(data: {
    userId?: string | null;
    name: string;
    description: string;
    systemPrompt: string;
    tools: string[];
    model?: string;
  }) {
    return prisma.userAgent.create({ data });
  },

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      systemPrompt: string;
      tools: string[];
      model: string;
      isActive: boolean;
    }>
  ) {
    return prisma.userAgent.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.userAgent.delete({ where: { id } });
  },
};
