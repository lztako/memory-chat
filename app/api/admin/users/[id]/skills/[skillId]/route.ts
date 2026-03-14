import { checkAuth } from "@/lib/admin/auth"
import { skillRepo } from "@/lib/repositories/skill.repo"
import { userDocRepo } from "@/lib/repositories/userDoc.repo"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; skillId: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id: userId, skillId } = await params
  const body = await req.json() as Partial<{ name: string; trigger: string; solution: string; tools: string[] }>
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name.trim()
  if (body.trigger !== undefined) data.trigger = body.trigger.trim()
  if (body.solution !== undefined) data.solution = body.solution.trim()
  if (body.tools !== undefined) data.tools = body.tools
  if (Object.keys(data).length === 0) return new Response("No fields to update", { status: 400 })
  await skillRepo.update(skillId, userId, data as Parameters<typeof skillRepo.update>[2])
  return Response.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; skillId: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })
  const { id: userId, skillId } = await params
  await userDocRepo.deleteByParent(userId, skillId)
  await skillRepo.delete(skillId, userId)
  return Response.json({ ok: true })
}
