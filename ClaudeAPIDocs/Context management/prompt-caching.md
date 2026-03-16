# Prompt Caching

**Source:** https://platform.claude.com/docs/en/build-with-claude/prompt-caching.md

## สรุป
Cache prefix ของ prompt เพื่อลด cost และ latency สำหรับ content ที่ซ้ำ

## 2 วิธี

### Automatic Caching (แนะนำสำหรับ multi-turn)
```ts
// ใส่ที่ top-level request — cache point เลื่อนอัตโนมัติทุก turn
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  cache_control: { type: "ephemeral" },
  system: "...",
  messages: [...],
})
```
Cache point เลื่อนอัตโนมัติ:
- Request 1: cache ที่ User(1)
- Request 2: hit cache ถึง User(1), write ถึง User(2)
- Request 3: hit cache ถึง User(2), write ถึง User(3)

### Explicit Breakpoints
```ts
// ใส่ cache_control บน content block เฉพาะจุด
{ type: "text", text: "...", cache_control: { type: "ephemeral" } }
```

## TTL
| TTL | ราคา write | ราคา read |
|-----|-----------|----------|
| 5 นาที (default) | 1.25x base | 0.1x base |
| 1 ชั่วโมง | 2x base | 0.1x base |

```ts
cache_control: { type: "ephemeral", ttl: "1h" }
```

## Pricing (Sonnet 4.6)
| | ราคา |
|--|------|
| Base input | $3 / MTok |
| Cache write (5m) | $3.75 / MTok |
| Cache write (1h) | $6 / MTok |
| Cache read | $0.30 / MTok |
| Output | $15 / MTok |

## Minimum Cacheable Tokens
| Model | Minimum |
|-------|---------|
| Sonnet 4.6 | 2,048 tokens |
| Sonnet 4.5, Sonnet 4 | 1,024 tokens |

## Tracking Cache Performance
```ts
response.usage.cache_read_input_tokens    // tokens read จาก cache
response.usage.cache_creation_input_tokens // tokens written ไป cache
response.usage.input_tokens               // tokens ที่ไม่ได้ cache

// total = cache_read + cache_creation + input_tokens
```

## สิ่งที่ cache ได้
✅ Tools, System messages, Text messages, Images, Documents, Tool use/results

❌ Thinking blocks (cache ไม่ได้โดยตรง แต่ cache ได้เมื่อ appear ใน previous assistant turns)

## Cache Invalidation Rules
tools → system → messages (เรียงตาม hierarchy)
- แก้ tool definitions → invalidate ทั้งหมด
- แก้ system prompt → invalidate system + messages
- แก้ message เก่า → invalidate messages จากจุดนั้น

## Best Practices
- ใช้ automatic caching สำหรับ multi-turn conversation
- System prompt ใส่ cache_control เพื่อแยก cache จาก conversation
- ใส่ cache breakpoint ท้าย conversation เสมอ (maximize hit)
- Stable content (instructions, background) → ใส่ต้น prompt
- 20-block lookback window: ถ้า conversation ยาวกว่า 20 blocks → ต้องมี explicit breakpoints หลายจุด
