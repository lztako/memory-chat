"use client"
import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { CompanyDrawer } from "./CompanyDrawer"
import type { MarketCompany } from "@/lib/market/client"

const WorldMap = dynamic(() => import("./WorldMap").then(m => m.WorldMap), { ssr: false })

export function MarketView() {
  const [companies, setCompanies] = useState<MarketCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedCompany, setSelectedCompany] = useState<MarketCompany | null>(null)
  const [mapCountryCounts, setMapCountryCounts] = useState<Record<string, number>>({})
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/market/companies")
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setCompanies(data.companies ?? [])
      })
      .catch(() => setError("Failed to load companies"))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return companies
    const q = search.toLowerCase()
    return companies.filter(c =>
      c.customer.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q)
    )
  }, [companies, search])

  function handleSelect(company: MarketCompany) {
    setSelectedCompany(company)
    setMapCountryCounts({})
    setSelectedCountry(null)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "20px 28px 16px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <div style={{ marginBottom: 14 }}>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", margin: 0, letterSpacing: "-.02em" }}>
            Market Intelligence
          </h1>
          <p style={{ fontSize: 12, color: "var(--text3)", margin: "3px 0 0" }}>
            {loading ? "Loading…" : `${companies.length} importer profiles · click to explore`}
          </p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by company name or country…"
          style={{
            width: "100%", padding: "7px 12px", borderRadius: 7,
            border: "1px solid var(--border)", background: "var(--surface2)",
            color: "var(--text)", fontSize: 13, outline: "none",
            fontFamily: "var(--font-sans)", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {error ? (
          <div style={{ padding: "20px 28px" }}>
            <div style={{ fontSize: 13, color: "var(--red)", padding: "10px 14px", borderRadius: 8, background: "rgba(240,80,80,.08)", border: "1px solid rgba(240,80,80,.2)" }}>
              {error}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 340px", gap: 0 }}>
            {/* Left: Company list */}
            <div style={{ overflow: "hidden", display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)" }}>
              <div style={{
                padding: "10px 20px", borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 12, color: "var(--text3)" }}>
                  {loading ? "Loading…" : `${filtered.length} of ${companies.length} companies`}
                </span>
              </div>

              <div style={{ flex: 1, overflowY: "auto" }}>
                {loading ? (
                  <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} style={{ height: 52, background: "var(--surface2)", borderRadius: 6, opacity: 1 - i * 0.1 }} />
                    ))}
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <tr style={{ background: "var(--surface)" }}>
                        <th style={{ padding: "8px 20px", textAlign: "left", fontSize: 11, color: "var(--text3)", fontWeight: 500, letterSpacing: ".04em", borderBottom: "1px solid var(--border)" }}>
                          Company
                        </th>
                        <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, color: "var(--text3)", fontWeight: 500, letterSpacing: ".04em", borderBottom: "1px solid var(--border)" }}>
                          Trades
                        </th>
                        <th style={{ padding: "8px 20px", textAlign: "right", fontSize: 11, color: "var(--text3)", fontWeight: 500, letterSpacing: ".04em", borderBottom: "1px solid var(--border)" }}>
                          Last Buy
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(company => {
                        const isSelected = selectedCompany?.company_id === company.company_id
                        return (
                          <tr
                            key={company.company_id}
                            onClick={() => handleSelect(company)}
                            style={{
                              cursor: "pointer",
                              background: isSelected ? "var(--accent-dim)" : "transparent",
                              borderBottom: "1px solid var(--border)",
                              transition: "background .1s",
                            }}
                            onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--surface2)" }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected ? "var(--accent-dim)" : "transparent" }}
                          >
                            <td style={{ padding: "10px 20px" }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: isSelected ? "var(--accent)" : "var(--text)", lineHeight: 1.35 }}>
                                {company.customer}
                              </div>
                              <div style={{ marginTop: 3, display: "flex", gap: 5, alignItems: "center" }}>
                                <span style={{ fontSize: 10, color: "var(--text3)" }}>{company.location}</span>
                                {company.value_tag && (
                                  <span style={{
                                    fontSize: 10, padding: "1px 5px", borderRadius: 3,
                                    background: "var(--accent-dim)", color: "var(--accent)",
                                  }}>
                                    {company.value_tag.split(" ")[0]}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, color: "var(--text2)" }}>
                              {company.trades.toLocaleString()}
                            </td>
                            <td style={{ padding: "10px 20px", textAlign: "right", fontSize: 11, color: "var(--text3)" }}>
                              {company.latest_purchase_time?.slice(0, 7) ?? "—"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right: Map */}
            <div style={{ overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text3)", letterSpacing: ".04em", textTransform: "uppercase" }}>
                Trade Origins
              </div>
              <WorldMap
                countryCounts={mapCountryCounts}
                selectedCountry={selectedCountry}
                onCountryClick={(code) => setSelectedCountry(prev => prev === code ? null : code)}
              />
              {Object.keys(mapCountryCounts).length === 0 && (
                <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: "12px 0" }}>
                  {selectedCompany ? "Loading…" : "Select a company to see trade origins"}
                </div>
              )}
              {Object.keys(mapCountryCounts).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text3)", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 4 }}>
                    Top Origins
                  </div>
                  {Object.entries(mapCountryCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8)
                    .map(([code, count]) => {
                      const max = Math.max(...Object.values(mapCountryCounts))
                      return (
                        <div key={code} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "var(--text2)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{code}</span>
                          <div style={{ width: 60, height: 4, background: "var(--surface2)", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                            <div style={{ width: `${(count / max) * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, color: "var(--text3)", width: 20, textAlign: "right", flexShrink: 0 }}>{count}</span>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CompanyDrawer
        company={selectedCompany}
        onClose={() => { setSelectedCompany(null); setMapCountryCounts({}) }}
        onCountsLoaded={setMapCountryCounts}
      />
    </div>
  )
}
