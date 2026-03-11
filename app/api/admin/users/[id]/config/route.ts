import { dashboardRepo } from "@/lib/repositories/dashboard.repo"

function checkAuth(req: Request) {
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${process.env.ADMIN_SECRET}`
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })

  const { id: userId } = await params

  try {
    const dashboard = await dashboardRepo.getByUser(userId)
    return Response.json({ userId, widgets: dashboard?.widgets ?? [] })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })

  const { id: userId } = await params

  try {
    const body = await req.json()
    const { widgets } = body
    if (!Array.isArray(widgets)) {
      return Response.json({ error: "Required: widgets (array)" }, { status: 400 })
    }

    const dashboard = await dashboardRepo.upsert(userId, widgets)
    return Response.json({ ok: true, userId, widgetCount: widgets.length, updatedAt: dashboard.updatedAt })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    )
  }
}
