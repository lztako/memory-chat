"use client"

import { useState } from "react"

interface FileEntry {
  id: string
  fileName: string
  fileType: string
  description: string | null
  rowCount: number
  columns: string[]
  size: number
  createdAt: string
  updatedAt: string
}

interface Props {
  files: FileEntry[]
  onReplace: (fileId: string) => void
  onDelete: (fileId: string) => Promise<void>
  onDownload: (file: FileEntry) => void
}

function SvgIcon({ d, size = 13 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
}

const FILE_TYPE_ORDER = ["shipment", "invoice", "product", "customer", "lead", "other"]

const FILE_TYPE_COLOR: Record<string, string> = {
  shipment: "var(--blue)",
  invoice: "var(--orange)",
  product: "var(--green)",
  customer: "var(--accent)",
  lead: "#a78bfa",
  other: "var(--text3)",
}

function FolderRow({ fileType, files, onReplace, onDelete, onDownload }: {
  fileType: string
  files: FileEntry[]
  onReplace: (id: string) => void
  onDelete: (id: string) => Promise<void>
  onDownload: (f: FileEntry) => void
}) {
  const [open, setOpen] = useState(false)
  const totalRows = files.reduce((s, f) => s + f.rowCount, 0)
  const color = FILE_TYPE_COLOR[fileType] ?? "var(--text3)"

  return (
    <div>
      {/* Folder row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          width: "100%", padding: "9px 14px",
          background: "none", border: "none", cursor: "pointer",
          borderBottom: open ? "none" : "1px solid var(--border)",
          textAlign: "left",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
        onMouseLeave={e => (e.currentTarget.style.background = "none")}
      >
        {/* Chevron */}
        <span style={{ color: "var(--text3)", flexShrink: 0, transition: "transform .15s", display: "inline-flex", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
          <SvgIcon d="M9 18l6-6-6-6" size={12} />
        </span>

        {/* Folder icon */}
        <SvgIcon d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" size={14} />

        {/* Label */}
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", flex: 1, textTransform: "capitalize" }}>
          {fileType}
        </span>

        {/* Stats */}
        <span style={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)", marginRight: 4 }}>
          {files.length} file{files.length !== 1 ? "s" : ""} · {totalRows.toLocaleString()} rows
        </span>

        {/* Color dot */}
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      </button>

      {/* Files list */}
      {open && (
        <div style={{ borderBottom: "1px solid var(--border)" }}>
          {files.map((f, i) => (
            <FileRow
              key={f.id}
              file={f}
              last={i === files.length - 1}
              onReplace={onReplace}
              onDelete={onDelete}
              onDownload={onDownload}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FileRow({ file, last, onReplace, onDelete, onDownload }: {
  file: FileEntry
  last: boolean
  onReplace: (id: string) => void
  onDelete: (id: string) => Promise<void>
  onDownload: (f: FileEntry) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleConfirmDelete() {
    setDeleting(true)
    try {
      await onDelete(file.id)
    } catch {
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "9px 14px 9px 38px",
      borderBottom: last ? "none" : "1px solid var(--border)",
      background: "var(--surface2)",
    }}>
      {/* File icon */}
      <span style={{ color: "var(--text3)", flexShrink: 0, marginTop: 1 }}>
        <SvgIcon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" size={13} />
      </span>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file.fileName}
        </div>
        {file.description && (
          <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.description}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          {[
            `${file.rowCount.toLocaleString()} rows`,
            `${file.columns.length} cols`,
            formatSize(file.size),
          ].map(label => (
            <span key={label} style={{
              fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace",
              padding: "2px 6px", borderRadius: 3,
              background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)",
            }}>{label}</span>
          ))}
        </div>
        <div style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)", marginTop: 4 }}>
          updated {formatDate(file.updatedAt)} · created {formatDate(file.createdAt)}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
        {confirmDelete ? (
          <>
            <span style={{ fontSize: 10, color: "var(--text3)" }}>{deleting ? "กำลังลบ..." : "ลบ?"}</span>
            <ActionBtn label="ยืนยัน" color="var(--red)" disabled={deleting} onClick={handleConfirmDelete} />
            <ActionBtn label="ยกเลิก" disabled={deleting} onClick={() => setConfirmDelete(false)} />
          </>
        ) : (
          <>
            <ActionBtn label="Replace" onClick={() => onReplace(file.id)} />
            <ActionBtn label="Download" onClick={() => onDownload(file)} />
            <ActionBtn label="Delete" color="var(--red)" onClick={() => setConfirmDelete(true)} />
          </>
        )}
      </div>
    </div>
  )
}

function ActionBtn({ label, onClick, color, disabled }: { label: string; onClick: () => void; color?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 9, padding: "3px 8px",
        border: "1px solid var(--border)", borderRadius: 4,
        background: "none", color: color ?? "var(--text3)",
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        fontFamily: "var(--font-ibm-plex-sans), sans-serif", whiteSpace: "nowrap",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = color ?? "var(--text2)" }}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      {label}
    </button>
  )
}

export function FileBrowser({ files, onReplace, onDelete, onDownload }: Props) {
  if (files.length === 0) {
    return (
      <div style={{
        background: "var(--surface)", border: "1.5px solid var(--border)",
        borderRadius: 10, padding: "28px 16px",
        textAlign: "center", color: "var(--text3)", fontSize: 13,
      }}>
        No files uploaded yet
      </div>
    )
  }

  // Group by fileType, sorted by FILE_TYPE_ORDER
  const grouped = FILE_TYPE_ORDER
    .map(ft => ({ fileType: ft, files: files.filter(f => f.fileType === ft) }))
    .filter(g => g.files.length > 0)

  // Any fileType not in FILE_TYPE_ORDER
  const knownTypes = new Set(FILE_TYPE_ORDER)
  const extraTypes = [...new Set(files.filter(f => !knownTypes.has(f.fileType)).map(f => f.fileType))]
  extraTypes.forEach(ft => grouped.push({ fileType: ft, files: files.filter(f => f.fileType === ft) }))

  return (
    <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      {grouped.map(({ fileType, files: groupFiles }) => (
        <FolderRow
          key={fileType}
          fileType={fileType}
          files={groupFiles}
          onReplace={onReplace}
          onDelete={onDelete}
          onDownload={onDownload}
        />
      ))}
    </div>
  )
}
