import * as XLSX from "xlsx"

export interface ParsedSheet {
  name: string
  headerRow: number       // 0-based index ของ row ที่เป็น header จริง
  columns: string[]       // column names หลัง detect
  rows: Record<string, unknown>[]  // data rows (ไม่รวม header)
  rawSample: unknown[][]  // 10 rows แรก (raw) สำหรับ debug
}

export interface XlsxParseResult {
  sheets: ParsedSheet[]
  primary: ParsedSheet    // sheet แรกที่มีข้อมูล
}

/**
 * ตรวจจับ header row โดยหา row ที่มี text cells หนาแน่นที่สุด
 * รองรับ: title rows, logo rows, empty rows ก่อน header
 */
function detectHeaderRow(rawRows: unknown[][]): number {
  if (rawRows.length === 0) return 0

  let bestRow = 0
  let bestScore = -1

  // scan แค่ 20 rows แรก (header ไม่ควรอยู่ลึกกว่านั้น)
  const scanLimit = Math.min(20, rawRows.length)

  for (let i = 0; i < scanLimit; i++) {
    const row = rawRows[i]
    if (!Array.isArray(row)) continue

    // นับ cells ที่เป็น string (ไม่ใช่ตัวเลข, ไม่ใช่ null/undefined)
    const textCells = row.filter(
      (cell) => cell !== null && cell !== undefined && cell !== "" && typeof cell === "string"
    ).length

    // หา total non-empty cells
    const nonEmpty = row.filter((cell) => cell !== null && cell !== undefined && cell !== "").length

    // score = จำนวน text cells + bonus ถ้า text ratio สูง
    const textRatio = nonEmpty > 0 ? textCells / nonEmpty : 0
    const score = textCells + (textRatio > 0.7 ? nonEmpty : 0)

    if (score > bestScore) {
      bestScore = score
      bestRow = i
    }
  }

  return bestRow
}

/**
 * แปลง raw rows เป็น array of objects โดยใช้ headerRow เป็น key
 */
function buildRows(
  rawRows: unknown[][],
  headerRowIndex: number
): { columns: string[]; rows: Record<string, unknown>[] } {
  const headerRow = rawRows[headerRowIndex]
  if (!Array.isArray(headerRow)) return { columns: [], rows: [] }

  // clean column names: trim, deduplicate ถ้าซ้ำกัน
  const columns: string[] = headerRow.map((cell, idx) => {
    const name = cell !== null && cell !== undefined && cell !== ""
      ? String(cell).trim()
      : `col_${idx}`
    return name
  })

  // deduplicate columns ที่ชื่อซ้ำกัน
  const seen: Record<string, number> = {}
  const uniqueColumns = columns.map((col) => {
    if (seen[col] !== undefined) {
      seen[col]++
      return `${col}_${seen[col]}`
    }
    seen[col] = 0
    return col
  })

  // build data rows (skip header + empty rows)
  const rows: Record<string, unknown>[] = []
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const raw = rawRows[i]
    if (!Array.isArray(raw)) continue

    // skip rows ที่ว่างทั้งหมด
    const hasData = raw.some((cell) => cell !== null && cell !== undefined && cell !== "")
    if (!hasData) continue

    const obj: Record<string, unknown> = {}
    uniqueColumns.forEach((col, idx) => {
      obj[col] = raw[idx] ?? null
    })
    rows.push(obj)
  }

  return { columns: uniqueColumns, rows }
}

/**
 * Parse xlsx/xls buffer → structured data
 * MAX_ROWS คือ limit สำหรับ data rows (ไม่รวม header)
 */
export function parseXlsx(buffer: Buffer, maxRows = 500): XlsxParseResult {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    dense: true,       // dense mode เร็วกว่า sparse สำหรับไฟล์ใหญ่
    cellDates: true,   // แปลง date serial → JS Date อัตโนมัติ
    cellNF: false,     // ไม่ต้องการ number format string
    cellHTML: false,   // ไม่ต้องการ HTML
  })

  const sheets: ParsedSheet[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue

    // แปลงเป็น raw 2D array (header: 1 = no assumed header)
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
    }) as unknown[][]

    if (rawRows.length === 0) continue

    const headerRowIndex = detectHeaderRow(rawRows)
    const { columns, rows } = buildRows(rawRows, headerRowIndex)

    if (columns.length === 0) continue

    sheets.push({
      name: sheetName,
      headerRow: headerRowIndex,
      columns,
      rows: rows.slice(0, maxRows),
      rawSample: rawRows.slice(0, 10),
    })
  }

  if (sheets.length === 0) {
    throw new Error("ไม่พบข้อมูลในไฟล์ xlsx")
  }

  return {
    sheets,
    primary: sheets[0],
  }
}
