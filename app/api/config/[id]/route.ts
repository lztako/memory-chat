import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { memoryRepo } from "@/lib/repositories/memory.repo"

// PATCH — update value of a config entry
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { key, value } = await req.json()
  if (!key?.trim() || !value?.trim()) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 })
  }

  const content = `${key.trim()}: ${value.trim()}`
  await memoryRepo.update(id, { content })
  return NextResponse.json({ id, key: key.trim(), value: value.trim() })
}

// DELETE — remove a config entry
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await memoryRepo.delete(id)
  return NextResponse.json({ success: true })
}
