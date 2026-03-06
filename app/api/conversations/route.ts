import { conversationRepo } from "@/lib/repositories/conversation.repo"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const conversation = await conversationRepo.create(user.id)
  return Response.json({ id: conversation.id })
}
