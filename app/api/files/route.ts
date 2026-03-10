import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fileRepo } from "@/lib/repositories/file.repo"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const files = await fileRepo.listByUser(user.id)
  return NextResponse.json(files)
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  await fileRepo.delete(id, user.id)
  return NextResponse.json({ success: true })
}
