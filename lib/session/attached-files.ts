export interface AttachedFile {
  id: string
  fileName: string
  fileType: "csv" | "json" | "txt" | "xlsx"
  columns?: string[]
  data: Record<string, unknown>[]
  rawText?: string
  rowCount: number
  attachedAt: number
  // xlsx only — info about all sheets (primary sheet data is in `data` above)
  sheets?: Array<{ name: string; rowCount: number; columns: string[] }>
}

const store = new Map<string, AttachedFile[]>()
const TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

// Cleanup expired sessions every hour
setInterval(() => {
  const now = Date.now()
  for (const [convId, files] of store.entries()) {
    const hasRecent = files.some((f) => now - f.attachedAt < TTL_MS)
    if (!hasRecent) store.delete(convId)
  }
}, 60 * 60 * 1000)

export function storeAttachedFile(
  conversationId: string,
  file: Omit<AttachedFile, "attachedAt">
): void {
  const existing = store.get(conversationId) ?? []
  const idx = existing.findIndex((f) => f.id === file.id)
  const entry: AttachedFile = { ...file, attachedAt: Date.now() }
  if (idx >= 0) existing[idx] = entry
  else existing.push(entry)
  store.set(conversationId, existing)
}

export function getAttachedFiles(conversationId: string): AttachedFile[] {
  return store.get(conversationId) ?? []
}

type QueryResult =
  | { rows: Record<string, unknown>[]; total: number; returned: number }
  | { text: string }
  | { error: string }

export function queryAttachedFile(
  conversationId: string,
  fileId: string,
  options: { filter?: string; limit?: number; offset?: number }
): QueryResult {
  const files = store.get(conversationId) ?? []
  const file = files.find((f) => f.id === fileId)
  if (!file) return { error: "ไม่พบไฟล์นี้ใน session — อาจหมดอายุหรือ fileId ไม่ถูกต้อง" }

  if (file.rawText !== undefined) return { text: file.rawText }

  let rows = file.data
  if (options.filter) {
    rows = applyFilter(rows, options.filter)
  }

  const total = rows.length
  const offset = options.offset ?? 0
  const limit = options.limit ?? 50
  const sliced = rows.slice(offset, offset + limit)

  return { rows: sliced, total, returned: sliced.length }
}

function applyFilter(
  rows: Record<string, unknown>[],
  filter: string
): Record<string, unknown>[] {
  const match = filter.match(/^(.+?)\s*(>=|<=|!=|>|<|=|contains)\s*(.+)$/)
  if (!match) return rows
  const [, colRaw, op, rawVal] = match
  const col = colRaw.trim()
  const val = rawVal.trim().replace(/^["']|["']$/g, "")

  return rows.filter((row) => {
    const cellVal = row[col]
    if (cellVal === undefined) return false
    const strCell = String(cellVal).toLowerCase()
    const strVal = val.toLowerCase()
    const numCell = parseFloat(String(cellVal))
    const numVal = parseFloat(val)

    switch (op) {
      case "=":
        return strCell === strVal
      case "!=":
        return strCell !== strVal
      case ">":
        return !isNaN(numCell) && !isNaN(numVal) && numCell > numVal
      case "<":
        return !isNaN(numCell) && !isNaN(numVal) && numCell < numVal
      case ">=":
        return !isNaN(numCell) && !isNaN(numVal) && numCell >= numVal
      case "<=":
        return !isNaN(numCell) && !isNaN(numVal) && numCell <= numVal
      case "contains":
        return strCell.includes(strVal)
      default:
        return true
    }
  })
}
