# Streaming Messages

**Source:** https://platform.claude.com/docs/en/build-with-claude/streaming.md

## SDK usage (TypeScript)

```ts
// Stream text
const stream = client.messages.stream({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello" }]
})
stream.on("text", (text) => process.stdout.write(text))

// Get final message (ใช้กับ large max_tokens)
const message = await stream.finalMessage()
```

## Event flow
```
message_start → content_block_start → content_block_delta(s) → content_block_stop → message_delta → message_stop
```

## Content block delta types

| Delta type | เมื่อ | Field |
|-----------|-------|-------|
| `text_delta` | Text content | `delta.text` |
| `input_json_delta` | Tool use input | `delta.partial_json` (accumulate แล้ว parse) |
| `thinking_delta` | Extended thinking | `delta.thinking` |
| `signature_delta` | Thinking signature | `delta.signature` (ส่งกลับเมื่อใช้ tool) |
| `citations_delta` | Citations | `delta.citation` |

## Streaming + thinking

```ts
for await (const event of stream) {
  if (event.type === "content_block_delta") {
    if (event.delta.type === "thinking_delta")
      process.stdout.write(event.delta.thinking)
    if (event.delta.type === "text_delta")
      process.stdout.write(event.delta.text)
  }
}
```

## Error recovery

**Claude 4.6:** เพิ่ม user message ให้ continue
```
"Your previous response was interrupted and ended with [previous_response]. Continue from where you left off."
```

**Claude 4.5 และก่อน:** ส่ง partial assistant response กลับแล้ว stream ต่อ

## ใน route.ts (memory-chat pattern)
```ts
const stream = await client.messages.stream({ ... })

// Accumulate full response
const finalMsg = await stream.finalMessage()

switch (finalMsg.stop_reason) {
  case "tool_use": // execute tools แล้ว loop
  case "end_turn": // done
  case "pause_turn": // server tool loop — push assistant msg แล้ว continue
  case "max_tokens": // response ถูกตัด
}
```
