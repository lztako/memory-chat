import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkAuth } from "@/lib/admin/auth"

// GET /api/admin/users/[id]/files/[fileId]/data — return full JSONB data for download
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })

  const { id: userId, fileId } = await params

  const file = await prisma.userFile.findFirst({
    where: { id: fileId, userId },
    select: { columns: true, data: true },
  })

  if (!file) return Response.json({ error: "ไม่พบไฟล์" }, { status: 404 })

  return Response.json({ columns: file.columns, data: file.data })
}
