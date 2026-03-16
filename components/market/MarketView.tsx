"use client"
import { useState } from "react"
import dynamic from "next/dynamic"
import { CompanyDrawer } from "./CompanyDrawer"

const WorldMap = dynamic(() => import("./WorldMap").then(m => m.WorldMap), { ssr: false })

interface MarketViewProps {
  initialUsed: number
  limit: number
}

type Catalog = "imports" | "exports"

export function MarketView({ initialUsed, limit }: MarketViewProps) {
  const [hsCode, setHsCode] = useState("")
  const [catalog, setCatalog] = useState<Catalog>("imports")
  const [companies, setCompanies] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [used, setUsed] = useState(initialUsed)
  const [searched, setSearched] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [mapCountryCounts, setMapCountryCounts] = useState<Record<string, number>>({})

  const remaining = limit - used

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!hsCode.trim()) return
    setLoading(true)
    setError(null)
    setSearched(true)
    setCompanies([])
    setMapCountryCounts({})
    setSelectedCountry(null)

    try {
      const res = await fetch("/api/market/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hsCode: hsCode.trim(), catalog, pageSize: 20 }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setCompanies(data.companies ?? [])
      setTotal(data.total ?? 0)
      setUsed(data.used ?? used)
    } catch {
      setError("Search failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleCompanyClick(company: string) {
    setSelectedCompany(company)
  }

  function handleDrawerTradeLoad(counts: Record<string, number>) {
    setMapCountryCounts(counts)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "20px 28px 16px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", margin: 0, letterSpacing: "-.02em" }}>
              Market Intelligence
            </h1>
            <p style={{ fontSize: 12, color: "var(--text3)", margin: "3px 0 0" }}>
              Search global importers & exporters via Tendata
            </p>
          </div>
          {/* Quota badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 20,
            background: remaining < 100 ? "rgba(240,80,80,.08)" : "var(--surface2)",
            border: `1px solid ${remaining < 100 ? "rgba(240,80,80,.25)" : "var(--border)"}`,
            fontSize: 11, color: remaining < 100 ? "var(--red)" : "var(--text3)",
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: remaining < 100 ? "var(--red)" : "var(--green)",
            }} />
            {remaining} pts remaining today
          </div>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Catalog toggle */}
          <div style={{
            display: "flex", border: "1px solid var(--border)",
            borderRadius: 7, overflow: "hidden", flexShrink: 0,
          }}>
            {(["imports", "exports"] as Catalog[]).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCatalog(c)}
                style={{
                  padding: "7px 14px", border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 500,
                  background: catalog === c ? "var(--accent)" : "transparent",
                  color: catalog === c ? "#0d1117" : "var(--text3)",
                  transition: "background .15s, color .15s",
                  textTransform: "capitalize",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* HS Code input */}
          <input
            value={hsCode}
            onChange={e => setHsCode(e.target.value)}
            placeholder="HS Code เช่น 1701 (น้ำตาล)"
            style={{
              flex: 1, padding: "7px 12px", borderRadius: 7,
              border: "1px solid var(--border)", background: "var(--surface2)",
              color: "var(--text)", fontSize: 13, outline: "none",
              fontFamily: "var(--font-sans)",
            }}
          />

          <button
            type="submit"
            disabled={loading || !hsCode.trim()}
            style={{
              padding: "7px 18px", borderRadius: 7, border: "none",
              background: loading || !hsCode.trim() ? "var(--surface2)" : "var(--accent)",
              color: loading || !hsCode.trim() ? "var(--text3)" : "#0d1117",
              fontSize: 13, fontWeight: 600, cursor: loading ? "wait" : "pointer",
              transition: "background .15s, color .15s", flexShrink: 0,
            }}
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </form>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {!searched ? (
          <EmptyState />
        ) : error ? (
          <div style={{ padding: "20px 28px" }}>
            <div style={{ fontSize: 13, color: "var(--red)", padding: "10px 14px", borderRadius: 8, background: "rgba(240,80,80,.08)", border: "1px solid rgba(240,80,80,.2)" }}>
              {error}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 340px", gap: 0 }}>
            {/* Left: Company table */}
            <div style={{ overflow: "hidden", display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)" }}>
              <div style={{
                padding: "12px 20px", borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
              }}>
                <span style={{ fontSize: 12, color: "var(--text3)" }}>
                  {loading ? "Searching…" : total > 0 ? `${total.toLocaleString()} ${catalog} found · click to view details` : "No results"}
                </span>
                {total > 0 && (
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "var(--accent-dim)", color: "var(--accent)" }}>
                    HS {hsCode}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, overflowY: "auto" }}>
                {loading ? (
                  <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} style={{ height: 36, background: "var(--surface2)", borderRadius: 6, opacity: 1 - i * 0.08 }} />
                    ))}
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <tr style={{ background: "var(--surface)" }}>
                        <th style={{ padding: "8px 20px", textAlign: "left", fontSize: 11, color: "var(--text3)", fontWeight: 500, letterSpacing: ".04em", borderBottom: "1px solid var(--border)" }}>#</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, color: "var(--text3)", fontWeight: 500, letterSpacing: ".04em", borderBottom: "1px solid var(--border)" }}>
                          {catalog === "imports" ? "Importer" : "Exporter"}
                        </th>
                        <th style={{ padding: "8px 20px", textAlign: "right", fontSize: 11, color: "var(--text3)", fontWeight: 500, letterSpacing: ".04em", borderBottom: "1px solid var(--border)" }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map((company, i) => (
                        <tr
                          key={i}
                          onClick={() => handleCompanyClick(company)}
                          style={{
                            cursor: "pointer",
                            background: selectedCompany === company ? "var(--accent-dim)" : "transparent",
                            borderBottom: "1px solid var(--border)",
                            transition: "background .1s",
                          }}
                          onMouseEnter={e => { if (selectedCompany !== company) (e.currentTarget as HTMLElement).style.background = "var(--surface2)" }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selectedCompany === company ? "var(--accent-dim)" : "transparent" }}
                        >
                          <td style={{ padding: "9px 20px", fontSize: 12, color: "var(--text3)", width: 36 }}>{i + 1}</td>
                          <td style={{ padding: "9px 12px", fontSize: 13, color: selectedCompany === company ? "var(--accent)" : "var(--text)", fontWeight: selectedCompany === company ? 500 : 400 }}>
                            {company}
                          </td>
                          <td style={{ padding: "9px 20px", textAlign: "right" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.8" strokeLinecap="round">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right: World Map */}
            <div style={{ overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text3)", letterSpacing: ".04em", textTransform: "uppercase" }}>
                Trade Map
              </div>
              <WorldMap
                countryCounts={mapCountryCounts}
                selectedCountry={selectedCountry}
                onCountryClick={(code) => setSelectedCountry(prev => prev === code ? null : code)}
              />
              {Object.keys(mapCountryCounts).length === 0 && (
                <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: "12px 0" }}>
                  Click a company to see their trade map
                </div>
              )}
              {/* Top countries list */}
              {Object.keys(mapCountryCounts).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text3)", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 4 }}>
                    Top Countries
                  </div>
                  {Object.entries(mapCountryCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8)
                    .map(([country, count]) => {
                      const max = Math.max(...Object.values(mapCountryCounts))
                      return (
                        <div key={country} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "var(--text2)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{country}</span>
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

      {/* Company Drawer */}
      <CompanyDrawerWithMapUpdate
        company={selectedCompany}
        catalog={catalog}
        hsCode={hsCode}
        onClose={() => setSelectedCompany(null)}
        onCountsLoaded={handleDrawerTradeLoad}
      />
    </div>
  )
}

// Wrapper to pass country counts back up to map
function CompanyDrawerWithMapUpdate({
  company, catalog, hsCode, onClose, onCountsLoaded,
}: {
  company: string | null
  catalog: Catalog
  hsCode: string
  onClose: () => void
  onCountsLoaded: (counts: Record<string, number>) => void
}) {
  return (
    <CompanyDrawer
      company={company}
      catalog={catalog}
      hsCode={hsCode}
      onClose={onClose}
      onCountsLoaded={onCountsLoaded}
    />
  )
}

function EmptyState() {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 12, padding: "40px 20px",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: "var(--surface)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text2)" }}>Search trade data</div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>Enter an HS Code to find importers or exporters worldwide</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
        {[["1701", "Sugar"], ["0901", "Coffee"], ["2709", "Crude Oil"], ["8471", "Computers"]].map(([code, name]) => (
          <span key={code} style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 20,
            border: "1px solid var(--border)", color: "var(--text3)",
            cursor: "default",
          }}>
            {code} · {name}
          </span>
        ))}
      </div>
    </div>
  )
}
