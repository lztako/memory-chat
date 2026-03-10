import { createClient } from "@/lib/supabase/server"
import { getTendataUsage } from "@/lib/tendata/rate-limit"
import { getTokenUsage } from "@/lib/ai/token-usage"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const [tendata, ai] = await Promise.all([
    Promise.resolve(getTendataUsage(user.id)), // reads in-memory cache (fast)
    getTokenUsage(user.id),                    // reads from DB
  ])

  return Response.json({
    date: new Date().toISOString().slice(0, 10),
    tendata: {
      used: tendata.used,
      limit: tendata.limit,
      remaining: tendata.remaining,
      percentUsed: Math.round((tendata.used / tendata.limit) * 100),
    },
    ai: {
      inputTokens: ai.inputTokens,
      outputTokens: ai.outputTokens,
      totalTokens: ai.totalTokens,
      estimatedCostUSD: ai.estimatedCostUSD,
    },
  })
}
