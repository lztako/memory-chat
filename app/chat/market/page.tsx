import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MarketView } from "@/components/market/MarketView"

export default async function MarketPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <div style={{ height: "100%", overflow: "hidden" }}>
      <MarketView />
    </div>
  )
}
