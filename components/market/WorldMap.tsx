"use client"
import { useState } from "react"
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps"

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

// ISO 3166-1 numeric → alpha-2 (subset for common trade countries)
const NUMERIC_TO_ALPHA2: Record<string, string> = {
  "004":"AF","008":"AL","012":"DZ","024":"AO","032":"AR","036":"AU","040":"AT","050":"BD",
  "056":"BE","068":"BO","076":"BR","100":"BG","116":"KH","120":"CM","124":"CA","152":"CL",
  "156":"CN","170":"CO","180":"CD","188":"CR","191":"HR","192":"CU","203":"CZ","208":"DK",
  "214":"DO","218":"EC","818":"EG","231":"ET","246":"FI","250":"FR","276":"DE","288":"GH",
  "300":"GR","320":"GT","324":"GN","332":"HT","340":"HN","348":"HU","356":"IN","360":"ID",
  "364":"IR","368":"IQ","372":"IE","376":"IL","380":"IT","388":"JM","392":"JP","400":"JO",
  "404":"KE","410":"KR","414":"KW","418":"LA","422":"LB","430":"LR","434":"LY","458":"MY",
  "484":"MX","504":"MA","508":"MZ","516":"NA","524":"NP","528":"NL","540":"NC","554":"NZ",
  "566":"NG","578":"NO","586":"PK","591":"PA","604":"PE","608":"PH","616":"PL","620":"PT",
  "630":"PR","634":"QA","642":"RO","643":"RU","682":"SA","686":"SN","694":"SL","706":"SO",
  "710":"ZA","724":"ES","144":"LK","729":"SD","752":"SE","756":"CH","764":"TH","788":"TN",
  "792":"TR","800":"UG","804":"UA","784":"AE","826":"GB","840":"US","858":"UY","862":"VE",
  "704":"VN","887":"YE","894":"ZM","716":"ZW","104":"MM",
}

interface WorldMapProps {
  countryCounts: Record<string, number>
  onCountryClick?: (code: string, name: string) => void
  selectedCountry?: string | null
}

export function WorldMap({ countryCounts, onCountryClick, selectedCountry }: WorldMapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; count: number } | null>(null)

  const maxCount = Math.max(...Object.values(countryCounts), 1)

  function getColor(alpha2: string): string {
    const count = countryCounts[alpha2] ?? 0
    if (count === 0) return "var(--surface2)"
    const intensity = count / maxCount
    if (selectedCountry === alpha2) return "#ffab2e"
    // Scale from dim yellow to full ORIGO yellow
    const r = Math.round(30 + intensity * (255 - 30))
    const g = Math.round(40 + intensity * (171 - 40))
    const b = Math.round(60 + intensity * (46 - 60))
    return `rgb(${r},${g},${b})`
  }

  return (
    <div style={{ position: "relative", width: "100%", background: "var(--surface)", borderRadius: 8, overflow: "hidden" }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 120, center: [10, 20] }}
        style={{ width: "100%", height: "auto" }}
        height={280}
      >
        <ZoomableGroup zoom={1} minZoom={0.8} maxZoom={4}>
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: import("react-simple-maps").Geography[] }) =>
              geographies.map((geo: import("react-simple-maps").Geography) => {
                const numericId = geo.id as string
                const alpha2 = NUMERIC_TO_ALPHA2[numericId] ?? ""
                const count = alpha2 ? (countryCounts[alpha2] ?? 0) : 0
                const isSelected = selectedCountry === alpha2
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(alpha2)}
                    stroke="var(--border)"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: "none", cursor: count > 0 || alpha2 ? "pointer" : "default" },
                      hover: { outline: "none", fill: isSelected ? "#ffab2e" : count > 0 ? "#ffab2e" : "var(--border)" },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(e: React.MouseEvent<SVGPathElement>) => {
                      if (!alpha2) return
                      const rect = (e.target as SVGElement).closest("svg")?.getBoundingClientRect()
                      if (rect) {
                        setTooltip({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top - 10,
                          name: geo.properties.name as string,
                          count,
                        })
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => {
                      if (alpha2 && onCountryClick) onCountryClick(alpha2, geo.properties.name as string)
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: "absolute",
          left: tooltip.x + 8, top: tooltip.y - 8,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 6, padding: "5px 10px",
          fontSize: 11, color: "var(--text)", pointerEvents: "none",
          whiteSpace: "nowrap", zIndex: 10,
          boxShadow: "0 4px 12px rgba(0,0,0,.4)",
        }}>
          <span style={{ fontWeight: 500 }}>{tooltip.name}</span>
          {tooltip.count > 0 && (
            <span style={{ color: "var(--accent)", marginLeft: 6 }}>{tooltip.count} records</span>
          )}
        </div>
      )}

      {/* Legend */}
      {Object.keys(countryCounts).length > 0 && (
        <div style={{
          position: "absolute", bottom: 8, right: 10,
          display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text3)",
        }}>
          <span>Low</span>
          <div style={{
            width: 60, height: 6, borderRadius: 3,
            background: "linear-gradient(to right, rgb(30,40,60), #ffab2e)",
          }} />
          <span>High</span>
        </div>
      )}
    </div>
  )
}
