/**
 * Tendata rate limiter — DB-backed, per user per day (UTC)
 * In-memory cache used only for getTendataUsage() display (stale OK)
 *
 * Point costs (per item):
 *   list_trade_companies  → 1 pt
 *   rank_trade_companies  → 12 pt
 *   query_trade_data      → 6 pt
 */

import { tendataUsageRepo } from "@/lib/repositories/tendata-usage.repo"

const DAILY_POINT_LIMIT = 500

// L1 cache: userId:date → points (for fast UI reads, stale-ok)
const cache = new Map<string, number>()

function dateKey(userId: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `${userId}:${date}`
}

function resetTimeText(): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  const diffMs = tomorrow.getTime() - now.getTime()
  const hours = Math.floor(diffMs / 3600000)
  const minutes = Math.floor((diffMs % 3600000) / 60000)
  return `${hours} ชั่วโมง ${minutes} นาที`
}

export async function checkTendataLimit(
  userId: string,
  estimatedPoints: number
): Promise<{ allowed: boolean; used: number; limit: number; errorMessage?: string }> {
  const used = await tendataUsageRepo.getPoints(userId)
  // sync cache
  cache.set(dateKey(userId), used)

  if (used + estimatedPoints > DAILY_POINT_LIMIT) {
    return {
      allowed: false,
      used,
      limit: DAILY_POINT_LIMIT,
      errorMessage: `quota การค้นหาข้อมูลการค้าวันนี้เต็มแล้วครับ (ใช้ไป ${used}/${DAILY_POINT_LIMIT} points) จะ reset ในอีก ${resetTimeText()} หากต้องการข้อมูลเพิ่มเติมสามารถติดต่อทีมงานได้ครับ`,
    }
  }
  return { allowed: true, used, limit: DAILY_POINT_LIMIT }
}

export async function recordTendataUsage(userId: string, points: number): Promise<void> {
  const newTotal = await tendataUsageRepo.incrementPoints(userId, points)
  cache.set(dateKey(userId), newTotal)
}

export function getTendataUsage(userId: string): { used: number; limit: number; remaining: number } {
  const used = cache.get(dateKey(userId)) ?? 0
  return { used, limit: DAILY_POINT_LIMIT, remaining: DAILY_POINT_LIMIT - used }
}
