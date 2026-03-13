import { checkAuth } from "@/lib/admin/auth"
import { globalDocRepo } from "@/lib/repositories/globalDoc.repo"
import type { GlobalDocType } from "@/lib/repositories/globalDoc.repo"

export async function GET(req: Request, { params }: { params: Promise<{ docId: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { docId } = await params
  const doc = await globalDocRepo.getContent(docId)
  if (!doc) return new Response("Not found", { status: 404 })
  return Response.json({ doc })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ docId: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { docId } = await params
  const { title, docType, content, sortOrder } = await req.json() as {
    title?: string; docType?: string; content?: string; sortOrder?: number
  }
  await globalDocRepo.update(docId, {
    ...(title && { title: title.trim() }),
    ...(docType && { docType: docType as GlobalDocType }),
    ...(content && { content: content.trim() }),
    ...(sortOrder !== undefined && { sortOrder }),
  })
  return Response.json({ success: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ docId: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { docId } = await params
  await globalDocRepo.delete(docId)
  return Response.json({ success: true })
}
