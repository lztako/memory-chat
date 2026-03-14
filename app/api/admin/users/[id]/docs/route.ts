import { checkAuth } from "@/lib/admin/auth"
import { userDocRepo } from "@/lib/repositories/userDoc.repo"
import type { UserDocParentType, UserDocType } from "@/lib/repositories/userDoc.repo"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id: userId } = await params
  const { searchParams } = new URL(req.url)
  const parentType = (searchParams.get("parentType") ?? "resource") as UserDocParentType
  const parentId = searchParams.get("parentId")
  const docs = parentId
    ? await userDocRepo.listByParent(userId, parentId)
    : await userDocRepo.listIndex(userId, parentType)
  return Response.json({ docs })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id: userId } = await params
  const { title, docType, content, parentType = "resource", parentId } = await req.json() as {
    title: string; docType: string; content: string
    parentType?: string; parentId?: string
  }
  if (!title?.trim() || !docType || !content?.trim()) {
    return new Response("title, docType, content required", { status: 400 })
  }
  const doc = await userDocRepo.create({
    userId,
    parentType: parentType as UserDocParentType,
    parentId,
    docType: docType as UserDocType,
    title: title.trim(),
    content: content.trim(),
  })
  return Response.json({ doc }, { status: 201 })
}
