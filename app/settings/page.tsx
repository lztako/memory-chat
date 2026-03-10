import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SubmitButton } from "@/components/SubmitButton"
import { AIConfigPanel } from "@/components/AIConfigPanel"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const userInitial = (user.email ?? "?")[0].toUpperCase()

  async function signOut() {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/login")
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "48px 24px 80px",
    }}>
      <div style={{ width: "100%", maxWidth: 520 }}>

        {/* Back + header */}
        <div style={{ marginBottom: 36 }}>
          <a href="/chat" style={{
            fontSize: 11, fontFamily: "var(--font-ibm-plex-mono), monospace",
            color: "var(--text3)", textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 28,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to chat
          </a>
          <div style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", letterSpacing: ".12em", color: "var(--text3)", textTransform: "uppercase", marginBottom: 5 }}>Settings</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "var(--text)", letterSpacing: "-.02em" }}>Your workspace</div>
        </div>

        {/* ── Account ─────────────────────────────────── */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", letterSpacing: ".1em", color: "var(--text3)", textTransform: "uppercase", marginBottom: 8, paddingLeft: 2 }}>
            Account
          </div>
          <div style={{
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
          }}>
            {/* User row */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: "var(--text)", color: "var(--bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 600, flexShrink: 0, letterSpacing: ".02em",
              }}>
                {userInitial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
                <div style={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)", marginTop: 2 }}>uid · {user.id.slice(0, 8)}</div>
              </div>
            </div>

            {/* Sign out row */}
            <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>Sign out</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>ออกจากระบบในอุปกรณ์นี้</div>
              </div>
              <form action={signOut}>
                <SubmitButton
                  label="Sign out"
                  loadingLabel="..."
                  className=""
                  style={{
                    padding: "6px 14px",
                    border: "1.5px solid var(--border)",
                    borderRadius: 5, fontSize: 11,
                    fontFamily: "var(--font-ibm-plex-sans), sans-serif",
                    background: "none", color: "var(--text2)", cursor: "pointer",
                  }}
                />
              </form>
            </div>
          </div>
        </div>

        {/* ── AI Config ─────────────────────────────────── */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace", letterSpacing: ".1em", color: "var(--text3)", textTransform: "uppercase", marginBottom: 8, paddingLeft: 2 }}>
            AI Config
          </div>
          <AIConfigPanel />
        </div>

        {/* App version */}
        <div style={{ marginTop: 36, paddingLeft: 2 }}>
          <div style={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--text3)" }}>
            Origo · import/export AI · claude-sonnet-4-6
          </div>
        </div>

      </div>
    </div>
  )
}
