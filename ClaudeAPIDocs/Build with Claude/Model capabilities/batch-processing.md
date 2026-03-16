# Message Batches API

**Source:** https://platform.claude.com/docs/en/build-with-claude/batch-processing.md

**50% discount** จาก standard pricing — รองรับทุก active models

## เมื่อไหร่ควรใช้
- Process large volumes ที่ไม่ต้องการ real-time response
- Memory extraction แบบ bulk
- Large-scale evaluations

## Create batch

```ts
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

const batch = await client.messages.batches.create({
  requests: [
    {
      custom_id: "req-1",  // ใช้ match กับ result ทีหลัง
      params: {
        model: "claude-opus-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: "Hello" }]
      }
    },
    {
      custom_id: "req-2",
      params: { model: "claude-opus-4-6", max_tokens: 1024, messages: [...] }
    }
  ]
})
// batch.processing_status = "in_progress"
```

## Poll for completion

```ts
let batch
while (true) {
  batch = await client.messages.batches.retrieve(batch.id)
  if (batch.processing_status === "ended") break
  await new Promise(r => setTimeout(r, 60_000))
}
```

## Retrieve results

```ts
for await (const result of await client.messages.batches.results(batch.id)) {
  switch (result.result.type) {
    case "succeeded":
      console.log(result.custom_id, result.result.message.content)
      break
    case "errored":
      console.error(result.custom_id, result.result.error)
      break
    case "expired":
      console.log("expired:", result.custom_id)
  }
}
// Results อาจไม่เรียงตาม input order → ใช้ custom_id เสมอ
```

## Limits
- Max: 100,000 requests หรือ 256 MB ต่อ batch
- Expires after 24 hours (ถ้าไม่เสร็จ)
- Results available 29 days

## Pricing (50% discount)

| Model | Batch Input | Batch Output |
|-------|------------|--------------|
| Sonnet 4.6 | $1.50/MTok | $7.50/MTok |
| Opus 4.6 | $2.50/MTok | $12.50/MTok |
| Haiku 4.5 | $0.50/MTok | $2.50/MTok |

## + Prompt caching
Caching ยังทำงานได้ใน batch แต่ cache hits เป็น best-effort (30-98% hit rate)
ใช้ `cache_control` บน shared system content เพื่อเพิ่ม hit rate
