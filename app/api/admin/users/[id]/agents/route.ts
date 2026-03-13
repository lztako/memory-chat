import { agentRepo } from "@/lib/repositories/agent.repo"
import { checkAuth } from "@/lib/admin/auth"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id: userId } = await params
  try {
    const [global_, perUser] = await Promise.all([
      agentRepo.listGlobal(),
      agentRepo.listByUser(userId),
    ])
    return Response.json({ global: global_, perUser })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id: userId } = await params
  try {
    const body = await req.json()
    const { name, description, systemPrompt, tools, model } = body
    if (!name || !description || !systemPrompt || !Array.isArray(tools)) {
      return Response.json({ error: "Required: name, description, systemPrompt, tools[]" }, { status: 400 })
    }
    const agent = await agentRepo.create({ userId, name, description, systemPrompt, tools, model })
    return Response.json({ ok: true, agent })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  await params
  try {
    const { searchParams } = new URL(req.url)
    const agentId = searchParams.get("agentId")
    if (!agentId) return Response.json({ error: "Required: agentId" }, { status: 400 })
    await agentRepo.delete(agentId)
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  await params
  try {
    const body = await req.json()
    const { agentId, ...data } = body
    if (!agentId) return Response.json({ error: "Required: agentId" }, { status: 400 })
    const agent = await agentRepo.update(agentId, data)
    return Response.json({ ok: true, agent })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}
