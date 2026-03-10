import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

// Vercel Cron: runs daily at 00:05 UTC
// Protected by CRON_SECRET env var (set in Vercel project settings)
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const { count } = await prisma.memory.deleteMany({
    where: {
      layer: "daily_log",
      createdAt: { lt: today },
    },
  })

  return Response.json({
    ok: true,
    deleted: count,
    date: new Date().toISOString(),
  })
}
