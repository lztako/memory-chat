"use client"
import { useEffect, useState, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList } from "recharts"
import type { StockRow } from "@/app/api/inventory/stock/route"

// ─── Constants ────────────────────────────────────────────────
const TYPES = ["hi-raw", "refined", "refined (ส่งออก)", "white", "ncs", "vhp"] as const

const TYPE_LABEL: Record<string, string> = {
  "hi-raw":              "Hi-Raw",
  "refined":             "Refined",
  "refined (ส่งออก)":   "Refined Exp.",
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

  const factories = useMemo(() =>
    [...new Set(rows.map(r => r.factory))].sort(),
  [rows])

  const typeTotals = useMemo(() => {
    const t: Record<string, number> = {}
    for (const r of filtered) t[r.type] = (t[r.type] ?? 0) + r.qty
    return t
  }, [filtered])

  const grandTotal = useMemo(() =>
    Object.values(typeTotals).reduce((s, v) => s + v, 0),
  [typeTotals])

  // Chart: one bar per factory = total qty
  const chartData = useMemo(() =>
    factories.map(f => ({
      factory: FACTORY_LABEL[f] ?? f,
      total: filtered.filter(r => r.factory === f).reduce((s, r) => s + r.qty, 0),
    })),
  [filtered, factories])

  // Matrix rows
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

        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "68/69", "ปีเก่า"] as const).map(s => (
            <button key={s} onClick={() => setSeason(s)} style={{
              padding: "5px 12px", borderRadius: 6, border: "1px solid",
              fontSize: 11, fontWeight: 500, cursor: "pointer",
              borderColor: season === s ? "var(--accent)" : "var(--border)",
              background:  season === s ? "var(--accent-dim)" : "transparent",
              color:       season === s ? "var(--accent)" : "var(--text3)",
              transition: "all .15s",
            }}>
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
              <KpiCard label="Total" value={fmtQty(grandTotal)} />
              {TYPES.map(t => (
                <KpiCard key={t} label={TYPE_LABEL[t]} value={fmtQty(typeTotals[t] ?? 0)} />
              ))}
            </div>

            {/* ── Bar chart ──────────────────────────────────── */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 14 }}>
                Factory Breakdown
              </div>

              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={chartData} margin={{ top: 20, right: 8, left: 8, bottom: 0 }} barCategoryGap="32%">
                  <XAxis
                    dataKey="factory"
                    tick={{ fontSize: 11, fill: "var(--text2)" }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Bar dataKey="total" fill="var(--accent)" radius={[3, 3, 0, 0]}>
                    <LabelList
                      dataKey="total"
                      position="top"
                      style={{ fontSize: 10, fill: "var(--text2)", fontVariantNumeric: "tabular-nums" }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => fmtQty(Number(v))}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ── Position Matrix ─────────────────────────────── */}
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
                          {TYPE_LABEL[t]}
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
                              {fmtQty(v)}
                            </td>
                          )
                        })}
                        <td style={{ padding: "9px 16px", textAlign: "right", color: "var(--text)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                          {fmtQty(row.total)}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: "var(--surface2)", borderTop: "1px solid var(--border2)" }}>
                      <td style={{ padding: "9px 16px", color: "var(--text3)", fontWeight: 600, fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase" }}>
                        Total
                      </td>
                      {TYPES.map(t => (
                        <td key={t} style={{ padding: "9px 12px", textAlign: "right", color: "var(--text2)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                          {fmtQty(typeTotals[t] ?? 0)}
                        </td>
                      ))}
                      <td style={{ padding: "9px 16px", textAlign: "right", color: "var(--text)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
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

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: "10px 12px",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
    }}>
      <div style={{ marginBottom: 5 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text3)", letterSpacing: ".06em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  )
}
