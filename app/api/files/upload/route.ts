import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Papa from "papaparse"
import { fileRepo } from "@/lib/repositories/file.repo"
import { parseXlsx } from "@/lib/parsers/xlsx"

const MAX_ROWS = 500
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB (xlsx มักใหญ่กว่า CSV)

const XLSX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
])

function isXlsx(file: File): boolean {
  return (
    XLSX_MIME_TYPES.has(file.type) ||
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls")
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 })
  const fileType = (formData.get("fileType") as string | null) ?? "other"
  const description = (formData.get("description") as string | null) ?? undefined

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "ไฟล์ต้องไม่เกิน 10MB" }, { status: 400 })
  }

  let rows: Record<string, unknown>[]
  let columns: string[]

  if (isXlsx(file)) {
    // --- xlsx / xls path ---
    const buffer = Buffer.from(await file.arrayBuffer())
    let parsed
    try {
      parsed = parseXlsx(buffer, MAX_ROWS)
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "parse xlsx error" },
        { status: 400 }
      )
    }
    rows = parsed.primary.rows
    columns = parsed.primary.columns
  } else {
    // --- CSV path (เดิม) ---
    const text = await file.text()
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    })
    if (result.data.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลในไฟล์ กรุณาตรวจสอบว่าเป็น CSV ที่มี header" },
        { status: 400 }
      )
    }
    rows = result.data.slice(0, MAX_ROWS)
    columns = result.meta.fields ?? []
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "ไม่พบข้อมูลในไฟล์" }, { status: 400 })
  }

  try {
    const saved = await fileRepo.create({
      userId: user.id,
      fileName: file.name,
      fileType,
      description,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      rowCount: rows.length,
      columns,
      data: rows,
    })

    return NextResponse.json({
      id: saved.id,
      fileName: saved.fileName,
      fileType: saved.fileType,
      description: saved.description,
      rowCount: saved.rowCount,
      columns,
    })
  } catch (err) {
    console.error("[upload] DB error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "DB error" },
      { status: 500 }
    )
  }
}
