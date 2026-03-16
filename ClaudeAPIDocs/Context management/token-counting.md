# Token Counting

**Source:** https://platform.claude.com/docs/en/build-with-claude/token-counting.md

## สรุป
นับ tokens ก่อนส่ง request จริง — ฟรี, ใช้ตรวจ context size, manage rate limits

## Usage

```ts
const countResponse = await anthropic.messages.count_tokens({
  model: "claude-sonnet-4-6",
  system: "...",
  messages: [...],
  tools: [...],
})

console.log(countResponse.input_tokens) // estimated token count
```

## รองรับทุก input type
- System prompts
- Tools definitions
- Text messages
- Images
- PDFs
- Extended thinking
- Tool use / tool results

## หมายเหตุ
- เป็น **estimate** — actual อาจต่างเล็กน้อย
- System-added tokens ไม่คิดเงิน (billing = เฉพาะ content ของเรา)
- **ฟรี** แต่มี rate limit แยกจาก messages API

## Rate Limits (แยกจาก messages)
| Usage Tier | RPM |
|-----------|-----|
| 1 | 100 |
| 2 | 2,000 |
| 3 | 4,000 |
| 4 | 8,000 |

## ใช้กับ Compaction
```ts
const countResponse = await anthropic.beta.messages.count_tokens({
  betas: ["compact-2026-01-12"],
  model: "claude-sonnet-4-6",
  messages,
  context_management: { edits: [{ type: "compact_20260112" }] },
})

// แสดง effective token count หลัง compaction blocks ถูก apply แล้ว
console.log(countResponse.input_tokens)          // effective tokens
console.log(countResponse.context_management.original_input_tokens) // ก่อน compaction
```

## Pattern: ตรวจก่อนส่ง
```ts
// ก่อน call messages.create จริง
const { input_tokens } = await anthropic.messages.count_tokens({ model, messages, system, tools })

if (input_tokens > 90_000) {
  // warn หรือ trigger manual compaction ก่อน
}
```
