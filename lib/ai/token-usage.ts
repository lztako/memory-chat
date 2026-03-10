/**
 * AI token usage tracker — DB-backed, per user per day (UTC)
 * Tracking only — no hard limit enforcement.
 *
 * Pricing (claude-sonnet-4-6):
 *   Input:  $3.00 / 1M tokens
 *   Output: $15.00 / 1M tokens
 */

import { tokenUsageRepo } from "@/lib/repositories/token-usage.repo"

const INPUT_PRICE_PER_M = 3.0
const OUTPUT_PRICE_PER_M = 15.0

function calcCost(inputTokens: number, outputTokens: number): number {
  const cost =
    (inputTokens / 1_000_000) * INPUT_PRICE_PER_M +
    (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_M
  return Math.round(cost * 10000) / 10000
}

// Fire-and-forget — does not block the response stream
export function recordTokenUsage(userId: string, inputTokens: number, outputTokens: number): void {
  tokenUsageRepo.incrementUsage(userId, inputTokens, outputTokens).catch(console.error)
}

export async function getTokenUsage(userId: string): Promise<{
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUSD: number
}> {
  const { inputTokens, outputTokens } = await tokenUsageRepo.getUsage(userId)
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCostUSD: calcCost(inputTokens, outputTokens),
  }
}
