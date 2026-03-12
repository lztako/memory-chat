import { NextRequest } from "next/server"
import { globalInfoRepo } from "@/lib/repositories/globalInfo.repo"

function checkAuth(req: Request) {
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${process.env.ADMIN_SECRET}`
}

// PATCH /api/admin/global-info/[id] — update entry
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id } = await params
  const data = await req.json() as Partial<{ key: string; value: string; sortOrder: number }>
  const item = await globalInfoRepo.update(id, data)
  return Response.json(item)
}

// DELETE /api/admin/global-info/[id] — delete entry
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id } = await params
  await globalInfoRepo.delete(id)
  return Response.json({ success: true })
}
