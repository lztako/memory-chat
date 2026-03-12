import { globalInfoRepo } from "@/lib/repositories/globalInfo.repo"

function checkAuth(req: Request) {
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${process.env.ADMIN_SECRET}`
}

// GET /api/admin/global-info — list all entries
export async function GET(req: Request) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  try {
    const items = await globalInfoRepo.list()
    return Response.json(items)
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

// POST /api/admin/global-info — create new entry
export async function POST(req: Request) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { key, value, sortOrder } = await req.json() as { key: string; value: string; sortOrder?: number }
  if (!key?.trim() || !value?.trim()) return Response.json({ error: "key and value required" }, { status: 400 })
  try {
    const item = await globalInfoRepo.upsert(key.trim(), value.trim(), sortOrder)
    return Response.json(item)
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}
