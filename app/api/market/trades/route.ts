import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { queryTrade } from "@/lib/tendata/client"
import { checkTendataLimit, recordTendataUsage } from "@/lib/tendata/rate-limit"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { company, catalog = "imports", hsCode, startDate, endDate } = body

  if (!company?.trim()) return NextResponse.json({ error: "company is required" }, { status: 400 })

  const pageSize = 20
  const estPoints = pageSize * 6
  const limit = await checkTendataLimit(user.id, estPoints)
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.errorMessage }, { status: 429 })
  }

  try {
    const result = await queryTrade({
      catalog,
      startDate: startDate ?? `${new Date().getFullYear() - 1}-01-01`,
      endDate: endDate ?? new Date().toISOString().slice(0, 10),
      ...(catalog === "imports" ? { importer: company } : { exporter: company }),
      ...(hsCode && { hsCode }),
      pageNo: 1,
      pageSize,
    })

    await recordTendataUsage(user.id, result.content.length * 6)

    // Build country distribution
    const countryCounts: Record<string, number> = {}
    for (const r of result.content) {
      const country = catalog === "imports" ? r.countryOfOrigin : r.countryOfDestination
      if (country) countryCounts[country] = (countryCounts[country] ?? 0) + 1
    }

    return NextResponse.json({
      records: result.content,
      total: result.total,
      countryCounts,
      used: limit.used + result.content.length * 6,
      limit: limit.limit,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
