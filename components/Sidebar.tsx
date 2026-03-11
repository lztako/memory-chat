"use client"
import { useState } from "react"
import Link from "next/link"
import { SubmitButton } from "@/components/SubmitButton"

interface Conversation { id: string; title: string | null; updatedAt: Date }

interface SidebarProps {
  conversations: Conversation[]
  userInitial: string
  userEmail: string
  signOut: () => Promise<void>
  deleteConversation: (id: string) => Promise<void>
}

// Panel/sidebar toggle icon — matches claude.ai's □ icon
function PanelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  )
}

function IconBtn({
  onClick, title, children, style,
}: {
  onClick?: () => void
  title?: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32, height: 32, borderRadius: 6,
        border: "none", background: "none",
        color: "var(--text3)", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "background .1s, color .1s",
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)" }}
      onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text3)" }}
    >
      {children}
    </button>
  )
}

const NAV_ITEMS = [
  {
    href: "/chat/dashboard", label: "Dashboard",
    icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  },
]

export function Sidebar({ conversations, userInitial, userEmail, signOut, deleteConversation }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const C = collapsed

  // ── Collapsed rail ─────────────────────────────────────────────────
  if (C) {
    return (
      <aside style={{
        width: 52, flexShrink: 0,
        display: "flex", flexDirection: "column", alignItems: "center",
        background: "var(--surface)",
        padding: "10px 0 10px",
        transition: "width 0.22s cubic-bezier(.4,0,.2,1)",
        overflow: "hidden",
      }}>
        {/* Panel toggle — expand */}
        <IconBtn onClick={() => setCollapsed(false)} title="Expand sidebar" style={{ marginBottom: 6 }}>
          <PanelIcon />
        </IconBtn>

        {/* New chat */}
        <Link
          href="/chat"
          title="New chat"
          style={{
            width: 32, height: 32, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text3)", textDecoration: "none",
            transition: "background .1s, color .1s",
            marginBottom: 2,
          }}
          className="sidebar-icon-link"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>

        {/* Divider */}
        <div style={{ width: 24, height: 1, background: "var(--border)", margin: "8px 0" }} />

        {/* Nav icons */}
        {NAV_ITEMS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            style={{
              width: 32, height: 32, borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text3)", textDecoration: "none",
              transition: "background .1s, color .1s",
              marginBottom: 2,
            }}
            className="sidebar-icon-link"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {icon}
            </svg>
          </Link>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Avatar */}
        <div
          title={userEmail}
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--text)", color: "var(--bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 600, flexShrink: 0, cursor: "default",
          }}
        >{userInitial}</div>
      </aside>
    )
  }

  // ── Expanded sidebar ────────────────────────────────────────────────
  return (
    <aside style={{
      width: 260, flexShrink: 0,
      display: "flex", flexDirection: "column",
      background: "var(--surface)",
      overflow: "hidden",
      transition: "width 0.22s cubic-bezier(.4,0,.2,1)",
    }}>

      {/* ── Header: Origo wordmark + panel toggle ── */}
      <div style={{
        height: 48, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 8px 0 16px",
        gap: 8,
      }}>
        {/* Origo wordmark */}
        <span style={{
          flex: 1,
          fontSize: 18, fontWeight: 700,
          color: "var(--text)",
          letterSpacing: "-.02em",
          fontFamily: "var(--font-ibm-plex-sans), sans-serif",
        }}>
          Origo
        </span>

        {/* Panel toggle — collapse */}
        <IconBtn onClick={() => setCollapsed(true)} title="Collapse sidebar">
          <PanelIcon />
        </IconBtn>
      </div>

      {/* ── New chat ── */}
      <div style={{ padding: "4px 10px 4px", flexShrink: 0 }}>
        <Link href="/chat" className="new-chat-btn-sidebar" style={{ textDecoration: "none" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New chat
        </Link>
      </div>

      {/* ── Navigate ── */}
      <div style={{ padding: "6px 10px 0", flexShrink: 0 }}>
        {NAV_ITEMS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="nav-item-sidebar"
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", borderRadius: 6, fontSize: 13, fontWeight: 400, color: "var(--text2)", marginBottom: 1 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              {icon}
            </svg>
            {label}
          </Link>
        ))}
      </div>

      {/* ── Recents label ── */}
      <div style={{ padding: "16px 16px 4px", fontSize: 11, color: "var(--text3)", fontWeight: 500, letterSpacing: ".04em", flexShrink: 0, textTransform: "uppercase" }}>
        Recents
      </div>

      {/* ── Conversation list ── */}
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 6px 6px" }}>
        {conversations.length === 0 ? (
          <div style={{ padding: "6px 8px", fontSize: 11, color: "var(--text3)" }}>No chats yet</div>
        ) : (
          conversations.map((conv) => {
            const deleteAction = deleteConversation.bind(null, conv.id)
            return (
              <div key={conv.id} className="sidebar-conv-row">
                <Link href={`/chat/${conv.id}`} className="sidebar-conv-link">
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{conv.title || "New conversation"}</span>
                </Link>
                <form action={deleteAction} className="sidebar-conv-del">
                  <button type="submit" title="Delete" className="sidebar-conv-del-btn">×</button>
                </form>
              </div>
            )
          })
        )}
      </nav>

      {/* ── Footer ── */}
      <div style={{ padding: "8px 10px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 6px", borderRadius: 6 }}>
          {/* Avatar */}
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--text)", color: "var(--bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 600, flexShrink: 0,
          }}>{userInitial}</div>

          {/* User info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</div>
            <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>import/export AI</div>
          </div>

          {/* Settings */}
          <Link
            href="/settings"
            title="Settings"
            style={{
              width: 26, height: 26, borderRadius: 5,
              border: "1px solid var(--border)", background: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text3)", textDecoration: "none", flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>

          {/* Sign out */}
          <form action={signOut} title="Sign out">
            <SubmitButton
              label={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              }
              loadingLabel="…"
              className=""
              style={{ width: 26, height: 26, borderRadius: 5, border: "1px solid var(--border)", background: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", cursor: "pointer" }}
            />
          </form>
        </div>
      </div>
    </aside>
  )
}
