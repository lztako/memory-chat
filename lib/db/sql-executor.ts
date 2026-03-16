import { prisma } from "@/lib/prisma"

const FORBIDDEN_PATTERNS = [
  /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|EXEC|EXECUTE)\b/i,
  /--/,                      // SQL comment injection
  /;.*\S/,                   // multiple statements
  /\bpg_/i,                  // system tables
  /\binformation_schema\b/i, // schema introspection
]

const MAX_ROWS = 500
const TIMEOUT_MS = 8_000

export async function executeSql(
  query: string,
  userId: string
): Promise<{ rows: unknown[]; rowCount: number; truncated: boolean }> {
  // 1. SELECT only
  if (!query.trim().toUpperCase().startsWith("SELECT")) {
    throw new Error("Only SELECT queries are allowed")
  }

  // 2. No forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(query)) {
      throw new Error("Query contains forbidden patterns")
    }
  }

  // 3. Must scope to userId
  if (!query.includes("$1")) {
    throw new Error('Query must filter by userId — include WHERE "userId" = $1')
  }

  // 4. Wrap with row limit to prevent runaway queries
  const limitedQuery = `WITH __result AS (${query}) SELECT * FROM __result LIMIT ${MAX_ROWS + 1}`

  // 5. Execute with timeout
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Query timeout (${TIMEOUT_MS / 1000}s)`)), TIMEOUT_MS)
  )

  const rows = await Promise.race([
    prisma.$queryRawUnsafe<unknown[]>(limitedQuery, userId),
    timeoutPromise,
  ])

  // Convert BigInt values (from COUNT/SUM) to Number for JSON serialization
  const serialize = (val: unknown): unknown => {
    if (typeof val === "bigint") return Number(val)
    if (val !== null && typeof val === "object") {
      return Object.fromEntries(
        Object.entries(val as Record<string, unknown>).map(([k, v]) => [k, serialize(v)])
      )
    }
    return val
  }
  const safeRows = rows.map(serialize)

  const truncated = safeRows.length > MAX_ROWS
  return {
    rows: truncated ? safeRows.slice(0, MAX_ROWS) : safeRows,
    rowCount: truncated ? MAX_ROWS : safeRows.length,
    truncated,
  }
}
