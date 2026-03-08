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
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        {artifacts.length > 1 && (
          <>
            <button
              onClick={() => onNavigate(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-lg leading-none"
            >
              ‹
            </button>
            <span className="text-xs text-gray-400 tabular-nums">
              {currentIndex + 1}/{artifacts.length}
            </span>
            <button
              onClick={() => onNavigate(currentIndex + 1)}
              disabled={currentIndex === artifacts.length - 1}
              className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-lg leading-none"
            >
              ›
            </button>
            <div className="w-px h-4 bg-gray-200" />
          </>
        )}
        <h3 className="flex-1 font-medium text-sm text-gray-800 truncate">
          {artifact.title}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-sm ml-2"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
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
    return <p className="text-sm text-gray-400">ไม่มีข้อมูล</p>
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={Math.max(240, items.length * 36)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={160}
            tick={{ fontSize: 11, fill: "#374151" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(val) => [
              `${Number(val).toLocaleString()} ${unit}`,
              "",
            ]}
            contentStyle={{
              fontSize: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          />
          <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
      {unit && (
        <p className="text-xs text-gray-400 text-right mt-1">unit: {unit}</p>
      )}
    </div>
  )
}

// ─── Table ───────────────────────────────────────────────────────────────────

function TableView({ data }: { data: Record<string, unknown> }) {
  const columns = (data.columns as string[]) ?? []
  const rows = (data.rows as Array<Array<string | number>>) ?? []

  if (columns.length === 0) {
    return <p className="text-sm text-gray-400">ไม่มีข้อมูล</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col, i) => (
              <th
                key={i}
                className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="py-2 px-3 text-gray-700 text-xs border-b border-gray-100"
                >
                  {typeof cell === "number" ? cell.toLocaleString() : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-2 text-right">{rows.length} rows</p>
    </div>
  )
}

// ─── Markdown ────────────────────────────────────────────────────────────────

function MarkdownView({ data }: { data: Record<string, unknown> }) {
  const content = (data.content as string) ?? ""
  return (
    <div className="markdown-content text-sm text-gray-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
