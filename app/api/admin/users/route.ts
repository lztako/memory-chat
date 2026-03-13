import { prisma } from "@/lib/prisma"
import { checkAuth } from "@/lib/admin/auth"

export async function GET(req: Request) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { files: true, skills: true, memories: true, tasks: true },
        },
      },
    })

    return Response.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt,
        stats: {
          files: u._count.files,
          skills: u._count.skills,
          memories: u._count.memories,
          tasks: u._count.tasks,
        },
      }))
    )
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    )
  }
}
