import { anthropic } from "../claude"
import { memoryRepo } from "../repositories/memory.repo"
import type { Memory } from "../types"

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

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    new_memories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["fact", "preference", "goal", "event"] },
          content: { type: "string" },
          importance: { type: "number" },
          layer: { type: "string", enum: ["long_term", "daily_log"] },
        },
        required: ["type", "content", "importance", "layer"],
        additionalProperties: false,
      },
    },
    update_memories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          content: { type: "string" },
        },
        required: ["id", "content"],
        additionalProperties: false,
      },
    },
    delete_memory_ids: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["new_memories", "update_memories", "delete_memory_ids"],
  additionalProperties: false,
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
          .map((m: { id: string; type: string; layer: string; content: string }) => `[${m.id}] (${m.type}|${m.layer}) ${m.content}`)
          .join("\n")
      : "ไม่มี"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (anthropic.messages.create as any)({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    output_config: {
      format: { type: "json_schema", schema: EXTRACT_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `วิเคราะห์บทสนทนานี้และระบุข้อมูลสำคัญเกี่ยวกับ user

บทสนทนา:
${conversationText}

Memory ที่มีอยู่แล้ว:
${existingText}

กฎ:
- เพิ่มเฉพาะข้อมูลใหม่ที่ user บอกในบทสนทนานี้
- update memory ที่มีอยู่ถ้าข้อมูลเปลี่ยน
- delete memory ที่ outdated หรือขัดแย้งกับข้อมูลใหม่
- ถ้าไม่มีอะไรใหม่ให้ส่ง arrays ว่างทั้งหมด
- importance: 5=สำคัญมาก (ชื่อ งาน ครอบครัว), 3=ปกติ, 1=ไม่สำคัญ
- layer: "daily_log" สำหรับสิ่งชั่วคราว (อารมณ์วันนี้ task ปัจจุบัน แผนวันนี้), "long_term" สำหรับข้อมูลถาวร (ชื่อ งาน ครอบครัว เป้าหมาย ความชอบ)`,
      },
    ],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  if (!text) return

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
}
