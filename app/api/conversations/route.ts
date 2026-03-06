import { conversationRepo } from "@/lib/repositories/conversation.repo"

export async function POST(req: Request) {
  const { userId } = await req.json()
  const conversation = await conversationRepo.create(userId)
  return Response.json({ id: conversation.id })
}
