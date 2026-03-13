"use client"

import { useState, useEffect, useCallback } from "react"
import { useAdminAuth } from "../layout"

type GlobalDoc = {
  id: string
  category: string
  docType: string
  title: string
  content: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

const CATEGORIES = ["company", "knowledge"] as const
const DOC_TYPES = ["overview", "history", "service", "reference", "workflow"] as const

const DOC_TYPE_COLOR: Record<string, string> = {
  overview:  "var(--blue)",
  history:   "var(--text3)",
  service:   "var(--green)",
  reference: "#c97a2a",
  workflow:  "#9166cc",
}

function IconFolder() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconFile() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function IconPencil() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function GlobalDocsPage() {
  const { secret } = useAdminAuth()
  const [docs, setDocs] = useState<GlobalDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addCategory, setAddCategory] = useState<string>("company")
  const [addDocType, setAddDocType] = useState<string>("overview")
  const [addTitle, setAddTitle] = useState("")
  const [addContent, setAddContent] = useState("")
  const [adding, setAdding] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<GlobalDoc | null>(null)
  const [editingDoc, setEditingDoc] = useState<GlobalDoc | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDocType, setEditDocType] = useState("")
  const [editContent, setEditContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const authHeader = { Authorization: `Bearer ${secret}` }

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/global-docs", { headers: authHeader })
    if (res.ok) {
      const data = await res.json()
      setDocs(data.docs ?? [])
    }
    setLoading(false)
  }, [secret]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchDocs() }, [fetchDocs])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addTitle.trim() || !addContent.trim()) return
    setAdding(true)
    const res = await fetch("/api/admin/global-docs", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ category: addCategory, docType: addDocType, title: addTitle.trim(), content: addContent.trim() }),
    })
    if (res.ok) {
      await fetchDocs()
      setAddTitle(""); setAddContent(""); setShowAdd(false)
    }
    setAdding(false)
  }

  function startEdit(doc: GlobalDoc) {
    setEditingDoc(doc)
    setEditTitle(doc.title)
    setEditDocType(doc.docType)
    setEditContent(doc.content)
    setViewingDoc(null)
  }

  async function handleSave() {
    if (!editingDoc || !editTitle.trim() || !editContent.trim()) return
    setSaving(true)
    const res = await fetch(`/api/admin/global-docs/${editingDoc.id}`, {
      method: "PATCH",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim(), docType: editDocType, content: editContent.trim() }),
    })
    if (res.ok) {
      await fetchDocs()
      setEditingDoc(null)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/global-docs/${id}`, { method: "DELETE", headers: authHeader })
    if (res.ok) {
      setDocs(prev => prev.filter(d => d.id !== id))
      setConfirmDeleteId(null)
    }
  }

  const byCategory = CATEGORIES.reduce<Record<string, GlobalDoc[]>>((acc, cat) => {
    acc[cat] = docs.filter(d => d.category === cat)
    return acc
  }, {} as Record<string, GlobalDoc[]>)

  return (
    <div style={{ maxWidth: 740, margin: "0 auto", padding: "32px 24px", fontFamily: "var(--font-ibm-plex-sans), sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: 0 }}>Global Docs</h1>
            {docs.length > 0 && (
              <span style={{
                fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace",
                letterSpacing: ".06em", textTransform: "uppercase",
                color: "var(--green)", background: "color-mix(in srgb, var(--green) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)",
                borderRadius: 4, padding: "2px 7px",
              }}>
                {docs.length} docs
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: "var(--text3)", margin: "3px 0 0", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
            Origo knowledge base — on-demand via read_global_doc tool
          </p>
        </div>
        <button onClick={() => setShowAdd(v => !v)} style={{
          fontSize: 11, padding: "6px 14px",
          background: showAdd ? "var(--surface2)" : "none",
          border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer",
          color: "var(--text)", fontFamily: "var(--font-ibm-plex-sans), sans-serif", flexShrink: 0,
        }}>
          {showAdd ? "ยกเลิก" : "+ เพิ่ม doc"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} style={{
          background: "var(--surface)", border: "1.5px solid var(--border)",
          borderRadius: 8, padding: "16px", marginBottom: 16,
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={addCategory} onChange={e => setAddCategory(e.target.value)} style={selectStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={addDocType} onChange={e => setAddDocType(e.target.value)} style={selectStyle}>
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              placeholder="Title"
              value={addTitle}
              onChange={e => setAddTitle(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
          <textarea
            placeholder="Content (markdown)"
            value={addContent}
            onChange={e => setAddContent(e.target.value)}
            rows={6}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => { setShowAdd(false); setAddTitle(""); setAddContent("") }} style={btnStyle}>ยกเลิก</button>
            <button type="submit" disabled={adding} style={{ ...btnStyle, background: "var(--text)", color: "var(--bg)", border: "none" }}>
              {adding ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      )}

      {/* Tree view */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text3)", fontSize: 12 }}>กำลังโหลด...</div>
      ) : docs.length === 0 && !showAdd ? (
        <div style={{
          background: "var(--surface)", border: "1.5px dashed var(--border)",
          borderRadius: 10, padding: "40px 16px",
          textAlign: "center", color: "var(--text3)", fontSize: 12,
        }}>
          ยังไม่มี document — กด &quot;+ เพิ่ม doc&quot; เพื่อสร้าง Origo knowledge base
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {CATEGORIES.map(cat => (
            <div key={cat}>
              {/* Folder header */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <span style={{ color: "var(--text3)" }}><IconFolder /></span>
                <span style={{
                  fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace",
                  letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text3)",
                }}>
                  {cat}
                </span>
                <span style={{
                  fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace",
                  color: "var(--text3)", background: "var(--surface2)",
                  border: "1px solid var(--border)", borderRadius: 3,
                  padding: "1px 5px",
                }}>
                  {byCategory[cat].length}
                </span>
              </div>

              {/* Files */}
              <div style={{
                background: "var(--surface)", border: "1.5px solid var(--border)",
                borderRadius: 10, overflow: "hidden",
                marginLeft: 20,
              }}>
                {byCategory[cat].length === 0 ? (
                  <div style={{ padding: "16px", color: "var(--text3)", fontSize: 11, fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
                    empty folder
                  </div>
                ) : byCategory[cat].map((doc, i) => (
                  <div key={doc.id} style={{
                    padding: "10px 14px",
                    borderBottom: i < byCategory[cat].length - 1 ? "1px solid var(--border)" : "none",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{ color: "var(--text3)", flexShrink: 0 }}><IconFile /></span>
                    <span style={{
                      fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace",
                      padding: "2px 6px", borderRadius: 3,
                      background: "var(--surface2)", border: "1px solid var(--border)",
                      color: DOC_TYPE_COLOR[doc.docType] ?? "var(--text3)",
                      flexShrink: 0,
                    }}>
                      {doc.docType}
                    </span>
                    <span
                      onClick={() => setViewingDoc(doc)}
                      style={{
                        fontSize: 12.5, color: "var(--text)", flex: 1,
                        cursor: "pointer", lineHeight: 1.4,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--blue)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--text)")}
                    >
                      {doc.title}
                    </span>
                    <span style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)", flexShrink: 0 }}>
                      {doc.content.length} ch
                    </span>

                    {/* Actions */}
                    {confirmDeleteId === doc.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, color: "var(--text3)" }}>ลบ?</span>
                        <button onClick={() => handleDelete(doc.id)} style={{ ...iconBtn, color: "var(--red)", fontSize: 10 }}>ยืนยัน</button>
                        <button onClick={() => setConfirmDeleteId(null)} style={{ ...iconBtn, fontSize: 10 }}>ยกเลิก</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        <button onClick={() => startEdit(doc)} title="แก้ไข" style={iconBtn}
                          onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
                          onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
                          <IconPencil />
                        </button>
                        <button onClick={() => setConfirmDeleteId(doc.id)} title="ลบ" style={iconBtn}
                          onMouseEnter={e => (e.currentTarget.style.color = "var(--red)")}
                          onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
                          <IconTrash />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View modal */}
      {viewingDoc && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 50, padding: 24,
        }} onClick={() => setViewingDoc(null)}>
          <div style={{
            background: "var(--bg)", border: "1.5px solid var(--border)",
            borderRadius: 12, width: "100%", maxWidth: 640,
            maxHeight: "80vh", display: "flex", flexDirection: "column",
            overflow: "hidden",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace",
                padding: "2px 6px", borderRadius: 3,
                background: "var(--surface2)", border: "1px solid var(--border)",
                color: DOC_TYPE_COLOR[viewingDoc.docType] ?? "var(--text3)",
              }}>
                {viewingDoc.category} / {viewingDoc.docType}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", flex: 1 }}>{viewingDoc.title}</span>
              <button onClick={() => startEdit(viewingDoc)} style={{ ...iconBtn, marginRight: 4 }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
                <IconPencil />
              </button>
              <button onClick={() => setViewingDoc(null)} style={iconBtn}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
                <IconX />
              </button>
            </div>
            <pre style={{
              flex: 1, overflowY: "auto",
              margin: 0, padding: "16px",
              fontSize: 12, fontFamily: "var(--font-ibm-plex-mono), monospace",
              color: "var(--text2)", lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}>
              {viewingDoc.content}
            </pre>
            <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <span style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)", alignSelf: "center", flex: 1 }}>
                id: {viewingDoc.id}
              </span>
              <button onClick={() => setViewingDoc(null)} style={btnStyle}>ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingDoc && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 50, padding: 24,
        }} onClick={() => setEditingDoc(null)}>
          <div style={{
            background: "var(--bg)", border: "1.5px solid var(--border)",
            borderRadius: 12, width: "100%", maxWidth: 640,
            maxHeight: "85vh", display: "flex", flexDirection: "column",
            overflow: "hidden",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", flex: 1 }}>แก้ไข Document</span>
              <button onClick={() => setEditingDoc(null)} style={iconBtn}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
                <IconX />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={editDocType} onChange={e => setEditDocType(e.target.value)} style={selectStyle}>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Title"
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={14}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button onClick={() => setEditingDoc(null)} style={btnStyle}>ยกเลิก</button>
              <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, background: "var(--text)", color: "var(--bg)", border: "none" }}>
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  fontSize: 12, padding: "7px 10px",
  border: "1px solid var(--border)", borderRadius: 6,
  background: "var(--bg)", color: "var(--text)",
  fontFamily: "var(--font-ibm-plex-mono), monospace",
  outline: "none", width: "100%", boxSizing: "border-box",
}

const selectStyle: React.CSSProperties = {
  fontSize: 11, padding: "7px 10px",
  border: "1px solid var(--border)", borderRadius: 6,
  background: "var(--bg)", color: "var(--text3)",
  fontFamily: "var(--font-ibm-plex-mono), monospace",
  outline: "none", cursor: "pointer",
}

const btnStyle: React.CSSProperties = {
  fontSize: 10, padding: "5px 12px",
  border: "1px solid var(--border)", borderRadius: 4,
  background: "none", color: "var(--text3)",
  cursor: "pointer", fontFamily: "var(--font-ibm-plex-sans), sans-serif",
}

const iconBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 26, height: 26,
  border: "1px solid transparent", borderRadius: 5,
  background: "none", cursor: "pointer",
  color: "var(--text3)", padding: 0,
  fontSize: 10, fontFamily: "var(--font-ibm-plex-sans), sans-serif",
  transition: "color .12s",
}
