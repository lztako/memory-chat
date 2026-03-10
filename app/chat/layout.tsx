import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { conversationRepo } from "@/lib/repositories/conversation.repo"
import { memoryRepo } from "@/lib/repositories/memory.repo"
import { SubmitButton } from "@/components/SubmitButton"

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  await prisma.user.upsert({
    where: { id: user.id },
    update: {},
    create: { id: user.id, email: user.email ?? "", name: user.email ?? "" },
  })

  const [conversations] = await Promise.all([
    conversationRepo.getAll(user.id),
    memoryRepo.clearOldDailyLog(user.id),
  ])

  const userInitial = (user.email ?? "?")[0].toUpperCase()
  const userEmail = user.email ?? ""

  async function createConversation() {
    "use server"
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")
    const conv = await conversationRepo.create(user.id)
    redirect(`/chat/${conv.id}`)
  }

  async function deleteConversation(id: string) {
    "use server"
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")
    await conversationRepo.delete(id)
    revalidatePath("/chat", "layout")
    redirect("/chat")
  }

  async function signOut() {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/login")
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "var(--font-ibm-plex-sans), sans-serif" }}>

      {/* ── Sidebar (220px) ─────────────────────────────────────── */}
      <aside style={{
        width: 220, flexShrink: 0,
        display: "flex", flexDirection: "column",
        background: "var(--surface)",
        borderRight: "1.5px solid var(--border)",
        overflow: "hidden",
      }}>

        {/* Brand */}
        <div style={{ padding: "13px 14px 11px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 28, height: 28,
            border: "1.5px solid var(--border2)", borderRadius: 7,
            background: "var(--surface2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, color: "var(--text2)",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", letterSpacing: ".01em" }}>Origo</div>
            <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--font-ibm-plex-mono), monospace", marginTop: 1 }}>import/export AI</div>
          </div>
        </div>

        {/* New Chat button */}
        <div style={{ padding: "10px 10px 4px", flexShrink: 0 }}>
          <Link href="/chat" className="new-chat-btn-sidebar" style={{ textDecoration: "none" }}>
            ＋ New Chat
          </Link>
        </div>

        {/* CHATS section label */}
        <div style={{ padding: "6px 14px 3px", fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", letterSpacing: ".1em", color: "var(--text3)", textTransform: "uppercase", flexShrink: 0 }}>
          Chats
        </div>

        {/* Conversation list */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "2px 8px 6px" }}>
          {conversations.length === 0 ? (
            <div style={{ padding: "6px 8px", fontSize: 11, color: "var(--text3)" }}>No chats yet</div>
          ) : (
            conversations.map((conv: { id: string; title: string | null; updatedAt: Date }) => {
              const deleteAction = deleteConversation.bind(null, conv.id)
              return (
                <div key={conv.id} className="sidebar-conv-row">
                  <Link href={`/chat/${conv.id}`} className="sidebar-conv-link">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0, color: "var(--text3)" }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
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

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border)", margin: "4px 14px", flexShrink: 0 }} />

        {/* NAVIGATE section */}
        <div style={{ padding: "3px 8px 6px", flexShrink: 0 }}>
          <div style={{ padding: "5px 14px 3px", fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", letterSpacing: ".1em", color: "var(--text3)", textTransform: "uppercase" }}>
            Navigate
          </div>
          <Link href="/chat/market" className="nav-item-sidebar" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 9, padding: "7px 8px", borderRadius: 6, fontSize: 12, fontWeight: 500, color: "var(--text2)", marginBottom: 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Market
          </Link>
          <Link href="/chat/tasks" className="nav-item-sidebar" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 9, padding: "7px 8px", borderRadius: 6, fontSize: 12, fontWeight: 500, color: "var(--text2)", marginBottom: 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Tasks
          </Link>
          <Link href="/chat/dashboard" className="nav-item-sidebar" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 9, padding: "7px 8px", borderRadius: 6, fontSize: 12, fontWeight: 500, color: "var(--text2)", marginBottom: 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </Link>
        </div>

        {/* Footer */}
        <div style={{ padding: "8px 10px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", borderRadius: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "var(--text)", color: "var(--bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, flexShrink: 0,
            }}>{userInitial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</div>
              <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>import/export AI</div>
            </div>
            <Link href="/settings" style={{ width: 26, height: 26, borderRadius: 5, border: "1px solid var(--border)", background: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", textDecoration: "none", flexShrink: 0 }} title="Settings">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
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

      {/* ── Main ────────────────────────────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>
        {children}
      </main>
    </div>
  )
}
