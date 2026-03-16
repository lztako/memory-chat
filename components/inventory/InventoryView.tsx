"use client"
import { useEffect, useState, useMemo } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import type { StockRow } from "@/app/api/inventory/stock/route"

// ─── Constants ────────────────────────────────────────────────
const TYPES = ["hi-raw", "refined", "refined (ส่งออก)", "white", "ncs", "vhp"] as const
type StockType = typeof TYPES[number]

const TYPE_COLOR: Record<string, string> = {
  "hi-raw":              "#5090d3",
  "refined":             "#ffab2e",
  "refined (ส่งออก)":   "#a78bfa",
  "white":               "#c8c2ba",
  "ncs":                 "#3dba6e",
  "vhp":                 "#f08060",
}

const TYPE_LABEL: Record<string, string> = {
  "hi-raw":              "Hi-Raw",
  "refined":             "Refined",
  "refined (ส่งออก)":   "Refined (Export)",
  "white":               "White",
  "ncs":                 "NCS",
  "vhp":                 "VHP",
}

const FACTORY_LABEL: Record<string, string> = {
  "pb":            "PB",
  "sb":            "SB",
  "ss":            "SS",
  "tsi":           "TSI",
  "คลัง tste":    "TSTE",
  "คลังอ่างทอง": "อ่างทอง",
}

function fmtQty(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`
  return v.toFixed(v % 1 === 0 ? 0 : 2)
}

// ─── Component ────────────────────────────────────────────────
export function InventoryView() {
  const [rows, setRows]       = useState<StockRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [season, setSeason]   = useState<"all" | "68/69" | "ปีเก่า">("all")

  useEffect(() => {
    fetch("/api/inventory/stock")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setRows(d.rows ?? []) })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() =>
    season === "all" ? rows : rows.filter(r => r.tag === season),
  [rows, season])

  // Total per type
  const typeTotals = useMemo(() => {
    const t: Record<string, number> = {}
    for (const r of filtered) t[r.type] = (t[r.type] ?? 0) + r.qty
    return t
  }, [filtered])

  const grandTotal = useMemo(() =>
    Object.values(typeTotals).reduce((s, v) => s + v, 0),
  [typeTotals])

  // Per factory + type for chart
  const factories = useMemo(() =>
    [...new Set(rows.map(r => r.factory))].sort(),
  [rows])

  const chartData = useMemo(() =>
    factories.map(f => {
      const entry: Record<string, string | number> = { factory: FACTORY_LABEL[f] ?? f }
      for (const t of TYPES) {
        entry[t] = filtered
          .filter(r => r.factory === f && r.type === t)
          .reduce((s, r) => s + r.qty, 0)
      }
      return entry
    }),
  [filtered, factories])

  // Matrix: factory rows × type cols
  const matrix = useMemo(() =>
    factories.map(f => ({
      factory: f,
      label: FACTORY_LABEL[f] ?? f,
      total: filtered.filter(r => r.factory === f).reduce((s, r) => s + r.qty, 0),
      byType: Object.fromEntries(
        TYPES.map(t => [
          t,
          filtered.filter(r => r.factory === f && r.type === t).reduce((s, r) => s + r.qty, 0),
        ])
      ),
    })),
  [filtered, factories])

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{
        padding: "16px 24px 12px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0, letterSpacing: "-.02em" }}>
            Stock Inventory
          </h1>
          <p style={{ fontSize: 12, color: "var(--text3)", margin: "3px 0 0" }}>
            {loading ? "Loading…" : `${fmtQty(grandTotal)} MT · ${filtered.filter(r => r.qty > 0).length} active positions`}
          </p>
        </div>

        {/* Season filter */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "68/69", "ปีเก่า"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSeason(s)}
              style={{
                padding: "5px 12px", borderRadius: 6, border: "1px solid",
                fontSize: 11, fontWeight: 500, cursor: "pointer",
                borderColor: season === s ? "var(--accent)" : "var(--border)",
                background:  season === s ? "var(--accent-dim)" : "transparent",
                color:       season === s ? "var(--accent)" : "var(--text3)",
                transition: "all .15s",
              }}
            >
              {s === "all" ? "All seasons" : s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text3)", fontSize: 13, paddingTop: 8 }}>
            <div className="spin" style={{ width: 14, height: 14, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
            Loading stock data…
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: "var(--red)", padding: "10px 14px", borderRadius: 8, background: "rgba(240,80,80,.08)", border: "1px solid rgba(240,80,80,.2)" }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── KPI strip ──────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
              <KpiCard
                label="Total"
                value={fmtQty(grandTotal)}
                unit="MT"
                accent
              />
              {TYPES.map(t => (
                <KpiCard
                  key={t}
                  label={TYPE_LABEL[t]}
                  value={fmtQty(typeTotals[t] ?? 0)}
                  unit="MT"
                  dot={TYPE_COLOR[t]}
                />
              ))}
            </div>

            {/* ── Stacked bar chart ──────────────────────────── */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 14 }}>
                Factory Breakdown
              </div>

              {/* Legend */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
                {TYPES.map(t => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLOR[t] }} />
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>{TYPE_LABEL[t]}</span>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
                  barCategoryGap="28%"
                >
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "var(--text3)" }}
                    tickFormatter={v => fmtQty(v as number)}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="factory"
                    tick={{ fontSize: 11, fill: "var(--text2)" }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,.04)" }}
                    contentStyle={{
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: 8, fontSize: 11, color: "var(--text)",
                    }}
                    formatter={(val, name) => [
                      `${fmtQty(Number(val))} MT`,
                      TYPE_LABEL[String(name)] ?? String(name),
                    ]}
                  />
                  {TYPES.map(t => (
                    <Bar key={t} dataKey={t} stackId="a" fill={TYPE_COLOR[t]} radius={t === "vhp" ? [0, 3, 3, 0] : undefined} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ── Matrix table ───────────────────────────────── */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", letterSpacing: ".06em", textTransform: "uppercase" }}>
                  Position Matrix
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "var(--surface2)" }}>
                      <th style={{ padding: "8px 16px", textAlign: "left", color: "var(--text3)", fontWeight: 500, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                        Factory
                      </th>
                      {TYPES.map(t => (
                        <th key={t} style={{ padding: "8px 12px", textAlign: "right", color: "var(--text3)", fontWeight: 500, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                            <div style={{ width: 6, height: 6, borderRadius: 1, background: TYPE_COLOR[t], flexShrink: 0 }} />
                            {TYPE_LABEL[t]}
                          </div>
                        </th>
                      ))}
                      <th style={{ padding: "8px 16px", textAlign: "right", color: "var(--text3)", fontWeight: 500, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row, i) => (
                      <tr key={row.factory} style={{ borderBottom: i < matrix.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <td style={{ padding: "9px 16px", color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap" }}>
                          {row.label}
                        </td>
                        {TYPES.map(t => {
                          const v = row.byType[t] ?? 0
                          return (
                            <td key={t} style={{ padding: "9px 12px", textAlign: "right", color: v > 0 ? "var(--text2)" : "var(--text3)", fontVariantNumeric: "tabular-nums" }}>
                              {v > 0 ? fmtQty(v) : "—"}
                            </td>
                          )
                        })}
                        <td style={{ padding: "9px 16px", textAlign: "right", color: "var(--accent)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                          {fmtQty(row.total)}
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr style={{ background: "var(--surface2)", borderTop: "1px solid var(--border2)" }}>
                      <td style={{ padding: "9px 16px", color: "var(--text3)", fontWeight: 600, fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase" }}>
                        Total
                      </td>
                      {TYPES.map(t => (
                        <td key={t} style={{ padding: "9px 12px", textAlign: "right", color: "var(--text2)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                          {fmtQty(typeTotals[t] ?? 0)}
                        </td>
                      ))}
                      <td style={{ padding: "9px 16px", textAlign: "right", color: "var(--accent)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {fmtQty(grandTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────
function KpiCard({ label, value, unit, accent, dot }: {
  label: string; value: string; unit: string; accent?: boolean; dot?: string
}) {
  return (
    <div style={{
      padding: "10px 12px",
      background: accent ? "var(--accent-dim)" : "var(--surface)",
      border: `1px solid ${accent ? "rgba(255,171,46,.25)" : "var(--border)"}`,
      borderRadius: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
        {dot && <div style={{ width: 6, height: 6, borderRadius: 1, background: dot, flexShrink: 0 }} />}
        <span style={{ fontSize: 9, fontWeight: 600, color: accent ? "var(--accent)" : "var(--text3)", letterSpacing: ".06em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: accent ? "var(--accent)" : "var(--text)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: accent ? "var(--accent)" : "var(--text3)", marginTop: 2, opacity: .7 }}>
        {unit}
      </div>
    </div>
  )
}
