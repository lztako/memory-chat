import { NextRequest } from "next/server"
import { tradeDataRepo } from "@/lib/repositories/trade-data.repo"
import { listTradeCompanies, rankTradeCompanies, queryTrade } from "@/lib/tendata/client"
import { tendataUsageRepo } from "@/lib/repositories/tendata-usage.repo"

// Admin-only endpoint — protected by ADMIN_SECRET
// Used by our team to pre-populate trade data for a specific user's SKU
//
// POST /api/admin/trade-sync
// Body: { userId, skuTag, dataType, tradeDirection, country?, params }
//
// dataType: "company_list" | "company_ranking" | "shipment_records"
// tradeDirection: "import" | "export"
// params: Tendata query params (hsCode, productDesc, pageSize, etc.)

const POINT_COST: Record<string, number> = {
  company_list: 1,
  company_ranking: 12,
  shipment_records: 6,
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  if (!process.env.TENDATA_API_KEY) {
    return Response.json({ error: "TENDATA_API_KEY not configured" }, { status: 500 })
  }

  const body = await req.json()
  const { userId, skuTag, dataType, tradeDirection, country, params = {} } = body

  if (!userId || !skuTag || !dataType || !tradeDirection) {
    return Response.json(
      { error: "Required: userId, skuTag, dataType, tradeDirection" },
      { status: 400 }
    )
  }

  const pageSize = Math.min(params.pageSize ?? 20, 20)
  const pointCost = (POINT_COST[dataType] ?? 6) * pageSize

  try {
    let content: unknown

    if (dataType === "company_list") {
      content = await listTradeCompanies(
        tradeDirection === "import" ? "importers" : "exporters",
        {
          catalog: tradeDirection === "import" ? "imports" : "exports",
          hsCode: params.hsCode,
          productDesc: params.productDesc,
          countryOfOriginCode: params.countryOfOriginCode,
          countryOfDestinationCode: params.countryOfDestinationCode,
          startDate: params.startDate,
          endDate: params.endDate,
          pageSize,
        }
      )
    } else if (dataType === "company_ranking") {
      content = await rankTradeCompanies({
        type: tradeDirection === "import" ? "importers" : "exporters",
        catalog: tradeDirection === "import" ? "imports" : "exports",
        hsCode: params.hsCode,
        productDesc: params.productDesc,
        countryOfOriginCode: params.countryOfOriginCode,
        countryOfDestinationCode: params.countryOfDestinationCode,
        startDate: params.startDate,
        endDate: params.endDate,
        pageSize,
      })
    } else if (dataType === "shipment_records") {
      content = await queryTrade({
        catalog: tradeDirection === "import" ? "imports" : "exports",
        hsCode: params.hsCode,
        importer: params.importer,
        exporter: params.exporter,
        startDate: params.startDate,
        endDate: params.endDate,
        pageSize,
      })
    } else {
      return Response.json({ error: `Unknown dataType: ${dataType}` }, { status: 400 })
    }

    // Store to UserTradeData
    const row = await tradeDataRepo.upsert({
      userId,
      skuTag,
      dataType,
      tradeDirection,
      country: country ?? undefined,
      content,
      sourceParams: { ...params, pageSize },
    })

    // Track Tendata point usage under a system account key
    await tendataUsageRepo.incrementPoints(`admin:${userId}`, pointCost)

    return Response.json({
      ok: true,
      id: row.id,
      skuTag,
      dataType,
      tradeDirection,
      pointsUsed: pointCost,
      fetchedAt: row.fetchedAt,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Tendata API error" },
      { status: 500 }
    )
  }
}
