import { anthropic } from "../claude"
import { memoryRepo } from "../repositories/memory.repo"
import { Memory } from "@prisma/client"

interface ExtractResult {
  new_memories: { type: string; content: string; importance: number; layer: string }[]
  update_memories: { id: string; content: string }[]
  delete_memory_ids: string[]
}

export async function extractAndSaveMemories(
  userId: string,
  conversationText: string,
  existingMemories: Memory[]
) {
  const lines = conversationText.split("\n")
  const lastUserMsg = lines.filter((l) => l.startsWith("user:")).slice(-1)[0]
  if (!lastUserMsg || lastUserMsg.replace(/^user:\s*/, "").trim().length < 30) return

  const existingText =
    existingMemories.length > 0
      ? existingMemories
          .map((m) => `[${m.id}] (${m.type}|${m.layer}) ${m.content}`)
          .join("\n")
      : "ไม่มี"

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `วิเคราะห์บทสนทนานี้และระบุข้อมูลสำคัญเกี่ยวกับ user

บทสนทนา:
${conversationText}

Memory ที่มีอยู่แล้ว:
${existingText}

ตอบเป็น JSON format นี้เท่านั้น ห้ามมีข้อความอื่น:
{
  "new_memories": [
    { "type": "fact|preference|goal|event", "content": "...", "importance": 1-5, "layer": "long_term|daily_log" }
  ],
  "update_memories": [
    { "id": "memory_id", "content": "เนื้อหาใหม่ที่อัพเดตแล้ว" }
  ],
  "delete_memory_ids": ["id1", "id2"]
}

กฎ:
- เพิ่มเฉพาะข้อมูลใหม่ที่ user บอกในบทสนทนานี้
- update memory ที่มีอยู่ถ้าข้อมูลเปลี่ยน
- delete memory ที่ outdated หรือขัดแย้งกับข้อมูลใหม่
- ถ้าไม่มีอะไรใหม่ให้ส่ง arrays ว่างทั้งหมด
- importance: 5=สำคัญมาก (ชื่อ งาน ครอบครัว), 3=ปกติ, 1=ไม่สำคัญ
- layer:
  - "daily_log" สำหรับสิ่งชั่วคราว (อารมณ์วันนี้, task ปัจจุบัน, แผนวันนี้)
  - "long_term" สำหรับข้อมูลถาวร (ชื่อ, งาน, ครอบครัว, เป้าหมาย, ความชอบ)`,
      },
    ],
  })

  try {
    const text =
      response.content[0].type === "text" ? response.content[0].text : ""
    const result: ExtractResult = JSON.parse(text)

    for (const m of result.new_memories) {
      await memoryRepo.create({ userId, ...m })
    }

    for (const m of result.update_memories) {
      await memoryRepo.update(m.id, { content: m.content })
    }

    for (const id of result.delete_memory_ids) {
      await memoryRepo.delete(id)
    }
  } catch {
    console.error("Memory extraction failed to parse JSON")
  }
}
