"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

// CHIPS defined inline below with icons

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return "Good morning."
  if (h >= 12 && h < 18) return "Good afternoon."
  return "Good evening."
}

export default function ChatListPage() {
  const router = useRouter()
  const [greeting] = useState(getGreeting)
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [plusOpen, setPlusOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const plusBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!plusOpen) return
    const handler = (e: MouseEvent) => {
      if (!plusBtnRef.current?.closest(".plus-wrap-hero")?.contains(e.target as Node)) setPlusOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [plusOpen])

  const startChat = async (prompt: string) => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    const res = await fetch("/api/conversations", { method: "POST" }).catch(() => null)
    if (!res?.ok) { setLoading(false); return }
    const conv = await res.json().catch(() => null)
    if (!conv?.id) { setLoading(false); return }
    sessionStorage.setItem(`chip_prompt_${conv.id}`, prompt.trim())
    if (folderHandle) {
      try {
        await new Promise<void>((resolve) => {
          const req = indexedDB.open("memory-chat-folders", 1)
          req.onupgradeneeded = () => req.result.createObjectStore("handles")
          req.onsuccess = () => {
            const db = req.result
            const tx = db.transaction("handles", "readwrite")
            tx.objectStore("handles").put(folderHandle, conv.id)
            tx.oncomplete = () => resolve(); tx.onerror = () => resolve()
          }
          req.onerror = () => resolve()
        })
      } catch { /* ignore */ }
    }
    router.push(`/chat/${conv.id}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); startChat(value) }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"
  }

  const handleOpenFolder = async () => {
    setPlusOpen(false)
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" })
      setFolderHandle(handle)
    } catch { /* cancelled */ }
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes heroIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-icon    { animation: heroIn .5s ease both; animation-delay: .0s; }
        .hero-title   { animation: heroIn .5s ease both; animation-delay: .08s; }
        .hero-input   { animation: heroIn .5s ease both; animation-delay: .16s; }
        .hero-chips   { animation: heroIn .5s ease both; animation-delay: .26s; }

        .hero-card {
          border-radius: 20px;
          background: var(--surface2);
          box-shadow: 0 0 0 1px var(--border), 0 8px 40px rgba(0,0,0,.35);
          transition: box-shadow .2s;
        }
        .hero-card:focus-within {
          box-shadow: 0 0 0 1.5px var(--border2), 0 8px 40px rgba(0,0,0,.4);
        }

        .chip-pill {
          padding: 6px 14px;
          border: 1px solid var(--border2);
          border-radius: 20px;
          font-size: 11.5px;
          font-family: var(--font-ibm-plex-sans), sans-serif;
          color: var(--text2);
          background: transparent;
          cursor: pointer;
          transition: border-color .15s, color .15s, background .12s;
          white-space: nowrap;
        }
        .chip-pill:hover { border-color: var(--text3); color: var(--text); background: var(--surface2); }
        .chip-pill:disabled { opacity: .4; cursor: default; }

        .plus-menu-row {
          display: flex; align-items: center; gap: 9px;
          padding: 9px 12px; font-size: 12px;
          color: var(--text2); cursor: pointer;
          transition: background .1s, color .1s;
          font-family: var(--font-ibm-plex-sans), sans-serif;
        }
        .plus-menu-row:hover { background: var(--surface); color: var(--text); }
      `}</style>

      {/* Full-height centered layout — NO topbar */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 24px 48px",
        background: "var(--bg)", overflow: "hidden",
      }}>
        <div style={{ width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>

          <h1 className="hero-title" style={{
            margin: "0 0 28px", fontSize: 40, fontWeight: 700,
            color: "var(--text)", letterSpacing: "-.03em",
            fontFamily: "var(--font-ibm-plex-sans), sans-serif",
            textAlign: "center", lineHeight: 1.1,
          }}>
            {greeting}
          </h1>

          {/* Input card */}
          <div className="hero-card hero-input" style={{ width: "100%" }}>

            {/* Folder badge */}
            {folderHandle && (
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 16px 0",
              }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "3px 10px", background: "var(--surface)",
                  border: "1px solid var(--border)", borderRadius: 6,
                  fontSize: 11, color: "var(--text2)",
                  fontFamily: "var(--font-ibm-plex-mono), monospace",
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  {folderHandle.name}
                  <span style={{ color: "var(--green)", fontSize: 9 }}>AI can edit</span>
                  <button onClick={() => setFolderHandle(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
                </div>
              </div>
            )}

            {/* Textarea */}
            <div style={{ padding: "16px 18px 4px" }}>
              <textarea
                ref={textareaRef}
                rows={2}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="How can I help you today?"
                disabled={loading}
                style={{
                  width: "100%", border: "none", background: "transparent",
                  fontFamily: "var(--font-ibm-plex-sans), sans-serif",
                  fontSize: 15, color: "var(--text)", outline: "none",
                  resize: "none", minHeight: 48, maxHeight: 160, lineHeight: 1.6,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Bottom bar */}
            <div style={{ padding: "8px 14px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <input ref={fileInputRef} type="file" style={{ display: "none" }} />

              {/* + popover */}
              <div className="plus-wrap-hero" style={{ position: "relative" }}>
                <button
                  ref={plusBtnRef}
                  onClick={() => setPlusOpen(o => !o)}
                  disabled={loading}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--text3)", transition: "border-color .12s, color .12s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--text2)" }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text3)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>

                {plusOpen && (
                  <div style={{
                    position: "absolute", bottom: 40, left: 0,
                    background: "var(--surface)", border: "1px solid var(--border2)",
                    borderRadius: 10, overflow: "hidden", minWidth: 172,
                    boxShadow: "0 8px 32px rgba(0,0,0,.4)", zIndex: 100,
                  }}>
                    <div className="plus-menu-row" onClick={() => { fileInputRef.current?.click(); setPlusOpen(false) }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                      Attach file
                    </div>
                    <div style={{ height: 1, background: "var(--border)" }} />
                    <div className="plus-menu-row" onClick={handleOpenFolder}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                      <div>
                        <div>{folderHandle ? "Change folder" : "Open folder"}</div>
                        <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>AI can edit files</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sonnet label */}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)" }}>
                  Sonnet 4.6
                </span>
                {/* Send button */}
                <button
                  onClick={() => startChat(value)}
                  disabled={!value.trim() || loading}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: value.trim() && !loading ? "var(--accent)" : "var(--surface)",
                    border: "1px solid " + (value.trim() && !loading ? "transparent" : "var(--border)"),
                    cursor: value.trim() && !loading ? "pointer" : "default",
                    color: value.trim() && !loading ? "var(--bg)" : "var(--text3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background .15s",
                    flexShrink: 0,
                  }}
                >
                  {loading ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>


        </div>
      </div>
    </>
  )
}
