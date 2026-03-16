# Fast Mode (Research Preview)

**Source:** https://platform.claude.com/docs/en/build-with-claude/fast-mode.md

> Research preview — ต้อง join waitlist ก่อน

## คืออะไร
Up to **2.5x faster output tokens/sec** สำหรับ Claude Opus 4.6 เท่านั้น
Same model, same weights — ไม่ใช่ model ต่างกัน

## Supported: Opus 4.6 เท่านั้น

## Usage

```ts
// Beta header required
const response = await client.beta.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 4096,
  speed: "fast",
  betas: ["fast-mode-2026-02-01"],
  messages: [...]
})

// Check response.usage.speed: "fast" | "standard"
```

## Pricing (6x standard Opus)
| | Input | Output |
|--|-------|--------|
| Fast mode | $30/MTok | $150/MTok |

## Rate limits
Fast mode มี **dedicated rate limit** แยกจาก standard Opus
Response headers: `anthropic-fast-input-tokens-limit`, `anthropic-fast-output-tokens-remaining`

## Fallback to standard

```ts
// Set max_retries: 0 เพื่อ fail immediately แล้ว retry ด้วย standard
try {
  return await client.beta.messages.create({
    speed: "fast", betas: ["fast-mode-2026-02-01"], ...
  }, { maxRetries: 0 })
} catch (e) {
  if (e.status === 429) {
    return await client.messages.create({ /* no speed */ })
  }
}
```

## ข้อจำกัด
- Output tokens/sec สูงขึ้น แต่ **TTFT (time-to-first-token) เหมือนเดิม**
- ไม่รองรับ Batch API
- ไม่รองรับ Priority Tier
- Switching fast ↔ standard → **prompt cache miss**
- Prompt caching ยังคง stack ได้ (คิดราคาบน fast mode price)

## memory-chat relevance
Fast mode มีราคาสูงมาก ($150/MTok output) — ยังไม่แนะนำให้ใช้ใน production ตอนนี้
รอจนกว่าจะออก GA และมีลูกค้าที่ต้องการ latency ต่ำจริงๆ
