import { prisma } from "@/lib/prisma"

// Staleness thresholds in days (null = never stale)
const STALE_DAYS: Record<string, number | null> = {
  company_list: 90,
  company_ranking: 90,
  shipment_records: null,
}

function isStale(fetchedAt: Date, dataType: string): boolean {
  const days = STALE_DAYS[dataType]
  if (days === null) return false
  const ageMs = Date.now() - fetchedAt.getTime()
  return ageMs > days * 24 * 60 * 60 * 1000
}

export const tradeDataRepo = {
  async search(userId: string, params: {
    skuTag: string
    tradeDirection?: string
    country?: string
    dataType?: string
  }) {
    const rows = await prisma.userTradeData.findMany({
      where: {
        userId,
        skuTag: { contains: params.skuTag, mode: "insensitive" },
        ...(params.tradeDirection ? { tradeDirection: params.tradeDirection } : {}),
        ...(params.country ? { country: { contains: params.country, mode: "insensitive" } } : {}),
        ...(params.dataType ? { dataType: params.dataType } : {}),
      },
      orderBy: { fetchedAt: "desc" },
    })

    return rows.map((row) => ({
      ...row,
      stale: isStale(row.fetchedAt, row.dataType),
    }))
  },

  async upsert(params: {
    userId: string
    skuTag: string
    dataType: string
    tradeDirection: string
    country?: string
    content: unknown
    sourceParams?: unknown
  }) {
    // Find existing row to update or create new
    const existing = await prisma.userTradeData.findFirst({
      where: {
        userId: params.userId,
        skuTag: params.skuTag,
        dataType: params.dataType,
        tradeDirection: params.tradeDirection,
        country: params.country ?? null,
      },
    })

    if (existing) {
      return prisma.userTradeData.update({
        where: { id: existing.id },
        data: {
          content: params.content as never,
          sourceParams: (params.sourceParams ?? null) as never,
          fetchedAt: new Date(),
        },
      })
    }

    return prisma.userTradeData.create({
      data: {
        userId: params.userId,
        skuTag: params.skuTag,
        dataType: params.dataType,
        tradeDirection: params.tradeDirection,
        country: params.country ?? null,
        content: params.content as never,
        sourceParams: (params.sourceParams ?? null) as never,
      },
    })
  },

  async listByUser(userId: string) {
    return prisma.userTradeData.findMany({
      where: { userId },
      orderBy: { fetchedAt: "desc" },
      select: { id: true, skuTag: true, dataType: true, tradeDirection: true, country: true, fetchedAt: true },
    })
  },
}
