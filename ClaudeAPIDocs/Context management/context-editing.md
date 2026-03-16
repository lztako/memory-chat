# Context Editing

**Source:** https://platform.claude.com/docs/en/build-with-claude/context-editing.md
**Beta header:** `context-management-2025-06-27`
**Note:** ไม่ eligible สำหรับ ZDR

## สรุป
Fine-grained control สำหรับ clear เนื้อหาเฉพาะส่วนออกจาก context — เป็น server-side (client ยัง hold full history ไว้ปกติ)

## Supported Models
Opus 4.6, Opus 4.5, Opus 4.1, Opus 4, **Sonnet 4.6** ✅, Sonnet 4.5, Sonnet 4, Haiku 4.5

## Strategy 1: Tool Result Clearing (`clear_tool_uses_20250919`)
ลบ tool results เก่าที่ไม่จำเป็นอัตโนมัติ — เหมาะกับ agentic workflows ที่มี tool use หนัก

```ts
const response = await anthropic.beta.messages.create({
  betas: ["context-management-2025-06-27"],
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  messages,
  context_management: {
    edits: [{ type: "clear_tool_uses_20250919" }]
  },
})
```

- เคลียร์ tool results เก่าสุดก่อน (chronological order)
- แทนที่ด้วย placeholder text (AI รู้ว่า result ถูกลบ)
- ตั้ง `clear_tool_inputs: true` เพื่อลบ tool call parameters ด้วย

## Strategy 2: Thinking Block Clearing (`clear_thinking_20251015`)
จัดการ thinking blocks เมื่อใช้ extended thinking

Default behavior (ไม่ config): เก็บแค่ thinking block จาก last assistant turn

## รวม Compaction + Tool Clearing
```ts
context_management: {
  edits: [
    { type: "compact_20260112", trigger: { type: "input_tokens", value: 100_000 } },
    { type: "clear_tool_uses_20250919" }
  ]
}
// ต้องส่ง betas: ["compact-2026-01-12", "context-management-2025-06-27"]
```

## Prompt Caching + Tool Clearing
Tool result clearing invalidates cached prefix → ใช้ `clear_at_least` parameter เพื่อ ensure ลบพอให้คุ้มกับ cache miss
