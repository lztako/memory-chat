import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { conversationRepo } from "@/lib/repositories/conversation.repo"

const USER_ID = "test-user-001"

export default async function ChatListPage() {
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, email: "test@test.com", name: "Test User" },
  })

  const conversations = await conversationRepo.getAll(USER_ID)

  async function createAndRedirect() {
    "use server"
    const conv = await conversationRepo.create(USER_ID)
    redirect(`/chat/${conv.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold">การสนทนา</h1>
          <p className="text-sm text-gray-400">AI จำคุณได้ทุกการสนทนา</p>
        </div>
        <form action={createAndRedirect}>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600">
            + สนทนาใหม่
          </button>
        </form>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">ยังไม่มีการสนทนา</p>
          <p className="text-xs mt-1">กด &quot;+ สนทนาใหม่&quot; เพื่อเริ่ม</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/chat/${conv.id}`}
              className="block p-4 border rounded-xl hover:bg-gray-50 transition-colors"
            >
              <p className="font-medium text-sm">
                {conv.title || "การสนทนาใหม่"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(conv.updatedAt).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
