import { createClient } from "@/lib/supabase/server"
import { storeAttachedFile } from "@/lib/session/attached-files"
import Papa from "papaparse"
import { randomUUID } from "crypto"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const conversationId = formData.get("conversationId") as string | null

  if (!file || !conversationId) {
    return Response.json({ error: "Missing file or conversationId" }, { status: 400 })
  }

  const fileName = file.name
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""

  if (!["csv", "txt", "json"].includes(ext)) {
    return Response.json(
      { error: "รองรับเฉพาะ CSV, TXT, JSON — Image จะถูกส่งโดยตรงในข้อความ" },
      { status: 400 }
    )
  }

  const text = await file.text()
  const id = randomUUID()

  if (ext === "csv") {
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    })
    const data = result.data
    const columns = result.meta.fields ?? []
    storeAttachedFile(conversationId, {
      id,
      fileName,
      fileType: "csv",
      columns,
      data,
      rowCount: data.length,
    })
    return Response.json({ id, fileName, fileType: "csv", columns, rowCount: data.length })
  }

  if (ext === "json") {
    let data: Record<string, unknown>[]
    try {
      const parsed = JSON.parse(text)
      data = Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    storeAttachedFile(conversationId, {
      id,
      fileName,
      fileType: "json",
      columns,
      data,
      rowCount: data.length,
    })
    return Response.json({ id, fileName, fileType: "json", columns, rowCount: data.length })
  }

  // txt
  storeAttachedFile(conversationId, {
    id,
    fileName,
    fileType: "txt",
    rawText: text,
    data: [],
    rowCount: 0,
  })
  return Response.json({ id, fileName, fileType: "txt", length: text.length })
}
