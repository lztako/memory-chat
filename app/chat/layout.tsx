import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { conversationRepo } from "@/lib/repositories/conversation.repo"
import { memoryRepo } from "@/lib/repositories/memory.repo"
import { Sidebar } from "@/components/Sidebar"

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

      <Sidebar
        conversations={conversations}
        userInitial={userInitial}
        userEmail={userEmail}
        signOut={signOut}
        deleteConversation={deleteConversation}
      />

      {/* ── Main ────────────────────────────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>
        {children}
      </main>
    </div>
  )
}
