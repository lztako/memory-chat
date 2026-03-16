import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { checkTendataLimit } from "@/lib/tendata/rate-limit"
import { MarketView } from "@/components/market/MarketView"

export default async function MarketPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const limit = await checkTendataLimit(user.id, 0)

  return (
    <div style={{ height: "100%", overflow: "hidden" }}>
      <MarketView initialUsed={limit.used} limit={limit.limit} />
    </div>
  )
}
