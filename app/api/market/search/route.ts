import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listTradeCompanies } from "@/lib/tendata/client"
import { checkTendataLimit, recordTendataUsage } from "@/lib/tendata/rate-limit"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { hsCode, catalog = "imports", startDate, endDate, pageNo = 1, pageSize = 20 } = body

  if (!hsCode?.trim()) return NextResponse.json({ error: "hsCode is required" }, { status: 400 })

  const estPoints = pageSize
  const limit = await checkTendataLimit(user.id, estPoints)
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.errorMessage }, { status: 429 })
  }

  try {
    const result = await listTradeCompanies(catalog as "importers" | "exporters", {
      catalog,
      startDate: startDate ?? `${new Date().getFullYear() - 1}-01-01`,
      endDate: endDate ?? new Date().toISOString().slice(0, 10),
      hsCode: hsCode.trim(),
      pageNo,
      pageSize,
    })

    await recordTendataUsage(user.id, result.names.length)

    return NextResponse.json({
      companies: result.names,
      total: result.total,
      used: limit.used + result.names.length,
      limit: limit.limit,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
