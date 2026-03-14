import { checkAuth } from "@/lib/admin/auth"
import { skillRepo } from "@/lib/repositories/skill.repo"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id: userId } = await params
  const skills = await skillRepo.listByUser(userId)
  return Response.json({ skills })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id: userId } = await params
  const { name, trigger, solution, tools } = await req.json() as {
    name: string; trigger: string; solution: string; tools?: string[]
  }
  if (!name?.trim() || !trigger?.trim() || !solution?.trim()) {
    return new Response("name, trigger, solution required", { status: 400 })
  }
  const skill = await skillRepo.create({
    userId,
    name: name.trim(),
    trigger: trigger.trim(),
    solution: solution.trim(),
    tools: tools ?? [],
  })
  return Response.json({ skill }, { status: 201 })
}
