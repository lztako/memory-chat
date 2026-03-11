"use client"

import { useMemo, useState, useRef } from "react"

type FileNode   = { id: string; fileName: string; fileType: string; rowCount: number }
type SkillNode  = { id: string; name: string; trigger: string; usageCount: number }
type MemoryNode = { id: string; type: string; content: string; importance: number; layer: string }
type TaskNode   = { id: string; title: string; status: string; priority: string }

type Props = {
  email: string
  files: FileNode[]
  skills: SkillNode[]
  memories: MemoryNode[]
  tasks: TaskNode[]
}

type GNode = {
  id: string
  x: number
  y: number
  kind: "user" | "category" | "leaf"
  label: string
  sublabel?: string
  color: string
  tooltip?: string[]
}

type GEdge = {
  x1: number; y1: number
  x2: number; y2: number
  fromKind: "user" | "category" | "leaf"
  toId: string
}

const W = 820
const H = 680
const CX = W / 2
const CY = H / 2 - 10
const CAT_R  = 158
const LEAF_R = 295

const CATS = {
  files:    { label: "FILES",   color: "var(--blue)",   angle: -Math.PI / 2 },
  skills:   { label: "SKILLS",  color: "var(--orange)", angle: 0 },
  memories: { label: "MEMORY",  color: "var(--green)",  angle: Math.PI / 2 },
  tasks:    { label: "TASKS",   color: "var(--red)",    angle: Math.PI },
} as const

function leafTooltip(key: keyof typeof CATS, item: FileNode | SkillNode | MemoryNode | TaskNode): string[] {
  if (key === "files") {
    const f = item as FileNode
    return [f.fileName, `${f.fileType} · ${f.rowCount} rows`]
  }
  if (key === "skills") {
    const s = item as SkillNode
    return [s.name, `used ${s.usageCount}×`, s.trigger.slice(0, 44) + (s.trigger.length > 44 ? "…" : "")]
  }
  if (key === "memories") {
    const m = item as MemoryNode
    return [m.content.slice(0, 55) + (m.content.length > 55 ? "…" : ""), `imp ${m.importance} · ${m.layer}`]
  }
  const t = item as TaskNode
  return [t.title, `${t.status} · ${t.priority}`]
}

function clip(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + "…" : s }

export function UserGraphView({ email, files, skills, memories, tasks }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; lines: string[] } | null>(null)

  const { nodes, edges } = useMemo(() => {
    const nodes: GNode[] = []
    const edges: GEdge[] = []

    // Center
    nodes.push({
      id: "user", x: CX, y: CY, kind: "user",
      label: clip(email.split("@")[0], 10),
      sublabel: clip("@" + email.split("@")[1], 14),
      color: "var(--text)",
    })

    const categories: { key: keyof typeof CATS; items: (FileNode | SkillNode | MemoryNode | TaskNode)[] }[] = [
      { key: "files",    items: files.slice(0, 5) },
      { key: "skills",   items: skills.slice(0, 5) },
      { key: "memories", items: memories.slice(0, 5) },
      { key: "tasks",    items: tasks.slice(0, 5) },
    ]

    for (const { key, items } of categories) {
      const meta = CATS[key]
      const cx2 = CX + CAT_R * Math.cos(meta.angle)
      const cy2 = CY + CAT_R * Math.sin(meta.angle)
      const catId = `cat-${key}`

      nodes.push({
        id: catId, x: cx2, y: cy2, kind: "category",
        label: meta.label, sublabel: String(items.length),
        color: meta.color,
      })
      edges.push({ x1: CX, y1: CY, x2: cx2, y2: cy2, fromKind: "user", toId: catId })

      const arc = Math.min(72, Math.max(20, items.length * 16)) * (Math.PI / 180)
      for (let i = 0; i < items.length; i++) {
        const offset = items.length === 1 ? 0 : ((i / (items.length - 1)) - 0.5) * arc
        const la = meta.angle + offset
        const lx = CX + LEAF_R * Math.cos(la)
        const ly = CY + LEAF_R * Math.sin(la)
        const leafId = `leaf-${key}-${i}`

        let label = ""
        if (key === "files")    label = clip((items[i] as FileNode).fileName, 13)
        if (key === "skills")   label = clip((items[i] as SkillNode).name, 13)
        if (key === "memories") label = clip((items[i] as MemoryNode).content, 13)
        if (key === "tasks")    label = clip((items[i] as TaskNode).title, 13)

        nodes.push({
          id: leafId, x: lx, y: ly, kind: "leaf",
          label, color: meta.color,
          tooltip: leafTooltip(key, items[i]),
        })
        edges.push({ x1: cx2, y1: cy2, x2: lx, y2: ly, fromKind: "category", toId: leafId })
      }
    }

    return { nodes, edges }
  }, [email, files, skills, memories, tasks])

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes])

  function handleMove(e: React.MouseEvent<SVGElement>, node: GNode) {
    if (!node.tooltip || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setTooltip({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 10, lines: node.tooltip })
    setHovered(node.id)
  }

  function handleLeave() {
    setHovered(null)
    setTooltip(null)
  }

  function edgePath({ x1, y1, x2, y2, fromKind }: GEdge) {
    if (fromKind === "user") {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
      return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`
    }
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }

  return (
    <div ref={containerRef} style={{ position: "relative", background: "var(--bg)", borderRadius: 10, border: "1.5px solid var(--border)", overflow: "hidden" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        onMouseLeave={handleLeave}
      >
        <defs>
          <pattern id="admin-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="var(--border)" strokeWidth="0.35" opacity="0.55" />
          </pattern>
        </defs>

        {/* Background grid */}
        <rect width={W} height={H} fill="url(#admin-grid)" />

        {/* Guide rings */}
        <circle cx={CX} cy={CY} r={CAT_R}  fill="none" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 7" opacity="0.35" />
        <circle cx={CX} cy={CY} r={LEAF_R} fill="none" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 7" opacity="0.2" />

        {/* Edges */}
        {edges.map((e, i) => {
          const toNode = nodeMap[e.toId]
          const lit = hovered === e.toId || (hovered && hovered.startsWith(`cat-`) && e.toId.startsWith(`leaf-${hovered.slice(4)}`))
          return (
            <path
              key={i}
              d={edgePath(e)}
              fill="none"
              stroke={lit ? (toNode?.color ?? "var(--border2)") : "var(--border)"}
              strokeWidth={lit ? 1.2 : 0.7}
              opacity={lit ? 0.7 : 0.35}
              style={{ transition: "stroke .12s, opacity .12s, stroke-width .12s" }}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const hov = hovered === node.id

          if (node.kind === "user") {
            return (
              <g key={node.id}>
                <circle cx={node.x} cy={node.y} r={38} fill="var(--surface2)" stroke="var(--border2)" strokeWidth="1" opacity="0.6" />
                <circle cx={node.x} cy={node.y} r={30} fill="var(--text)" />
                <text x={node.x} y={node.y - 5} textAnchor="middle" dominantBaseline="middle"
                  fill="var(--bg)" fontSize={9.5} fontFamily="var(--font-ibm-plex-mono), monospace" fontWeight={700} letterSpacing=".06em">
                  {node.label.toUpperCase()}
                </text>
                <text x={node.x} y={node.y + 9} textAnchor="middle" dominantBaseline="middle"
                  fill="var(--bg)" fontSize={7} fontFamily="var(--font-ibm-plex-mono), monospace" opacity={0.55} letterSpacing=".02em">
                  {node.sublabel}
                </text>
              </g>
            )
          }

          if (node.kind === "category") {
            return (
              <g key={node.id}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "default" }}
              >
                {hov && <circle cx={node.x} cy={node.y} r={34} fill="none" stroke={node.color} strokeWidth="0.8" opacity={0.25} />}
                <circle cx={node.x} cy={node.y} r={26} fill="var(--surface)" stroke={node.color} strokeWidth={hov ? 1.8 : 1.2}
                  style={{ transition: "stroke-width .12s" }} />
                <text x={node.x} y={node.y - 4} textAnchor="middle" dominantBaseline="middle"
                  fill={node.color} fontSize={8} fontFamily="var(--font-ibm-plex-mono), monospace" fontWeight={700} letterSpacing=".1em">
                  {node.label}
                </text>
                <text x={node.x} y={node.y + 8} textAnchor="middle" dominantBaseline="middle"
                  fill="var(--text3)" fontSize={11} fontFamily="var(--font-ibm-plex-mono), monospace">
                  {node.sublabel}
                </text>
              </g>
            )
          }

          // Leaf
          const bw = 76, bh = 21, rx = 4
          return (
            <g key={node.id}
              onMouseMove={e => handleMove(e, node)}
              onMouseLeave={handleLeave}
              style={{ cursor: "pointer" }}
            >
              <rect x={node.x - bw / 2} y={node.y - bh / 2} width={bw} height={bh} rx={rx}
                fill={hov ? "var(--surface2)" : "var(--surface)"}
                stroke={hov ? node.color : "var(--border)"}
                strokeWidth={hov ? 1.2 : 0.7}
                style={{ transition: "fill .1s, stroke .1s, stroke-width .1s" }}
              />
              <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="middle"
                fill={hov ? node.color : "var(--text3)"}
                fontSize={7.5} fontFamily="var(--font-ibm-plex-mono), monospace" letterSpacing=".02em"
                style={{ transition: "fill .1s" }}>
                {node.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: "absolute", left: tooltip.x, top: tooltip.y,
          background: "var(--surface)", border: "1px solid var(--border2)",
          borderRadius: 6, padding: "7px 10px",
          pointerEvents: "none", zIndex: 20, maxWidth: 230,
          boxShadow: "0 6px 20px rgba(0,0,0,.5)",
        }}>
          {tooltip.lines.map((line, i) => (
            <div key={i} style={{
              fontSize: i === 0 ? 11 : 10,
              fontFamily: "var(--font-ibm-plex-mono), monospace",
              color: i === 0 ? "var(--text)" : "var(--text3)",
              lineHeight: 1.55,
              marginBottom: i === 0 && tooltip.lines.length > 1 ? 3 : 0,
            }}>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{ position: "absolute", bottom: 14, right: 16, display: "flex", gap: 14 }}>
        {Object.entries(CATS).map(([key, meta]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: meta.color }} />
            <span style={{ fontSize: 7.5, fontFamily: "var(--font-ibm-plex-mono), monospace", letterSpacing: ".08em", color: "var(--text3)", textTransform: "uppercase" }}>
              {meta.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
