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

// ─── Projection ───────────────────────────────────────────────
const VIEWBOX = { width: 1000, height: 410 }
const MIN_ZOOM = 1
const MAX_ZOOM = 2.3
const ZOOM_STEP = 0.2
const LAT_MAX = 78
const LAT_MIN = -52

const project = (lon: number, lat: number) => {
  const clamped = Math.max(LAT_MIN, Math.min(LAT_MAX, lat))
  const x = ((lon + 180) / 360) * VIEWBOX.width
  const y = ((LAT_MAX - clamped) / (LAT_MAX - LAT_MIN)) * VIEWBOX.height
  return [x, y] as const
}

const ringToPath = (ring: number[][]) =>
  ring.map(([lon, lat], i) => {
    const [x, y] = project(lon, lat)
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
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
  let best: number[][] = [], bestArea = 0
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

// ─── Control button (round, like original) ───────────────────
function MapBtn({ onClick, disabled, title, children, yellow }: {
  onClick: () => void; disabled?: boolean; title?: string; children: React.ReactNode; yellow?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 32, height: 32, borderRadius: "50%",
        border: `1px solid ${yellow ? "#ffab2e" : "rgba(60,60,67,.12)"}`,
        background: yellow ? "var(--accent)" : "var(--surface)",
        color: yellow ? "#0d1117" : "var(--text2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? .4 : 1,
        boxShadow: "0 1px 4px rgba(0,0,0,.25)",
        backdropFilter: "blur(8px)",
        transition: "opacity .15s, background .15s",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

// ─── SVG Icons ────────────────────────────────────────────────
const IcoPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoMinus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoLocate = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/></svg>
const IcoReset = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>

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
  const [isFocused, setIsFocused] = useState(false)
  const [focusHint, setFocusHint] = useState<string | null>(null)
  const [userInteracted, setUserInteracted] = useState(false)

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
  const focusTimer = useRef<number | null>(null)

  const showHint = (msg: string) => {
    setFocusHint(msg)
    if (focusTimer.current) clearTimeout(focusTimer.current)
    focusTimer.current = window.setTimeout(() => setFocusHint(null), 2000)
  }

  // Load GeoJSON
  useEffect(() => {
    fetch("/world-countries.geojson")
      .then(r => { if (!r.ok) throw new Error("not found"); return r.json() })
      .then((json: { features: GeoFeature[] }) => setFeatures(json.features ?? []))
      .catch(() => setLoadError(true))
  }, [])

  const dataMap = useMemo(() => new Map(data.map(d => [d.code.toUpperCase(), d])), [data])

  const countryNameMap = useMemo(() => {
    const m = new Map<string, string>()
    features.forEach(f => {
      const code = getIso2(f.properties)
      const name = getName(f.properties)
      if (code && name) m.set(code, name)
    })
    return m
  }, [features])

  // Precompute paths
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

  const clampPan = useCallback((p: { x: number; y: number }, z: number) => {
    const maxX = (z - 1) * VIEWBOX.width / 2
    const maxY = (z - 1) * VIEWBOX.height / 2
    return { x: Math.max(-maxX, Math.min(maxX, p.x)), y: Math.max(-maxY, Math.min(maxY, p.y)) }
  }, [])

  const applyTransform = useCallback((p: { x: number; y: number }, z: number, animate = false) => {
    if (!groupRef.current) return
    const clamped = clampPan(p, z)
    const cx = VIEWBOX.width / 2, cy = VIEWBOX.height / 2
    const tx = clamped.x + cx - cx * z
    const ty = clamped.y + cy - cy * z
    if (animate) {
      groupRef.current.style.transition = "transform 420ms ease"
    } else {
      groupRef.current.style.transition = "none"
    }
    groupRef.current.setAttribute("transform", `translate(${tx} ${ty}) scale(${z})`)
  }, [clampPan])

  useEffect(() => { applyTransform(pan, zoom) }, [pan, zoom, applyTransform])

  // Scroll to zoom
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current + delta))
      if (nextZoom === zoomRef.current) return
      zoomRef.current = nextZoom
      if (nextZoom === MIN_ZOOM) { panRef.current = { x: 0, y: 0 }; setPan({ x: 0, y: 0 }) }
      setUserInteracted(true)
      setZoom(nextZoom)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  // Focus auto-zoom
  const doFocusZoom = useCallback(() => {
    if (!features.length || !data.length) return
    const codes = new Set(data.map(d => d.code.toUpperCase()))
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    const updateBounds = (lon: number, lat: number) => {
      const [x, y] = project(lon, lat)
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
    features.forEach(f => {
      const code = getIso2(f.properties)
      if (!code || !codes.has(code) || !f.geometry) return
      if (f.geometry.type === "Polygon") {
        f.geometry.coordinates.forEach(ring => ring.forEach(([lon, lat]) => updateBounds(lon, lat)))
      } else {
        f.geometry.coordinates.forEach(poly => poly.forEach(ring => ring.forEach(([lon, lat]) => updateBounds(lon, lat))))
      }
    })
    if (!isFinite(minX)) return
    const padding = 46
    const boundsW = Math.max(1, maxX - minX), boundsH = Math.max(1, maxY - minY)
    let nextZoom = Math.min((VIEWBOX.width - padding * 2) / boundsW, (VIEWBOX.height - padding * 2) / boundsH)
    nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom))
    if (data.length === 1) nextZoom = Math.min(nextZoom, 1.8)
    const cx = VIEWBOX.width / 2, cy = VIEWBOX.height / 2
    const nextPan = { x: (cx - (minX + maxX) / 2) * nextZoom, y: (cy - (minY + maxY) / 2) * nextZoom }
    panRef.current = nextPan; zoomRef.current = nextZoom
    applyTransform(nextPan, nextZoom, true)
    setIsAnimating(true)
    setZoom(nextZoom); setPan(nextPan)
    setTimeout(() => setIsAnimating(false), 420)
  }, [features, data, applyTransform])

  useEffect(() => {
    if (isFocused && !userInteracted && features.length) doFocusZoom()
  }, [isFocused, userInteracted, features, doFocusZoom])

  // Drag handlers
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== null) return
    if (frameRef.current) { cancelAnimationFrame(frameRef.current); frameRef.current = null }
    activePointer.current = e.pointerId
    lastPoint.current = { x: e.clientX, y: e.clientY }
    dragDist.current = 0; dragHappened.current = false
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== e.pointerId || !lastPoint.current) return
    const dx = e.clientX - lastPoint.current.x, dy = e.clientY - lastPoint.current.y
    lastPoint.current = { x: e.clientX, y: e.clientY }
    dragDist.current += Math.abs(dx) + Math.abs(dy)
    if (dragDist.current > 3) { dragHappened.current = true; setUserInteracted(true) }
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
    const clamped = clampPan(panRef.current, zoomRef.current)
    panRef.current = clamped; applyTransform(clamped, zoomRef.current)
    activePointer.current = null; lastPoint.current = null
    setIsDragging(false); setPan(clamped)
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

  const hoveredDatum = hoveredCode ? dataMap.get(hoveredCode.toUpperCase()) : undefined
  const hoveredName = hoveredCode
    ? (hoveredDatum?.name ?? countryNameMap.get(hoveredCode.toUpperCase()) ?? hoveredCode)
    : null

  const cardStyle = useMemo(() => {
    if (!hoverPos || !containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    const W = 200, H = 90
    let left = hoverPos.x + 14, top = hoverPos.y - H - 10
    if (left + W > rect.width - 8) left = rect.width - W - 8
    if (left < 8) left = 8
    if (top < 8) top = hoverPos.y + 14
    return { left, top }
  }, [hoverPos])

  const resetView = () => {
    applyTransform({ x: 0, y: 0 }, 1, true)
    setIsAnimating(true)
    setZoom(1); setPan({ x: 0, y: 0 })
    panRef.current = { x: 0, y: 0 }; zoomRef.current = 1
    setTimeout(() => setIsAnimating(false), 420)
    if (isFocused) setUserInteracted(false)
  }

  const toggleFocus = () => {
    if (isFocused) {
      setIsFocused(false); setUserInteracted(true)
      resetView()
      showHint("Focus off — pan and zoom freely")
    } else {
      setIsFocused(true); setUserInteracted(false)
      showHint("Focused on countries with data")
    }
  }

  const hasViewChange = Math.abs(zoom - 1) > 0.01 || Math.abs(pan.x) > 1 || Math.abs(pan.y) > 1

  const cx = VIEWBOX.width / 2, cy = VIEWBOX.height / 2
  const clamped = clampPan(pan, zoom)
  const transform = `translate(${clamped.x + cx - cx * zoom} ${clamped.y + cy - cy * zoom}) scale(${zoom})`

  if (loadError) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text3)", fontSize: 13 }}>
        Missing <code style={{ margin: "0 6px" }}>public/world-countries.geojson</code>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Controls — top right, round buttons like original */}
      <div style={{ position: "absolute", right: 10, top: 10, zIndex: 20, display: "flex", flexDirection: "column", gap: 6 }}>
        <MapBtn onClick={() => { const z = Math.min(MAX_ZOOM, zoomRef.current + ZOOM_STEP); zoomRef.current = z; setUserInteracted(true); setZoom(z) }} disabled={zoom >= MAX_ZOOM - 0.001} title="Zoom in"><IcoPlus /></MapBtn>
        <MapBtn onClick={() => { const z = Math.max(MIN_ZOOM, zoomRef.current - ZOOM_STEP); zoomRef.current = z; if (z === MIN_ZOOM) { panRef.current = { x: 0, y: 0 }; setPan({ x: 0, y: 0 }) } setUserInteracted(true); setZoom(z) }} disabled={zoom <= MIN_ZOOM + 0.001} title="Zoom out"><IcoMinus /></MapBtn>
        <MapBtn onClick={toggleFocus} yellow={isFocused} title={isFocused ? "Disable focus" : "Focus on data countries"}>
          <IcoLocate />
          {isFocused && <span style={{ position: "absolute", bottom: 4, right: 4, width: 6, height: 6, borderRadius: "50%", background: "#3dba6e" }} />}
        </MapBtn>
        {hasViewChange && (
          <MapBtn onClick={resetView} title="Reset view"><IcoReset /></MapBtn>
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
        <rect width={VIEWBOX.width} height={VIEWBOX.height} fill="var(--surface)" />
        <g
          ref={groupRef}
          transform={transform}
          style={{ willChange: "transform" }}
        >
          {renderedFeatures.map(f => {
            const isSelected = f.code && selectedCountry === f.code
            return (
              <path
                key={f.key}
                d={f.path}
                fill={isSelected ? "rgba(255,171,46,.22)" : "var(--surface2)"}
                stroke="var(--border)"
                strokeWidth="0.65"
                style={{ cursor: f.code ? "pointer" : "default", transition: "fill .15s" }}
                onClick={() => handleCountryClick(f.code)}
                onMouseEnter={f.code ? e => handleHoverEnter(f.code!, e) : undefined}
                onMouseMove={f.code ? handleHoverMove : undefined}
                onMouseLeave={f.code ? handleHoverLeave : undefined}
              />
            )
          })}

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
      {hoveredCode && cardStyle && hoveredName && (
        <div style={{
          position: "absolute", left: cardStyle.left, top: cardStyle.top,
          zIndex: 30, pointerEvents: "none",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "12px 14px",
          boxShadow: "0 8px 24px rgba(0,0,0,.5)",
          minWidth: 180,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
            {hoveredName}
          </div>
          {hoveredDatum ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "var(--surface2)", borderRadius: 6, border: "1px solid var(--border)", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>Companies</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{hoveredDatum.count}</span>
              </div>
              <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4 }}>Click to filter list</div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: "var(--text3)" }}>No data available</div>
          )}
        </div>
      )}

      {/* Focus hint */}
      {focusHint && (
        <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", zIndex: 20, pointerEvents: "none" }}>
          <span style={{ display: "inline-block", background: "rgba(22,28,39,.9)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "var(--text2)" }}>
            {focusHint}
          </span>
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
            {dataMap.get(selectedCountry.toUpperCase())?.name ?? countryNameMap.get(selectedCountry.toUpperCase()) ?? selectedCountry}
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
