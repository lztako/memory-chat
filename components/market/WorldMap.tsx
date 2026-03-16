"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

// ─── Types ────────────────────────────────────────────────────
export interface MapCountryDatum {
  code: string   // ISO alpha-2
  name: string
  count: number  // number of companies
}

interface WorldMapProps {
  data: MapCountryDatum[]
  selectedCountry?: string | null
  onCountryClick?: (code: string) => void
  onClearSelection?: () => void
}

// ─── GeoJSON types ────────────────────────────────────────────
type GeoGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] }

type GeoFeature = {
  type: "Feature"
  id?: string | number
  properties?: Record<string, unknown>
  geometry?: GeoGeometry | null
}

// ─── Projection (Mercator) ────────────────────────────────────
const VIEWBOX = { width: 1000, height: 420 }
const MIN_ZOOM = 1
const MAX_ZOOM = 6
const ZOOM_STEP = 0.35
const LAT_MAX = 80
const LAT_MIN = -55

const project = (lon: number, lat: number) => {
  const clamped = Math.max(LAT_MIN, Math.min(LAT_MAX, lat))
  const x = ((lon + 180) / 360) * VIEWBOX.width
  const y = ((LAT_MAX - clamped) / (LAT_MAX - LAT_MIN)) * VIEWBOX.height
  return [x, y] as const
}

const ringToPath = (ring: number[][]) =>
  ring.map(([lon, lat], i) => {
    const [x, y] = project(lon, lat)
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(" ")

const polygonToPath = (coords: number[][][]) =>
  coords.map(ring => `${ringToPath(ring)} Z`).join(" ")

const geometryToPath = (geometry?: GeoGeometry | null) => {
  if (!geometry) return ""
  if (geometry.type === "Polygon") return polygonToPath(geometry.coordinates)
  return geometry.coordinates.map(p => polygonToPath(p)).join(" ")
}

const getIso2 = (props?: Record<string, unknown>) => {
  if (!props) return undefined
  const v = (props.ISO_A2 ?? props.iso_a2 ?? props.ISO2 ?? props["ISO3166-1-Alpha-2"]) as string | undefined
  if (!v || v === "-99") return undefined
  return v.toUpperCase()
}

const getName = (props?: Record<string, unknown>) =>
  ((props?.NAME ?? props?.name ?? props?.ADMIN) as string | undefined)

// ─── Centroid helpers ─────────────────────────────────────────
const ringArea = (ring: number[][]) => {
  let a = 0
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % ring.length]
    a += x1 * y2 - x2 * y1
  }
  return Math.abs(a / 2)
}

const getPrimaryRing = (geometry?: GeoGeometry | null): number[][] => {
  if (!geometry) return []
  if (geometry.type === "Polygon") return geometry.coordinates[0] ?? []
  let best: number[][] = []
  let bestArea = 0
  for (const polygon of geometry.coordinates) {
    const ring = polygon[0] ?? []
    const area = ringArea(ring)
    if (area > bestArea) { bestArea = area; best = ring }
  }
  return best
}

const getCentroid = (ring: number[][]): [number, number] | null => {
  if (!ring.length) return null
  let twiceArea = 0, cx = 0, cy = 0
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % ring.length]
    const cross = x1 * y2 - x2 * y1
    twiceArea += cross; cx += (x1 + x2) * cross; cy += (y1 + y2) * cross
  }
  if (twiceArea === 0) {
    const s = ring.reduce((a, [lon, lat]) => ({ lon: a.lon + lon, lat: a.lat + lat }), { lon: 0, lat: 0 })
    return [s.lon / ring.length, s.lat / ring.length]
  }
  return [cx / (3 * twiceArea), cy / (3 * twiceArea)]
}

// ─── Component ────────────────────────────────────────────────
export function WorldMap({ data, selectedCountry, onCountryClick, onClearSelection }: WorldMapProps) {
  const [features, setFeatures] = useState<GeoFeature[]>([])
  const [loadError, setLoadError] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredCode, setHoveredCode] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  const svgRef = useRef<SVGSVGElement | null>(null)
  const groupRef = useRef<SVGGElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const activePointer = useRef<number | null>(null)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const dragDist = useRef(0)
  const dragHappened = useRef(false)
  const frameRef = useRef<number | null>(null)
  const hoverTimer = useRef<number | null>(null)

  // Load GeoJSON
  useEffect(() => {
    fetch("/world-countries.geojson")
      .then(r => { if (!r.ok) throw new Error("not found"); return r.json() })
      .then((json: { features: GeoFeature[] }) => setFeatures(json.features ?? []))
      .catch(() => setLoadError(true))
  }, [])

  const dataMap = useMemo(() => new Map(data.map(d => [d.code.toUpperCase(), d])), [data])

  // Precompute paths once
  const renderedFeatures = useMemo(
    () => features.map((f, idx) => {
      const path = geometryToPath(f.geometry)
      if (!path) return null
      const code = getIso2(f.properties)
      return { key: `${f.id ?? idx}`, code, path }
    }).filter(Boolean) as Array<{ key: string; code?: string; path: string }>,
    [features]
  )

  // Precompute markers
  const markers = useMemo(() => {
    const featureByCode = new Map<string, GeoFeature>()
    features.forEach(f => {
      const iso2 = getIso2(f.properties)
      if (iso2) featureByCode.set(iso2, f)
    })
    return data.map(datum => {
      const f = featureByCode.get(datum.code.toUpperCase())
      if (!f) return null
      const ring = getPrimaryRing(f.geometry)
      const centroid = getCentroid(ring)
      if (!centroid) return null
      const [mx, my] = project(centroid[0], centroid[1])
      return { ...datum, x: mx, y: my, label: datum.count > 99 ? "99+" : String(datum.count) }
    }).filter(Boolean) as Array<MapCountryDatum & { x: number; y: number; label: string }>
  }, [data, features])

  // Apply transform imperatively for smooth drag
  const applyTransform = useCallback((p: { x: number; y: number }, z: number) => {
    if (!groupRef.current) return
    const cx = VIEWBOX.width / 2, cy = VIEWBOX.height / 2
    const tx = p.x + cx - cx * z
    const ty = p.y + cy - cy * z
    groupRef.current.setAttribute("transform", `translate(${tx} ${ty}) scale(${z})`)
  }, [])

  useEffect(() => { applyTransform(pan, zoom) }, [pan, zoom, applyTransform])

  // Scroll to zoom
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current + delta))
      zoomRef.current = nextZoom
      setZoom(nextZoom)
      panRef.current = pan
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [pan])

  // Drag handlers
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== null) return
    if (frameRef.current) { cancelAnimationFrame(frameRef.current); frameRef.current = null }
    activePointer.current = e.pointerId
    lastPoint.current = { x: e.clientX, y: e.clientY }
    dragDist.current = 0
    dragHappened.current = false
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== e.pointerId || !lastPoint.current) return
    const dx = e.clientX - lastPoint.current.x
    const dy = e.clientY - lastPoint.current.y
    lastPoint.current = { x: e.clientX, y: e.clientY }
    dragDist.current += Math.abs(dx) + Math.abs(dy)
    if (dragDist.current > 4) dragHappened.current = true
    panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy }
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(() => {
        applyTransform(panRef.current, zoomRef.current)
        frameRef.current = null
      })
    }
    e.preventDefault()
  }

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== e.pointerId) return
    if (frameRef.current) { cancelAnimationFrame(frameRef.current); frameRef.current = null }
    applyTransform(panRef.current, zoomRef.current)
    activePointer.current = null
    lastPoint.current = null
    setIsDragging(false)
    setPan(panRef.current)
    e.currentTarget.releasePointerCapture(e.pointerId)
    e.preventDefault()
    setTimeout(() => { dragHappened.current = false }, 0)
  }

  const handleCountryClick = (code?: string) => {
    if (!code || dragHappened.current) return
    if (selectedCountry === code) { onClearSelection?.(); return }
    onCountryClick?.(code)
  }

  const handleMarkerClick = (code: string) => {
    if (dragHappened.current) return
    if (selectedCountry === code) { onClearSelection?.(); return }
    onCountryClick?.(code)
  }

  const handleHoverEnter = (code: string, e: React.MouseEvent) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
    hoverTimer.current = window.setTimeout(() => setHoveredCode(code), 100)
  }

  const handleHoverMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const handleHoverLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setHoveredCode(null), 100)
  }

  const hoveredDatum = hoveredCode ? dataMap.get(hoveredCode.toUpperCase()) : null

  // Hover card position
  const cardStyle = useMemo(() => {
    if (!hoverPos || !containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    const W = 200, H = 90
    let left = hoverPos.x + 14
    let top = hoverPos.y - H - 10
    if (left + W > rect.width - 8) left = rect.width - W - 8
    if (left < 8) left = 8
    if (top < 8) top = hoverPos.y + 14
    return { left, top }
  }, [hoverPos])

  const resetView = () => {
    setIsAnimating(true)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    panRef.current = { x: 0, y: 0 }
    zoomRef.current = 1
    setTimeout(() => setIsAnimating(false), 350)
  }

  const cx = VIEWBOX.width / 2, cy = VIEWBOX.height / 2
  const tx = pan.x + cx - cx * zoom
  const ty = pan.y + cy - cy * zoom
  const transform = `translate(${tx} ${ty}) scale(${zoom})`
  const hasViewChange = Math.abs(zoom - 1) > 0.01 || Math.abs(pan.x) > 1 || Math.abs(pan.y) > 1

  if (loadError) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 260, borderRadius: 12, border: "1px dashed var(--border)", color: "var(--text3)", fontSize: 13 }}>
        Missing <code style={{ margin: "0 6px", color: "var(--text2)" }}>public/world-countries.geojson</code>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%", minHeight: 260, overflow: "hidden", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Zoom controls */}
      <div style={{ position: "absolute", right: 10, top: 10, zIndex: 20, display: "flex", flexDirection: "column", gap: 6 }}>
        {([
          { label: "+", action: () => { const z = Math.min(MAX_ZOOM, zoomRef.current + ZOOM_STEP); zoomRef.current = z; setZoom(z) } },
          { label: "−", action: () => { const z = Math.max(MIN_ZOOM, zoomRef.current - ZOOM_STEP); zoomRef.current = z; setZoom(z) } },
        ] as const).map(({ label, action }) => (
          <button
            key={label}
            onClick={action}
            style={{
              width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)",
              background: "var(--surface2)", color: "var(--text)", fontSize: 16, lineHeight: 1,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 400,
            }}
          >{label}</button>
        ))}
        {hasViewChange && (
          <button
            onClick={resetView}
            title="Reset view"
            style={{
              width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)",
              background: "var(--surface2)", color: "var(--text3)", fontSize: 11,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
          </button>
        )}
      </div>

      {/* SVG map */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        style={{ width: "100%", height: "100%", touchAction: "none", cursor: isDragging ? "grabbing" : "grab", display: "block", userSelect: "none" }}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Ocean background */}
        <rect width={VIEWBOX.width} height={VIEWBOX.height} fill="var(--surface)" />

        <g
          ref={groupRef}
          transform={transform}
          style={{ transition: isAnimating ? "transform 350ms ease" : "none", willChange: "transform" }}
        >
          {/* Country shapes */}
          {renderedFeatures.map(f => {
            const isSelected = f.code && selectedCountry === f.code
            const hasData = f.code ? dataMap.has(f.code) : false
            return (
              <path
                key={f.key}
                d={f.path}
                fill={isSelected ? "rgba(255,171,46,.18)" : hasData ? "#2a3a55" : "var(--surface2)"}
                stroke="var(--border)"
                strokeWidth="0.5"
                style={{ cursor: f.code ? "pointer" : "default", transition: "fill .15s" }}
                onClick={() => handleCountryClick(f.code)}
                onMouseEnter={f.code && !hasData ? e => handleHoverEnter(f.code!, e) : undefined}
                onMouseMove={f.code && !hasData ? handleHoverMove : undefined}
                onMouseLeave={f.code && !hasData ? handleHoverLeave : undefined}
              />
            )
          })}

          {/* Country markers */}
          {markers.map(m => {
            const isActive = selectedCountry === m.code.toUpperCase()
            const r = m.label.length > 2 ? 17 : 15
            return (
              <g
                key={`marker-${m.code}`}
                className={`origo-marker${isActive ? " is-active" : ""}`}
                onClick={() => handleMarkerClick(m.code.toUpperCase())}
                onMouseEnter={e => handleHoverEnter(m.code.toUpperCase(), e)}
                onMouseMove={handleHoverMove}
                onMouseLeave={handleHoverLeave}
              >
                <circle className="origo-marker-hit" cx={m.x} cy={m.y} r={Math.max(24, r + 8)} />
                <circle className="origo-marker-glow" cx={m.x} cy={m.y} r={r + 3} />
                <circle className="origo-marker-pill" cx={m.x} cy={m.y} r={r} />
                <text className="origo-marker-text" x={m.x} y={m.y}>{m.label}</text>
              </g>
            )
          })}
        </g>
      </svg>

      {/* Hover tooltip */}
      {hoveredCode && cardStyle && (
        <div style={{
          position: "absolute", left: cardStyle.left, top: cardStyle.top,
          zIndex: 30, pointerEvents: "none",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "10px 14px",
          boxShadow: "0 8px 24px rgba(0,0,0,.5)",
          minWidth: 160,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
            {hoveredDatum?.name ?? hoveredCode}
          </div>
          {hoveredDatum ? (
            <div style={{ fontSize: 12, color: "var(--accent)" }}>
              {hoveredDatum.count} {hoveredDatum.count === 1 ? "company" : "companies"}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "var(--text3)" }}>No data</div>
          )}
          {hoveredDatum && (
            <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4 }}>Click to filter</div>
          )}
        </div>
      )}

      {/* Selected country badge */}
      {selectedCountry && (
        <div style={{
          position: "absolute", bottom: 10, left: 10, zIndex: 20,
          display: "flex", alignItems: "center", gap: 6,
          background: "var(--accent-dim)", border: "1px solid var(--accent)",
          borderRadius: 20, padding: "4px 10px 4px 8px",
        }}>
          <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 500 }}>
            {dataMap.get(selectedCountry.toUpperCase())?.name ?? selectedCountry}
          </span>
          <button
            onClick={() => onClearSelection?.()}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 12, lineHeight: 1, padding: 0 }}
          >✕</button>
        </div>
      )}
    </div>
  )
}
