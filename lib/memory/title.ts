import { anthropic } from "../claude"
import { conversationRepo } from "../repositories/conversation.repo"

export async function generateAndSaveTitle(conversationId: string, firstMessage: string) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 32,
    messages: [
      {
        role: "user",
        content: `สรุปเป็นชื่อการสนทนาสั้นๆ ไม่เกิน 6 คำ ไม่มีเครื่องหมายคำพูด ไม่มีคำอธิบายเพิ่มเติม:
"${firstMessage}"`,
      },
    ],
  })

  const title = response.content[0].type === "text"
    ? response.content[0].text.trim()
    : firstMessage.slice(0, 40)

  await conversationRepo.updateTitle(conversationId, title)
}
