import { createClient } from "@/lib/supabase/server"
import { skillRepo } from "@/lib/repositories/skill.repo"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const skills = await skillRepo.listByUser(user.id)
  return Response.json({ skills })
}
