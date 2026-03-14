import { checkAuth } from "@/lib/admin/auth"
import { userDocRepo } from "@/lib/repositories/userDoc.repo"

export async function GET(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id: userId, docId } = await params
  const doc = await userDocRepo.getContent(userId, docId)
  if (!doc) return new Response("Not found", { status: 404 })
  return Response.json({ doc })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id: userId, docId } = await params
  const body = await req.json() as Partial<{ title: string; content: string; docType: string }>
  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title.trim()
  if (body.content !== undefined) data.content = body.content.trim()
  if (body.docType !== undefined) data.docType = body.docType
  if (Object.keys(data).length === 0) return new Response("No fields to update", { status: 400 })
  await userDocRepo.update(docId, userId, data as Parameters<typeof userDocRepo.update>[2])
  return Response.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id: userId, docId } = await params
  await userDocRepo.delete(docId, userId)
  return Response.json({ success: true })
}
