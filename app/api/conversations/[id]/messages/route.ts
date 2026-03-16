import { conversationRepo } from "@/lib/repositories/conversation.repo"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const messages = await conversationRepo.getMessages(id, 50)
  return Response.json(messages.map((m: { role: string; content: string; toolCalls?: unknown }) => ({
    role: m.role,
    content: m.content,
    ...(m.toolCalls ? { toolCalls: m.toolCalls } : {}),
  })))
}
