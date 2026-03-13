import { agentRepo } from "@/lib/repositories/agent.repo"
import { checkAuth } from "@/lib/admin/auth"

export async function GET(req: Request) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  try {
    const agents = await agentRepo.listGlobal()
    return Response.json({ agents })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  try {
    const body = await req.json()
    const { name, description, systemPrompt, tools, model } = body
    if (!name || !description || !systemPrompt || !Array.isArray(tools)) {
      return Response.json({ error: "Required: name, description, systemPrompt, tools[]" }, { status: 400 })
    }
    const agent = await agentRepo.create({ userId: null, name, description, systemPrompt, tools, model })
    return Response.json({ ok: true, agent })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}
