import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { memoryRepo } from "@/lib/repositories/memory.repo"
import { SubmitButton } from "@/components/SubmitButton"

type Memory = {
  id: string
  layer: string
  type: string
  content: string
  importance: number
}

const layerLabel: Record<string, string> = {
  long_term: "ระยะยาว",
  daily_log: "วันนี้",
}

const typeLabel: Record<string, string> = {
  fact: "ข้อเท็จจริง",
  preference: "ความชอบ",
  goal: "เป้าหมาย",
  event: "เหตุการณ์",
}

export default async function MemoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const memories: Memory[] = await memoryRepo.getAll(user.id)
  const longTerm = memories.filter((m: Memory) => m.layer === "long_term")
  const dailyLog = memories.filter((m: Memory) => m.layer === "daily_log")

  async function deleteMemory(id: string) {
    "use server"
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    await memoryRepo.delete(id)
    redirect('/memory')
  }

  function MemoryItem({ id, content, type, importance }: {
    id: string
    content: string
    type: string
    importance: number
  }) {
    const deleteWithId = deleteMemory.bind(null, id)
    return (
      <div className="flex items-start gap-3 p-3 border rounded-xl">
        <div className="flex-1">
          <p className="text-sm">{content}</p>
          <p className="text-xs text-gray-400 mt-1">
            {typeLabel[type] ?? type} · ความสำคัญ {importance}/5
          </p>
        </div>
        <form action={deleteWithId}>
          <SubmitButton
            label="✕"
            loadingLabel="..."
            className="text-gray-300 hover:text-red-400 transition-colors text-sm p-1"
          />
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/chat" className="text-gray-400 hover:text-gray-600 text-sm">
          ← กลับ
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Memory</h1>
          <p className="text-sm text-gray-400">สิ่งที่ AI จำเกี่ยวกับคุณ</p>
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-medium text-gray-500 mb-2">
            ระยะยาว ({longTerm.length})
          </h2>
          {longTerm.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6 border rounded-xl">
              ยังไม่มี memory ระยะยาว
            </p>
          ) : (
            <div className="space-y-2">
              {longTerm.map((m: Memory) => (
                <MemoryItem key={m.id} id={m.id} content={m.content} type={m.type} importance={m.importance} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-gray-500 mb-2">
            วันนี้ ({dailyLog.length})
          </h2>
          {dailyLog.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6 border rounded-xl">
              ยังไม่มี memory วันนี้
            </p>
          ) : (
            <div className="space-y-2">
              {dailyLog.map((m: Memory) => (
                <MemoryItem key={m.id} id={m.id} content={m.content} type={m.type} importance={m.importance} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
