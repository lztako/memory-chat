import { checkAuth } from "@/lib/admin/auth"
import { globalDocRepo } from "@/lib/repositories/globalDoc.repo"
import type { GlobalDocCategory, GlobalDocType } from "@/lib/repositories/globalDoc.repo"

export async function GET(req: Request) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const docs = await globalDocRepo.listAll()
  return Response.json({ docs })
}

export async function POST(req: Request) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { category, docType, title, content, sortOrder } = await req.json() as {
    category: string; docType: string; title: string; content: string; sortOrder?: number
  }
  if (!category?.trim() || !docType || !title?.trim() || !content?.trim()) {
    return new Response("category, docType, title, content required", { status: 400 })
  }
  const doc = await globalDocRepo.create({
    category: category as GlobalDocCategory,
    docType: docType as GlobalDocType,
    title: title.trim(),
    content: content.trim(),
    sortOrder: sortOrder ?? 0,
  })
  return Response.json({ doc }, { status: 201 })
}
