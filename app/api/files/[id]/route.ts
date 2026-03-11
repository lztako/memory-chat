import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Papa from "papaparse"
import { fileRepo } from "@/lib/repositories/file.repo"

const MAX_ROWS = 500
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

// PUT /api/files/[id] — replace existing file content (keeps same fileId)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Verify file belongs to user
  const existing = await fileRepo.getById(id, user.id)
  if (!existing) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "ไม่พบไฟล์ใหม่" }, { status: 400 })

  const fileType = (formData.get("fileType") as string | null) ?? existing.fileType
  const description = (formData.get("description") as string | null) ?? existing.description ?? undefined

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "ไฟล์ต้องไม่เกิน 5MB" }, { status: 400 })
  }

  const text = await file.text()
  const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true })

  if (result.data.length === 0) {
    return NextResponse.json({ error: "ไม่พบข้อมูลในไฟล์" }, { status: 400 })
  }

  const rows = result.data.slice(0, MAX_ROWS)
  const columns = result.meta.fields ?? []

  try {
    await fileRepo.replace(id, user.id, {
      fileName: file.name,
      fileType,
      description,
      mimeType: file.type || "text/csv",
      size: file.size,
      rowCount: rows.length,
      columns,
      data: rows,
    })

    return NextResponse.json({ id, fileName: file.name, fileType, description, rowCount: rows.length, columns })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}
