"use client"
import { useState } from "react"
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react"

interface TreeNode {
  name: string
  kind: "file" | "directory"
  children?: TreeNode[]
}

interface Props {
  handle: FileSystemDirectoryHandle
  onClose: () => void
}

async function buildTree(dir: FileSystemDirectoryHandle, depth: number): Promise<TreeNode[]> {
  if (depth <= 0) return []
  const nodes: TreeNode[] = []
  // @ts-expect-error - File System Access API
  for await (const entry of dir.values()) {
    if (entry.kind === "directory") {
      const children = await buildTree(entry as FileSystemDirectoryHandle, depth - 1)
      nodes.push({ name: entry.name, kind: "directory", children })
    } else {
      nodes.push({ name: entry.name, kind: "file" })
    }
  }
  return nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function TreeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 1)

  if (node.kind === "directory") {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            paddingTop: 2, paddingBottom: 2, paddingRight: 8,
            paddingLeft: `${8 + depth * 14}px`,
            width: "100%", textAlign: "left",
            borderRadius: 4, background: "none", border: "none", cursor: "pointer",
            transition: "background .1s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          {open
            ? <ChevronDown size={12} style={{ color: "var(--text3)", flexShrink: 0 }} />
            : <ChevronRight size={12} style={{ color: "var(--text3)", flexShrink: 0 }} />}
          <Folder size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
        </button>
        {open && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeItem key={child.name} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 4,
        paddingTop: 2, paddingBottom: 2,
        paddingLeft: `${8 + depth * 14 + 16}px`,
        borderRadius: 4,
      }}
    >
      <File size={12} style={{ color: "var(--text3)", flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
    </div>
  )
}

export function FolderWorkspace({ handle, onClose }: Props) {
  const [tree, setTree] = useState<TreeNode[] | null>(null)
  const [loading, setLoading] = useState(false)

  const loadTree = async () => {
    setLoading(true)
    try {
      const nodes = await buildTree(handle, 3)
      setTree(nodes)
    } catch {
      setTree([])
    } finally {
      setLoading(false)
    }
  }

  if (tree === null && !loading) {
    loadTree()
  }

  return (
    <div style={{
      border: "1.5px solid var(--border)",
      borderRadius: 10,
      background: "var(--surface)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface2)",
      }}>
        <Folder size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{handle.name}</span>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--text3)", lineHeight: 1, padding: "0 2px" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text3)")}
        >×</button>
      </div>

      {/* Tree */}
      <div style={{ paddingTop: 4, paddingBottom: 4, maxHeight: 192, overflowY: "auto" }}>
        {loading ? (
          <p style={{ fontSize: 11, color: "var(--text3)", padding: "8px 12px" }}>Loading...</p>
        ) : tree && tree.length > 0 ? (
          tree.map((node) => <TreeItem key={node.name} node={node} />)
        ) : (
          <p style={{ fontSize: 11, color: "var(--text3)", padding: "8px 12px" }}>Empty folder</p>
        )}
      </div>
    </div>
  )
}
