# Handling Stop Reasons

**Source:** https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons.md

## Stop Reasons ทั้งหมด

| stop_reason | ความหมาย | action |
|-------------|----------|--------|
| `end_turn` | ตอบสมบูรณ์ปกติ | ใช้ content ได้เลย |
| `max_tokens` | ถึง max_tokens limit — response ตัด | ถามต่อหรือแจ้ง user |
| `tool_use` | AI ต้องการ execute tool | execute แล้วส่ง result กลับ |
| `pause_turn` | server tool loop ครบ 10 iter | ส่ง response กลับเพื่อ continue |
| `refusal` | AI ปฏิเสธ safety | handle gracefully |
| `model_context_window_exceeded` | ชน context window limit | trigger compaction |
| `stop_sequence` | เจอ custom stop sequence | extract content ก่อน sequence |

## Pattern ใน route.ts

```ts
const finalMsg = await stream.finalMessage()

switch (finalMsg.stop_reason) {
  case "tool_use":
    // execute tools แล้ว loop ต่อ (ทำอยู่แล้ว)
    break
  case "pause_turn":
    // server tool (web_search) ครบ iterations
    // ส่ง response กลับเป็น assistant message แล้ว call ใหม่
    apiMessages.push({ role: "assistant", content: finalMsg.content })
    // loop ต่อ
    break
  case "model_context_window_exceeded":
    // context เต็ม → trigger compaction หรือ notify user
    controller.enqueue(sse("text", "\n\n[Context limit reached]"))
    break
  case "refusal":
    controller.enqueue(sse("text", "\n\n[ไม่สามารถตอบคำถามนี้ได้]"))
    break
  case "max_tokens":
    // response ถูกตัด — อาจต้อง continue
    break
  case "end_turn":
  default:
    // สมบูรณ์ — break loop
    break
}
```

## Empty Response (end_turn + no content)

เกิดเมื่อ: ใส่ text block ต่อจาก tool_result → AI คิดว่า turn จบแล้ว

```ts
// ❌ อย่าทำ — causes empty response
{ role: "user", content: [
  { type: "tool_result", tool_use_id: "...", content: "result" },
  { type: "text", text: "Here's the result" }  // ← ลบออก
]}

// ✅ ถูก — tool_result อย่างเดียว
{ role: "user", content: [
  { type: "tool_result", tool_use_id: "...", content: "result" }
]}
```

## Streaming — stop_reason อยู่ใน message_delta

```ts
for await (const event of stream) {
  if (event.type === "message_delta") {
    const stopReason = event.delta.stop_reason // มาตรงนี้
  }
}
```

## pause_turn — Server Tool Loop

```ts
// Web search อาจ return pause_turn ถ้า iterate เกิน 10 ครั้ง
if (finalMsg.stop_reason === "pause_turn") {
  apiMessages.push({ role: "assistant", content: finalMsg.content })
  // continue loop โดยไม่ต้องแก้ messages อื่น
}
```
