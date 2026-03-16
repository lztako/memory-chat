# Extended Thinking (Manual Mode)

**Source:** https://platform.claude.com/docs/en/build-with-claude/extended-thinking.md

> **Note:** Opus 4.6 ใช้ [adaptive thinking](./adaptive-thinking.md) แทน — `budget_tokens` deprecated บน Opus 4.6

## Supported models (manual mode)
- `claude-sonnet-4-6` — manual + interleaved (beta header) + adaptive
- `claude-opus-4-5`, `claude-sonnet-4-5`, `claude-haiku-4-5` — manual mode เท่านั้น

## Basic usage (Sonnet 4.6)

```ts
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 16000,
  thinking: { type: "enabled", budget_tokens: 10000 },
  messages: [{ role: "user", content: "..." }]
})

for (const block of response.content) {
  if (block.type === "thinking") console.log(block.thinking)
  if (block.type === "text") console.log(block.text)
}
```

## Summarized thinking (Claude 4 models)
- Response มี **summary** ของ thinking ไม่ใช่ full text
- Billed ตาม full thinking tokens (ไม่ใช่ summary tokens) → `billed ≠ visible`
- Claude Sonnet 3.7 ยังคง return full thinking

## Interleaved thinking (think between tool calls)

| Model | Support |
|-------|---------|
| Opus 4.6 | Auto (adaptive mode) |
| Sonnet 4.6 | Beta header `interleaved-thinking-2025-05-14` |
| Opus 4.5, Sonnet 4.5, etc. | Beta header `interleaved-thinking-2025-05-14` |

```ts
// Sonnet 4.6 + interleaved
await client.messages.create({
  model: "claude-sonnet-4-6",
  thinking: { type: "enabled", budget_tokens: 10000 },
  // ...
}, { headers: { "anthropic-beta": "interleaved-thinking-2025-05-14" } })
```

## Tool use + thinking rules
- `tool_choice` ใช้ได้แค่ `auto` หรือ `none` (ไม่ใช่ `any` หรือ specific tool)
- **ต้อง pass thinking blocks กลับ** ใน multi-turn tool use loops
- ห้าม toggle thinking mode กลางคัน (ใน assistant turn เดียวกัน)

## Prompt caching + thinking
- Thinking parameter เปลี่ยน → cache breakpoint เสีย (messages)
- System prompt และ tools ยังคง cache อยู่
- ใช้ 1-hour cache สำหรับ tasks ที่ใช้เวลานาน
