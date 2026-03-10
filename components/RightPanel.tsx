"use client"
import { useState, useEffect } from "react"
import { ArtifactPanel, type Artifact } from "./ArtifactPanel"

interface UserFile {
  id: string
  fileName: string
  fileType: string
  description: string | null
  rowCount: number
  columns: string[]
}

interface UploadModal { fileType: string; description: string; file: File | null }

interface Props {
  artifacts: Artifact[]
  currentIndex: number
  onNavigate: (i: number) => void
  onClearArtifacts: () => void
  folderHandle: FileSystemDirectoryHandle | null
  tendataRemaining: number
  tendataLimit: number
}

const S = {
  panel: {
    width: 280, flexShrink: 0,
    display: "flex", flexDirection: "column" as const,
    background: "var(--surface)",
    borderLeft: "1.5px solid var(--border)",
    overflow: "hidden",
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: "var(--font-ibm-plex-mono), monospace",
    letterSpacing: ".08em",
    color: "var(--text3)",
    textTransform: "uppercase" as const,
    marginBottom: 8,
  },
  connectorRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    border: "1.5px solid var(--border)",
    borderRadius: 6,
    marginBottom: 6,
    background: "var(--bg)",
  },
  connIcon: {
    width: 28, height: 28,
    border: "1.5px solid var(--border)", borderRadius: 5,
    background: "var(--surface)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, color: "var(--text3)",
  },
  connStatus: (connected: boolean): React.CSSProperties => ({
    fontSize: 9,
    fontFamily: "var(--font-ibm-plex-mono), monospace",
    padding: "2px 6px",
    borderRadius: 3,
    border: `1px solid ${connected ? "var(--green)" : "var(--border)"}`,
    color: connected ? "var(--green)" : "var(--text3)",
  }),
  fileRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 10px",
    border: "1.5px solid var(--border)",
    borderRadius: 6,
    marginBottom: 5,
    background: "var(--bg)",
    fontSize: 11,
  } as React.CSSProperties,
}

export function RightPanel({
  artifacts, currentIndex, onNavigate, onClearArtifacts,
  folderHandle, tendataRemaining, tendataLimit,
}: Props) {
  const [files, setFiles] = useState<UserFile[]>([])
  const [uploadModal, setUploadModal] = useState<UploadModal | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    fetch("/api/files").then(r => r.json()).then(d => setFiles(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setUploadModal({ file, fileType: "shipment", description: "" })
  }

  const handleUpload = async () => {
    if (!uploadModal?.file) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", uploadModal.file)
      formData.append("fileType", uploadModal.fileType)
      if (uploadModal.description) formData.append("description", uploadModal.description)
      const res = await fetch("/api/files/upload", { method: "POST", body: formData })
      if (res.ok) {
        const data = await res.json()
        setFiles(prev => [...prev, data])
      }
    } catch { /* ignore */ } finally {
      setIsUploading(false)
      setUploadModal(null)
    }
  }

  // When artifact arrives, show artifact panel instead
  if (artifacts.length > 0) {
    return (
      <div style={S.panel}>
        <div style={{ display: "flex", alignItems: "center", padding: "0 14px", borderBottom: "1.5px solid var(--border)", height: 42, flexShrink: 0 }}>
          <button
            onClick={onClearArtifacts}
            style={{ fontSize: 11, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)", cursor: "pointer", background: "none", border: "none", padding: "10px 0", marginRight: 10 }}
          >← back</button>
          <span style={{ fontSize: 11, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)", letterSpacing: ".06em" }}>ARTIFACT</span>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ArtifactPanel
            artifacts={artifacts}
            currentIndex={currentIndex}
            onNavigate={onNavigate}
            onClose={onClearArtifacts}
          />
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={S.panel}>
        {/* Panel header */}
        <div style={{ padding: "11px 14px 9px", borderBottom: "1.5px solid var(--border)", flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace", letterSpacing: ".08em", color: "var(--text3)", textTransform: "uppercase" }}>
            Connectors
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>

          {/* External */}
          <div style={{ ...S.sectionLabel, marginTop: 0 }}>External</div>

          <div style={S.connectorRow}>
            <div style={S.connIcon}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", flex: 1 }}>Tendata</div>
            <div style={{ textAlign: "right" }}>
              <span style={S.connStatus(tendataRemaining > 0)}>
                {tendataRemaining > 0 ? "Connected" : "Quota full"}
              </span>
              <div style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)", marginTop: 2 }}>
                {tendataRemaining}/{tendataLimit} pts
              </div>
            </div>
          </div>

          <div style={{ ...S.connectorRow, opacity: 0.5 }}>
            <div style={S.connIcon}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)", flex: 1 }}>Google Sheets</div>
            <span style={S.connStatus(false)}>Soon</span>
          </div>

          {/* Local Folder */}
          {folderHandle && (
            <div style={S.connectorRow}>
              <div style={S.connIcon}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folderHandle.name}</div>
              <span style={S.connStatus(true)}>Open</span>
            </div>
          )}

          {/* Internal Data */}
          <div style={{ ...S.sectionLabel, marginTop: 16 }}>Internal Data</div>

          {files.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6, marginBottom: 8 }}>
              ยังไม่มีไฟล์ข้อมูลบริษัท
            </div>
          ) : (
            files.map((f) => (
              <div key={f.id} style={S.fileRow}>
                <div style={{ width: 26, height: 26, border: "1px solid var(--border)", borderRadius: 4, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--text3)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.fileName}</div>
                  <div style={{ color: "var(--text3)", fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 9, marginTop: 1 }}>
                    {f.fileType} · {f.rowCount} rows
                  </div>
                </div>
                <span style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", padding: "1px 5px", borderRadius: 3, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text3)" }}>
                  {f.fileType}
                </span>
              </div>
            ))
          )}

          {/* Upload button */}
          <input
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            id="connector-file-input"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => document.getElementById("connector-file-input")?.click()}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "8px 12px", border: "1.5px dashed var(--border2)",
              borderRadius: 7, background: "none",
              fontFamily: "var(--font-ibm-plex-mono), monospace",
              fontSize: 11, color: "var(--text3)", cursor: "pointer",
              marginTop: 6, transition: "border-color .12s, color .12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--text)" }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--text3)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Upload company data
          </button>
        </div>
      </div>

      {/* Upload modal */}
      {uploadModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(42,40,37,.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) setUploadModal(null) }}
        >
          <div style={{ width: 440, background: "var(--bg)", border: "1.5px solid var(--border2)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Upload company data</div>
              <button onClick={() => setUploadModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text3)", lineHeight: 1, padding: "2px 6px" }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>File type</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[
                  { type: "shipment", desc: "ข้อมูลการส่งสินค้า" },
                  { type: "invoice", desc: "ใบแจ้งหนี้" },
                  { type: "product", desc: "รายการสินค้า" },
                  { type: "customer", desc: "ข้อมูลลูกค้า" },
                ].map(({ type, desc }) => (
                  <div
                    key={type}
                    onClick={() => setUploadModal({ ...uploadModal, fileType: type })}
                    style={{
                      padding: "10px 12px", border: `1.5px solid ${uploadModal.fileType === type ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: 7, cursor: "pointer",
                      background: uploadModal.fileType === type ? "var(--surface2)" : "transparent",
                      transition: "border-color .12s, background .12s",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{type.charAt(0).toUpperCase() + type.slice(1)}</div>
                    <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--font-ibm-plex-mono), monospace", marginTop: 2 }}>{desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>File</div>
              <div style={{ border: "1.5px dashed var(--border2)", borderRadius: 8, padding: "16px", textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--text2)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>{uploadModal.file?.name}</div>
              </div>
              <input
                type="text"
                placeholder="Description (optional)"
                value={uploadModal.description}
                onChange={(e) => setUploadModal({ ...uploadModal, description: e.target.value })}
                style={{ width: "100%", padding: "7px 10px", border: "1.5px solid var(--border)", borderRadius: 6, background: "var(--surface)", color: "var(--text)", fontSize: 12, fontFamily: "var(--font-ibm-plex-sans), sans-serif", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setUploadModal(null)} style={{ padding: "7px 14px", border: "1.5px solid var(--border)", borderRadius: 6, background: "none", fontSize: 12, color: "var(--text2)", cursor: "pointer" }}>Cancel</button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                style={{ padding: "7px 14px", border: "1.5px solid var(--accent)", borderRadius: 6, background: "var(--accent)", fontSize: 12, color: "var(--bg)", cursor: "pointer" }}
              >
                {isUploading ? "Uploading…" : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
