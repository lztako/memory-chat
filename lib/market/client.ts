const BASE = process.env.MARKET_DB_URL!
const KEY = process.env.MARKET_DB_KEY!

function headers() {
  return {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/rest/v1/${path}`, { headers: headers() })
  if (!res.ok) throw new Error(`Market DB ${res.status}: ${await res.text()}`)
  return res.json()
}

// Country name → ISO alpha-2 (for choropleth map)
const NAME_TO_ALPHA2: Record<string, string> = {
  "Brazil": "BR", "Thailand": "TH", "India": "IN", "Australia": "AU",
  "China": "CN", "United States": "US", "France": "FR", "Germany": "DE",
  "United Kingdom": "GB", "Japan": "JP", "South Korea": "KR", "Canada": "CA",
  "Mexico": "MX", "Indonesia": "ID", "Malaysia": "MY", "Vietnam": "VN",
  "Philippines": "PH", "Singapore": "SG", "South Africa": "ZA", "Kenya": "KE",
  "Nigeria": "NG", "Egypt": "EG", "Ethiopia": "ET", "Uganda": "UG",
  "Tanzania": "TZ", "Ghana": "GH", "Pakistan": "PK", "Bangladesh": "BD",
  "Sri Lanka": "LK", "Myanmar": "MM", "Cambodia": "KH", "Laos": "LA",
  "UAE": "AE", "United Arab Emirates": "AE", "Saudi Arabia": "SA",
  "Qatar": "QA", "Kuwait": "KW", "Turkey": "TR", "Russia": "RU",
  "Ukraine": "UA", "Poland": "PL", "Netherlands": "NL", "Belgium": "BE",
  "Spain": "ES", "Italy": "IT", "Portugal": "PT", "Sweden": "SE",
  "Switzerland": "CH", "Austria": "AT", "Argentina": "AR", "Chile": "CL",
  "Colombia": "CO", "Peru": "PE", "Ecuador": "EC", "Bolivia": "BO",
  "Uruguay": "UY", "Morocco": "MA", "Tunisia": "TN", "Algeria": "DZ",
  "Sudan": "SD", "Angola": "AO", "Mozambique": "MZ", "Zimbabwe": "ZW",
  "Zambia": "ZM", "Burundi": "BI", "Rwanda": "RW", "Cameroon": "CM",
  "New Zealand": "NZ", "Iran": "IR", "Iraq": "IQ", "Jordan": "JO",
  "Israel": "IL", "Nepal": "NP", "Cuba": "CU", "Dominican Republic": "DO",
  "Guatemala": "GT", "Honduras": "HN", "Costa Rica": "CR",
}

export interface MarketCompany {
  company_id: string
  customer: string
  location: string
  trades: number
  supplier_number: number
  value_tag: string
  latest_purchase_time: string
  status: string
  product_description: string | null
}

export interface CompanyHistory {
  id: string
  date: string
  importer: string
  exporter: string
  hs_code: string
  product_description: string
  origin_country: string
  destination_country: string
  total_price_usd: number
  weight_kg: number
  quantity: number
  unit_price_usd_kg: number
  quantity_unit: string
}

export interface CompanySupplychain {
  id: string
  exporter: string
  trades_sum: number
  trade_frequency_ratio: number
  kg_weight: number
  weight_ratio: number
  total_price_usd: number
  total_price_ratio: number
}

export interface CompanyOverview {
  total_purchase_value: number
  purchase_value_last_12m: number
  purchase_frequency_per_year: number
  latest_purchase_date: string
  purchase_interval_days: number
  is_active: boolean
  trade_start_date: string
  trade_end_date: string
  core_products: string[]
  core_supplier_countries: string[]
  core_suppliers: string[]
  recent_trends: string
  purchasing_trend: number
  purchase_stability: string
  purchase_activity: string
  business_overview: string
  procurement_structure: string
}

export interface CompanyDetail {
  history: CompanyHistory[]
  supplychain: CompanySupplychain[]
  overview: CompanyOverview | null
  countryCounts: Record<string, number>
}

export async function listCompanies(): Promise<MarketCompany[]> {
  return get<MarketCompany[]>(
    "companies?select=company_id,customer,location,trades,supplier_number,value_tag,latest_purchase_time,status,product_description&order=trades.desc"
  )
}

export async function getCompanyDetail(companyId: string): Promise<CompanyDetail> {
  const [history, supplychain, overviewArr] = await Promise.all([
    get<CompanyHistory[]>(
      `company_history?company_id=eq.${companyId}&order=date.desc&limit=20&select=id,date,importer,exporter,hs_code,product_description,origin_country,destination_country,total_price_usd,weight_kg,quantity,unit_price_usd_kg,quantity_unit`
    ),
    get<CompanySupplychain[]>(
      `company_supplychain?company_id=eq.${companyId}&order=total_price_usd.desc&select=id,exporter,trades_sum,trade_frequency_ratio,kg_weight,weight_ratio,total_price_usd,total_price_ratio`
    ),
    get<CompanyOverview[]>(
      `company_overview?company_id=eq.${companyId}&limit=1&select=total_purchase_value,purchase_value_last_12m,purchase_frequency_per_year,latest_purchase_date,purchase_interval_days,is_active,trade_start_date,trade_end_date,core_products,core_supplier_countries,core_suppliers,recent_trends,purchasing_trend,purchase_stability,purchase_activity,business_overview,procurement_structure`
    ),
  ])

  // Build origin country counts for map
  const countryCounts: Record<string, number> = {}
  for (const r of history) {
    const alpha2 = NAME_TO_ALPHA2[r.origin_country]
    if (alpha2) countryCounts[alpha2] = (countryCounts[alpha2] ?? 0) + 1
  }

  return {
    history,
    supplychain,
    overview: overviewArr[0] ?? null,
    countryCounts,
  }
}
