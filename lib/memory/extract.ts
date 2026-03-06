import { anthropic } from "../claude"
import { memoryRepo } from "../repositories/memory.repo"
import { Memory } from "@prisma/client"

interface NewMemory {
  type: string
  content: string
  importance: number
  layer: string
}

interface ExtractResult {
  new_memories: NewMemory[]
  update_memories: { id: string; content: string }[]
  delete_memory_ids: string[]
}

async function evaluateLayers(memories: NewMemory[]): Promise<NewMemory[]> {
  if (memories.length === 0) return memories

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `ตรวจสอบ layer ของ memories เหล่านี้ว่าถูกต้องไหม:
${memories.map((m, i) => `[${i}] (${m.layer}) ${m.content}`).join("\n")}

กฎ:
- long_term: ข้อมูลถาวร (ชื่อ งาน ครอบครัว เป้าหมาย ความชอบระยะยาว)
- daily_log: สิ่งชั่วคราว (อารมณ์วันนี้ task ปัจจุบัน แผนวันนี้)

ตอบเป็น JSON เท่านั้น — array ที่มีสมาชิกเท่ากับ input:
[{ "index": 0, "layer": "long_term|daily_log", "changed": true|false }]`,
      },
    ],
  })

  try {
    const text =
      response.content[0].type === "text" ? response.content[0].text : "[]"
    const corrections: { index: number; layer: string; changed: boolean }[] =
      JSON.parse(text)

    const corrected = [...memories]
    for (const c of corrections) {
      if (c.changed && corrected[c.index]) {
        const prev = corrected[c.index].layer
        corrected[c.index] = { ...corrected[c.index], layer: c.layer }
        console.log(
          `[memory eval] corrected [${c.index}] ${prev} → ${c.layer}: ${corrected[c.index].content.slice(0, 40)}`
        )
      }
    }
    return corrected
  } catch {
    console.error("[memory eval] failed to parse evaluator response — using original")
    return memories
  }
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

    const validatedMemories = await evaluateLayers(result.new_memories)

    for (const m of validatedMemories) {
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
