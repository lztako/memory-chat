# Working with Messages API

**Source:** https://platform.claude.com/docs/en/build-with-claude/working-with-messages.md

## Basic Request (TypeScript)

```ts
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()

const message = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello" }]
})
```

## Response Structure

```json
{
  "id": "msg_01XFD...",
  "type": "message",
  "role": "assistant",
  "content": [{ "type": "text", "text": "Hello!" }],
  "model": "claude-sonnet-4-6",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": { "input_tokens": 12, "output_tokens": 6 }
}
```

## Multi-turn Conversation

API เป็น stateless — ต้องส่ง full history ทุก request:

```ts
await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hello!" },  // previous turn
    { role: "user", content: "Tell me more" }  // current
  ]
})
```

## Vision — Image Input

```ts
// Base64
const message = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{
    role: "user",
    content: [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg", // jpeg | png | gif | webp
          data: base64String,
        }
      },
      { type: "text", text: "What's in this image?" }
    ]
  }]
})

// URL
const message = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{
    role: "user",
    content: [
      { type: "image", source: { type: "url", url: "https://..." } },
      { type: "text", text: "Describe this" }
    ]
  }]
})
```

## ⚠️ Prefill — Deprecated บน 4.6
อย่าใช้ prefill (assistant message สุดท้าย) บน Sonnet/Opus 4.6 → return 400
ใช้ structured outputs หรือ system prompt แทน
