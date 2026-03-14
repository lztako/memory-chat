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

  // ── SQL JSONB query engine — Phase 1+2 ────────────────────────────────
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
    // Phase 2: JOIN + window functions
    joinFile?: {
      fileId: string
      allowedCols: string[]
      on: string | [string, string]   // "customer" or ["customer","client_name"]
      type?: "inner" | "left"
      columns?: string[]              // columns to bring from joined file
    }
    windowFns?: Array<{
      fn: "rank" | "dense_rank" | "row_number" | "sum" | "avg" | "lag" | "lead"
      column?: string                 // required for sum/avg/lag/lead
      partitionBy?: string | string[]
      orderBy?: string                // "col asc" or "col desc"
      alias: string
    }>
  }): Promise<{
    columns: string[]
    data: Record<string, string>[]
    filtered: number
    returned: number
  }> {
    const {
      fileId, userId, allowedCols,
      filter, groupBy, aggregate, having, orderBy, limit, columns,
      joinFile, windowFns,
    } = params

    const vals: unknown[] = [fileId, userId]
    let p = 3 // $1=fileId, $2=userId, next starts at $3

    const groupCols = groupBy ? (Array.isArray(groupBy) ? groupBy : [groupBy]) : []
    const hasAgg = !!(aggregate?.length)
    const hasJoin = !!joinFile
    const hasWin = !!(windowFns?.length)

    // ── Main file column declarations ────────────────────────────────────
    const mainColDecls = allowedCols.map(c => `${pgId(c)} TEXT`).join(", ")

    // ── WHERE clause (on main file rows) ─────────────────────────────────
    let whereSQL = ""
    if (filter) {
      const res = buildFilterSQL(filter, allowedCols, "r.", p)
      whereSQL = `AND (${res.sql})`
      vals.push(...res.vals)
      p = res.pEnd
    }

    // ── JOIN file setup ───────────────────────────────────────────────────
    let joinFileParamIdx = -1
    let joinColDecls = ""
    let joinOnSQL = ""
    let joinCols: string[] = []
    if (hasJoin) {
      vals.push(joinFile!.fileId, userId)
      joinFileParamIdx = p
      p += 2

      const jf = joinFile!
      joinColDecls = jf.allowedCols.map(c => `${pgId(c)} TEXT`).join(", ")

      // columns to select from join file
      joinCols = jf.columns?.length
        ? jf.columns.filter(c => jf.allowedCols.includes(c))
        : jf.allowedCols

      // ON condition
      const [mainOn, joinOn] = Array.isArray(jf.on) ? jf.on : [jf.on, jf.on]
      safeCol(mainOn, allowedCols)
      safeCol(joinOn, jf.allowedCols)
      joinOnSQL = `LOWER(m.${pgId(mainOn)}) = LOWER(j.${pgId(joinOn)})`
    }

    // ── SELECT, GROUP BY, window functions ───────────────────────────────
    // For non-JOIN: columns referenced as r.col
    // For JOIN: combined CTE flattens all cols — outer query uses bare col names
    const allCols = hasJoin ? [...allowedCols, ...joinCols] : allowedCols
    const colRef = (col: string) => hasJoin ? pgId(col) : `r.${pgId(col)}`

    let selectParts: string[]
    if (!hasAgg) {
      const pickCols = columns?.length ? columns.filter(c => allCols.includes(c)) : allCols
      selectParts = pickCols.map(colRef)
    } else {
      selectParts = groupCols.map(c => {
        if (!allCols.includes(c)) throw new Error(`groupBy column "${c}" not found in any file`)
        return colRef(c)
      })
      for (const { column, fn } of aggregate!) {
        if (!allCols.includes(column)) throw new Error(`aggregate column "${column}" not found in any file`)
        selectParts.push(`${aggFnSQL(fn, colRef(column))} AS ${pgId(`${column}_${fn}`)}`)
      }
    }

    // window functions
    if (hasWin) {
      for (const wf of windowFns!) {
        safeAlias(wf.alias)
        const overParts: string[] = []
        if (wf.partitionBy) {
          const pbCols = Array.isArray(wf.partitionBy) ? wf.partitionBy : [wf.partitionBy]
          overParts.push(`PARTITION BY ${pbCols.map(colRef).join(", ")}`)
        }
        if (wf.orderBy) {
          const [obCol, obDir] = wf.orderBy.trim().split(/\s+/)
          const dir = obDir?.toLowerCase() === "desc" ? "DESC" : "ASC"
          if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(obCol)) {
            const obExpr = allCols.includes(obCol) ? colRef(obCol) : pgId(obCol)
            overParts.push(`ORDER BY ${obExpr} ${dir}`)
          }
        }
        const over = `OVER (${overParts.join(" ")})`
        let winExpr: string
        switch (wf.fn) {
          case "rank":       winExpr = `RANK() ${over}`; break
          case "dense_rank": winExpr = `DENSE_RANK() ${over}`; break
          case "row_number": winExpr = `ROW_NUMBER() ${over}`; break
          default: {
            if (!wf.column) throw new Error(`window fn "${wf.fn}" requires column`)
            if (!allCols.includes(wf.column)) throw new Error(`window column "${wf.column}" not found`)
            const castExpr = `CAST(NULLIF(${colRef(wf.column)},'') AS NUMERIC)`
            winExpr = `${wf.fn.toUpperCase()}(${castExpr}) ${over}`
          }
        }
        selectParts.push(`${winExpr} AS ${pgId(wf.alias)}`)
      }
    }
    selectParts.push(`COUNT(*) OVER() AS "__filtered"`)

    // GROUP BY
    const groupBySQL = groupCols.length
      ? `GROUP BY ${groupCols.map(colRef).join(", ")}`
      : ""

    // HAVING
    let havingSQL = ""
    if (having && hasAgg) {
      const res = buildFilterSQL(having, [], "", p)
      havingSQL = `HAVING ${res.sql}`
      vals.push(...res.vals)
      p = res.pEnd
    }

    // ORDER BY
    let orderBySQL = ""
    if (orderBy) {
      const [obCol, obDir] = orderBy.trim().split(/\s+/)
      const dir = obDir?.toLowerCase() === "desc" ? "DESC" : "ASC"
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(obCol)) {
        orderBySQL = `ORDER BY ${pgId(obCol)} ${dir}`
      }
    }

    // LIMIT
    const limitVal = limit ?? 50
    vals.push(limitVal)
    const limitSQL = `LIMIT $${p}`

    // ── Assemble SQL ──────────────────────────────────────────────────────
    let sql: string

    if (hasJoin) {
      const jf = joinFile!
      const joinType = jf.type === "left" ? "LEFT JOIN" : "INNER JOIN"
      const joinSelectCols = joinCols.map(c => `j.${pgId(c)}`).join(", ")

      sql = `
        WITH main AS (
          SELECT r.*
          FROM "UserFile" f
          CROSS JOIN LATERAL jsonb_to_recordset(f.data) AS r(${mainColDecls})
          WHERE f.id = $1 AND f."userId" = $2
          ${whereSQL}
        ),
        joined_file AS (
          SELECT r.*
          FROM "UserFile" f
          CROSS JOIN LATERAL jsonb_to_recordset(f.data) AS r(${joinColDecls})
          WHERE f.id = $${joinFileParamIdx} AND f."userId" = $${joinFileParamIdx + 1}
        ),
        combined AS (
          SELECT m.*, ${joinSelectCols}
          FROM main m
          ${joinType} joined_file j ON ${joinOnSQL}
        )
        SELECT ${selectParts.join(", ")}
        FROM combined
        ${groupBySQL}
        ${havingSQL}
        ${orderBySQL}
        ${limitSQL}
      `
    } else {
      sql = `
        SELECT ${selectParts.join(", ")}
        FROM "UserFile" f
        CROSS JOIN LATERAL jsonb_to_recordset(f.data) AS r(${mainColDecls})
        WHERE f.id = $1 AND f."userId" = $2
        ${whereSQL}
        ${groupBySQL}
        ${havingSQL}
        ${orderBySQL}
        ${limitSQL}
      `
    }

    const rawRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...vals)

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

// ── SQL builder helpers ───────────────────────────────────────────────────────

function pgId(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

function safeCol(col: string, allowed: string[]): string {
  const t = col.trim()
  if (allowed.length && !allowed.includes(t)) throw new Error(`Column "${t}" not in file`)
  return t
}

function safeAlias(alias: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias.trim())) throw new Error(`Invalid alias: "${alias}"`)
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
  prefix: string,
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
