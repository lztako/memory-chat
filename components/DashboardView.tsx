"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import type { ComputedWidget, ComputedKPI, ComputedBarChart, ComputedDonut, ComputedTable } from "@/app/chat/dashboard/page"

// ── Palette ────────────────────────────────────────────────────────
const PALETTE = ["#2a2825", "#8b7355", "#c4a882", "#e8d5b7", "#6b8e7f", "#a0856b"]

// ── Format helpers ─────────────────────────────────────────────────
function formatValue(value: number, format: string): string {
  if (format === "currency_usd") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
    return `$${value.toFixed(2)}`
  }
  if (format === "number") return value.toLocaleString()
  return String(value)
}

function shortValue(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value}`
}

// ── Status badge ───────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? ""
  let bg = "var(--border)", color = "var(--text2)"
  if (s === "delivered") { bg = "#d1f0e0"; color = "#1a7a46" }
  else if (s === "in transit") { bg = "#dbeafe"; color = "#1d4ed8" }
  else if (s === "pending") { bg = "#fef3c7"; color = "#92400e" }
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 600,
      background: bg, color,
      fontFamily: "var(--font-ibm-plex-mono), monospace",
      letterSpacing: ".03em",
      whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  )
}

// ── KPI Card ───────────────────────────────────────────────────────
function KPICard({ widget }: { widget: ComputedKPI }) {
  const display = formatValue(widget.value, widget.format)
  return (
    <div style={{
      background: "var(--surface)",
      border: "1.5px solid var(--border)",
      borderRadius: 10,
      padding: "20px 22px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      minHeight: 100,
    }}>
      <div style={{
        fontSize: 11,
        fontFamily: "var(--font-ibm-plex-mono), monospace",
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--text3)",
      }}>
        {widget.title}
      </div>
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        color: "var(--text)",
        letterSpacing: "-.02em",
        lineHeight: 1.1,
      }}>
        {display}
      </div>
    </div>
  )
}

// ── Bar Chart Widget ───────────────────────────────────────────────
function BarChartWidget({ widget }: { widget: ComputedBarChart }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1.5px solid var(--border)",
      borderRadius: 10,
      padding: "20px 22px 16px",
    }}>
      <div style={{
        fontSize: 11,
        fontFamily: "var(--font-ibm-plex-mono), monospace",
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--text3)",
        marginBottom: 16,
      }}>
        {widget.title}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={widget.data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--text3)", fontFamily: "var(--font-ibm-plex-mono)" }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => shortValue(v)}
            tick={{ fontSize: 10, fill: "var(--text3)", fontFamily: "var(--font-ibm-plex-mono)" }}
            axisLine={false} tickLine={false} width={52}
          />
          <Tooltip
            formatter={(v) => [formatValue(Number(v), widget.valueFormat ?? "currency_usd"), widget.title]}
            contentStyle={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 6, fontSize: 11,
            }}
            labelStyle={{ color: "var(--text2)", fontFamily: "var(--font-ibm-plex-mono)" }}
          />
          <Bar dataKey="value" fill="#8b7355" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Donut Chart Widget ─────────────────────────────────────────────
const RADIAN = Math.PI / 180
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number
}) {
  if (percent < 0.04) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono)", fontWeight: 600 }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

function DonutWidget({ widget }: { widget: ComputedDonut }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1.5px solid var(--border)",
      borderRadius: 10,
      padding: "20px 22px 16px",
    }}>
      <div style={{
        fontSize: 11,
        fontFamily: "var(--font-ibm-plex-mono), monospace",
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--text3)",
        marginBottom: 16,
      }}>
        {widget.title}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={widget.data}
            cx="50%"
            cy="45%"
            innerRadius={52}
            outerRadius={82}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={CustomLabel as unknown as boolean}
          >
            {widget.data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Legend
            iconSize={8}
            iconType="circle"
            formatter={(v) => (
              <span style={{ fontSize: 10, color: "var(--text2)", fontFamily: "var(--font-ibm-plex-mono)" }}>{v}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Table Widget ───────────────────────────────────────────────────
function TableWidget({ widget }: { widget: ComputedTable }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1.5px solid var(--border)",
      borderRadius: 10,
      padding: "20px 0 0",
      overflow: "hidden",
    }}>
      <div style={{
        fontSize: 11,
        fontFamily: "var(--font-ibm-plex-mono), monospace",
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--text3)",
        marginBottom: 12,
        padding: "0 22px",
      }}>
        {widget.title}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1.5px solid var(--border)" }}>
              {widget.columns.map((col) => (
                <th key={col} style={{
                  padding: "6px 22px 8px",
                  textAlign: "left",
                  fontSize: 9,
                  fontFamily: "var(--font-ibm-plex-mono), monospace",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: "var(--text3)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}>
                  {col.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {widget.rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                {widget.columns.map((col) => {
                  const val = row[col] ?? ""
                  const isStatus = col === "status"
                  return (
                    <td key={col} style={{
                      padding: "9px 22px",
                      color: "var(--text2)",
                      whiteSpace: "nowrap",
                    }}>
                      {isStatus ? <StatusBadge status={val} /> : val}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────
function EmptyDashboard() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      gap: 16,
      color: "var(--text3)",
    }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text2)", marginBottom: 4 }}>
          Dashboard ยังไม่พร้อม
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)" }}>
          ทีมงานกำลังตั้งค่า dashboard สำหรับคุณ
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────
export function DashboardView({ widgets }: { widgets: ComputedWidget[] }) {
  const kpis = widgets.filter((w): w is ComputedKPI => w.type === "kpi")
  const charts = widgets.filter((w) => w.type === "bar_chart" || w.type === "donut_chart")
  const tables = widgets.filter((w): w is ComputedTable => w.type === "table")

  if (widgets.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" }}>
        {/* Topbar */}
        <div style={{
          height: 52,
          borderBottom: "1.5px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          background: "var(--surface)",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Dashboard</span>
        </div>
        <EmptyDashboard />
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)", overflow: "hidden" }}>
      {/* Topbar */}
      <div style={{
        height: 52,
        borderBottom: "1.5px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        background: "var(--surface)",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Dashboard</span>
        <span style={{
          marginLeft: 10,
          fontSize: 9,
          fontFamily: "var(--font-ibm-plex-mono), monospace",
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--text3)",
          padding: "2px 7px",
          border: "1px solid var(--border)",
          borderRadius: 4,
        }}>
          Sugar Export
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

        {/* KPI row */}
        {kpis.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
            gap: 12,
            marginBottom: 16,
          }}>
            {kpis.map((w) => <KPICard key={w.id} widget={w} />)}
          </div>
        )}

        {/* Charts row */}
        {charts.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: charts.length === 1 ? "1fr" : "1fr 1fr",
            gap: 12,
            marginBottom: 16,
          }}>
            {charts.map((w) => {
              if (w.type === "bar_chart") return <BarChartWidget key={w.id} widget={w} />
              if (w.type === "donut_chart") return <DonutWidget key={w.id} widget={w} />
              return null
            })}
          </div>
        )}

        {/* Tables */}
        {tables.map((w) => (
          <div key={w.id} style={{ marginBottom: 16 }}>
            <TableWidget widget={w} />
          </div>
        ))}

      </div>
    </div>
  )
}
