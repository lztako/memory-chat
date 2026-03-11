"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAdminAuth } from "../layout"
import { UserGraphView } from "@/components/admin/UserGraphView"

type UserDetail = {
  id: string
  email: string
  name: string | null
  createdAt: string
  files: { id: string; fileName: string; fileType: string; description: string | null; rowCount: number; columns: string[]; createdAt: string }[]
  skills: { id: string; name: string; trigger: string; solution: string; tools: string[]; usageCount: number; createdAt: string }[]
  memories: { id: string; type: string; content: string; importance: number; layer: string; createdAt: string }[]
  tasks: { id: string; title: string; status: string; priority: string; dueDate: string | null; linkedCompany: string | null; createdAt: string }[]
  dashboard: { widgets: unknown[]; updatedAt: string } | null
}

type Tab = "files" | "memories" | "skills" | "tasks" | "config" | "graph"
const TABS: { key: Tab; label: string }[] = [
  { key: "graph", label: "Graph" },
  { key: "files", label: "Files" },
  { key: "memories", label: "Memories" },
  { key: "skills", label: "Skills" },
  { key: "tasks", label: "Tasks" },
  { key: "config", label: "Widget Config" },
]

function SvgIcon({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "var(--red)", high: "var(--orange)", normal: "var(--text2)", low: "var(--text3)",
}
const STATUS_COLOR: Record<string, string> = {
  done: "var(--green)", in_progress: "var(--blue)", pending: "var(--text3)", cancelled: "var(--text3)",
}

export default function AdminUserDetailPage() {
  const { secret } = useAdminAuth()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const userId = params.id

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<Tab>("files")

  // Upload modal state (new file)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFileType, setUploadFileType] = useState("other")
  const [uploadDesc, setUploadDesc] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Replace modal state (replace existing file)
  const [replacingFileId, setReplacingFileId] = useState<string | null>(null)
  const [replacing, setReplacing] = useState(false)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  async function handleReplace(e: React.FormEvent) {
    e.preventDefault()
    const file = replaceInputRef.current?.files?.[0]
    if (!file || !replacingFileId) return
    setReplacing(true)
    const fd = new FormData()
    fd.append("file", file)
    try {
      const r = await fetch(`/api/admin/users/${userId}/files/${replacingFileId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${secret}` },
        body: fd,
      })
      if (!r.ok) throw new Error("Replace failed")
      setReplacingFileId(null)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Replace failed")
    } finally {
      setReplacing(false)
    }
  }

  // Widget config state
  const [widgetJson, setWidgetJson] = useState("")
  const [savingConfig, setSavingConfig] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${secret}` },
      })
      if (!r.ok) throw new Error(r.status === 401 ? "Unauthorized" : "Not found")
      const data = await r.json()
      setUser(data)
      setWidgetJson(JSON.stringify(data.dashboard?.widgets ?? [], null, 2))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [userId])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("fileType", uploadFileType)
    fd.append("description", uploadDesc)
    try {
      const r = await fetch(`/api/admin/users/${userId}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
        body: fd,
      })
      if (!r.ok) throw new Error("Upload failed")
      setShowUpload(false)
      setUploadDesc("")
      setUploadFileType("other")
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function handleSaveConfig() {
    setSavingConfig(true)
    try {
      const widgets = JSON.parse(widgetJson)
      const r = await fetch(`/api/admin/users/${userId}/config`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ widgets }),
      })
      if (!r.ok) throw new Error("Save failed")
      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 2000)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSavingConfig(false)
    }
  }

  if (loading) return (
    <div style={{ padding: 32, color: "var(--text3)", fontSize: 13, fontFamily: "var(--font-ibm-plex-sans), sans-serif" }}>
      Loading...
    </div>
  )

  if (error || !user) return (
    <div style={{ padding: 32, color: "var(--red)", fontSize: 13, fontFamily: "var(--font-ibm-plex-sans), sans-serif" }}>
      {error || "User not found"}
    </div>
  )

  const tabCount: Record<Tab, number> = {
    graph: user.files.length + user.skills.length + user.memories.length + user.tasks.length,
    files: user.files.length,
    memories: user.memories.length,
    skills: user.skills.length,
    tasks: user.tasks.length,
    config: user.dashboard?.widgets.length ?? 0,
  }

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 900, margin: "0 auto", fontFamily: "var(--font-ibm-plex-sans), sans-serif" }}>

      {/* Back */}
      <button
        onClick={() => router.push("/admin")}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text3)", fontSize: 12, padding: 0, marginBottom: 20,
          fontFamily: "var(--font-ibm-plex-sans), sans-serif",
        }}
      >
        <SvgIcon d="M15 18l-6-6 6-6" />
        All users
      </button>

      {/* User header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace",
          letterSpacing: ".1em", textTransform: "uppercase",
          color: "var(--text3)", marginBottom: 6,
        }}>Account</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", letterSpacing: "-.02em", margin: "0 0 4px" }}>
          {user.email}
        </h1>
        <span style={{
          fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace",
          color: "var(--text3)", letterSpacing: ".02em",
        }}>
          {user.id}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: tab === t.key ? 600 : 400,
              background: tab === t.key ? "var(--text)" : "none",
              color: tab === t.key ? "var(--bg)" : "var(--text3)",
              fontFamily: "var(--font-ibm-plex-sans), sans-serif",
              transition: "background .1s, color .1s",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {t.label}
            <span style={{
              fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace",
              opacity: tab === t.key ? 0.6 : 0.5,
            }}>
              {tabCount[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* GRAPH TAB */}
      {tab === "graph" && (
        <UserGraphView
          email={user.email}
          files={user.files}
          skills={user.skills}
          memories={user.memories}
          tasks={user.tasks}
        />
      )}

      {/* FILES TAB */}
      {tab === "files" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button
              onClick={() => setShowUpload(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "var(--text)", color: "var(--bg)",
                border: "none", borderRadius: 6, padding: "6px 14px",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                fontFamily: "var(--font-ibm-plex-sans), sans-serif",
              }}
            >
              <SvgIcon d="M12 5v14M5 12l7-7 7 7" size={12} />
              Upload file
            </button>
          </div>

          {/* Replace modal */}
          {replacingFileId && (
            <div style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,.6)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
            }}>
              <form
                onSubmit={handleReplace}
                style={{
                  background: "var(--surface)", border: "1.5px solid var(--border)",
                  borderRadius: 12, padding: 24, width: 400,
                  display: "flex", flexDirection: "column", gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Replace file</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>fileId จะคงเดิม — widget config ไม่ต้องแก้</div>
                </div>
                <input ref={replaceInputRef} type="file" accept=".csv" required
                  style={{ fontSize: 12, color: "var(--text2)" }} />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setReplacingFileId(null)}
                    style={{
                      padding: "6px 14px", border: "1.5px solid var(--border)",
                      borderRadius: 6, background: "none", fontSize: 11,
                      color: "var(--text3)", cursor: "pointer",
                      fontFamily: "var(--font-ibm-plex-sans), sans-serif",
                    }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={replacing}
                    style={{
                      padding: "6px 14px", background: "var(--orange)", color: "var(--bg)",
                      border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      cursor: replacing ? "not-allowed" : "pointer", opacity: replacing ? 0.6 : 1,
                      fontFamily: "var(--font-ibm-plex-sans), sans-serif",
                    }}>
                    {replacing ? "Replacing..." : "Replace"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Upload modal */}
          {showUpload && (
            <div style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,.6)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
            }}>
              <form
                onSubmit={handleUpload}
                style={{
                  background: "var(--surface)", border: "1.5px solid var(--border)",
                  borderRadius: 12, padding: 24, width: 400,
                  display: "flex", flexDirection: "column", gap: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Upload CSV</div>
                <input ref={fileInputRef} type="file" accept=".csv" required
                  style={{ fontSize: 12, color: "var(--text2)" }} />
                <select
                  value={uploadFileType}
                  onChange={e => setUploadFileType(e.target.value)}
                  style={{
                    fontSize: 12, padding: "7px 10px",
                    border: "1.5px solid var(--border)", borderRadius: 6,
                    background: "var(--bg)", color: "var(--text)",
                    fontFamily: "var(--font-ibm-plex-sans), sans-serif", outline: "none",
                  }}
                >
                  {["shipment","invoice","product","customer","lead","other"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="text" placeholder="Description (optional)"
                  value={uploadDesc} onChange={e => setUploadDesc(e.target.value)}
                  style={{
                    fontSize: 12, padding: "7px 10px",
                    border: "1.5px solid var(--border)", borderRadius: 6,
                    background: "var(--bg)", color: "var(--text)",
                    fontFamily: "var(--font-ibm-plex-sans), sans-serif", outline: "none",
                  }}
                />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                  <button type="button" onClick={() => setShowUpload(false)}
                    style={{
                      padding: "6px 14px", border: "1.5px solid var(--border)",
                      borderRadius: 6, background: "none", fontSize: 11,
                      color: "var(--text3)", cursor: "pointer",
                      fontFamily: "var(--font-ibm-plex-sans), sans-serif",
                    }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={uploading}
                    style={{
                      padding: "6px 14px", background: "var(--text)", color: "var(--bg)",
                      border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1,
                      fontFamily: "var(--font-ibm-plex-sans), sans-serif",
                    }}>
                    {uploading ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            {user.files.length === 0 ? (
              <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>No files</div>
            ) : user.files.map((f, i) => (
              <div key={f.id} style={{
                padding: "12px 16px",
                borderBottom: i < user.files.length - 1 ? "1px solid var(--border)" : "none",
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 3 }}>{f.fileName}</div>
                  {f.description && <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>{f.description}</div>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", padding: "2px 7px", borderRadius: 3, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>{f.fileType}</span>
                    <span style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", padding: "2px 7px", borderRadius: 3, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text3)" }}>{f.rowCount} rows</span>
                    <span style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", padding: "2px 7px", borderRadius: 3, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text3)" }}>{f.columns.length} cols</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)", whiteSpace: "nowrap" }}>
                    {new Date(f.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                  <button
                    onClick={() => setReplacingFileId(f.id)}
                    title="Replace file content (keeps same fileId)"
                    style={{
                      fontSize: 10, padding: "3px 8px",
                      border: "1px solid var(--border)", borderRadius: 4,
                      background: "none", color: "var(--text3)", cursor: "pointer",
                      fontFamily: "var(--font-ibm-plex-sans), sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Replace
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MEMORIES TAB */}
      {tab === "memories" && (
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          {user.memories.length === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>No memories</div>
          ) : user.memories.map((m, i) => (
            <div key={m.id} style={{
              padding: "11px 16px",
              borderBottom: i < user.memories.length - 1 ? "1px solid var(--border)" : "none",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.5, marginBottom: 5 }}>{m.content}</div>
                <div style={{ display: "flex", gap: 5 }}>
                  <span style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", padding: "2px 6px", borderRadius: 3, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text3)" }}>{m.type}</span>
                  <span style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", padding: "2px 6px", borderRadius: 3, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text3)" }}>{m.layer}</span>
                  <span style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", padding: "2px 6px", borderRadius: 3, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--orange)" }}>imp {m.importance}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SKILLS TAB */}
      {tab === "skills" && (
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          {user.skills.length === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>No skills</div>
          ) : user.skills.map((s, i) => (
            <div key={s.id} style={{
              padding: "12px 16px",
              borderBottom: i < user.skills.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{s.name}</span>
                <span style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", padding: "2px 6px", borderRadius: 3, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text3)" }}>
                  {s.usageCount}x
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 3 }}>
                <span style={{ color: "var(--text2)" }}>When:</span> {s.trigger}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>
                <span style={{ color: "var(--text2)" }}>Do:</span> {s.solution}
              </div>
              {s.tools.length > 0 && (
                <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                  {s.tools.map(t => (
                    <span key={t} style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", padding: "2px 6px", borderRadius: 3, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--blue)" }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TASKS TAB */}
      {tab === "tasks" && (
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          {user.tasks.length === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>No tasks</div>
          ) : user.tasks.map((t, i) => (
            <div key={t.id} style={{
              padding: "11px 16px",
              borderBottom: i < user.tasks.length - 1 ? "1px solid var(--border)" : "none",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", marginBottom: 3 }}>{t.title}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", padding: "2px 6px", borderRadius: 3, background: "var(--surface2)", border: "1px solid var(--border)", color: STATUS_COLOR[t.status] ?? "var(--text3)" }}>{t.status}</span>
                  <span style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", padding: "2px 6px", borderRadius: 3, background: "var(--surface2)", border: "1px solid var(--border)", color: PRIORITY_COLOR[t.priority] ?? "var(--text3)" }}>{t.priority}</span>
                  {t.linkedCompany && <span style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", padding: "2px 6px", borderRadius: 3, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>{t.linkedCompany}</span>}
                </div>
              </div>
              {t.dueDate && (
                <span style={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace", color: new Date(t.dueDate) < new Date() ? "var(--red)" : "var(--text3)", whiteSpace: "nowrap" }}>
                  {new Date(t.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* WIDGET CONFIG TAB */}
      {tab === "config" && (
        <div>
          <div style={{
            fontSize: 11, color: "var(--text3)", marginBottom: 12, lineHeight: 1.6,
          }}>
            Edit the widget config JSON for this user. Changes apply immediately on save.
          </div>
          <div style={{
            background: "var(--surface)", border: "1.5px solid var(--border)",
            borderRadius: 10, overflow: "hidden",
          }}>
            <textarea
              value={widgetJson}
              onChange={e => setWidgetJson(e.target.value)}
              rows={18}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "16px", border: "none", borderRadius: 0,
                background: "var(--bg)", color: "var(--text)",
                fontFamily: "var(--font-ibm-plex-mono), monospace",
                fontSize: 12, lineHeight: 1.65, outline: "none", resize: "vertical",
              }}
            />
            <div style={{
              padding: "10px 14px", borderTop: "1px solid var(--border)",
              display: "flex", justifyContent: "flex-end",
            }}>
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                style={{
                  background: configSaved ? "var(--green)" : "var(--text)",
                  color: "var(--bg)", border: "none", borderRadius: 6,
                  padding: "6px 16px", fontSize: 11, fontWeight: 600,
                  cursor: savingConfig ? "not-allowed" : "pointer",
                  opacity: savingConfig ? 0.7 : 1, transition: "background .2s",
                  fontFamily: "var(--font-ibm-plex-sans), sans-serif",
                }}
              >
                {configSaved ? "Saved" : savingConfig ? "Saving..." : "Save config"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
