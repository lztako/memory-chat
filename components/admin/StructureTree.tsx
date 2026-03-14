"use client"

import { useState, useCallback, useEffect } from "react"

// ── Types ─────────────────────────────────────────────────────────────────────
type FileEntry = { id: string; fileName: string; fileType: string; description: string | null; rowCount: number; columns: string[]; createdAt: string }
type SkillEntry = { id: string; name: string; trigger: string; solution: string; tools: string[]; usageCount: number; createdAt: string }
type MemoryEntry = { id: string; type: string; content: string; importance: number; layer: string; createdAt: string }
type AgentEntry = { id: string; name: string; description: string; systemPrompt: string; tools: string[]; model: string; maxTurns: number; isActive: boolean; createdAt: string }
type ResourceDoc = { id: string; title: string; docType: string; parentType: string }
type SkillDoc = { id: string; parentId: string | null; title: string; content: string; docType: string; parentType: string }

type SelectedNode =
  | { kind: "skill"; data: SkillEntry }
  | { kind: "skill-doc"; data: SkillDoc; skillId: string }
  | { kind: "resource"; data: ResourceDoc & { content?: string } }
  | { kind: "agent"; data: AgentEntry; isGlobal: boolean }
  | { kind: "file"; data: FileEntry }
  | { kind: "memory"; data: MemoryEntry }

export interface StructureTreeProps {
  userId: string
  secret: string
  files: FileEntry[]
  skills: SkillEntry[]
  memories: MemoryEntry[]
  agents: { global: AgentEntry[]; perUser: AgentEntry[] }
  resources: ResourceDoc[]
  onRefresh: () => void
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MONO = "var(--font-ibm-plex-mono), monospace"
const SANS = "var(--font-ibm-plex-sans), sans-serif"
const BORDER = "1.5px solid var(--border)"
const DOC_TYPE_OPTIONS = ["reference", "example", "workflow", "overview", "contact", "product"]
const DOC_TYPE_COLOR: Record<string, string> = {
  overview: "var(--blue)", contact: "var(--green)", workflow: "var(--orange)",
  product: "#a78bfa", reference: "var(--text2)", example: "var(--text3)",
}
const FILE_TYPE_COLOR: Record<string, string> = {
  shipment: "var(--blue)", invoice: "var(--green)", product: "#a78bfa",
  customer: "var(--orange)", lead: "var(--red)", other: "var(--text3)",
}
const MEMORY_TYPE_COLOR: Record<string, string> = {
  user_config: "var(--orange)", long_term: "var(--blue)", daily_log: "var(--text3)",
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function Icon({ d, size = 14, color }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color ?? "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  )
}

const ICONS = {
  chevronDown: "M19 9l-7 7-7-7",
  chevronRight: "M9 18l6-6-6-6",
  skill: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  doc: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  agent: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  file: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  memory: "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
  plus: "M12 5v14M5 12h14",
  folder: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z",
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "7px 10px", borderRadius: 6, border: BORDER,
  background: "var(--bg)", color: "var(--text)",
  fontSize: 12, fontFamily: MONO, outline: "none",
}
const btnPrimary: React.CSSProperties = {
  background: "var(--text)", color: "var(--bg)", border: "none",
  borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 600,
  cursor: "pointer", fontFamily: SANS,
}
const btnGhost: React.CSSProperties = {
  background: "none", color: "var(--text3)", border: BORDER,
  borderRadius: 6, padding: "6px 12px", fontSize: 11,
  cursor: "pointer", fontFamily: SANS,
}
const labelStyle: React.CSSProperties = {
  fontSize: 10, fontFamily: MONO, letterSpacing: ".08em",
  textTransform: "uppercase", color: "var(--text3)", marginBottom: 4, display: "block",
}
const tagStyle = (color: string): React.CSSProperties => ({
  fontSize: 8, fontFamily: MONO, letterSpacing: ".06em",
  padding: "2px 6px", borderRadius: 3,
  background: "var(--surface2)", border: BORDER,
  color, display: "inline-block",
})

// ── Tree Row ─────────────────────────────────────────────────────────────────
function TreeRow({ depth = 0, icon, label, tag, tagColor, selected, onClick, dim }: {
  depth?: number; icon: string; label: string
  tag?: string; tagColor?: string; selected?: boolean; onClick: () => void; dim?: boolean
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: `5px ${8 + depth * 16}px 5px ${8 + depth * 16}px`,
        borderRadius: 6, cursor: "pointer",
        background: selected ? "rgba(139,115,85,.13)" : "none",
        opacity: dim ? 0.5 : 1,
        transition: "background .1s",
      }}
    >
      <Icon d={icon} size={12} />
      <span style={{ fontSize: 11, fontWeight: selected ? 600 : 400, color: "var(--text)", fontFamily: SANS, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      {tag && <span style={tagStyle(tagColor ?? "var(--text3)")}>{tag}</span>}
    </div>
  )
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ label, count, expanded, onToggle, onAdd }: {
  label: string; count: number; expanded: boolean; onToggle: () => void; onAdd?: () => void
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "6px 4px 2px" }}>
      <button onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, flex: 1, padding: "2px 4px", color: "var(--text3)" }}>
        <Icon d={expanded ? ICONS.chevronDown : ICONS.chevronRight} size={11} />
        <span style={{ fontSize: 9, fontFamily: MONO, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text3)" }}>
          {label}
        </span>
        <span style={{ fontSize: 9, fontFamily: MONO, color: "var(--text3)", opacity: 0.6 }}>{count}</span>
      </button>
      {onAdd && (
        <button onClick={onAdd} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 3, display: "flex" }}>
          <Icon d={ICONS.plus} size={11} />
        </button>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function StructureTree({ userId, secret, files, skills, memories, agents, resources, onRefresh }: StructureTreeProps) {
  const [skillDocs, setSkillDocs] = useState<Map<string, SkillDoc[]>>(new Map())
  const [sections, setSections] = useState({ skills: true, agents: false, resources: false, files: false, memory: false })
  const [skillExpanded, setSkillExpanded] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<SelectedNode | null>(null)

  // Editor state
  const [editName, setEditName] = useState("")
  const [editTrigger, setEditTrigger] = useState("")
  const [editSolution, setEditSolution] = useState("")
  const [editTools, setEditTools] = useState("")
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editDocType, setEditDocType] = useState("reference")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Add forms
  const [showAddSkill, setShowAddSkill] = useState(false)
  const [newSkill, setNewSkill] = useState({ name: "", trigger: "", solution: "", tools: "" })
  const [addingSkill, setAddingSkill] = useState(false)
  const [addingDocFor, setAddingDocFor] = useState<string | null>(null)
  const [newDoc, setNewDoc] = useState({ title: "", docType: "reference", content: "" })
  const [addingDoc, setAddingDoc] = useState(false)

  const auth = { Authorization: `Bearer ${secret}` }

  // ── Load skill docs ─────────────────────────────────────────────────────────
  async function loadSkillDocs(skillId: string) {
    if (skillDocs.has(skillId)) return
    const r = await fetch(`/api/admin/users/${userId}/docs?parentType=skill&parentId=${skillId}`, { headers: auth })
    if (r.ok) {
      const { docs } = await r.json()
      setSkillDocs(prev => new Map(prev).set(skillId, docs))
    }
  }

  function toggleSkill(skillId: string) {
    setSkillExpanded(prev => {
      const next = new Set(prev)
      if (next.has(skillId)) { next.delete(skillId) }
      else { next.add(skillId); loadSkillDocs(skillId) }
      return next
    })
  }

  // ── Select helpers ──────────────────────────────────────────────────────────
  function selectSkill(skill: SkillEntry) {
    setSelected({ kind: "skill", data: skill })
    setEditName(skill.name); setEditTrigger(skill.trigger)
    setEditSolution(skill.solution); setEditTools(skill.tools.join(", "))
    setConfirmDelete(false); setSaved(false)
  }

  function selectDoc(doc: SkillDoc, skillId: string) {
    setSelected({ kind: "skill-doc", data: doc, skillId })
    setEditTitle(doc.title); setEditContent(doc.content); setEditDocType(doc.docType)
    setConfirmDelete(false); setSaved(false)
  }

  function selectResource(doc: ResourceDoc) {
    // Fetch full content
    fetch(`/api/admin/users/${userId}/docs/${doc.id}`, { headers: auth })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const full = d?.doc ?? doc
        setSelected({ kind: "resource", data: full })
        setEditTitle(full.title); setEditContent(full.content ?? ""); setEditDocType(full.docType)
        setConfirmDelete(false); setSaved(false)
      })
  }

  function selectAgent(agent: AgentEntry, isGlobal: boolean) {
    setSelected({ kind: "agent", data: agent, isGlobal })
    setConfirmDelete(false); setSaved(false)
  }

  // ── Save / Delete ───────────────────────────────────────────────────────────
  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      if (selected.kind === "skill") {
        const tools = editTools.split(",").map(t => t.trim()).filter(Boolean)
        await fetch(`/api/admin/users/${userId}/skills/${selected.data.id}`, {
          method: "PATCH", headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName, trigger: editTrigger, solution: editSolution, tools }),
        })
        onRefresh()
      } else if (selected.kind === "skill-doc") {
        await fetch(`/api/admin/users/${userId}/docs/${selected.data.id}`, {
          method: "PATCH", headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({ title: editTitle, content: editContent, docType: editDocType }),
        })
        const { skillId } = selected
        setSkillDocs(prev => {
          const next = new Map(prev)
          next.set(skillId, (next.get(skillId) ?? []).map(d =>
            d.id === selected.data.id ? { ...d, title: editTitle, content: editContent, docType: editDocType } : d
          ))
          return next
        })
      } else if (selected.kind === "resource") {
        await fetch(`/api/admin/users/${userId}/docs/${selected.data.id}`, {
          method: "PATCH", headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({ title: editTitle, content: editContent, docType: editDocType }),
        })
        onRefresh()
      }
      setSaved(true); setTimeout(() => setSaved(false), 1800)
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!selected) return
    if (selected.kind === "skill") {
      await fetch(`/api/admin/users/${userId}/skills/${selected.data.id}`, { method: "DELETE", headers: auth })
      setSkillExpanded(prev => { const n = new Set(prev); n.delete(selected.data.id); return n })
      setSkillDocs(prev => { const n = new Map(prev); n.delete(selected.data.id); return n })
    } else if (selected.kind === "skill-doc") {
      await fetch(`/api/admin/users/${userId}/docs/${selected.data.id}`, { method: "DELETE", headers: auth })
      const { skillId } = selected
      setSkillDocs(prev => {
        const n = new Map(prev)
        n.set(skillId, (n.get(skillId) ?? []).filter(d => d.id !== selected.data.id))
        return n
      })
    } else if (selected.kind === "resource") {
      await fetch(`/api/admin/users/${userId}/docs/${selected.data.id}`, { method: "DELETE", headers: auth })
    }
    setSelected(null); setConfirmDelete(false); onRefresh()
  }

  async function handleAddSkill(e: React.FormEvent) {
    e.preventDefault(); setAddingSkill(true)
    try {
      const tools = newSkill.tools.split(",").map(t => t.trim()).filter(Boolean)
      const r = await fetch(`/api/admin/users/${userId}/skills`, {
        method: "POST", headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSkill.name, trigger: newSkill.trigger, solution: newSkill.solution, tools }),
      })
      if (r.ok) { onRefresh(); setShowAddSkill(false); setNewSkill({ name: "", trigger: "", solution: "", tools: "" }) }
    } finally { setAddingSkill(false) }
  }

  async function handleAddDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!addingDocFor) return
    setAddingDoc(true)
    try {
      const r = await fetch(`/api/admin/users/${userId}/docs`, {
        method: "POST", headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ title: newDoc.title, docType: newDoc.docType, content: newDoc.content, parentType: "skill", parentId: addingDocFor }),
      })
      if (r.ok) {
        const { doc } = await r.json()
        setSkillDocs(prev => new Map(prev).set(addingDocFor!, [...(prev.get(addingDocFor!) ?? []), doc]))
        setAddingDocFor(null); setNewDoc({ title: "", docType: "reference", content: "" })
      }
    } finally { setAddingDoc(false) }
  }

  async function toggleAgentActive(agent: AgentEntry) {
    await fetch(`/api/admin/users/${userId}/agents`, {
      method: "PATCH", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: agent.id, isActive: !agent.isActive }),
    })
    onRefresh()
    setSelected(prev => prev?.kind === "agent" ? { ...prev, data: { ...prev.data, isActive: !prev.data.isActive } } : prev)
  }

  // ── Tree Sections ────────────────────────────────────────────────────────────
  const memByType = {
    config: memories.filter(m => m.type === "user_config"),
    longTerm: memories.filter(m => m.type === "long_term"),
    dailyLog: memories.filter(m => m.type === "daily_log"),
  }

  function toggleSection(key: keyof typeof sections) {
    setSections(p => ({ ...p, [key]: !p[key] }))
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", gap: 0, minHeight: 520, border: BORDER, borderRadius: 8, overflow: "hidden" }}>

      {/* ── Left: Tree ─────────────────────────────────────────────────────── */}
      <div style={{ width: 280, flexShrink: 0, borderRight: BORDER, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ padding: "10px 12px 6px", borderBottom: BORDER }}>
          <span style={{ fontSize: 9, fontFamily: MONO, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text3)" }}>
            AI Environment
          </span>
        </div>

        <div style={{ flex: 1, padding: "6px 4px", overflowY: "auto" }}>

          {/* ── skills/ ── */}
          <SectionHeader
            label="skills/" count={skills.length}
            expanded={sections.skills} onToggle={() => toggleSection("skills")}
            onAdd={() => { setSections(p => ({ ...p, skills: true })); setShowAddSkill(true) }}
          />
          {sections.skills && (
            <div style={{ marginBottom: 4 }}>
              {skills.map(skill => {
                const isExp = skillExpanded.has(skill.id)
                const isSel = selected?.kind === "skill" && selected.data.id === skill.id
                const docs = skillDocs.get(skill.id) ?? []
                return (
                  <div key={skill.id}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <button onClick={() => toggleSkill(skill.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", color: "var(--text3)", display: "flex" }}>
                        <Icon d={isExp ? ICONS.chevronDown : ICONS.chevronRight} size={11} />
                      </button>
                      <div onClick={() => selectSkill(skill)} style={{
                        flex: 1, display: "flex", alignItems: "center", gap: 6,
                        padding: "4px 6px 4px 0", borderRadius: 6, cursor: "pointer",
                        background: isSel ? "rgba(139,115,85,.13)" : "none",
                      }}>
                        <Icon d={ICONS.skill} size={12} />
                        <span style={{ fontSize: 11, fontFamily: MONO, color: "var(--text)", flex: 1 }}>{skill.name}</span>
                        <span style={{ fontSize: 8, fontFamily: MONO, color: "var(--text3)", paddingRight: 4 }}>
                          {isExp && docs.length > 0 ? `${docs.length}` : ""}
                        </span>
                      </div>
                    </div>
                    {isExp && (
                      <div style={{ marginLeft: 28, borderLeft: BORDER, paddingLeft: 10, marginBottom: 4 }}>
                        {!skillDocs.has(skill.id) && (
                          <div style={{ fontSize: 10, color: "var(--text3)", padding: "3px 0", fontFamily: MONO }}>loading...</div>
                        )}
                        {docs.map(doc => {
                          const isSel = selected?.kind === "skill-doc" && selected.data.id === doc.id
                          return (
                            <div key={doc.id} onClick={() => selectDoc(doc, skill.id)} style={{
                              display: "flex", alignItems: "center", gap: 5, padding: "4px 6px",
                              borderRadius: 6, cursor: "pointer",
                              background: isSel ? "rgba(139,115,85,.13)" : "none",
                            }}>
                              <Icon d={ICONS.doc} size={11} />
                              <span style={{ fontSize: 10, fontFamily: SANS, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</span>
                              <span style={{ ...tagStyle(DOC_TYPE_COLOR[doc.docType] ?? "var(--text3)"), fontSize: 7 }}>{doc.docType}</span>
                            </div>
                          )
                        })}
                        {addingDocFor === skill.id ? (
                          <form onSubmit={handleAddDoc} style={{ display: "flex", flexDirection: "column", gap: 5, padding: "6px 0" }}>
                            <input style={{ ...inputStyle, fontSize: 11 }} placeholder="Title" required
                              value={newDoc.title} onChange={e => setNewDoc(p => ({ ...p, title: e.target.value }))} />
                            <select style={{ ...inputStyle, fontSize: 11, cursor: "pointer" }}
                              value={newDoc.docType} onChange={e => setNewDoc(p => ({ ...p, docType: e.target.value }))}>
                              {DOC_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <textarea style={{ ...inputStyle, fontSize: 11, minHeight: 50, resize: "vertical" }} placeholder="Content"
                              value={newDoc.content} onChange={e => setNewDoc(p => ({ ...p, content: e.target.value }))} />
                            <div style={{ display: "flex", gap: 5 }}>
                              <button type="submit" style={{ ...btnPrimary, fontSize: 10, padding: "4px 10px" }} disabled={addingDoc}>
                                {addingDoc ? "..." : "Add"}
                              </button>
                              <button type="button" style={{ ...btnGhost, fontSize: 10, padding: "4px 8px" }} onClick={() => setAddingDocFor(null)}>Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <button onClick={() => { setAddingDocFor(skill.id); loadSkillDocs(skill.id) }}
                            style={{ ...btnGhost, marginTop: 3, fontSize: 9, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                            <Icon d={ICONS.plus} size={9} /> Add doc
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {showAddSkill ? (
                <form onSubmit={handleAddSkill} style={{ display: "flex", flexDirection: "column", gap: 5, padding: "6px 4px" }}>
                  <input style={{ ...inputStyle, fontSize: 11 }} placeholder="Skill name" required
                    value={newSkill.name} onChange={e => setNewSkill(p => ({ ...p, name: e.target.value }))} />
                  <input style={{ ...inputStyle, fontSize: 11 }} placeholder="Trigger keywords" required
                    value={newSkill.trigger} onChange={e => setNewSkill(p => ({ ...p, trigger: e.target.value }))} />
                  <textarea style={{ ...inputStyle, fontSize: 11, minHeight: 50, resize: "vertical" }} placeholder="SKILL.md"
                    value={newSkill.solution} onChange={e => setNewSkill(p => ({ ...p, solution: e.target.value }))} />
                  <input style={{ ...inputStyle, fontSize: 11 }} placeholder="Tools (comma-sep, optional)"
                    value={newSkill.tools} onChange={e => setNewSkill(p => ({ ...p, tools: e.target.value }))} />
                  <div style={{ display: "flex", gap: 5 }}>
                    <button type="submit" style={{ ...btnPrimary, fontSize: 10, padding: "4px 10px" }} disabled={addingSkill}>
                      {addingSkill ? "..." : "Add skill"}
                    </button>
                    <button type="button" style={{ ...btnGhost, fontSize: 10, padding: "4px 8px" }} onClick={() => setShowAddSkill(false)}>Cancel</button>
                  </div>
                </form>
              ) : skills.length === 0 && (
                <div style={{ padding: "6px 8px", fontSize: 10, color: "var(--text3)", fontFamily: MONO }}>No skills</div>
              )}
            </div>
          )}

          {/* ── agents/ ── */}
          <SectionHeader label="agents/" count={agents.global.length + agents.perUser.length} expanded={sections.agents} onToggle={() => toggleSection("agents")} />
          {sections.agents && (
            <div style={{ marginBottom: 4 }}>
              {agents.global.length > 0 && (
                <div style={{ padding: "2px 12px 1px", fontSize: 8, fontFamily: MONO, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text3)" }}>global</div>
              )}
              {agents.global.map(a => (
                <TreeRow key={a.id} depth={1} icon={ICONS.agent} label={a.name} tag="global" tagColor="var(--text3)"
                  selected={selected?.kind === "agent" && selected.data.id === a.id}
                  onClick={() => selectAgent(a, true)} dim />
              ))}
              {agents.perUser.length > 0 && (
                <div style={{ padding: "2px 12px 1px", fontSize: 8, fontFamily: MONO, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text3)" }}>user</div>
              )}
              {agents.perUser.map(a => (
                <TreeRow key={a.id} depth={1} icon={ICONS.agent} label={a.name}
                  tag={a.isActive ? "active" : "off"} tagColor={a.isActive ? "var(--green)" : "var(--text3)"}
                  selected={selected?.kind === "agent" && selected.data.id === a.id}
                  onClick={() => selectAgent(a, false)} />
              ))}
              {agents.global.length === 0 && agents.perUser.length === 0 && (
                <div style={{ padding: "4px 8px", fontSize: 10, color: "var(--text3)", fontFamily: MONO }}>No agents</div>
              )}
            </div>
          )}

          {/* ── resources/ ── */}
          <SectionHeader label="resources/" count={resources.length} expanded={sections.resources} onToggle={() => toggleSection("resources")} />
          {sections.resources && (
            <div style={{ marginBottom: 4 }}>
              {resources.map(doc => (
                <TreeRow key={doc.id} depth={1} icon={ICONS.doc} label={doc.title}
                  tag={doc.docType} tagColor={DOC_TYPE_COLOR[doc.docType] ?? "var(--text3)"}
                  selected={selected?.kind === "resource" && selected.data.id === doc.id}
                  onClick={() => selectResource(doc)} />
              ))}
              {resources.length === 0 && (
                <div style={{ padding: "4px 8px", fontSize: 10, color: "var(--text3)", fontFamily: MONO }}>No resources</div>
              )}
            </div>
          )}

          {/* ── files/ ── */}
          <SectionHeader label="files/" count={files.length} expanded={sections.files} onToggle={() => toggleSection("files")} />
          {sections.files && (
            <div style={{ marginBottom: 4 }}>
              {files.map(f => (
                <TreeRow key={f.id} depth={1} icon={ICONS.file} label={f.fileName}
                  tag={f.fileType} tagColor={FILE_TYPE_COLOR[f.fileType] ?? "var(--text3)"}
                  selected={selected?.kind === "file" && selected.data.id === f.id}
                  onClick={() => { setSelected({ kind: "file", data: f }); setConfirmDelete(false) }} />
              ))}
              {files.length === 0 && (
                <div style={{ padding: "4px 8px", fontSize: 10, color: "var(--text3)", fontFamily: MONO }}>No files</div>
              )}
            </div>
          )}

          {/* ── memory/ ── */}
          <SectionHeader label="memory/" count={memories.length} expanded={sections.memory} onToggle={() => toggleSection("memory")} />
          {sections.memory && (
            <div style={{ marginBottom: 4 }}>
              {[
                { label: "AI Config", items: memByType.config, color: MEMORY_TYPE_COLOR.user_config },
                { label: "Long-term", items: memByType.longTerm, color: MEMORY_TYPE_COLOR.long_term },
                { label: "Daily log", items: memByType.dailyLog, color: MEMORY_TYPE_COLOR.daily_log },
              ].map(({ label, items, color }) => items.length > 0 && (
                <div key={label}>
                  <div style={{ padding: "2px 12px 1px", fontSize: 8, fontFamily: MONO, letterSpacing: ".08em", textTransform: "uppercase", color }}>{label} · {items.length}</div>
                  {items.map(m => (
                    <TreeRow key={m.id} depth={1} icon={ICONS.memory} label={m.content.slice(0, 40) + (m.content.length > 40 ? "…" : "")}
                      selected={selected?.kind === "memory" && selected.data.id === m.id}
                      onClick={() => { setSelected({ kind: "memory", data: m }); setConfirmDelete(false) }} />
                  ))}
                </div>
              ))}
              {memories.length === 0 && (
                <div style={{ padding: "4px 8px", fontSize: 10, color: "var(--text3)", fontFamily: MONO }}>No memories</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Editor/Viewer ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, minWidth: 0, overflowY: "auto" }}>
        {!selected ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text3)", fontFamily: MONO }}>Select a node to view or edit</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 12, borderBottom: BORDER }}>
              <span style={{ fontSize: 10, fontFamily: MONO, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text3)" }}>
                {selected.kind.replace("-", " ")}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: SANS }}>
                {selected.kind === "skill" ? selected.data.name
                  : selected.kind === "skill-doc" ? selected.data.title
                  : selected.kind === "resource" ? selected.data.title
                  : selected.kind === "agent" ? selected.data.name
                  : selected.kind === "file" ? selected.data.fileName
                  : selected.data.type}
              </span>
            </div>

            {/* ── Skill editor ── */}
            {selected.kind === "skill" && (
              <>
                <div><label style={labelStyle}>Name</label>
                  <input style={inputStyle} value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div><label style={labelStyle}>Trigger keywords</label>
                  <input style={inputStyle} value={editTrigger} onChange={e => setEditTrigger(e.target.value)} placeholder="keyword1 keyword2" />
                </div>
                <div><label style={labelStyle}>Tools (comma-separated)</label>
                  <input style={inputStyle} value={editTools} onChange={e => setEditTools(e.target.value)} placeholder="query_user_file, render_artifact" />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>SKILL.md</label>
                  <textarea style={{ ...inputStyle, flex: 1, minHeight: 200, resize: "vertical", lineHeight: 1.5 }}
                    value={editSolution} onChange={e => setEditSolution(e.target.value)} />
                </div>
              </>
            )}

            {/* ── Skill-doc / Resource editor ── */}
            {(selected.kind === "skill-doc" || selected.kind === "resource") && (
              <>
                <div><label style={labelStyle}>Title</label>
                  <input style={inputStyle} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                </div>
                <div><label style={labelStyle}>Doc type</label>
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={editDocType} onChange={e => setEditDocType(e.target.value)}>
                    {DOC_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>Content</label>
                  <textarea style={{ ...inputStyle, flex: 1, minHeight: 200, resize: "vertical", lineHeight: 1.5 }}
                    value={editContent} onChange={e => setEditContent(e.target.value)} />
                </div>
              </>
            )}

            {/* ── Agent viewer ── */}
            {selected.kind === "agent" && (
              <>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={tagStyle(selected.data.isActive ? "var(--green)" : "var(--text3)")}>{selected.data.isActive ? "active" : "inactive"}</span>
                  <span style={tagStyle("var(--text3)")}>{selected.data.model.includes("haiku") ? "haiku" : "sonnet"}</span>
                  <span style={tagStyle("var(--text3)")}>max {selected.data.maxTurns} turns</span>
                </div>
                <div><label style={labelStyle}>Description</label>
                  <div style={{ fontSize: 12, color: "var(--text2)", fontFamily: SANS, lineHeight: 1.6 }}>{selected.data.description}</div>
                </div>
                <div><label style={labelStyle}>Tools</label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {selected.data.tools.map(t => <span key={t} style={tagStyle("var(--blue)")}>{t}</span>)}
                  </div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>System prompt</label>
                  <div style={{ ...inputStyle, flex: 1, minHeight: 120, overflowY: "auto", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--text2)" }}>
                    {selected.data.systemPrompt}
                  </div>
                </div>
                {!selected.isGlobal && (
                  <button onClick={() => toggleAgentActive(selected.data)} style={{ ...btnGhost, alignSelf: "flex-start" }}>
                    {selected.data.isActive ? "Disable agent" : "Enable agent"}
                  </button>
                )}
              </>
            )}

            {/* ── File viewer ── */}
            {selected.kind === "file" && (
              <>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={tagStyle(FILE_TYPE_COLOR[selected.data.fileType] ?? "var(--text3)")}>{selected.data.fileType}</span>
                  <span style={tagStyle("var(--text3)")}>{selected.data.rowCount} rows</span>
                  <span style={tagStyle("var(--text3)")}>{selected.data.columns.length} columns</span>
                </div>
                {selected.data.description && (
                  <div><label style={labelStyle}>Description</label>
                    <div style={{ fontSize: 12, color: "var(--text2)", fontFamily: SANS }}>{selected.data.description}</div>
                  </div>
                )}
                <div><label style={labelStyle}>Columns</label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {selected.data.columns.map(c => <span key={c} style={tagStyle("var(--text2)")}>{c}</span>)}
                  </div>
                </div>
                <div style={{ fontSize: 10, fontFamily: MONO, color: "var(--text3)" }}>
                  ID: {selected.data.id}
                </div>
              </>
            )}

            {/* ── Memory viewer ── */}
            {selected.kind === "memory" && (
              <>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={tagStyle(MEMORY_TYPE_COLOR[selected.data.type] ?? "var(--text3)")}>{selected.data.type}</span>
                  <span style={tagStyle("var(--text3)")}>importance {selected.data.importance}</span>
                  <span style={tagStyle("var(--text3)")}>{selected.data.layer}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Content</label>
                  <div style={{ ...inputStyle, minHeight: 80, overflowY: "auto", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--text2)" }}>
                    {selected.data.content}
                  </div>
                </div>
              </>
            )}

            {/* ── Actions (only for editable nodes) ── */}
            {(selected.kind === "skill" || selected.kind === "skill-doc" || selected.kind === "resource") && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 4 }}>
                <button onClick={handleSave} style={btnPrimary} disabled={saving}>
                  {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
                </button>
                {confirmDelete ? (
                  <>
                    <span style={{ fontSize: 11, color: "var(--red)", fontFamily: SANS }}>Delete?</span>
                    <button onClick={handleDelete} style={{ ...btnGhost, color: "var(--red)", borderColor: "var(--red)" }}>Confirm</button>
                    <button onClick={() => setConfirmDelete(false)} style={btnGhost}>Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} style={{ ...btnGhost, marginLeft: "auto" }}>Delete</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
