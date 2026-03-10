import { NextRequest } from "next/server"
import { dashboardRepo } from "@/lib/repositories/dashboard.repo"

// POST /api/admin/dashboard
// Body: { userId, widgets: [...] }
// Protected by ADMIN_SECRET — Origo team use only

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json()
  const { userId, widgets } = body

  if (!userId || !Array.isArray(widgets)) {
    return Response.json({ error: "Required: userId (string), widgets (array)" }, { status: 400 })
  }

  await dashboardRepo.upsert(userId, widgets)
  return Response.json({ ok: true, userId, widgetCount: widgets.length })
}
