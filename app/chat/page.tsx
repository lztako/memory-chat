import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { conversationRepo } from "@/lib/repositories/conversation.repo"
import { createClient } from "@/lib/supabase/server"
import { memoryRepo } from "@/lib/repositories/memory.repo"
import { SubmitButton } from "@/components/SubmitButton"

export default async function ChatListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const USER_ID = user.id
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, email: user.email ?? '', name: user.email ?? '' },
  })

  const [conversations] = await Promise.all([
    conversationRepo.getAll(USER_ID),
    memoryRepo.clearOldDailyLog(USER_ID),
  ])

  async function createAndRedirect() {
    "use server"
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    const conv = await conversationRepo.create(user.id)
    redirect(`/chat/${conv.id}`)
  }

  async function deleteConversation(id: string) {
    "use server"
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    await conversationRepo.delete(id)
    redirect('/chat')
  }

  async function signOut() {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold">การสนทนา</h1>
          <p className="text-sm text-gray-400">AI จำคุณได้ทุกการสนทนา</p>
        </div>
        <div className="flex gap-2">
          <Link href="/memory" className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200">
            Memory
          </Link>
          <form action={createAndRedirect}>
            <SubmitButton
              label="+ สนทนาใหม่"
              loadingLabel="กำลังสร้าง..."
              className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
            />
          </form>
          <form action={signOut}>
            <SubmitButton
              label="ออกจากระบบ"
              loadingLabel="กำลังออก..."
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
            />
          </form>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">ยังไม่มีการสนทนา</p>
          <p className="text-xs mt-1">กด &quot;+ สนทนาใหม่&quot; เพื่อเริ่ม</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const deleteWithId = deleteConversation.bind(null, conv.id)
            return (
              <div key={conv.id} className="flex items-center border rounded-xl hover:bg-gray-50 transition-colors">
                <Link href={`/chat/${conv.id}`} className="flex-1 p-4">
                  <p className="font-medium text-sm">{conv.title || "การสนทนาใหม่"}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(conv.updatedAt).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </Link>
                <form action={deleteWithId} className="pr-3">
                  <button
                    type="submit"
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors rounded-lg"
                    title="ลบการสนทนา"
                  >
                    ✕
                  </button>
                </form>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
