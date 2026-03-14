import { prisma } from "../prisma"

export const fileRepo = {
  async create(data: {
    userId: string
    fileName: string
    fileType?: string
    description?: string
    mimeType: string
    size: number
    rowCount: number
    columns: string[]
    data: unknown[]
  }) {
    return prisma.userFile.create({ data: { ...data, data: data.data as object[] } })
  },

  async listByUser(userId: string, fileType?: string) {
    return prisma.userFile.findMany({
      where: { userId, ...(fileType ? { fileType } : {}) },
      select: { id: true, fileName: true, fileType: true, description: true, mimeType: true, size: true, rowCount: true, columns: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })
  },

  async listSummaryByUser(userId: string) {
    return prisma.userFile.findMany({
      where: { userId },
      select: { id: true, fileName: true, fileType: true, description: true, rowCount: true, columns: true },
      orderBy: { createdAt: "desc" },
    })
  },

  async getById(id: string, userId: string) {
    return prisma.userFile.findFirst({ where: { id, userId } })
  },

  async getMeta(id: string, userId: string) {
    return prisma.userFile.findFirst({
      where: { id, userId },
      select: { id: true, fileName: true, fileType: true, rowCount: true, columns: true },
    })
  },

  async rename(id: string, userId: string, newName: string) {
    return prisma.userFile.updateMany({ where: { id, userId }, data: { fileName: newName } })
  },

  async replace(id: string, userId: string, data: {
    fileName: string
    fileType?: string
    description?: string
    mimeType: string
    size: number
    rowCount: number
    columns: string[]
    data: unknown[]
  }) {
    return prisma.userFile.updateMany({
      where: { id, userId },
      data: { ...data, data: data.data as object[] },
    })
  },

  async delete(id: string, userId: string) {
    return prisma.userFile.deleteMany({ where: { id, userId } })
  },

  // ── SQL JSONB query engine ──────────────────────────────────────────────
  async querySQLFile(params: {
    fileId: string
    userId: string
    fileName: string
    totalRowCount: number
    allowedCols: string[]
    filter?: string
    groupBy?: string | string[]
    aggregate?: Array<{ column: string; fn: string }>
    having?: string
    orderBy?: string
    limit?: number
    columns?: string[]
  }): Promise<{
    columns: string[]
    data: Record<string, string>[]
    filtered: number
    returned: number
  }> {
    const { fileId, userId, allowedCols, filter, groupBy, aggregate, having, orderBy, limit, columns } = params
    const vals: unknown[] = [fileId, userId]
    let p = 3 // next param index ($1=fileId, $2=userId)

    const groupCols = groupBy ? (Array.isArray(groupBy) ? groupBy : [groupBy]) : []
    const hasAgg = !!(aggregate?.length)

    // ── Column declarations for jsonb_to_recordset ──────────────────────
    const colDecls = allowedCols.map(c => `${pgId(c)} TEXT`).join(", ")

    // ── SELECT clause ────────────────────────────────────────────────────
    let selectParts: string[]
    if (!hasAgg) {
      // raw rows — select specific columns or all
      const pickCols = columns?.length ? columns.filter(c => allowedCols.includes(c)) : allowedCols
      selectParts = pickCols.map(c => `r.${pgId(c)}`)
    } else {
      // groupBy cols first
      selectParts = groupCols.map(c => {
        safeCol(c, allowedCols)
        return `r.${pgId(c)}`
      })
      // aggregate expressions
      for (const { column, fn } of aggregate!) {
        safeCol(column, allowedCols)
        const alias = pgId(`${column}_${fn}`)
        selectParts.push(`${aggFnSQL(fn, `r.${pgId(column)}`)} AS ${alias}`)
      }
    }
    // always include filtered count via window function
    selectParts.push(`COUNT(*) OVER() AS "__filtered"`)

    // ── WHERE clause ─────────────────────────────────────────────────────
    let whereSQL = ""
    if (filter) {
      const res = buildFilterSQL(filter, allowedCols, "r.", p)
      whereSQL = `AND (${res.sql})`
      vals.push(...res.vals)
      p = res.pEnd
    }

    // ── GROUP BY clause ───────────────────────────────────────────────────
    const groupBySQL = groupCols.length
      ? `GROUP BY ${groupCols.map(c => `r.${pgId(c)}`).join(", ")}`
      : ""

    // ── HAVING clause ─────────────────────────────────────────────────────
    let havingSQL = ""
    if (having && hasAgg) {
      const res = buildFilterSQL(having, [], "", p) // no col whitelist — aliases only
      havingSQL = `HAVING ${res.sql}`
      vals.push(...res.vals)
      p = res.pEnd
    }

    // ── ORDER BY clause ───────────────────────────────────────────────────
    let orderBySQL = ""
    if (orderBy) {
      const parts = orderBy.trim().split(/\s+/)
      const col = parts[0]
      const dir = parts[1]?.toLowerCase() === "desc" ? "DESC" : "ASC"
      // allow raw cols or aggregate aliases (alphanumeric + underscore)
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) {
        orderBySQL = `ORDER BY ${pgId(col)} ${dir}`
      }
    }

    // ── LIMIT ─────────────────────────────────────────────────────────────
    const limitVal = limit ?? 50
    vals.push(limitVal)
    const limitSQL = `LIMIT $${p}`
    p++

    // ── Full query ────────────────────────────────────────────────────────
    const sql = `
      SELECT ${selectParts.join(", ")}
      FROM "UserFile" f
      CROSS JOIN LATERAL jsonb_to_recordset(f.data) AS r(${colDecls})
      WHERE f.id = $1 AND f."userId" = $2
      ${whereSQL}
      ${groupBySQL}
      ${havingSQL}
      ${orderBySQL}
      ${limitSQL}
    `

    const rawRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...vals)

    // Extract filtered count + strip __filtered from result
    const filtered = rawRows.length > 0 ? Number(rawRows[0]["__filtered"] ?? 0) : 0
    const data = rawRows.map(row => {
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(row)) {
        if (k === "__filtered") continue
        out[k] = v === null || v === undefined ? "" : String(v)
      }
      return out
    })

    const resultCols = data.length > 0 ? Object.keys(data[0]) : (columns ?? allowedCols)
    return { columns: resultCols, data, filtered, returned: data.length }
  },
}

// ── SQL builder helpers (module-private) ─────────────────────────────────────

function pgId(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

function safeCol(col: string, allowed: string[]): string {
  const t = col.trim()
  if (allowed.length && !allowed.includes(t)) throw new Error(`Column "${t}" not in file`)
  return t
}

function safeAlias(alias: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias.trim())) throw new Error(`Invalid column alias: "${alias}"`)
  return alias.trim()
}

function aggFnSQL(fn: string, colExpr: string): string {
  switch (fn) {
    case "sum":   return `SUM(CAST(NULLIF(${colExpr}, '') AS NUMERIC))`
    case "count": return `COUNT(NULLIF(${colExpr}, ''))`
    case "avg":   return `AVG(CAST(NULLIF(${colExpr}, '') AS NUMERIC))`
    case "min":   return `MIN(CAST(NULLIF(${colExpr}, '') AS NUMERIC))`
    case "max":   return `MAX(CAST(NULLIF(${colExpr}, '') AS NUMERIC))`
    default: throw new Error(`Unknown aggregate function: "${fn}"`)
  }
}

function singleCondSQL(
  cond: string,
  allowed: string[],
  prefix: string, // "r." for WHERE (raw cols), "" for HAVING (aggregate aliases)
  pStart: number
): { sql: string; vals: unknown[]; pEnd: number } {
  const nullM = cond.match(/^(.+?)\s+IS\s+NULL$/i)
  if (nullM) {
    const col = nullM[1].trim()
    if (prefix) {
      const c = safeCol(col, allowed)
      return { sql: `(${prefix}${pgId(c)} IS NULL OR ${prefix}${pgId(c)} = '')`, vals: [], pEnd: pStart }
    }
    return { sql: `${pgId(safeAlias(col))} IS NULL`, vals: [], pEnd: pStart }
  }

  const notNullM = cond.match(/^(.+?)\s+IS\s+NOT\s+NULL$/i)
  if (notNullM) {
    const col = notNullM[1].trim()
    if (prefix) {
      const c = safeCol(col, allowed)
      return { sql: `(${prefix}${pgId(c)} IS NOT NULL AND ${prefix}${pgId(c)} != '')`, vals: [], pEnd: pStart }
    }
    return { sql: `(${pgId(safeAlias(col))} IS NOT NULL AND ${pgId(safeAlias(col))} != '')`, vals: [], pEnd: pStart }
  }

  const opM = cond.match(/^(.+?)\s*(>=|<=|!=|>|<|=|contains)\s*(.+)$/)
  if (!opM) return { sql: "TRUE", vals: [], pEnd: pStart }

  const [, colRaw, op, rawVal] = opM
  const val = rawVal.trim().replace(/^["']|["']$/g, "")
  const pn = pStart

  if (prefix) {
    const c = safeCol(colRaw.trim(), allowed)
    const expr = `${prefix}${pgId(c)}`
    switch (op) {
      case "=":        return { sql: `LOWER(${expr}) = LOWER($${pn})`, vals: [val], pEnd: pn + 1 }
      case "!=":       return { sql: `LOWER(${expr}) != LOWER($${pn})`, vals: [val], pEnd: pn + 1 }
      case ">":        return { sql: `CAST(NULLIF(${expr},'') AS NUMERIC) > $${pn}::numeric`, vals: [val], pEnd: pn + 1 }
      case "<":        return { sql: `CAST(NULLIF(${expr},'') AS NUMERIC) < $${pn}::numeric`, vals: [val], pEnd: pn + 1 }
      case ">=":       return { sql: `CAST(NULLIF(${expr},'') AS NUMERIC) >= $${pn}::numeric`, vals: [val], pEnd: pn + 1 }
      case "<=":       return { sql: `CAST(NULLIF(${expr},'') AS NUMERIC) <= $${pn}::numeric`, vals: [val], pEnd: pn + 1 }
      case "contains": return { sql: `${expr} ILIKE $${pn}`, vals: [`%${val}%`], pEnd: pn + 1 }
      default:         return { sql: "TRUE", vals: [], pEnd: pStart }
    }
  } else {
    // HAVING on aggregate alias — no col whitelist (alias is generated by our code)
    const alias = safeAlias(colRaw.trim())
    switch (op) {
      case "=":  return { sql: `${pgId(alias)} = $${pn}::numeric`, vals: [val], pEnd: pn + 1 }
      case "!=": return { sql: `${pgId(alias)} != $${pn}::numeric`, vals: [val], pEnd: pn + 1 }
      case ">":  return { sql: `${pgId(alias)} > $${pn}::numeric`, vals: [val], pEnd: pn + 1 }
      case "<":  return { sql: `${pgId(alias)} < $${pn}::numeric`, vals: [val], pEnd: pn + 1 }
      case ">=": return { sql: `${pgId(alias)} >= $${pn}::numeric`, vals: [val], pEnd: pn + 1 }
      case "<=": return { sql: `${pgId(alias)} <= $${pn}::numeric`, vals: [val], pEnd: pn + 1 }
      default:   return { sql: "TRUE", vals: [], pEnd: pStart }
    }
  }
}

function buildFilterSQL(
  filterStr: string,
  allowed: string[],
  prefix: string,
  pStart: number
): { sql: string; vals: unknown[]; pEnd: number } {
  const hasOr = /\s+OR\s+/i.test(filterStr)
  const allVals: unknown[] = []
  let p = pStart

  const orBranches = hasOr ? filterStr.split(/\s+OR\s+/i) : [filterStr]
  const branchSqls: string[] = []

  for (const branch of orBranches) {
    const andConds = branch.trim().split(/\s+AND\s+/i)
    const condSqls: string[] = []
    for (const cond of andConds) {
      const res = singleCondSQL(cond.trim(), allowed, prefix, p)
      condSqls.push(res.sql)
      allVals.push(...res.vals)
      p = res.pEnd
    }
    branchSqls.push(andConds.length > 1 ? `(${condSqls.join(" AND ")})` : condSqls[0])
  }

  return { sql: branchSqls.join(" OR "), vals: allVals, pEnd: p }
}
