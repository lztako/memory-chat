import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { InventoryView } from "@/components/inventory/InventoryView"

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return <InventoryView />
}
