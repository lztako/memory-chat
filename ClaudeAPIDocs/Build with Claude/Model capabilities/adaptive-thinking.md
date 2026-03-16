# Adaptive Thinking

**Source:** https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking.md

## คืออะไร
Claude decide เองว่าจะ think หรือไม่ และ think เท่าไหร่ ตาม complexity ของ request
ใช้กับ **Opus 4.6** และ **Sonnet 4.6** เท่านั้น (ไม่ต้อง beta header)

> `budget_tokens` deprecated บน Opus 4.6 และ Sonnet 4.6 — ใช้ adaptive + effort แทน

## Basic usage

```ts
const response = await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 16000,
  thinking: { type: "adaptive" },
  messages: [{ role: "user", content: "..." }]
})
```

## กับ effort parameter

```ts
await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 16000,
  thinking: { type: "adaptive" },
  output_config: { effort: "medium" },  // ควบคุม thinking depth
  messages: [...]
})
```

| Effort | Thinking behavior |
|--------|-------------------|
| `max` | Always thinks, no constraints (Opus 4.6 only) |
| `high` (default) | Always thinks |
| `medium` | May skip thinking for simple queries |
| `low` | Minimizes thinking |

## Streaming

```ts
const stream = await client.messages.stream({
  model: "claude-opus-4-6",
  max_tokens: 16000,
  thinking: { type: "adaptive" },
  messages: [...]
})

for await (const event of stream) {
  if (event.type === "content_block_delta") {
    if (event.delta.type === "thinking_delta")
      process.stdout.write(event.delta.thinking)
    if (event.delta.type === "text_delta")
      process.stdout.write(event.delta.text)
  }
}
```

## Interleaved thinking
Adaptive mode **automatically enables** interleaved thinking → Claude thinks between tool calls

## ความแตกต่างจาก manual mode

| | Adaptive | Manual (`budget_tokens`) |
|---|---------|--------------------------|
| Supported | Opus 4.6, Sonnet 4.6 | All models |
| Control | `effort` parameter | `budget_tokens` |
| Interleaved | Auto | Beta header |
| Predictability | Variable | Predictable cost |

## Prompt caching
- Consecutive requests ที่ใช้ `adaptive` mode → cache breakpoints preserved
- Switch ระหว่าง `adaptive` ↔ `enabled`/`disabled` → cache breakpoint เสีย (messages)
- System prompt และ tools ยังคง cached

## Tune thinking ใน system prompt
```
Extended thinking adds latency and should only be used when it will meaningfully
improve answer quality. When in doubt, respond directly.
```
