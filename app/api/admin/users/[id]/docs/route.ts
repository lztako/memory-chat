import { checkAuth } from "@/lib/admin/auth"
import { userDocRepo } from "@/lib/repositories/userDoc.repo"
import type { UserDocParentType, UserDocType } from "@/lib/repositories/userDoc.repo"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id: userId } = await params
  const docs = await userDocRepo.listIndex(userId, "resource")
  return Response.json({ docs })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id: userId } = await params
  const { title, docType, content } = await req.json() as {
    title: string; docType: string; content: string
  }
  if (!title?.trim() || !docType || !content?.trim()) {
    return new Response("title, docType, content required", { status: 400 })
  }
  const doc = await userDocRepo.create({
    userId,
    parentType: "resource" as UserDocParentType,
    docType: docType as UserDocType,
    title: title.trim(),
    content: content.trim(),
  })
  return Response.json({ doc }, { status: 201 })
}
