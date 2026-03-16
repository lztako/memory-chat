# Compaction

**Source:** https://platform.claude.com/docs/en/build-with-claude/compaction.md
**Beta header:** `compact-2026-01-12`
**Supported models:** `claude-opus-4-6`, `claude-sonnet-4-6`

## สรุป
Server-side auto-summarize เมื่อ conversation ใกล้เกิน context limit — **primary strategy** สำหรับ long chat และ agentic workflows

## Basic Usage

```ts
const response = await anthropic.beta.messages.create({
  betas: ["compact-2026-01-12"],
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  messages,
  context_management: {
    edits: [{
      type: "compact_20260112",
      trigger: { type: "input_tokens", value: 100_000 }, // default 150k
    }]
  },
})

// แค่ append response ปกติ — API จัดการ drop content ก่อน compaction block เอง
messages.push({ role: "assistant", content: response.content })
```

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `trigger.value` | 150,000 | tokens ก่อน trigger (min 50,000) |
| `pause_after_compaction` | false | หยุดหลัง summary เพื่อ inject เนื้อหาเพิ่ม |
| `instructions` | null | custom summarization prompt (replaces default ทั้งหมด) |

## Compaction Block
เมื่อ trigger → API return `compaction` block ในตอนต้น response:
```json
{
  "content": [
    { "type": "compaction", "content": "Summary: ..." },
    { "type": "text", "text": "..." }
  ]
}
```
Content ก่อน compaction block จะถูก ignore อัตโนมัติใน request ถัดไป

## Prompt Caching + Compaction
ใส่ `cache_control` บน compaction block เพื่อ cache summary:
```json
{ "type": "compaction", "content": "...", "cache_control": { "type": "ephemeral" } }
```

## Usage Tracking (สำคัญ)
เมื่อ compaction trigger → ต้อง sum `usage.iterations[]` แทน flat `usage`:
```ts
const totalInput = response.usage.iterations
  ? response.usage.iterations.reduce((s, i) => s + i.input_tokens, 0)
  : response.usage.input_tokens
```
top-level `input_tokens` / `output_tokens` **ไม่รวม** compaction iteration

## Pause After Compaction
```ts
if (response.stop_reason === "compaction") {
  messages.push({ role: "assistant", content: response.content })
  // inject เนื้อหาเพิ่มก่อน continue ได้
  const next = await anthropic.beta.messages.create({ ... messages })
}
```
