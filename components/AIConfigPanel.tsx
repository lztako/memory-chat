"use client"
import { useState, useEffect } from "react"

interface Config { id: string; key: string; value: string }

const PRESETS = [
  { key: "ภาษา", value: "ตอบภาษาไทยเสมอ" },
  { key: "สไตล์การตอบ", value: "ตรงประเด็น กระชับ ไม่อธิบายยาว" },
  { key: "domain", value: "industrial goods B2B" },
  { key: "ตลาดหลัก", value: "EU + ASEAN" },
  { key: "Incoterms", value: "FOB, CIF" },
  { key: "สกุลเงิน", value: "USD" },
]

export function AIConfigPanel() {
  const [configs, setConfigs] = useState<Config[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [saving, setSaving] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then(d => { setConfigs(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    setConfigs(prev => prev.filter(c => c.id !== id))
    await fetch(`/api/config/${id}`, { method: "DELETE" }).catch(() => {})
  }

  const handleEditStart = (c: Config) => {
    setEditingId(c.id)
    setEditValue(c.value)
  }

  const handleEditSave = async (c: Config) => {
    if (!editValue.trim()) return
    const updated = { ...c, value: editValue.trim() }
    setConfigs(prev => prev.map(x => x.id === c.id ? updated : x))
    setEditingId(null)
    await fetch(`/api/config/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: c.key, value: editValue.trim() }),
    }).catch(() => {})
  }

  const handleAdd = async (key = newKey, value = newValue) => {
    if (!key.trim() || !value.trim()) return
    setSaving(true)
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: key.trim(), value: value.trim() }),
    }).catch(() => null)
    if (res?.ok) {
      const data = await res.json()
      setConfigs(prev => {
        const exists = prev.findIndex(c => c.key === key.trim())
        if (exists >= 0) return prev.map((c, i) => i === exists ? data : c)
        return [...prev, data]
      })
      setNewKey("")
      setNewValue("")
      setAddOpen(false)
    }
    setSaving(false)
  }

  const handlePreset = (preset: { key: string; value: string }) => {
    const exists = configs.find(c => c.key === preset.key)
    if (exists) {
      setEditingId(exists.id)
      setEditValue(preset.value)
    } else {
      handleAdd(preset.key, preset.value)
    }
  }

  return (
    <div style={{
      background: "var(--surface)",
      border: "1.5px solid var(--border)",
      borderRadius: 10,
      overflow: "hidden",
    }}>

      {/* Header */}
      <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>
          วิธีทำงานของ AI กับคุณ
        </div>
        <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>
          ตั้งค่าให้ AI เข้าใจ context ธุรกิจและสไตล์การทำงานของคุณ — inject เข้า system prompt ทุก session
        </div>
      </div>

      {/* Config list */}
      <div style={{ padding: "10px 14px" }}>
        {loading ? (
          <div style={{ padding: "16px 4px", fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>Loading...</div>
        ) : configs.length === 0 ? (
          <div style={{ padding: "16px 4px", fontSize: 12, color: "var(--text3)" }}>
            ยังไม่มี config — เพิ่มจาก presets ด้านล่าง หรือสร้างเอง
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {configs.map(c => (
              <div key={c.id} style={{
                display: "flex", alignItems: editingId === c.id ? "flex-start" : "center",
                gap: 10, padding: "8px 10px",
                background: "var(--bg)",
                border: `1.5px solid ${editingId === c.id ? "var(--border2)" : "var(--border)"}`,
                borderRadius: 7, transition: "border-color .12s",
              }}>
                {/* Key badge */}
                <span style={{
                  fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace",
                  padding: "2px 7px", borderRadius: 3,
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  color: "var(--text2)", whiteSpace: "nowrap", flexShrink: 0,
                  letterSpacing: ".04em",
                }}>
                  {c.key}
                </span>

                {/* Value / Edit input */}
                {editingId === c.id ? (
                  <div style={{ flex: 1, display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleEditSave(c); if (e.key === "Escape") setEditingId(null) }}
                      style={{
                        flex: 1, fontSize: 12, padding: "4px 8px",
                        border: "1.5px solid var(--border2)", borderRadius: 5,
                        background: "var(--surface)", color: "var(--text)",
                        fontFamily: "var(--font-ibm-plex-sans), sans-serif", outline: "none",
                      }}
                    />
                    <button
                      onClick={() => handleEditSave(c)}
                      style={{ background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 500, flexShrink: 0 }}
                    >Save</button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: 5, padding: "4px 8px", fontSize: 11, cursor: "pointer", color: "var(--text3)", flexShrink: 0 }}
                    >Cancel</button>
                  </div>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: 12, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.value}
                    </span>
                    {/* Edit button */}
                    <button
                      onClick={() => handleEditStart(c)}
                      title="Edit"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 3, color: "var(--text3)", flexShrink: 0, display: "flex", alignItems: "center", borderRadius: 4, transition: "color .1s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--text2)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(c.id)}
                      title="Delete"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 3, color: "var(--text3)", flexShrink: 0, display: "flex", alignItems: "center", borderRadius: 4, transition: "color .1s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--red)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Presets */}
      <div style={{ padding: "8px 14px 12px", borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", letterSpacing: ".08em", color: "var(--text3)", textTransform: "uppercase", marginBottom: 8 }}>
          Presets
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PRESETS.map(p => {
            const active = configs.some(c => c.key === p.key)
            return (
              <button
                key={p.key}
                onClick={() => handlePreset(p)}
                disabled={saving}
                style={{
                  padding: "4px 10px",
                  border: `1.5px solid ${active ? "var(--border2)" : "var(--border)"}`,
                  borderRadius: 20, fontSize: 11,
                  background: active ? "var(--surface2)" : "transparent",
                  color: active ? "var(--text)" : "var(--text3)",
                  cursor: "pointer",
                  fontFamily: "var(--font-ibm-plex-sans), sans-serif",
                  transition: "border-color .12s, color .12s, background .12s",
                  display: "flex", alignItems: "center", gap: 5,
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--text2)" } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text3)" } }}
              >
                {active && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {p.key}
              </button>
            )
          })}
        </div>
      </div>

      {/* Add custom config */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        {!addOpen ? (
          <button
            onClick={() => setAddOpen(true)}
            style={{
              width: "100%", padding: "11px 18px",
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 12, color: "var(--text3)",
              fontFamily: "var(--font-ibm-plex-sans), sans-serif",
              transition: "color .12s, background .12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text2)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text3)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add custom config
          </button>
        ) : (
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                autoFocus
                placeholder="Key เช่น สกุลเงิน"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                style={{
                  flex: "0 0 140px", fontSize: 12, padding: "7px 10px",
                  border: "1.5px solid var(--border)", borderRadius: 6,
                  background: "var(--bg)", color: "var(--text)",
                  fontFamily: "var(--font-ibm-plex-sans), sans-serif", outline: "none",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--border2)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />
              <input
                placeholder="Value เช่น USD"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAddOpen(false) }}
                style={{
                  flex: 1, fontSize: 12, padding: "7px 10px",
                  border: "1.5px solid var(--border)", borderRadius: 6,
                  background: "var(--bg)", color: "var(--text)",
                  fontFamily: "var(--font-ibm-plex-sans), sans-serif", outline: "none",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--border2)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => handleAdd()}
                disabled={!newKey.trim() || !newValue.trim() || saving}
                style={{
                  padding: "6px 16px", border: "none", borderRadius: 5,
                  background: newKey.trim() && newValue.trim() ? "var(--text)" : "var(--surface2)",
                  color: newKey.trim() && newValue.trim() ? "var(--bg)" : "var(--text3)",
                  fontSize: 11, fontWeight: 500, cursor: newKey.trim() && newValue.trim() ? "pointer" : "default",
                  fontFamily: "var(--font-ibm-plex-sans), sans-serif",
                  transition: "background .12s",
                }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => { setAddOpen(false); setNewKey(""); setNewValue("") }}
                style={{
                  padding: "6px 12px", border: "1.5px solid var(--border)", borderRadius: 5,
                  background: "none", fontSize: 11, cursor: "pointer",
                  color: "var(--text3)", fontFamily: "var(--font-ibm-plex-sans), sans-serif",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
