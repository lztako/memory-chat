"use client"
import { useState, useRef, useEffect } from "react"

interface Skill { id: string; name: string; trigger: string }

export interface FolderContext {
  tree: string
  files: Array<{ path: string; content: string }>
}

export interface ImageAttachment {
  name: string
  data: string    // base64 (no prefix)
  mimeType: string
}

interface TextAttachment {
  id: string
  fileName: string
  fileType: string
  rowCount?: number
  columns?: string[]
  length?: number
}

interface Props {
  onSend: (message: string, folderContext?: FolderContext, imageAttachments?: ImageAttachment[]) => void
  onStop?: () => void
  disabled?: boolean
  isStreaming?: boolean
  folderHandle?: FileSystemDirectoryHandle | null
  onFolderOpen?: (handle: FileSystemDirectoryHandle) => void
  folderReconnectName?: string | null
  attachedFiles?: string[]   // DB files — permanent badges (right panel uploads)
  recentContext?: string
  conversationId: string
  initialTextAttachments?: object[]  // staged from empty-state attach
}

// ── Folder helpers (browser FileSystem API) ─────────────────────────────────

const FOLDER_FILE_SIZE_LIMIT = 12_000   // chars per file
const FOLDER_TOTAL_SIZE_LIMIT = 80_000  // chars total across all files

export async function buildFolderContext(handle: FileSystemDirectoryHandle, _message: string, _recentContext = ""): Promise<FolderContext> {
  const treeLines: string[] = []
  const allFiles: Array<{ path: string; fileHandle: FileSystemFileHandle }> = []

  async function readTree(dir: FileSystemDirectoryHandle, prefix: string, relPath: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const [name, entry] of (dir as any).entries()) {
      if (entry.kind === "file") {
        treeLines.push(`${prefix}${name}`)
        const filePath = relPath ? `${relPath}/${name}` : name
        allFiles.push({ path: filePath, fileHandle: entry as FileSystemFileHandle })
      } else {
        treeLines.push(`${prefix}${name}/`)
        const subPath = relPath ? `${relPath}/${name}` : name
        await readTree(entry as FileSystemDirectoryHandle, prefix + "  ", subPath)
      }
    }
  }
  await readTree(handle, "", "")

  // Send tree only — AI uses read_local_file tool to fetch specific files on demand
  return { tree: treeLines.join("\n"), files: [] }
}

async function writeFolderFile(handle: FileSystemDirectoryHandle, path: string, content: string) {
  const parts = path.split("/")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dir: FileSystemDirectoryHandle = handle
  for (const part of parts.slice(0, -1)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dir = await (dir as any).getDirectoryHandle(part, { create: true })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fh = await (dir as any).getFileHandle(parts[parts.length - 1], { create: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const writable = await (fh as any).createWritable()
  await writable.write(content)
  await writable.close()
}

async function copyDirRecursive(srcDir: FileSystemDirectoryHandle, dstDir: FileSystemDirectoryHandle) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for await (const [name, entry] of (srcDir as any).entries()) {
    if (entry.kind === "file") {
      const file = await (entry as FileSystemFileHandle).getFile()
      const content = await file.text()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fh = await (dstDir as any).getFileHandle(name, { create: true })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writable = await (fh as any).createWritable()
      await writable.write(content)
      await writable.close()
    } else if (entry.kind === "directory") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subDst = await (dstDir as any).getDirectoryHandle(name, { create: true })
      await copyDirRecursive(entry as FileSystemDirectoryHandle, subDst)
    }
  }
}

async function moveFolderFile(handle: FileSystemDirectoryHandle, from: string, to: string) {
  const fromClean = from.replace(/\/$/, "")
  const toClean = to.replace(/\/$/, "")
  const fromParts = fromClean.split("/")
  const fromName = fromParts[fromParts.length - 1]

  // Navigate to source parent directory
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fromDir: any = handle
  for (const part of fromParts.slice(0, -1)) {
    fromDir = await (fromDir as any).getDirectoryHandle(part)
  }

  // Detect if it's a directory or file
  let isDirectory = false
  try {
    await (fromDir as any).getDirectoryHandle(fromName)
    isDirectory = true
  } catch { /* it's a file */ }

  if (isDirectory) {
    // Navigate into source dir, create dest dir, copy recursively, then delete source
    const srcDir: FileSystemDirectoryHandle = await (fromDir as any).getDirectoryHandle(fromName)
    const toParts = toClean.split("/")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dstParent: any = handle
    for (const part of toParts.slice(0, -1)) {
      dstParent = await (dstParent as any).getDirectoryHandle(part, { create: true })
    }
    const dstDir: FileSystemDirectoryHandle = await (dstParent as any).getDirectoryHandle(toParts[toParts.length - 1], { create: true })
    await copyDirRecursive(srcDir, dstDir)
    await (fromDir as any).removeEntry(fromName, { recursive: true })
  } else {
    // It's a file — read, write to new path, remove from source dir
    const fh = await (fromDir as any).getFileHandle(fromName)
    const file = await fh.getFile()
    const content: string = await file.text()
    await writeFolderFile(handle, toClean, content)
    await (fromDir as any).removeEntry(fromName)
  }
}

export { writeFolderFile, moveFolderFile }

export function ChatInput({ onSend, onStop, disabled, isStreaming, folderHandle, onFolderOpen, folderReconnectName, attachedFiles = [], recentContext = "", conversationId, initialTextAttachments = [] }: Props) {
  const [value, setValue] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [textAttachments, setTextAttachments] = useState<TextAttachment[]>(
    initialTextAttachments as TextAttachment[]
  )
  const [imageAttachments, setImageAttachments] = useState<ImageAttachment[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashFilter, setSlashFilter] = useState("")
  const [slashIndex, setSlashIndex] = useState(0)
  const [plusOpen, setPlusOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const plusBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    fetch("/api/skills").then(r => r.json()).then(d => setSkills(d.skills ?? [])).catch(() => {})
  }, [])

  // Close plus popover when clicking outside
  useEffect(() => {
    if (!plusOpen) return
    const handler = (e: MouseEvent) => {
      if (plusBtnRef.current && !plusBtnRef.current.closest(".plus-popover-wrap")?.contains(e.target as Node)) {
        setPlusOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [plusOpen])

  const filteredSkills = skills.filter(s =>
    slashFilter === "" ||
    s.name.toLowerCase().includes(slashFilter) ||
    s.trigger.toLowerCase().includes(slashFilter)
  )

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setValue(v)
    if (v.startsWith("/")) {
      setSlashFilter(v.slice(1).toLowerCase())
      setSlashOpen(true)
      setSlashIndex(0)
    } else {
      setSlashOpen(false)
    }
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
  }

  const doSend = async () => {
    if (!value.trim() || disabled) return
    const msg = value.trim()
    setValue("")
    setSlashOpen(false)
    if (textareaRef.current) textareaRef.current.style.height = "auto"

    let ctx: FolderContext | undefined
    if (folderHandle) {
      ctx = await buildFolderContext(folderHandle, msg, recentContext).catch(() => undefined)
    }

    const imgs = imageAttachments.length > 0 ? [...imageAttachments] : undefined
    onSend(msg, ctx, imgs)
    setImageAttachments([])   // images clear after send (they're in message content)
    // textAttachments persist — they stay in session for the whole conversation
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (slashOpen && filteredSkills.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashIndex(i => Math.min(i + 1, filteredSkills.length - 1)); return }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSlashIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === "Enter")     { e.preventDefault(); selectSkill(filteredSkills[slashIndex]); return }
      if (e.key === "Escape")    { setSlashOpen(false); return }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend() }
  }

  const selectSkill = (skill: Skill) => {
    setValue(skill.trigger + " ")
    setSlashOpen(false)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setPlusOpen(false)

    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    const isImage = file.type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)

    if (isImage) {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const data = dataUrl.split(",")[1]
        const mimeType = file.type || "image/jpeg"
        setImageAttachments((prev) => [...prev, { name: file.name, data, mimeType }])
      }
      reader.readAsDataURL(file)
      return
    }

    if (!["csv", "txt", "json", "xlsx", "xls"].includes(ext)) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("conversationId", conversationId)
      const res = await fetch("/api/files/attach", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) return
      setTextAttachments((prev) => [...prev, {
        id: data.id,
        fileName: data.fileName,
        fileType: data.fileType,
        rowCount: data.rowCount,
        columns: data.columns,
        length: data.length,
      }])
    } catch { /* ignore */ }
    finally { setIsUploading(false) }
  }

  const handleOpenFolder = async () => {
    if (!onFolderOpen) return
    setPlusOpen(false)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" })
      onFolderOpen(handle)
    } catch { /* cancelled */ }
  }

  return (
    <div style={{ padding: "0 24px 24px", background: "var(--bg)", flexShrink: 0, position: "relative" }}>
      {/* Gradient fade */}
      <div style={{ position: "absolute", top: -60, left: 0, right: 0, height: 60, background: "linear-gradient(to bottom, transparent, var(--bg))", pointerEvents: "none" }} />

      {/* ── Slash Command Dropdown ── */}
      {slashOpen && filteredSkills.length > 0 && (
        <div style={{
          position: "absolute", bottom: "100%", left: 32, right: 32,
          marginBottom: 4,
          background: "var(--surface)",
          border: "1.5px solid var(--border2)",
          borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          zIndex: 100, overflow: "hidden",
        }}>
          <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--border)", fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)", letterSpacing: ".06em" }}>
            SKILLS — {filteredSkills.length} match
          </div>
          {filteredSkills.slice(0, 6).map((skill, i) => (
            <div
              key={skill.id}
              onClick={() => selectSkill(skill)}
              style={{
                padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                background: i === slashIndex ? "var(--surface2)" : "transparent",
              }}
              onMouseEnter={() => setSlashIndex(i)}
            >
              <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 12, fontWeight: 500, color: "var(--accent)", width: 120, flexShrink: 0 }}>/{skill.name}</div>
              <div style={{ fontSize: 11, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{skill.trigger}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Chat Attachments (ephemeral) — moved inside Input Box below ── */}
      {false && (textAttachments.length > 0 || imageAttachments.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {textAttachments.map((f) => (
            <div key={f.id} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 8px 3px 9px",
              background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: 5, fontSize: 11, color: "var(--text2)",
              fontFamily: "var(--font-ibm-plex-mono), monospace",
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              {f.fileName}
              {f.rowCount != null && <span style={{ color: "var(--text3)" }}>{f.rowCount}r</span>}
              <button
                onClick={() => setTextAttachments((prev) => prev.filter((x) => x.id !== f.id))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 12, lineHeight: 1, padding: 0, marginLeft: 2 }}
              >×</button>
            </div>
          ))}
          {imageAttachments.map((img, i) => (
            <div key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 8px 3px 9px",
              background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: 5, fontSize: 11, color: "var(--text2)",
              fontFamily: "var(--font-ibm-plex-mono), monospace",
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
              {img.name}
              <button
                onClick={() => setImageAttachments((prev) => prev.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 12, lineHeight: 1, padding: 0, marginLeft: 2 }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Attached file badges — permanent, no remove */}
      {attachedFiles.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {attachedFiles.map((name, i) => (
            <div key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 9px",
              background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: 5, fontSize: 11, color: "var(--text2)",
              fontFamily: "var(--font-ibm-plex-mono), monospace",
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              {name}
            </div>
          ))}
        </div>
      )}

      {/* Folder reconnect prompt — shown when permission needs re-grant */}
      {!folderHandle && folderReconnectName && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div
            onClick={handleOpenFolder}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 10px",
              background: "var(--surface2)", border: "1px dashed var(--border)",
              borderRadius: 5, fontSize: 11, color: "var(--text3)",
              fontFamily: "var(--font-ibm-plex-mono), monospace",
              cursor: "pointer",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            {folderReconnectName}
            <span style={{ fontSize: 9, color: "var(--text3)" }}>click to reconnect</span>
          </div>
        </div>
      )}

      {/* Folder badge — shown when folder connected */}
      {folderHandle && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 10px",
            background: "var(--surface2)", border: "1px solid var(--border)",
            borderRadius: 5, fontSize: 11, color: "var(--text2)",
            fontFamily: "var(--font-ibm-plex-mono), monospace",
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            {folderHandle.name}
            <span style={{ fontSize: 9, color: "var(--green)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>AI can edit</span>
          </div>
        </div>
      )}

      {/* ── Input Box ── */}
      <div style={{
        border: "1px solid var(--border)",
        borderRadius: 20,
        background: "var(--surface2)",
        overflow: "visible",
        boxShadow: "0 4px 32px rgba(0,0,0,.35)",
        transition: "border-color .2s, box-shadow .2s",
        maxWidth: 760,
        margin: "0 auto",
      }}
        onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 40px rgba(0,0,0,.45)" }}
        onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 32px rgba(0,0,0,.35)" }}
      >
        {/* ── Attachments inside card ── */}
        {(textAttachments.length > 0 || imageAttachments.length > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 14px 0" }}>
            {textAttachments.map((f) => (
              <div key={f.id} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 8px 3px 9px",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 6, fontSize: 11, color: "var(--text2)",
                fontFamily: "var(--font-ibm-plex-mono), monospace",
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                {f.fileName}
                {f.rowCount != null && <span style={{ color: "var(--text3)" }}>{f.rowCount}r</span>}
                <button
                  onClick={() => setTextAttachments((prev) => prev.filter((x) => x.id !== f.id))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 12, lineHeight: 1, padding: 0, marginLeft: 2 }}
                >×</button>
              </div>
            ))}
            {imageAttachments.map((img, i) => (
              <div key={i} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 8px 3px 9px",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 6, fontSize: 11, color: "var(--text2)",
                fontFamily: "var(--font-ibm-plex-mono), monospace",
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
                {img.name}
                <button
                  onClick={() => setImageAttachments((prev) => prev.filter((_, j) => j !== i))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 12, lineHeight: 1, padding: 0, marginLeft: 2 }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea + Send */}
        <div style={{ display: "flex", alignItems: "flex-end", padding: "12px 14px", gap: 10 }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={isUploading ? "Uploading..." : "Reply..."}
            disabled={isStreaming ? false : disabled}
            rows={1}
            style={{
              flex: 1, border: "none", background: "transparent",
              fontFamily: "var(--font-ibm-plex-sans), sans-serif",
              fontSize: 13, color: "var(--text)", outline: "none",
              resize: "none", minHeight: 20, maxHeight: 120,
            }}
          />
          {isStreaming ? (
            <button
              onClick={onStop}
              style={{
                width: 32, height: 32, flexShrink: 0,
                background: "var(--accent)", border: "none", borderRadius: 8,
                cursor: "pointer", color: "var(--bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <rect x="2" y="2" width="8" height="8" rx="1.5"/>
              </svg>
            </button>
          ) : (
            <button
              onClick={doSend}
              disabled={!value.trim() || disabled}
              style={{
                width: 32, height: 32, flexShrink: 0,
                background: value.trim() ? "var(--accent)" : "var(--surface2)",
                border: "none", borderRadius: 8,
                cursor: value.trim() ? "pointer" : "default",
                color: value.trim() ? "var(--bg)" : "var(--text3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background .15s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* Bottom bar: + button + hint */}
        <div style={{ padding: "6px 12px 10px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <input ref={fileInputRef} type="file" accept=".csv,.txt,.json,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.webp" style={{ display: "none" }} onChange={handleFileChange} />

          {/* + popover */}
          <div className="plus-popover-wrap" style={{ position: "relative" }}>
            <button
              ref={plusBtnRef}
              onClick={() => setPlusOpen(o => !o)}
              disabled={isStreaming || disabled}
              style={{
                width: 28, height: 28, borderRadius: 6,
                border: "1.5px solid var(--border)",
                background: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text3)",
                transition: "border-color .12s, color .12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)" }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text3)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {plusOpen && (
              <div style={{
                position: "absolute", bottom: 36, left: 0,
                background: "var(--surface)", border: "1.5px solid var(--border2)",
                borderRadius: 8, overflow: "hidden", minWidth: 160,
                boxShadow: "0 6px 20px rgba(42,40,37,.12)", zIndex: 100,
              }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", fontSize: 12, color: "var(--text2)", cursor: "pointer", transition: "background .1s, color .1s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "var(--text2)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  Attach file
                </div>
                <div style={{ height: 1, background: "var(--border)" }} />
                <div
                  onClick={handleOpenFolder}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", fontSize: 12, color: "var(--text2)", cursor: "pointer", transition: "background .1s, color .1s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "var(--text2)" }}
                >
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
            claude sonnet 4.6
          </span>
        </div>
      </div>
    </div>
  )
}
