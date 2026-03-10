"use client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export interface Artifact {
  id: string
  type: "chart_bar" | "table" | "markdown"
  title: string
  data: Record<string, unknown>
}

interface Props {
  artifacts: Artifact[]
  currentIndex: number
  onNavigate: (index: number) => void
  onClose: () => void
}

export function ArtifactPanel({ artifacts, currentIndex, onNavigate, onClose }: Props) {
  const artifact = artifacts[currentIndex]
  if (!artifact) return null

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "10px 14px",
        borderBottom: "1.5px solid var(--border)",
        flexShrink: 0,
      }}>
        {artifacts.length > 1 && (
          <>
            <button
              onClick={() => onNavigate(currentIndex - 1)}
              disabled={currentIndex === 0}
              style={{ background: "none", border: "none", cursor: currentIndex === 0 ? "default" : "pointer", fontSize: 18, color: "var(--text3)", lineHeight: 1, padding: "0 2px", opacity: currentIndex === 0 ? 0.3 : 1 }}
            >‹</button>
            <span style={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)", tabularNums: true } as React.CSSProperties}>
              {currentIndex + 1}/{artifacts.length}
            </span>
            <button
              onClick={() => onNavigate(currentIndex + 1)}
              disabled={currentIndex === artifacts.length - 1}
              style={{ background: "none", border: "none", cursor: currentIndex === artifacts.length - 1 ? "default" : "pointer", fontSize: 18, color: "var(--text3)", lineHeight: 1, padding: "0 2px", opacity: currentIndex === artifacts.length - 1 ? 0.3 : 1 }}
            >›</button>
            <div style={{ width: 1, height: 14, background: "var(--border)", margin: "0 2px" }} />
          </>
        )}
        <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {artifact.title}
        </span>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text3)", marginLeft: 4, lineHeight: 1 }}
        >✕</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {artifact.type === "chart_bar" && <BarChartView data={artifact.data} />}
        {artifact.type === "table" && <TableView data={artifact.data} />}
        {artifact.type === "markdown" && <MarkdownView data={artifact.data} />}
      </div>
    </div>
  )
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────

function BarChartView({ data }: { data: Record<string, unknown> }) {
  const items = (data.items as Array<{ label: string; value: number }>) ?? []
  const unit = (data.unit as string) ?? ""
  const chartData = items.map((item) => ({ name: item.label, value: item.value }))

  if (items.length === 0) {
    return <p style={{ fontSize: 12, color: "var(--text3)" }}>ไม่มีข้อมูล</p>
  }

  return (
    <div style={{ width: "100%" }}>
      <ResponsiveContainer width="100%" height={Math.max(240, items.length * 36)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--text3)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={160}
            tick={{ fontSize: 11, fill: "var(--text2)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(val) => [`${Number(val).toLocaleString()} ${unit}`, ""]}
            contentStyle={{
              fontSize: 12,
              border: "1.5px solid var(--border)",
              borderRadius: 6,
              background: "var(--surface)",
              color: "var(--text)",
              boxShadow: "0 4px 12px rgba(42,40,37,.08)",
            }}
          />
          <Bar dataKey="value" fill="var(--accent)" radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
      {unit && (
        <p style={{ fontSize: 10, color: "var(--text3)", textAlign: "right", marginTop: 4, fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
          unit: {unit}
        </p>
      )}
    </div>
  )
}

// ─── Table ───────────────────────────────────────────────────────────────────

function TableView({ data }: { data: Record<string, unknown> }) {
  const columns = (data.columns as string[]) ?? []
  const rows = (data.rows as Array<Array<string | number>>) ?? []

  if (columns.length === 0) {
    return <p style={{ fontSize: 12, color: "var(--text3)" }}>ไม่มีข้อมูล</p>
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1.5px solid var(--border)" }}>
            {columns.map((col, i) => (
              <th
                key={i}
                style={{
                  textAlign: "left", padding: "6px 10px",
                  fontSize: 9, fontWeight: 600,
                  fontFamily: "var(--font-ibm-plex-mono), monospace",
                  color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em",
                  whiteSpace: "nowrap",
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "var(--bg)" : "var(--surface)" }}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: "6px 10px", color: "var(--text2)",
                    fontSize: 11, borderBottom: "1px solid var(--border)",
                  }}
                >
                  {typeof cell === "number" ? cell.toLocaleString() : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 6, textAlign: "right", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
        {rows.length} rows
      </p>
    </div>
  )
}

// ─── Markdown ────────────────────────────────────────────────────────────────

function MarkdownView({ data }: { data: Record<string, unknown> }) {
  const content = (data.content as string) ?? ""
  return (
    <div className="markdown-content" style={{ fontSize: 13, color: "var(--text)" }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
