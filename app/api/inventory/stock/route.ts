import { NextResponse } from "next/server"

const BASE = process.env.MARKET_DB_URL!
const KEY  = process.env.MARKET_DB_KEY!

export interface StockRow {
  stock_id:    string
  factory:     string
  qty:         number
  tag:         string
  type:        string
  customer_id: string
}

export async function GET() {
  try {
    const res = await fetch(
      `${BASE}/rest/v1/stock?customer_id=eq.trrgroup&limit=200`,
      {
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
        next: { revalidate: 300 },
      }
    )
    if (!res.ok) throw new Error(`Market DB ${res.status}: ${await res.text()}`)
    const rows: StockRow[] = await res.json()
    return NextResponse.json({ rows })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
