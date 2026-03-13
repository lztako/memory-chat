import { checkAuth } from "@/lib/admin/auth"
import { userDocRepo } from "@/lib/repositories/userDoc.repo"

export async function GET(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id: userId, docId } = await params
  const doc = await userDocRepo.getContent(userId, docId)
  if (!doc) return new Response("Not found", { status: 404 })
  return Response.json({ doc })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id: userId, docId } = await params
  await userDocRepo.delete(docId, userId)
  return Response.json({ success: true })
}
