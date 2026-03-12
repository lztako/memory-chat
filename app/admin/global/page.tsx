"use client"

import { useState, useEffect, useCallback } from "react"
import { useAdminAuth } from "../layout"

type GlobalInfoItem = {
  id: string
  key: string
  value: string
  sortOrder: number
}

function IconPencil() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function IconCopy() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function GlobalInfoPage() {
  const { secret } = useAdminAuth()
  const [items, setItems] = useState<GlobalInfoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editKey, setEditKey] = useState("")
  const [editValue, setEditValue] = useState("")
  const [saving, setSaving] = useState(false)
  const [addKey, setAddKey] = useState("")
  const [addValue, setAddValue] = useState("")
  const [adding, setAdding] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const authHeader = { Authorization: `Bearer ${secret}` }

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/global-info", { headers: { Authorization: `Bearer ${secret}` } })
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }, [secret])

  useEffect(() => { fetchItems() }, [fetchItems])

  function startEdit(item: GlobalInfoItem) {
    setEditId(item.id)
    setEditKey(item.key)
    setEditValue(item.value)
    setConfirmDeleteId(null)
  }

  function cancelEdit() {
    setEditId(null)
    setEditKey("")
    setEditValue("")
  }

  async function handleSave(id: string) {
    setSaving(true)
    await fetch(`/api/admin/global-info/${id}`, {
      method: "PATCH",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ key: editKey, value: editValue }),
    })
    await fetchItems()
    cancelEdit()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/global-info/${id}`, { method: "DELETE", headers: authHeader })
    setItems(prev => prev.filter(i => i.id !== id))
    setConfirmDeleteId(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addKey.trim() || !addValue.trim()) return
    setAdding(true)
    const res = await fetch("/api/admin/global-info", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ key: addKey.trim(), value: addValue.trim(), sortOrder: items.length }),
    })
    if (res.ok) {
      const item = await res.json()
      setItems(prev => [...prev, item])
    }
    setAddKey("")
    setAddValue("")
    setShowAdd(false)
    setAdding(false)
  }

  const previewText = `## เกี่ยวกับ Origo (บริษัทที่ให้บริการระบบนี้):\n${items.map(i => `- ${i.key}: ${i.value}`).join("\n")}`

  function handleCopy() {
    navigator.clipboard.writeText(previewText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div style={{ maxWidth: 740, margin: "0 auto", padding: "32px 24px", fontFamily: "var(--font-ibm-plex-sans), sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: 0 }}>Global Info</h1>
            {items.length > 0 && (
              <span style={{
                fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace",
                letterSpacing: ".06em", textTransform: "uppercase",
                color: "var(--green)", background: "color-mix(in srgb, var(--green) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)",
                borderRadius: 4, padding: "2px 7px",
              }}>
                live · {items.length} entries
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: "var(--text3)", margin: "3px 0 0", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
            inject เข้า system prompt ทุก account โดยอัตโนมัติ
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button onClick={() => setShowAdd(v => !v)} style={{
            fontSize: 11, padding: "6px 14px",
            background: showAdd ? "var(--surface2)" : "none",
            border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer",
            color: "var(--text)", fontFamily: "var(--font-ibm-plex-sans), sans-serif",
          }}>
            {showAdd ? "ยกเลิก" : "+ เพิ่ม"}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} style={{
          background: "var(--surface)", border: "1.5px solid var(--border)",
          borderRadius: 8, padding: "14px 16px", marginBottom: 12,
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <input
              placeholder="key"
              value={addKey}
              onChange={e => setAddKey(e.target.value)}
              style={{ ...inputStyle, width: 140, flexShrink: 0 }}
            />
            <textarea
              placeholder="value"
              value={addValue}
              onChange={e => setAddValue(e.target.value)}
              rows={2}
              style={{ ...inputStyle, flex: 1, resize: "vertical", lineHeight: 1.5 }}
            />
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => { setShowAdd(false); setAddKey(""); setAddValue("") }} style={btnStyle}>ยกเลิก</button>
            <button type="submit" disabled={adding} style={{ ...btnStyle, background: "var(--text)", color: "var(--bg)", border: "none" }}>
              {adding ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      )}

      {/* Items list */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text3)", fontSize: 12 }}>
          กำลังโหลด...
        </div>
      ) : items.length === 0 ? (
        <div style={{
          background: "var(--surface)", border: "1.5px solid var(--border)",
          borderRadius: 10, padding: "40px 16px",
          textAlign: "center", color: "var(--text3)", fontSize: 13,
        }}>
          ยังไม่มีข้อมูล — กด &quot;Seed ค่าเริ่มต้น&quot; เพื่อเพิ่ม Origo identity
        </div>
      ) : (
        <div style={{
          background: "var(--surface)", border: "1.5px solid var(--border)",
          borderRadius: 10, overflow: "hidden",
        }}>
          {items.map((item, i) => (
            <div key={item.id} style={{
              borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none",
              background: editId === item.id ? "var(--surface2)" : "none",
            }}>
              {editId === item.id ? (
                /* Edit mode */
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <input
                      value={editKey}
                      onChange={e => setEditKey(e.target.value)}
                      style={{ ...inputStyle, width: 140, flexShrink: 0 }}
                    />
                    <textarea
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      rows={3}
                      style={{ ...inputStyle, flex: 1, resize: "vertical", lineHeight: 1.5 }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button onClick={cancelEdit} style={btnStyle}>ยกเลิก</button>
                    <button onClick={() => handleSave(item.id)} disabled={saving} style={{ ...btnStyle, background: "var(--text)", color: "var(--bg)", border: "none" }}>
                      {saving ? "..." : "บันทึก"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <div style={{ padding: "10px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {/* Key badge — fixed width so values align */}
                  <span style={{
                    fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace",
                    color: "var(--text3)", background: "var(--surface2)",
                    border: "1px solid var(--border)", borderRadius: 4,
                    padding: "2px 0", flexShrink: 0, marginTop: 2,
                    width: 130, textAlign: "center", display: "inline-block",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {item.key}
                  </span>

                  {/* Value */}
                  <span style={{
                    fontSize: 12.5, color: "var(--text)", flex: 1,
                    lineHeight: 1.55, paddingTop: 2,
                  }}>
                    {item.value}
                  </span>

                  {/* Actions — icon buttons */}
                  <div style={{ display: "flex", gap: 2, flexShrink: 0, marginTop: 1 }}>
                    {confirmDeleteId === item.id ? (
                      <>
                        <span style={{ fontSize: 10, color: "var(--text3)", alignSelf: "center", marginRight: 4 }}>ลบ?</span>
                        <button onClick={() => handleDelete(item.id)} style={{ ...iconBtn, color: "var(--red)", borderColor: "color-mix(in srgb, var(--red) 40%, transparent)" }}>ยืนยัน</button>
                        <button onClick={() => setConfirmDeleteId(null)} style={iconBtn}>ยกเลิก</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(item)}
                          title="แก้ไข"
                          style={iconBtn}
                          onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
                          onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
                        >
                          <IconPencil />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(item.id)}
                          title="ลบ"
                          style={iconBtn}
                          onMouseEnter={e => (e.currentTarget.style.color = "var(--red)")}
                          onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
                        >
                          <IconTrash />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* System Prompt Preview — collapsible */}
      {items.length > 0 && (
        <div style={{ marginTop: 20 }}>
          {/* Toggle header */}
          <button
            onClick={() => setPreviewOpen(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              background: "none", border: "none", cursor: "pointer", padding: "6px 0",
              color: "var(--text3)",
            }}
          >
            <span style={{
              fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace",
              letterSpacing: ".1em", textTransform: "uppercase",
            }}>
              System Prompt Preview
            </span>
            <IconChevron open={previewOpen} />
            <div style={{ flex: 1 }} />
            {previewOpen && (
              <span
                onClick={e => { e.stopPropagation(); handleCopy() }}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 10, padding: "3px 8px",
                  border: "1px solid var(--border)", borderRadius: 4,
                  cursor: "pointer", color: copied ? "var(--green)" : "var(--text3)",
                  fontFamily: "var(--font-ibm-plex-sans), sans-serif",
                }}
              >
                <IconCopy />
                {copied ? "Copied" : "Copy"}
              </span>
            )}
          </button>

          {previewOpen && (
            <pre style={{
              fontSize: 11, fontFamily: "var(--font-ibm-plex-mono), monospace",
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "14px 16px", color: "var(--text2)",
              whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.7,
              maxHeight: 360, overflowY: "auto",
            }}>
              {previewText}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "7px 10px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  background: "var(--bg)",
  color: "var(--text)",
  fontFamily: "var(--font-ibm-plex-mono), monospace",
  outline: "none",
}

const btnStyle: React.CSSProperties = {
  fontSize: 10, padding: "4px 10px",
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
