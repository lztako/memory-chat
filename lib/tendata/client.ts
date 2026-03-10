const BASE_URL = "https://open-api.tendata.cn"

// --- Token cache ---
let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken
  }

  const apiKey = process.env.TENDATA_API_KEY
  if (!apiKey) throw new Error("TENDATA_API_KEY is not set")

  const res = await fetch(`${BASE_URL}/v2/access-token?apiKey=${apiKey}`)
  const json = await res.json()

  if (!json.success) {
    throw new Error(`Tendata token error: ${json.code} ${json.msg}`)
  }

  cachedToken = json.data.accessToken as string
  tokenExpiresAt = Date.now() + json.data.expiresIn * 1000
  return cachedToken
}

// --- Query cache (in-memory, saves points during test) ---
const queryCache = new Map<string, { result: TendataTradeResult; cachedAt: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export interface TendataTradeParams {
  catalog: "imports" | "exports"
  startDate: string
  endDate: string
  hsCode?: string
  importer?: string
  exporter?: string
  pageNo?: number
  pageSize?: number
  searchMode?: string
}

export interface TendataTradeRecord {
  date: string
  importer: string
  exporter: string
  hsCode: string
  countryOfOrigin: string
  countryOfDestination: string
}

export interface TendataTradeResult {
  total: number
  page: number
  size: number
  content: TendataTradeRecord[]
}

export interface TendataCompanyListParams {
  catalog: "imports" | "exports"
  startDate: string
  endDate: string
  hsCode?: string
  productDesc?: string
  importer?: string
  exporter?: string
  countryOfOriginCode?: string
  countryOfDestinationCode?: string
  portOfDeparture?: string
  portOfArrival?: string
  transportType?: string
  weight?: [number, number]
  sumOfUSD?: [number, number]
  pageNo?: number
  pageSize?: number
}

export interface TendataCompanyListResult {
  total: number
  pageNo: number
  pageSize: number
  names: string[]
}

export async function listTradeCompanies(
  type: "importers" | "exporters",
  params: TendataCompanyListParams
): Promise<TendataCompanyListResult> {
  const cacheKey = `companies:${type}:${JSON.stringify(params)}`
  const cached = queryCache.get(cacheKey)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.result as unknown as TendataCompanyListResult
  }

  const token = await getToken()

  const body = {
    pageNo: params.pageNo ?? 1,
    pageSize: Math.min(params.pageSize ?? 10, 20),
    catalog: params.catalog,
    startDate: params.startDate,
    endDate: params.endDate,
    ...(params.hsCode && { hsCode: params.hsCode }),
    ...(params.productDesc && { productDesc: params.productDesc }),
    ...(params.importer && { importer: params.importer }),
    ...(params.exporter && { exporter: params.exporter }),
    ...(params.countryOfOriginCode && { countryOfOriginCode: params.countryOfOriginCode }),
    ...(params.countryOfDestinationCode && { countryOfDestinationCode: params.countryOfDestinationCode }),
    ...(params.portOfDeparture && { portOfDeparture: params.portOfDeparture }),
    ...(params.portOfArrival && { portOfArrival: params.portOfArrival }),
    ...(params.transportType && { transportType: params.transportType }),
    ...(params.weight && { weight: params.weight }),
    ...(params.sumOfUSD && { sumOfUSD: params.sumOfUSD }),
  }

  const res = await fetch(`${BASE_URL}/v2/trade/${type}-name`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()

  if (!json.success) {
    throw new Error(`Tendata API error: ${json.code} ${json.msg} (traceId: ${json.traceId})`)
  }

  const result: TendataCompanyListResult = {
    total: json.data.total,
    pageNo: json.data.pageNo,
    pageSize: json.data.pageSize,
    names: (json.data.content ?? json.data.list ?? []).map((item: { name: string }) => item.name),
  }

  queryCache.set(cacheKey, { result: result as unknown as TendataTradeResult, cachedAt: Date.now() })
  return result
}

export interface TendataRankParams {
  type: "importers" | "exporters"
  catalog: "imports" | "exports"
  startDate: string
  endDate: string
  hsCode?: string
  productDesc?: string
  countryOfOriginCode?: string
  countryOfDestinationCode?: string
  pageNo?: number
  pageSize?: number
}

export interface TendataRankedCompany {
  name: string
  country: string
  tradeCount: number
  quantity: number
  sumOfUSD: number
  quantityAvgPrice: number
}

export interface TendataRankResult {
  total: number
  companies: TendataRankedCompany[]
}

export async function rankTradeCompanies(params: TendataRankParams): Promise<TendataRankResult> {
  const cacheKey = `rank:${JSON.stringify(params)}`
  const cached = queryCache.get(cacheKey)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.result as unknown as TendataRankResult
  }

  const token = await getToken()

  const body = {
    pageNo: params.pageNo ?? 1,
    pageSize: Math.min(params.pageSize ?? 10, 20),
    catalog: params.catalog,
    startDate: params.startDate,
    endDate: params.endDate,
    ...(params.hsCode && { hsCode: params.hsCode }),
    ...(params.productDesc && { productDesc: params.productDesc }),
    ...(params.countryOfOriginCode && { countryOfOriginCode: params.countryOfOriginCode }),
    ...(params.countryOfDestinationCode && { countryOfDestinationCode: params.countryOfDestinationCode }),
  }

  const res = await fetch(`${BASE_URL}/v2/trade/${params.type}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()

  if (!json.success) {
    throw new Error(`Tendata API error: ${json.code} ${json.msg} (traceId: ${json.traceId})`)
  }

  const result: TendataRankResult = {
    total: json.data.total,
    companies: (json.data.content ?? []).map((item: TendataRankedCompany) => ({
      name: item.name,
      country: item.country,
      tradeCount: item.tradeCount,
      quantity: item.quantity,
      sumOfUSD: item.sumOfUSD,
      quantityAvgPrice: item.quantityAvgPrice,
    })),
  }

  queryCache.set(cacheKey, { result: result as unknown as TendataTradeResult, cachedAt: Date.now() })
  return result
}

export async function queryTrade(params: TendataTradeParams): Promise<TendataTradeResult> {
  const cacheKey = JSON.stringify(params)
  const cached = queryCache.get(cacheKey)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.result
  }

  const token = await getToken()

  const body = {
    pageNo: params.pageNo ?? 1,
    pageSize: Math.min(params.pageSize ?? 10, 20),
    catalog: params.catalog,
    startDate: params.startDate,
    endDate: params.endDate,
    ...(params.hsCode && { hsCode: params.hsCode }),
    ...(params.importer && { importer: params.importer }),
    ...(params.exporter && { exporter: params.exporter }),
    ...(params.searchMode && { searchMode: params.searchMode }),
  }

  const res = await fetch(`${BASE_URL}/v2/trade`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()

  if (!json.success) {
    throw new Error(`Tendata API error: ${json.code} ${json.msg} (traceId: ${json.traceId})`)
  }

  const result: TendataTradeResult = {
    total: json.data.total,
    page: json.data.page,
    size: json.data.size,
    content: json.data.content ?? [],
  }

  queryCache.set(cacheKey, { result, cachedAt: Date.now() })
  return result
}
