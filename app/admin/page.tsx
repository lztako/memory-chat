"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminAuth } from "./layout"

type UserStat = {
  id: string
  email: string
  name: string | null
  createdAt: string
  stats: { files: number; skills: number; memories: number; tasks: number }
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 4,
      background: "var(--surface2)", border: "1px solid var(--border)",
      fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace",
      color: value > 0 ? color : "var(--text3)",
      letterSpacing: ".02em",
    }}>
      <span style={{ fontWeight: 600 }}>{value}</span>
      <span style={{ color: "var(--text3)" }}>{label}</span>
    </span>
  )
}

export default function AdminUsersPage() {
  const { secret } = useAdminAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${secret}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setUsers)
      .catch(e => setError(e === 401 ? "Invalid secret" : "Failed to load"))
      .finally(() => setLoading(false))
  }, [secret])

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace",
          letterSpacing: ".1em", textTransform: "uppercase",
          color: "var(--text3)", marginBottom: 6,
        }}>
          Users
        </div>
        <h1 style={{
          fontSize: 22, fontWeight: 600, color: "var(--text)",
          letterSpacing: "-.02em", margin: 0,
        }}>
          {loading ? "—" : `${users.length} accounts`}
        </h1>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: 7,
          background: "var(--surface)", border: "1.5px solid var(--red)",
          fontSize: 12, color: "var(--red)", marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div style={{
          background: "var(--surface)", border: "1.5px solid var(--border)",
          borderRadius: 10, overflow: "hidden",
        }}>
          {/* Table head */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 140px",
            padding: "8px 16px",
            borderBottom: "1px solid var(--border)",
          }}>
            {["User", "Stats"].map(h => (
              <span key={h} style={{
                fontSize: 9, fontFamily: "var(--font-ibm-plex-mono), monospace",
                letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text3)",
              }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {users.map((u, i) => (
            <div
              key={u.id}
              onClick={() => router.push(`/admin/${u.id}`)}
              onMouseEnter={() => setHovered(u.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 140px",
                padding: "12px 16px",
                borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
                background: hovered === u.id ? "var(--surface2)" : "transparent",
                transition: "background .1s",
                alignItems: "center",
              }}
            >
              {/* User info */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                  {u.email}
                </span>
                <span style={{
                  fontSize: 10, fontFamily: "var(--font-ibm-plex-mono), monospace",
                  color: "var(--text3)", letterSpacing: ".02em",
                }}>
                  {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>

              {/* Stats badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                <StatBadge label="files" value={u.stats.files} color="var(--blue)" />
                <StatBadge label="mem" value={u.stats.memories} color="var(--green)" />
                <StatBadge label="skills" value={u.stats.skills} color="var(--orange)" />
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
