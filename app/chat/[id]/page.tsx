"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MessageBubble } from "@/components/MessageBubble"
import { ChatInput, buildFolderContext, writeFolderFile, moveFolderFile, type FolderContext, type ImageAttachment } from "@/components/ChatInput"
import { RightPanel } from "@/components/RightPanel"
import type { Artifact } from "@/components/ArtifactPanel"

// ── IndexedDB: persist FileSystemDirectoryHandle per conversation ────────────
function openFolderDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("memory-chat-folders", 1)
    req.onupgradeneeded = () => req.result.createObjectStore("handles")
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
async function saveFolderHandle(convId: string, handle: FileSystemDirectoryHandle) {
  try {
    const db = await openFolderDB()
    await new Promise<void>((res, rej) => {
      const tx = db.transaction("handles", "readwrite")
      tx.objectStore("handles").put(handle, convId)
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
  } catch { /* ignore */ }
}
async function loadFolderHandle(convId: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openFolderDB()
    return await new Promise((res, rej) => {
      const tx = db.transaction("handles", "readonly")
      const req = tx.objectStore("handles").get(convId)
      req.onsuccess = () => res(req.result ?? null)
      req.onerror = () => rej(req.error)
    })
  } catch { return null }
}

interface ToolCall { id: string; name: string; done: boolean }
interface Message {
  role: "user" | "assistant"
  content: string
  toolCalls?: ToolCall[]
}

const topbarBtnStyle: React.CSSProperties = {
  padding: "4px 10px",
  border: "1.5px solid var(--border)",
  borderRadius: 5,
  fontSize: 11,
  fontFamily: "var(--font-ibm-plex-mono), monospace",
  background: "var(--surface)",
  color: "var(--text2)",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [conversationId, setConversationId] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [artifactIndex, setArtifactIndex] = useState(0)
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [folderReconnectName, setFolderReconnectName] = useState<string | null>(null)
  const [attachedFiles, setAttachedFiles] = useState<string[]>([])
  const [shareCopied, setShareCopied] = useState(false)
  const [tendataRemaining, setTendataRemaining] = useState(500)
  const [tendataLimit, setTendataLimit] = useState(500)
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)
  const [folderLoaded, setFolderLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const folderHandleRef = useRef<FileSystemDirectoryHandle | null>(null)

  useEffect(() => { folderHandleRef.current = folderHandle }, [folderHandle])

  useEffect(() => {
    params.then((p) => setConversationId(p.id))
  }, [params])

  useEffect(() => {
    if (!conversationId) return
    setIsLoadingMessages(true)
    setMessages([])
    fetch(`/api/conversations/${conversationId}/messages`)
      .then((r) => r.json())
      .then((data: Message[]) => setMessages(data))
      .catch(console.error)
      .finally(() => { setIsLoadingMessages(false); router.refresh() })

    // Restore folder handle from IndexedDB
    setFolderHandle(null)
    setFolderReconnectName(null)
    setFolderLoaded(false)
    loadFolderHandle(conversationId).then(async (handle) => {
      if (!handle) { setFolderLoaded(true); return }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const perm = await (handle as any).queryPermission({ mode: "readwrite" })
        if (perm === "granted") {
          setFolderHandle(handle)
        } else {
          setFolderReconnectName(handle.name)
        }
      } catch { /* handle invalid */ }
      setFolderLoaded(true)
    }).catch(() => { setFolderLoaded(true) })

    // Restore attached file names from localStorage
    try {
      const saved = localStorage.getItem(`attached-${conversationId}`)
      setAttachedFiles(saved ? JSON.parse(saved) : [])
    } catch { setAttachedFiles([]) }

    // Pick up prompt queued from empty-state page
    const queued = sessionStorage.getItem(`chip_prompt_${conversationId}`)
    if (queued) {
      sessionStorage.removeItem(`chip_prompt_${conversationId}`)
      setPendingPrompt(queued)
    }
  }, [conversationId])

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => {
        setTendataRemaining(d.tendata?.remaining ?? 500)
        setTendataLimit(d.tendata?.limit ?? 500)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-send queued prompt from empty-state page once messages + folder both ready
  useEffect(() => {
    if (!pendingPrompt || isLoadingMessages || !folderLoaded) return
    const prompt = pendingPrompt
    setPendingPrompt(null)
    const handle = folderHandleRef.current
    if (handle) {
      buildFolderContext(handle, prompt).then((ctx) => handleSend(prompt, ctx)).catch(() => handleSend(prompt))
    } else {
      handleSend(prompt)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt, isLoadingMessages, folderLoaded])

  const handleStop = () => abortRef.current?.abort()

  const handleSend = async (message: string, folderContext?: FolderContext, imageAttachments?: ImageAttachment[]) => {
    const displayContent = imageAttachments?.length
      ? message + "\n" + imageAttachments.map((img) => `[ไฟล์แนบ: ${img.name}]`).join("\n")
      : message
    setMessages((prev) => [...prev, { role: "user", content: displayContent }])
    setIsStreaming(true)
    setMessages((prev) => [...prev, { role: "assistant", content: "", toolCalls: [] }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId, folderContext, imageAttachments }),
        signal: controller.signal,
      })
      if (res.status === 404) {
        window.location.href = "/chat"
        return
      }
      if (!res.ok) throw new Error(`Error ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split("\n\n")
        buffer = parts.pop() ?? ""
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue
          try {
            const { t, v } = JSON.parse(part.slice(6))
            if (t === "text") {
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + v,
                }
                return updated
              })
            } else if (t === "artifact") {
              const artifact: Artifact = { id: Date.now().toString(), ...v }
              setArtifacts((prev) => {
                const next = [...prev, artifact]
                setArtifactIndex(next.length - 1)
                return next
              })
            } else if (t === "tool_start") {
              const { id, name } = v as { id: string; name: string }
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                updated[updated.length - 1] = {
                  ...last,
                  toolCalls: [...(last.toolCalls ?? []), { id, name, done: false }],
                }
                return updated
              })
            } else if (t === "folder_write") {
              const { path, content } = v as { path: string; content: string }
              if (folderHandleRef.current) writeFolderFile(folderHandleRef.current, path, content).catch(console.error)
            } else if (t === "folder_move") {
              const { from, to } = v as { from: string; to: string }
              if (folderHandleRef.current) moveFolderFile(folderHandleRef.current, from, to).catch(console.error)
            } else if (t === "title_update") {
              router.refresh()
            } else if (t === "tool_done") {
              const { id } = v as { id: string }
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                updated[updated.length - 1] = {
                  ...last,
                  toolCalls: (last.toolCalls ?? []).map((tc) =>
                    tc.id === id ? { ...tc, done: true } : tc
                  ),
                }
                return updated
              })
            }
          } catch { /* ignore malformed */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
          }
          return updated
        })
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }

  const handleFolderOpen = (handle: FileSystemDirectoryHandle) => {
    setFolderHandle(handle)
    setFolderReconnectName(null)
    if (conversationId) saveFolderHandle(conversationId, handle)
  }


  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 1800)
    }).catch(() => {})
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* ── Chat Column ─────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Topbar ── */}
        <div style={{
          height: 44, flexShrink: 0,
          borderBottom: "1.5px solid var(--border)",
          display: "flex", alignItems: "center",
          padding: "0 20px", gap: 10,
          background: "var(--bg)",
        }}>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {folderHandle ? folderHandle.name : "Chat"}
          </div>
          <button onClick={handleShare} style={{ ...topbarBtnStyle, color: shareCopied ? "var(--green)" : "var(--text2)" }}>
            {shareCopied ? "Copied" : "Share ↗"}
          </button>
          <span style={{ ...topbarBtnStyle, cursor: "default", userSelect: "none" }}>Sonnet 4.6</span>
        </div>

        {/* ── Messages ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20, background: "var(--bg)" }}>
          {isLoadingMessages ? (
            <div style={{ textAlign: "center", color: "var(--text3)", marginTop: 64, fontSize: 13 }}>Loading...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text3)", marginTop: 64, fontSize: 13 }}>Start a conversation...</div>
          ) : (
            messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} toolCalls={m.toolCalls} />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          disabled={isStreaming}
          isStreaming={isStreaming}
          folderHandle={folderHandle}
          onFolderOpen={handleFolderOpen}
          folderReconnectName={folderReconnectName}
          attachedFiles={attachedFiles}
          recentContext={messages.slice(-5).map(m => m.content).join(" ")}
          conversationId={conversationId}
        />
      </div>

      {/* ── Right Panel (280px) ── */}
      <RightPanel
        artifacts={artifacts}
        currentIndex={artifactIndex}
        onNavigate={setArtifactIndex}
        onClearArtifacts={() => setArtifacts([])}
        folderHandle={folderHandle}
        tendataRemaining={tendataRemaining}
        tendataLimit={tendataLimit}
      />
    </div>
  )
}
