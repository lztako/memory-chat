"use client"

import { useState, useEffect, createContext, useContext } from "react"
import Link from "next/link"

type AdminAuthCtx = { secret: string; setSecret: (s: string) => void }
export const AdminAuthContext = createContext<AdminAuthCtx>({ secret: "", setSecret: () => {} })
export const useAdminAuth = () => useContext(AdminAuthContext)

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [secret, setSecret] = useState("")

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_secret")
    if (stored) setSecret(stored)
  }, [])
  const [input, setInput] = useState("")
  const [error, setError] = useState(false)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    sessionStorage.setItem("admin_secret", input)
    setSecret(input)
    setError(false)
  }

  if (!secret) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-ibm-plex-sans), sans-serif",
      }}>
        <div style={{ width: 320 }}>
          <div style={{
            fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace",
            letterSpacing: ".12em", textTransform: "uppercase",
            color: "var(--text3)", marginBottom: 20,
          }}>
            Origo / Admin
          </div>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="password"
              placeholder="Admin secret"
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              style={{
                fontSize: 13, padding: "9px 12px",
                border: `1.5px solid ${error ? "var(--red)" : "var(--border)"}`,
                borderRadius: 7, background: "var(--surface)",
                color: "var(--text)", fontFamily: "var(--font-ibm-plex-mono), monospace",
                outline: "none", width: "100%", boxSizing: "border-box",
              }}
            />
            <button type="submit" style={{
              background: "var(--text)", color: "var(--bg)",
              border: "none", borderRadius: 7, padding: "9px",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "var(--font-ibm-plex-sans), sans-serif",
            }}>
              Enter
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <AdminAuthContext.Provider value={{ secret, setSecret }}>
      <div style={{
        minHeight: "100vh", background: "var(--bg)",
        fontFamily: "var(--font-ibm-plex-sans), sans-serif",
        display: "flex", flexDirection: "column",
      }}>
        {/* Topbar */}
        <div style={{
          height: 48, flexShrink: 0,
          display: "flex", alignItems: "center",
          padding: "0 24px", gap: 16,
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}>
          <span style={{
            fontSize: 11, fontFamily: "var(--font-ibm-plex-mono), monospace",
            letterSpacing: ".08em", textTransform: "uppercase",
            color: "var(--text3)",
          }}>
            Origo
          </span>
          <span style={{ color: "var(--border)", fontSize: 14 }}>/</span>
          <span style={{
            fontSize: 12, fontWeight: 600, color: "var(--text)",
            letterSpacing: "-.01em",
          }}>
            Admin
          </span>
          <span style={{ color: "var(--border)", fontSize: 14 }}>/</span>
          <Link href="/admin" style={{ fontSize: 11, color: "var(--text3)", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
          >
            Users
          </Link>
          <Link href="/admin/global" style={{ fontSize: 11, color: "var(--text3)", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
          >
            Global Info
          </Link>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => { sessionStorage.removeItem("admin_secret"); setSecret("") }}
            style={{
              fontSize: 11, color: "var(--text3)", background: "none",
              border: "none", cursor: "pointer", padding: "4px 8px",
              borderRadius: 4, fontFamily: "var(--font-ibm-plex-sans), sans-serif",
            }}
          >
            Sign out
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {children}
        </div>
      </div>
    </AdminAuthContext.Provider>
  )
}
