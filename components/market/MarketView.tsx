"use client"
import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { CompanyDrawer } from "./CompanyDrawer"
import type { MarketCompany } from "@/lib/market/client"
import type { MapCountryDatum } from "./WorldMap"

const WorldMap = dynamic(() => import("./WorldMap").then(m => m.WorldMap), { ssr: false })

// Country name → ISO alpha-2 (for map markers)
const NAME_TO_ALPHA2: Record<string, string> = {
  "Uganda": "UG", "Indonesia": "ID", "Pakistan": "PK", "Burundi": "BI",
  "Vietnam": "VN", "South Africa": "ZA", "Kenya": "KE", "Tanzania": "TZ",
  "Nigeria": "NG", "Ghana": "GH", "Ethiopia": "ET", "Rwanda": "RW",
  "Brazil": "BR", "Thailand": "TH", "India": "IN", "China": "CN",
  "Malaysia": "MY", "Philippines": "PH", "Bangladesh": "BD", "Sri Lanka": "LK",
  "Egypt": "EG", "Morocco": "MA", "Cameroon": "CM", "Senegal": "SN",
  "UAE": "AE", "Saudi Arabia": "SA", "Qatar": "QA", "Turkey": "TR",
  "Russia": "RU", "Poland": "PL", "Netherlands": "NL", "Germany": "DE",
  "United Kingdom": "GB", "France": "FR", "Spain": "ES", "Italy": "IT",
  "United States": "US", "Canada": "CA", "Mexico": "MX", "Australia": "AU",
  "Japan": "JP", "South Korea": "KR", "Argentina": "AR", "Chile": "CL",
  "Colombia": "CO", "Peru": "PE", "Ecuador": "EC",
}

export function MarketView() {
  const [companies, setCompanies] = useState<MarketCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedCompany, setSelectedCompany] = useState<MarketCompany | null>(null)
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

  // Build map data: group companies by location country
  const mapData = useMemo((): MapCountryDatum[] => {
    const counts = new Map<string, { code: string; name: string; count: number }>()
    for (const c of companies) {
      if (!c.location) continue
      const code = NAME_TO_ALPHA2[c.location]
      if (!code) continue
      const existing = counts.get(code)
      if (existing) existing.count++
      else counts.set(code, { code, name: c.location, count: 1 })
    }
    return Array.from(counts.values())
  }, [companies])

  // Filter companies by search + selected country
  const filtered = useMemo(() => {
    let list = companies
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.customer.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q)
      )
    }
    if (selectedCountry) {
      list = list.filter(c => NAME_TO_ALPHA2[c.location ?? ""] === selectedCountry)
    }
    return list
  }, [companies, search, selectedCountry])

  function handleCountryClick(code: string) {
    setSelectedCountry(code)
    setSelectedCompany(null)
  }

  function handleSelectCompany(company: MarketCompany) {
    setSelectedCompany(company)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0, letterSpacing: "-.02em" }}>
            Market Intelligence
          </h1>
          <p style={{ fontSize: 12, color: "var(--text3)", margin: "3px 0 0" }}>
            {loading ? "Loading…" : `${companies.length} importer profiles across ${mapData.length} countries`}
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

      {/* Body: map top + table bottom */}
      {error ? (
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 13, color: "var(--red)", padding: "10px 14px", borderRadius: 8, background: "rgba(240,80,80,.08)", border: "1px solid rgba(240,80,80,.2)" }}>
            {error}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* Map panel */}
          <div style={{ height: 280, flexShrink: 0, padding: "12px 16px 0", borderBottom: "1px solid var(--border)" }}>
            <WorldMap
              data={mapData}
              selectedCountry={selectedCountry}
              onCountryClick={handleCountryClick}
              onClearSelection={() => setSelectedCountry(null)}
            />
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Table header bar */}
            <div style={{
              padding: "9px 20px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
            }}>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>
                {loading ? "Loading…" : (
                  selectedCountry
                    ? `${filtered.length} companies in ${mapData.find(d => d.code === selectedCountry)?.name ?? selectedCountry}`
                    : `${filtered.length} of ${companies.length} companies`
                )}
              </span>
              {selectedCountry && (
                <button
                  onClick={() => setSelectedCountry(null)}
                  style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 20,
                    border: "1px solid var(--border)", background: "none",
                    color: "var(--text3)", cursor: "pointer",
                  }}
                >
                  Clear filter ✕
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ height: 44, background: "var(--surface2)", borderRadius: 6, opacity: 1 - i * 0.14 }} />
                  ))}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                    <tr style={{ background: "var(--surface)" }}>
                      <th style={{ padding: "7px 20px", textAlign: "left", fontSize: 11, color: "var(--text3)", fontWeight: 500, letterSpacing: ".04em", borderBottom: "1px solid var(--border)" }}>
                        Company
                      </th>
                      <th style={{ padding: "7px 12px", textAlign: "right", fontSize: 11, color: "var(--text3)", fontWeight: 500, letterSpacing: ".04em", borderBottom: "1px solid var(--border)" }}>
                        Trades
                      </th>
                      <th style={{ padding: "7px 12px", textAlign: "right", fontSize: 11, color: "var(--text3)", fontWeight: 500, letterSpacing: ".04em", borderBottom: "1px solid var(--border)" }}>
                        Suppliers
                      </th>
                      <th style={{ padding: "7px 20px", textAlign: "right", fontSize: 11, color: "var(--text3)", fontWeight: 500, letterSpacing: ".04em", borderBottom: "1px solid var(--border)" }}>
                        Last Active
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(company => {
                      const isSelected = selectedCompany?.company_id === company.company_id
                      return (
                        <tr
                          key={company.company_id}
                          onClick={() => handleSelectCompany(company)}
                          style={{
                            cursor: "pointer",
                            background: isSelected ? "var(--accent-dim)" : "transparent",
                            borderBottom: "1px solid var(--border)",
                            transition: "background .1s",
                          }}
                          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--surface2)" }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected ? "var(--accent-dim)" : "transparent" }}
                        >
                          <td style={{ padding: "9px 20px" }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: isSelected ? "var(--accent)" : "var(--text)", lineHeight: 1.3 }}>
                              {company.customer}
                            </div>
                            <div style={{ marginTop: 2, display: "flex", gap: 5, alignItems: "center" }}>
                              <span style={{ fontSize: 10, color: "var(--text3)" }}>{company.location}</span>
                              {company.value_tag && (
                                <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "var(--accent-dim)", color: "var(--accent)" }}>
                                  {company.value_tag.split(" ")[0]}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "right", fontSize: 12, color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>
                            {company.trades.toLocaleString()}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "right", fontSize: 12, color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>
                            {company.supplier_number}
                          </td>
                          <td style={{ padding: "9px 20px", textAlign: "right", fontSize: 11, color: "var(--text3)" }}>
                            {company.latest_purchase_time?.slice(0, 7) ?? "—"}
                          </td>
                        </tr>
                      )
                    })}
                    {!loading && filtered.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: "32px 20px", textAlign: "center", fontSize: 13, color: "var(--text3)" }}>
                          No companies match
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <CompanyDrawer
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
      />
    </div>
  )
}
