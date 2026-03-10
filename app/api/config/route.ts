import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { memoryRepo } from "@/lib/repositories/memory.repo"

// GET — list all user_config entries
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const all = await memoryRepo.getAll(user.id)
  const configs = all
    .filter((m) => m.type === "user_config")
    .map((m) => {
      const colonIdx = m.content.indexOf(":")
      const key = colonIdx >= 0 ? m.content.slice(0, colonIdx).trim() : m.content
      const value = colonIdx >= 0 ? m.content.slice(colonIdx + 1).trim() : ""
      return { id: m.id, key, value, updatedAt: m.updatedAt }
    })

  return NextResponse.json(configs)
}

// POST — create or update a config entry
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { key, value } = await req.json()
  if (!key?.trim() || !value?.trim()) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 })
  }

  const content = `${key.trim()}: ${value.trim()}`
  const all = await memoryRepo.getAll(user.id)
  const existing = all.find(
    (m) => m.type === "user_config" && m.content.startsWith(`${key.trim()}:`)
  )

  if (existing) {
    await memoryRepo.update(existing.id, { content })
    return NextResponse.json({ id: existing.id, key: key.trim(), value: value.trim() })
  } else {
    const created = await memoryRepo.create({
      userId: user.id,
      type: "user_config",
      content,
      importance: 5,
      layer: "long_term",
    })
    return NextResponse.json({ id: created.id, key: key.trim(), value: value.trim() })
  }
}
