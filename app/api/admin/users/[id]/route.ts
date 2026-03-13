import { prisma } from "@/lib/prisma"
import { checkAuth } from "@/lib/admin/auth"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })

  const { id: userId } = await params

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        files: {
          select: { id: true, fileName: true, fileType: true, description: true, rowCount: true, columns: true, size: true, createdAt: true, updatedAt: true },
          orderBy: { createdAt: "desc" },
        },
        skills: {
          select: { id: true, name: true, trigger: true, solution: true, tools: true, usageCount: true, createdAt: true },
          orderBy: { usageCount: "desc" },
        },
        memories: {
          where: { type: { not: "user_config" } },
          select: { id: true, type: true, content: true, importance: true, layer: true, createdAt: true },
          orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
        },
        tasks: {
          select: { id: true, title: true, status: true, priority: true, dueDate: true, linkedCompany: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
        dashboard: { select: { widgets: true, updatedAt: true } },
      },
    })

    if (!user) return Response.json({ error: "User not found" }, { status: 404 })

    return Response.json(user)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    )
  }
}
