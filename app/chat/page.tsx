"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ChatListPage() {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const [plusOpen, setPlusOpen] = useState(false)
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const plusBtnRef = useRef<HTMLButtonElement>(null)

  // Close popover on outside click
  useEffect(() => {
    if (!plusOpen) return
    const handler = (e: MouseEvent) => {
      if (!plusBtnRef.current?.closest(".plus-wrap")?.contains(e.target as Node)) {
        setPlusOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [plusOpen])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text().catch(() => "")
    setAttachedFile({ name: file.name, content: text })
    setPlusOpen(false)
    e.target.value = ""
  }

  const handleOpenFolder = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" })
      setFolderHandle(handle)
      setPlusOpen(false)
    } catch { /* cancelled */ }
  }

  const startChat = async (prompt: string) => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    const res = await fetch("/api/conversations", { method: "POST" }).catch(() => null)
    if (!res?.ok) { setLoading(false); return }
    const conv = await res.json().catch(() => null)
    if (!conv?.id) { setLoading(false); return }

    const fullPrompt = attachedFile
      ? `${prompt.trim()}\n\n[ไฟล์แนบ: ${attachedFile.name}]\n\`\`\`\n${attachedFile.content.slice(0, 8000)}\n\`\`\``
      : prompt.trim()

    sessionStorage.setItem(`chip_prompt_${conv.id}`, fullPrompt)

    // Save folder handle to IndexedDB so [id]/page.tsx can restore it
    if (folderHandle) {
      try {
        await new Promise<void>((resolve) => {
          const req = indexedDB.open("memory-chat-folders", 1)
          req.onupgradeneeded = () => req.result.createObjectStore("handles")
          req.onsuccess = () => {
            const db = req.result
            const tx = db.transaction("handles", "readwrite")
            tx.objectStore("handles").put(folderHandle, conv.id)
            tx.oncomplete = () => resolve()
            tx.onerror = () => resolve()
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

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .chat-hero-badge   { animation: fadeUp .45s ease both; animation-delay: .05s; }
        .chat-hero-heading { animation: fadeUp .45s ease both; animation-delay: .15s; }
        .chat-hero-sub     { animation: fadeUp .45s ease both; animation-delay: .22s; }
        .chat-hero-input   { animation: fadeUp .45s ease both; animation-delay: .30s; }

        .hero-input-wrap { transition: box-shadow .2s, border-color .2s; }
        .hero-input-wrap.focused {
          box-shadow: 0 0 0 3px rgba(42,40,37,.09);
          border-color: var(--accent) !important;
        }

        .send-btn { transition: background .15s, transform .1s; }
        .send-btn:not(:disabled):hover  { transform: scale(1.06); }
        .send-btn:not(:disabled):active { transform: scale(.96); }

        .plus-btn {
          width: 28px; height: 28px; border-radius: 6px;
          border: 1.5px solid var(--border);
          background: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: var(--text3);
          transition: border-color .12s, color .12s, background .12s;
          flex-shrink: 0;
        }
        .plus-btn:hover { border-color: var(--accent); color: var(--accent); }
        .plus-btn.active { border-color: var(--accent); color: var(--accent); background: var(--surface2); }

        .plus-menu-item {
          display: flex; align-items: center; gap: 9px;
          padding: 9px 12px; font-size: 12px;
          color: var(--text2); cursor: pointer;
          transition: background .1s, color .1s;
          font-family: var(--font-ibm-plex-sans), sans-serif;
        }
        .plus-menu-item:hover { background: var(--surface2); color: var(--text); }

        .folder-badge {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 10px;
          background: var(--surface2);
          border: 1.5px dashed var(--border2);
          border-radius: 7px;
          font-size: 11px; color: var(--text2);
          font-family: var(--font-ibm-plex-sans), sans-serif;
          margin-bottom: 8px;
        }
        .badge-remove {
          width: 16px; height: 16px; border-radius: 4px;
          border: none; background: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: var(--text3); padding: 0;
          transition: color .1s;
        }
        .badge-remove:hover { color: var(--red); }
      `}</style>

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 40px 60px",
        background: "var(--bg)", position: "relative", overflow: "hidden",
      }}>

        {/* Dot-grid */}
        <svg aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: .4 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1" fill="var(--border)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, var(--bg) 100%)" }} />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 600, display: "flex", flexDirection: "column", alignItems: "center" }}>

          {/* Badge */}
          <div className="chat-hero-badge" style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "5px 12px", background: "var(--surface)",
            border: "1.5px solid var(--border2)", borderRadius: 20, marginBottom: 28,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
            </svg>
            <span style={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text3)" }}>
              Origo Intelligence
            </span>
          </div>

          {/* Heading */}
          <h1 className="chat-hero-heading" style={{
            margin: "0 0 10px", fontSize: 38, fontWeight: 700,
            color: "var(--text)", letterSpacing: "-.03em",
            fontFamily: "var(--font-ibm-plex-sans), sans-serif",
            textAlign: "center", lineHeight: 1.15,
          }}>
            สวัสดีครับ
          </h1>

          <p className="chat-hero-sub" style={{
            margin: "0 0 32px", fontSize: 13, color: "var(--text3)",
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            letterSpacing: ".02em", textAlign: "center",
          }}>
            ถามอะไรก็ได้เกี่ยวกับการค้าระหว่างประเทศ
          </p>

          {/* Folder / file badge above input */}
          {(folderHandle || attachedFile) && (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4, marginBottom: 0 }}>
              {folderHandle && (
                <div className="folder-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <span style={{ flex: 1 }}>{folderHandle.name}</span>
                  <span style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)" }}>AI can edit</span>
                  <button className="badge-remove" onClick={() => setFolderHandle(null)} title="Remove">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
              {attachedFile && (
                <div className="folder-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  <span style={{ flex: 1 }}>{attachedFile.name}</span>
                  <button className="badge-remove" onClick={() => setAttachedFile(null)} title="Remove">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Input box */}
          <div
            className={`hero-input-wrap chat-hero-input${focused ? " focused" : ""}`}
            style={{
              width: "100%", border: "1.5px solid var(--border2)", borderRadius: 14,
              background: "var(--surface)",
              marginTop: (folderHandle || attachedFile) ? 8 : 0,
            }}
          >
            {/* Textarea */}
            <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "flex-end", gap: 10 }}>
              <textarea
                rows={2}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="พิมพ์คำถามของคุณที่นี่…"
                disabled={loading}
                style={{
                  flex: 1, border: "none", background: "transparent",
                  fontFamily: "var(--font-ibm-plex-sans), sans-serif",
                  fontSize: 14, color: "var(--text)", outline: "none",
                  resize: "none", minHeight: 44, lineHeight: 1.6,
                }}
              />
              <button
                className="send-btn"
                onClick={() => startChat(value)}
                disabled={!value.trim() || loading}
                style={{
                  width: 36, height: 36, flexShrink: 0,
                  background: value.trim() && !loading ? "var(--accent)" : "var(--surface2)",
                  border: "none", borderRadius: 9,
                  cursor: value.trim() && !loading ? "pointer" : "default",
                  color: value.trim() && !loading ? "var(--bg)" : "var(--text3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
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

            {/* Bottom bar */}
            <div style={{
              padding: "6px 12px 10px", borderTop: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <input ref={fileInputRef} type="file" accept=".csv,.txt,.json,.png,.jpg,.jpeg,.gif,.webp" style={{ display: "none" }} onChange={handleFileChange} />

              {/* + popover */}
              <div className="plus-wrap" style={{ position: "relative" }}>
                <button
                  ref={plusBtnRef}
                  className={`plus-btn${plusOpen ? " active" : ""}`}
                  onClick={() => setPlusOpen(o => !o)}
                  disabled={loading}
                  title="Attach or connect"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>

                {plusOpen && (
                  <div style={{
                    position: "absolute", bottom: 36, left: 0,
                    background: "var(--surface)", border: "1.5px solid var(--border2)",
                    borderRadius: 8, overflow: "hidden", minWidth: 168,
                    boxShadow: "0 6px 20px rgba(42,40,37,.12)", zIndex: 100,
                  }}>
                    <div className="plus-menu-item" onClick={() => { fileInputRef.current?.click(); setPlusOpen(false) }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                      Attach file
                    </div>
                    <div style={{ height: 1, background: "var(--border)" }} />
                    <div className="plus-menu-item" onClick={handleOpenFolder}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      <div>
                        <div>{folderHandle ? "Change folder" : "Open folder"}</div>
                        <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>AI can edit files</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)" }}>
                Sonnet 4.6 · ⏎ send
              </span>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
