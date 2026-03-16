"use client"
import { useEffect, useState } from "react"
import type { MarketCompany, CompanyDetail } from "@/lib/market/client"

interface CompanyDrawerProps {
  company: MarketCompany | null
  onClose: () => void
  onCountsLoaded?: (counts: Record<string, number>) => void
}

export function CompanyDrawer({ company, onClose, onCountsLoaded }: CompanyDrawerProps) {
  const [detail, setDetail] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!company) return
    setLoading(true)
    setError(null)
    setDetail(null)
    fetch(`/api/market/companies/${company.company_id}`)
      .then(r => r.json())
      .then((data: CompanyDetail & { error?: string }) => {
        if (data.error) { setError(data.error); return }
        setDetail(data)
        onCountsLoaded?.(data.countryCounts ?? {})
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.company_id])

  const open = Boolean(company)

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 40 }}
        />
      )}

      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 520, maxWidth: "90vw",
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
          <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
              {company?.customer ?? "—"}
            </div>
            <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--surface2)", color: "var(--text3)" }}>
                {company?.location}
              </span>
              {company?.value_tag && (
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--accent-dim)", color: "var(--accent)" }}>
                  {company.value_tag}
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
              Loading company data…
            </div>
          )}

          {error && (
            <div style={{ fontSize: 12, color: "var(--red)", padding: "8px 12px", borderRadius: 6, background: "rgba(240,80,80,.08)", border: "1px solid rgba(240,80,80,.2)" }}>
              {error}
            </div>
          )}

          {!loading && !error && detail && (
            <>
              {/* KPI cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <StatCard label="Total purchase" value={`$${fmtVal(detail.overview?.total_purchase_value)}`} />
                <StatCard label="Last 12 months" value={`$${fmtVal(detail.overview?.purchase_value_last_12m)}`} />
                <StatCard label="Trade records" value={company?.trades.toLocaleString() ?? "—"} />
                <StatCard label="Suppliers" value={company?.supplier_number.toString() ?? "—"} />
              </div>

              {/* Activity indicators */}
              {detail.overview && (
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  <Chip active={detail.overview.is_active} label={detail.overview.is_active ? "Active" : "Inactive"} />
                  {detail.overview.purchase_stability && <Chip label={detail.overview.purchase_stability} />}
                  {detail.overview.purchasing_trend != null && (
                    <Chip label={`Trend ${detail.overview.purchasing_trend > 0 ? "+" : ""}${detail.overview.purchasing_trend.toFixed(0)}%`} positive={detail.overview.purchasing_trend > 0} />
                  )}
                </div>
              )}

              {/* Business overview */}
              {detail.overview?.business_overview && (
                <div style={{ marginBottom: 16 }}>
                  <SectionTitle>Overview</SectionTitle>
                  <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.65, background: "var(--surface2)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border)" }}>
                    {detail.overview.business_overview}
                  </div>
                </div>
              )}

              {/* Core suppliers */}
              {detail.overview?.core_suppliers && detail.overview.core_suppliers.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <SectionTitle>Core Suppliers</SectionTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {detail.overview.core_suppliers.slice(0, 5).map((s, i) => (
                      <div key={i} style={{ fontSize: 12, color: "var(--text2)", padding: "6px 10px", background: "var(--surface2)", borderRadius: 6, border: "1px solid var(--border)" }}>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Supplier breakdown */}
              {detail.supplychain.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <SectionTitle>Supplier Breakdown</SectionTitle>
                  <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: "var(--surface2)" }}>
                          {["Supplier", "Trades", "Share"].map(h => (
                            <th key={h} style={{ padding: "7px 10px", textAlign: h === "Supplier" ? "left" : "right", color: "var(--text3)", fontWeight: 500, borderBottom: "1px solid var(--border)" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detail.supplychain.map((s, i) => (
                          <tr key={s.id} style={{ borderBottom: i < detail.supplychain.length - 1 ? "1px solid var(--border)" : "none" }}>
                            <td style={{ padding: "6px 10px", color: "var(--text2)" }}>{s.exporter}</td>
                            <td style={{ padding: "6px 10px", color: "var(--text2)", textAlign: "right" }}>{s.trades_sum}</td>
                            <td style={{ padding: "6px 10px", textAlign: "right" }}>
                              <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                                {(s.trade_frequency_ratio * 100).toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recent shipments */}
              {detail.history.length > 0 && (
                <div>
                  <SectionTitle>Recent Shipments</SectionTitle>
                  <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: "var(--surface2)" }}>
                          {["Date", "Origin", "Value"].map(h => (
                            <th key={h} style={{ padding: "7px 10px", textAlign: h === "Value" ? "right" : "left", color: "var(--text3)", fontWeight: 500, borderBottom: "1px solid var(--border)" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detail.history.map((r, i) => (
                          <tr key={r.id} style={{ borderBottom: i < detail.history.length - 1 ? "1px solid var(--border)" : "none" }}>
                            <td style={{ padding: "6px 10px", color: "var(--text2)" }}>{r.date?.slice(0, 10) ?? "—"}</td>
                            <td style={{ padding: "6px 10px", color: "var(--text2)" }}>{r.origin_country ?? "—"}</td>
                            <td style={{ padding: "6px 10px", textAlign: "right", color: "var(--text2)" }}>
                              {r.total_price_usd ? `$${fmtVal(r.total_price_usd)}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

function fmtVal(v?: number | null): string {
  if (!v) return "—"
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return v.toFixed(0)
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 8, border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{label}</div>
    </div>
  )
}

function Chip({ label, active, positive }: { label: string; active?: boolean; positive?: boolean }) {
  const color = active === false ? "var(--text3)" : positive === false ? "var(--red)" : positive ? "var(--green)" : "var(--text3)"
  return (
    <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, border: "1px solid var(--border)", color, background: "var(--surface2)" }}>
      {label}
    </span>
  )
}
