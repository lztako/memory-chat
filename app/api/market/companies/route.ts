import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listCompanies } from "@/lib/market/client"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const companies = await listCompanies()
    return NextResponse.json({ companies })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
