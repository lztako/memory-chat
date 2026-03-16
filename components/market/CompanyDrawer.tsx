"use client"
import { useEffect, useState } from "react"

interface TradeRecord {
  date: string
  importer: string
  exporter: string
  hsCode: string
  countryOfOrigin: string
  countryOfDestination: string
}

interface CompanyDrawerProps {
  company: string | null
  catalog: "imports" | "exports"
  hsCode?: string
  onClose: () => void
  onCountsLoaded?: (counts: Record<string, number>) => void
}

export function CompanyDrawer({ company, catalog, hsCode, onClose, onCountsLoaded }: CompanyDrawerProps) {
  const [records, setRecords] = useState<TradeRecord[]>([])
  const [countryCounts, setCountryCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!company) return
    setLoading(true)
    setError(null)
    fetch("/api/market/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, catalog, hsCode }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setRecords(data.records ?? [])
        const counts = data.countryCounts ?? {}
        setCountryCounts(counts)
        setTotal(data.total ?? 0)
        onCountsLoaded?.(counts)
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false))
  }, [company, catalog, hsCode])

  const open = Boolean(company)

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,.5)", zIndex: 40,
          }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 480, maxWidth: "90vw",
        background: "var(--surface)",
        borderLeft: "1px solid var(--border)",
        zIndex: 50, overflow: "hidden",
        display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform .25s cubic-bezier(.4,0,.2,1)",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
              {company ?? "—"}
            </div>
            <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                background: "var(--accent-dim)", color: "var(--accent)", letterSpacing: ".02em",
              }}>
                {catalog}
              </span>
              {hsCode && (
                <span style={{
                  fontSize: 10, padding: "2px 7px", borderRadius: 4,
                  background: "var(--surface2)", color: "var(--text3)", letterSpacing: ".02em",
                }}>
                  HS {hsCode}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6, border: "none",
              background: "none", cursor: "pointer", color: "var(--text3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text3)", fontSize: 13 }}>
              <div className="spin" style={{ width: 14, height: 14, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
              Loading trade records…
            </div>
          )}

          {error && (
            <div style={{ fontSize: 12, color: "var(--red)", padding: "8px 12px", borderRadius: 6, background: "rgba(240,80,80,.08)", border: "1px solid rgba(240,80,80,.2)" }}>
              {error}
            </div>
          )}

          {!loading && !error && records.length > 0 && (
            <>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <StatCard label="Total records" value={total.toLocaleString()} />
                <StatCard label="Countries" value={Object.keys(countryCounts).length.toString()} />
              </div>

              {/* Top countries */}
              {Object.keys(countryCounts).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text3)", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 8 }}>
                    {catalog === "imports" ? "Origin Countries" : "Destination Countries"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {Object.entries(countryCounts)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([country, count]) => {
                        const max = Math.max(...Object.values(countryCounts))
                        const pct = (count / max) * 100
                        return (
                          <div key={country} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, color: "var(--text2)", width: 120, flexShrink: 0 }}>{country}</span>
                            <div style={{ flex: 1, height: 4, background: "var(--surface2)", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 11, color: "var(--text3)", width: 24, textAlign: "right" }}>{count}</span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Trade records table */}
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text3)", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 8 }}>
                Recent Shipments
              </div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "var(--surface2)" }}>
                      {["Date", "HS Code", catalog === "imports" ? "Origin" : "Destination"].map(h => (
                        <th key={h} style={{ padding: "7px 10px", textAlign: "left", color: "var(--text3)", fontWeight: 500, borderBottom: "1px solid var(--border)" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={i} style={{ borderBottom: i < records.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <td style={{ padding: "6px 10px", color: "var(--text2)" }}>{r.date?.slice(0, 10) ?? "—"}</td>
                        <td style={{ padding: "6px 10px", color: "var(--text2)", fontFamily: "var(--font-mono)" }}>{r.hsCode ?? "—"}</td>
                        <td style={{ padding: "6px 10px", color: "var(--text2)" }}>
                          {(catalog === "imports" ? r.countryOfOrigin : r.countryOfDestination) ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {total > 20 && (
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--text3)", textAlign: "center" }}>
                  Showing 20 of {total.toLocaleString()} records
                </div>
              )}
            </>
          )}

          {!loading && !error && records.length === 0 && company && (
            <div style={{ fontSize: 13, color: "var(--text3)", textAlign: "center", padding: "40px 0" }}>
              No trade records found
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: "10px 12px", background: "var(--surface2)",
      borderRadius: 8, border: "1px solid var(--border)",
    }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{label}</div>
    </div>
  )
}
