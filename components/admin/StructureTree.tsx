"use client"

import { useState, useCallback, useEffect } from "react"

type Skill = {
  id: string; name: string; trigger: string; solution: string
  tools: string[]; usageCount: number; createdAt: string
}
type SkillDoc = {
  id: string; parentId: string | null; title: string; content: string; docType: string; parentType: string
}
type SelectedNode =
  | { kind: "skill"; data: Skill }
  | { kind: "skill-doc"; data: SkillDoc; skillId: string }

function Icon({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const DOC_TYPE_OPTIONS = ["reference", "example", "workflow", "overview", "contact", "product"]
const DOC_TYPE_COLOR: Record<string, string> = {
  overview: "var(--blue)", contact: "var(--green)", workflow: "var(--orange)",
  product: "#a78bfa", reference: "var(--text2)", example: "var(--text3)",
}

const MONO = "var(--font-ibm-plex-mono), monospace"
const SANS = "var(--font-ibm-plex-sans), sans-serif"

interface StructureTreeProps {
  userId: string
  secret: string
}

export function StructureTree({ userId, secret }: StructureTreeProps) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [skillDocs, setSkillDocs] = useState<Map<string, SkillDoc[]>>(new Map())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<SelectedNode | null>(null)
  const [loading, setLoading] = useState(true)

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

  const loadSkills = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/admin/users/${userId}/skills`, { headers: auth })
    if (r.ok) { const { skills: s } = await r.json(); setSkills(s) }
    setLoading(false)
  }, [userId, secret])

  useEffect(() => { loadSkills() }, [loadSkills])

  async function loadSkillDocs(skillId: string) {
    if (skillDocs.has(skillId)) return
    const r = await fetch(`/api/admin/users/${userId}/docs?parentType=skill&parentId=${skillId}`, { headers: auth })
    if (r.ok) {
      const { docs } = await r.json()
      setSkillDocs(prev => new Map(prev).set(skillId, docs))
    }
  }

  function toggleExpand(skillId: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(skillId)) { next.delete(skillId) }
      else { next.add(skillId); loadSkillDocs(skillId) }
      return next
    })
  }

  function selectSkill(skill: Skill) {
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
        setSkills(prev => prev.map(s => s.id === selected.data.id
          ? { ...s, name: editName, trigger: editTrigger, solution: editSolution, tools }
          : s))
      } else {
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
      }
      setSaved(true); setTimeout(() => setSaved(false), 1800)
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!selected) return
    if (selected.kind === "skill") {
      await fetch(`/api/admin/users/${userId}/skills/${selected.data.id}`, { method: "DELETE", headers: auth })
      setSkills(prev => prev.filter(s => s.id !== selected.data.id))
      setExpanded(prev => { const n = new Set(prev); n.delete(selected.data.id); return n })
      setSkillDocs(prev => { const n = new Map(prev); n.delete(selected.data.id); return n })
    } else {
      await fetch(`/api/admin/users/${userId}/docs/${selected.data.id}`, { method: "DELETE", headers: auth })
      const { skillId } = selected
      setSkillDocs(prev => {
        const n = new Map(prev)
        n.set(skillId, (n.get(skillId) ?? []).filter(d => d.id !== selected.data.id))
        return n
      })
    }
    setSelected(null); setConfirmDelete(false)
  }

  async function handleAddSkill(e: React.FormEvent) {
    e.preventDefault(); setAddingSkill(true)
    try {
      const tools = newSkill.tools.split(",").map(t => t.trim()).filter(Boolean)
      const r = await fetch(`/api/admin/users/${userId}/skills`, {
        method: "POST", headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSkill.name, trigger: newSkill.trigger, solution: newSkill.solution, tools }),
      })
      if (r.ok) {
        const { skill } = await r.json()
        setSkills(prev => [...prev, skill])
        setShowAddSkill(false)
        setNewSkill({ name: "", trigger: "", solution: "", tools: "" })
      }
    } finally { setAddingSkill(false) }
  }

  async function handleAddDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!addingDocFor) return
    setAddingDoc(true)
    try {
      const r = await fetch(`/api/admin/users/${userId}/docs`, {
        method: "POST", headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newDoc.title, docType: newDoc.docType, content: newDoc.content,
          parentType: "skill", parentId: addingDocFor,
        }),
      })
      if (r.ok) {
        const { doc } = await r.json()
        setSkillDocs(prev => new Map(prev).set(addingDocFor!, [...(prev.get(addingDocFor!) ?? []), doc]))
        setAddingDocFor(null)
        setNewDoc({ title: "", docType: "reference", content: "" })
      }
    } finally { setAddingDoc(false) }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const border = "1.5px solid var(--border)"
  const radius = 8

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "7px 10px", borderRadius: 6, border,
    background: "var(--bg)", color: "var(--text)",
    fontSize: 12, fontFamily: MONO, outline: "none",
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontFamily: MONO, letterSpacing: ".08em",
    textTransform: "uppercase", color: "var(--text3)", marginBottom: 4, display: "block",
  }

  const btnPrimary: React.CSSProperties = {
    background: "var(--text)", color: "var(--bg)", border: "none",
    borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 600,
    cursor: "pointer", fontFamily: SANS,
  }

  const btnGhost: React.CSSProperties = {
    background: "none", color: "var(--text3)", border,
    borderRadius: 6, padding: "6px 12px", fontSize: 11,
    cursor: "pointer", fontFamily: SANS,
  }

  // ── Tree node ──────────────────────────────────────────────────────────────
  function SkillRow({ skill }: { skill: Skill }) {
    const isExp = expanded.has(skill.id)
    const isSel = selected?.kind === "skill" && selected.data.id === skill.id
    const docs = skillDocs.get(skill.id) ?? []

    return (
      <div>
        {/* Skill row */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 8px", borderRadius: 6, cursor: "pointer",
            background: isSel ? "var(--accent-subtle, rgba(139,115,85,.12))" : "none",
            transition: "background .1s",
          }}
        >
          {/* Chevron */}
          <button
            onClick={() => toggleExpand(skill.id)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--text3)", display: "flex" }}
          >
            <Icon d={isExp ? "M19 9l-7 7-7-7" : "M9 18l6-6-6-6"} size={12} />
          </button>

          {/* Skill icon + name */}
          <div onClick={() => selectSkill(skill)} style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
            <Icon d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" size={13} />
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", fontFamily: SANS }}>{skill.name}</span>
            <span style={{ fontSize: 9, fontFamily: MONO, color: "var(--text3)", marginLeft: "auto" }}>
              {docs.length > 0 ? `${docs.length} docs` : ""}
            </span>
          </div>
        </div>

        {/* Skill docs */}
        {isExp && (
          <div style={{ marginLeft: 28, borderLeft: "1.5px solid var(--border)", paddingLeft: 12, marginTop: 2, marginBottom: 4 }}>
            {docs.length === 0 && !skillDocs.has(skill.id) && (
              <div style={{ fontSize: 11, color: "var(--text3)", padding: "4px 0", fontFamily: MONO }}>loading...</div>
            )}
            {docs.map(doc => {
              const isSel = selected?.kind === "skill-doc" && selected.data.id === doc.id
              return (
                <div
                  key={doc.id}
                  onClick={() => selectDoc(doc, skill.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 8px", borderRadius: 6, cursor: "pointer",
                    background: isSel ? "var(--accent-subtle, rgba(139,115,85,.12))" : "none",
                    transition: "background .1s",
                  }}
                >
                  <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={12} />
                  <span style={{ fontSize: 11, color: "var(--text)", fontFamily: SANS }}>{doc.title}</span>
                  <span style={{
                    fontSize: 8, fontFamily: MONO, letterSpacing: ".06em",
                    color: DOC_TYPE_COLOR[doc.docType] ?? "var(--text3)", marginLeft: "auto",
                  }}>
                    {doc.docType}
                  </span>
                </div>
              )
            })}

            {/* Add doc button */}
            {addingDocFor === skill.id ? (
              <form onSubmit={handleAddDoc} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 0" }}>
                <input
                  style={inputStyle} placeholder="Title" required
                  value={newDoc.title} onChange={e => setNewDoc(p => ({ ...p, title: e.target.value }))}
                />
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={newDoc.docType} onChange={e => setNewDoc(p => ({ ...p, docType: e.target.value }))}
                >
                  {DOC_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <textarea
                  style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} placeholder="Content"
                  value={newDoc.content} onChange={e => setNewDoc(p => ({ ...p, content: e.target.value }))}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="submit" style={btnPrimary} disabled={addingDoc}>
                    {addingDoc ? "Adding..." : "Add"}
                  </button>
                  <button type="button" style={btnGhost} onClick={() => setAddingDocFor(null)}>Cancel</button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => { setAddingDocFor(skill.id); loadSkillDocs(skill.id) }}
                style={{ ...btnGhost, marginTop: 4, fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}
              >
                <Icon d="M12 5v14M5 12h14" size={10} /> Add doc
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Editor panel ───────────────────────────────────────────────────────────
  function EditorPanel() {
    if (!selected) return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12, color: "var(--text3)", fontFamily: MONO }}>Select a node to edit</span>
      </div>
    )

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, padding: "0 0 0 24px", minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 12, borderBottom: border }}>
          <span style={{ fontSize: 10, fontFamily: MONO, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text3)" }}>
            {selected.kind === "skill" ? "skill" : "reference"}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: SANS }}>
            {selected.kind === "skill" ? selected.data.name : selected.data.title}
          </span>
        </div>

        {/* Fields */}
        {selected.kind === "skill" ? (
          <>
            <div>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Trigger keywords</label>
              <input style={inputStyle} value={editTrigger} onChange={e => setEditTrigger(e.target.value)}
                placeholder="keyword1 keyword2 keyword3" />
            </div>
            <div>
              <label style={labelStyle}>Tools (comma-separated)</label>
              <input style={inputStyle} value={editTools} onChange={e => setEditTools(e.target.value)}
                placeholder="query_user_file, render_artifact" />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <label style={labelStyle}>SKILL.md</label>
              <textarea
                style={{ ...inputStyle, flex: 1, minHeight: 200, resize: "vertical", lineHeight: 1.5 }}
                value={editSolution} onChange={e => setEditSolution(e.target.value)}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label style={labelStyle}>Title</label>
              <input style={inputStyle} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Doc type</label>
              <select style={{ ...inputStyle, cursor: "pointer" }}
                value={editDocType} onChange={e => setEditDocType(e.target.value)}>
                {DOC_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <label style={labelStyle}>Content</label>
              <textarea
                style={{ ...inputStyle, flex: 1, minHeight: 200, resize: "vertical", lineHeight: 1.5 }}
                value={editContent} onChange={e => setEditContent(e.target.value)}
              />
            </div>
          </>
        )}

        {/* Actions */}
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
            <button onClick={() => setConfirmDelete(true)}
              style={{ ...btnGhost, color: "var(--text3)", marginLeft: "auto" }}>
              Delete
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", gap: 0, minHeight: 480, border, borderRadius: radius, overflow: "hidden" }}>

      {/* Left: Tree */}
      <div style={{
        width: 280, flexShrink: 0, borderRight: border,
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        {/* Section header */}
        <div style={{ padding: "12px 12px 8px", borderBottom: border }}>
          <span style={{ fontSize: 9, fontFamily: MONO, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text3)" }}>
            Skills
          </span>
        </div>

        {/* Skill list */}
        <div style={{ flex: 1, padding: "8px 4px", overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 12, fontSize: 11, color: "var(--text3)", fontFamily: MONO }}>Loading...</div>
          ) : skills.length === 0 ? (
            <div style={{ padding: 12, fontSize: 11, color: "var(--text3)", fontFamily: MONO }}>No skills yet</div>
          ) : (
            skills.map(skill => <SkillRow key={skill.id} skill={skill} />)
          )}
        </div>

        {/* Add skill */}
        <div style={{ borderTop: border, padding: 8 }}>
          {showAddSkill ? (
            <form onSubmit={handleAddSkill} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input style={inputStyle} placeholder="Skill name" required
                value={newSkill.name} onChange={e => setNewSkill(p => ({ ...p, name: e.target.value }))} />
              <input style={inputStyle} placeholder="Trigger keywords" required
                value={newSkill.trigger} onChange={e => setNewSkill(p => ({ ...p, trigger: e.target.value }))} />
              <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} placeholder="SKILL.md content"
                value={newSkill.solution} onChange={e => setNewSkill(p => ({ ...p, solution: e.target.value }))} />
              <input style={inputStyle} placeholder="Tools (comma-separated, optional)"
                value={newSkill.tools} onChange={e => setNewSkill(p => ({ ...p, tools: e.target.value }))} />
              <div style={{ display: "flex", gap: 6 }}>
                <button type="submit" style={btnPrimary} disabled={addingSkill}>
                  {addingSkill ? "Adding..." : "Add skill"}
                </button>
                <button type="button" style={btnGhost} onClick={() => setShowAddSkill(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowAddSkill(true)}
              style={{ ...btnGhost, width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon d="M12 5v14M5 12h14" size={11} /> New skill
            </button>
          )}
        </div>
      </div>

      {/* Right: Editor */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, minWidth: 0, overflowY: "auto" }}>
        <EditorPanel />
      </div>
    </div>
  )
}
