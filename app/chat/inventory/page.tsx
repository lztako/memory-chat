import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

type Row = Record<string, string>

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const files = await prisma.userFile.findMany({
    where: { userId: user.id, fileType: { in: ["product", "other"] } },
    orderBy: { updatedAt: "desc" },
  })

  const totalRows = files.reduce((s, f) => s + f.rowCount, 0)

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "20px 28px 16px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", margin: 0, letterSpacing: "-.02em" }}>
            Inventory
          </h1>
          <p style={{ fontSize: 12, color: "var(--text3)", margin: "3px 0 0" }}>
            {files.length > 0 ? `${totalRows.toLocaleString()} records across ${files.length} file${files.length !== 1 ? "s" : ""}` : "No inventory files uploaded yet"}
          </p>
        </div>
        <Link
          href="/chat"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 7,
            background: "var(--accent)", color: "#0d1117",
            fontSize: 12, fontWeight: 600, textDecoration: "none",
            letterSpacing: "-.01em",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Ask AI
        </Link>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
        {files.length === 0 ? (
          <EmptyState
            label="No inventory data"
            hint="Upload a product or inventory CSV file to see your data here"
            href="/settings"
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {files.map((file) => {
              const rows = (file.data as Row[]).slice(0, 50)
              const columns = file.columns as string[]
              return (
                <FileCard
                  key={file.id}
                  fileName={file.fileName}
                  fileType={file.fileType}
                  rowCount={file.rowCount}
                  columns={columns}
                  rows={rows}
                  updatedAt={file.updatedAt}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function FileCard({ fileName, fileType, rowCount, columns, rows, updatedAt }: {
  fileName: string
  fileType: string
  rowCount: number
  columns: string[]
  rows: Row[]
  updatedAt: Date
}) {
  const displayCols = columns.slice(0, 8)
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{fileName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>
            {rowCount.toLocaleString()} rows · {updatedAt.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
            background: "var(--accent-dim)", color: "var(--accent)", letterSpacing: ".02em",
          }}>
            {fileType}
          </span>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--surface2)" }}>
              {displayCols.map((col) => (
                <th key={col} style={{
                  padding: "8px 12px", textAlign: "left",
                  color: "var(--text3)", fontWeight: 500,
                  borderBottom: "1px solid var(--border)",
                  whiteSpace: "nowrap", letterSpacing: ".02em", fontSize: 11,
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
                {displayCols.map((col) => (
                  <td key={col} style={{
                    padding: "7px 12px", color: "var(--text2)",
                    whiteSpace: "nowrap", maxWidth: 200,
                    overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {row[col] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rowCount > 50 && (
        <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--text3)" }}>
          Showing 50 of {rowCount.toLocaleString()} rows · Ask AI for deeper analysis
        </div>
      )}
    </div>
  )
}

function EmptyState({ label, hint, href }: { label: string; hint: string; href: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "60px 20px", gap: 12,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: "var(--surface)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text2)" }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>{hint}</div>
      </div>
      <Link
        href={href}
        style={{
          fontSize: 12, padding: "6px 14px", borderRadius: 6,
          border: "1px solid var(--border)", color: "var(--text2)",
          textDecoration: "none", marginTop: 4,
        }}
      >
        Go to Settings
      </Link>
    </div>
  )
}
