import { NextRequest } from "next/server"
import Papa from "papaparse"
import { fileRepo } from "@/lib/repositories/file.repo"
import { checkAuth } from "@/lib/admin/auth"

const MAX_ROWS = 500
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) return new Response("Unauthorized", { status: 401 })

  const { id: userId } = await params

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return Response.json({ error: "ไม่พบไฟล์" }, { status: 400 })

  const fileType = (formData.get("fileType") as string | null) ?? "other"
  const description = (formData.get("description") as string | null) ?? undefined

  if (file.size > MAX_SIZE_BYTES) {
    return Response.json({ error: "ไฟล์ต้องไม่เกิน 5MB" }, { status: 400 })
  }

  const text = await file.text()
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  })

  if (result.data.length === 0) {
    return Response.json({ error: "ไม่พบข้อมูลในไฟล์" }, { status: 400 })
  }

  const rows = result.data.slice(0, MAX_ROWS)
  const columns = result.meta.fields ?? []

  try {
    const saved = await fileRepo.create({
      userId,
      fileName: file.name,
      fileType,
      description,
      mimeType: file.type || "text/csv",
      size: file.size,
      rowCount: rows.length,
      columns,
      data: rows,
    })

    return Response.json({
      id: saved.id,
      fileName: saved.fileName,
      fileType: saved.fileType,
      description: saved.description,
      rowCount: saved.rowCount,
      columns,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    )
  }
}
