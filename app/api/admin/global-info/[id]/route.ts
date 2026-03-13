import { globalInfoRepo } from "@/lib/repositories/globalInfo.repo"
import { checkAuth } from "@/lib/admin/auth"

// PATCH /api/admin/global-info/[id] — update entry
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id } = await params
  const data = await req.json() as Partial<{ key: string; value: string; sortOrder: number }>

  // Validate non-empty strings when key/value are provided
  if (data.key !== undefined && !data.key.trim()) return Response.json({ error: "key cannot be empty" }, { status: 400 })
  if (data.value !== undefined && !data.value.trim()) return Response.json({ error: "value cannot be empty" }, { status: 400 })
  if (!data.key && !data.value && data.sortOrder === undefined) return Response.json({ error: "nothing to update" }, { status: 400 })

  try {
    const item = await globalInfoRepo.update(id, data)
    return Response.json(item)
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

// DELETE /api/admin/global-info/[id] — delete entry
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id } = await params
  try {
    await globalInfoRepo.delete(id)
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}
