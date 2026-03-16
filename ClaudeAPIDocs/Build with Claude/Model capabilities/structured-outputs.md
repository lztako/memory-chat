# Structured Outputs

**Source:** https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md

**GA** บน Opus 4.6, Sonnet 4.6, Sonnet 4.5, Opus 4.5, Haiku 4.5 — ไม่ต้อง beta header

## 2 features แยกกัน
1. **JSON outputs** (`output_config.format`) — ควบคุม response format
2. **Strict tool use** (`strict: true`) — validate tool input schema

> Note: `output_format` (เก่า) → ย้ายไป `output_config.format` แล้ว (เก่ายังใช้ได้ช่วงนี้)

## JSON Outputs

```ts
const response = await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Extract: John Smith, john@example.com" }],
  output_config: {
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
        },
        required: ["name", "email"],
        additionalProperties: false
      }
    }
  }
})

const result = JSON.parse(response.content[0].text)
// { name: "John Smith", email: "john@example.com" }
```

## Strict Tool Use

```ts
tools: [{
  name: "get_weather",
  description: "...",
  strict: true,  // ← เพิ่ม strict
  input_schema: {
    type: "object",
    properties: { location: { type: "string" } },
    required: ["location"],
    additionalProperties: false
  }
}]
// tool input จะตรงตาม schema เสมอ
```

## JSON Schema support
**รองรับ:** object, array, string, number, integer, boolean, null, properties, required, items, enum, const, additionalProperties: false, minItems, maxItems, pattern, format (date/time/email/uri/uuid เท่านั้น)

**ไม่รองรับ:** minimum/maximum, minLength/maxLength, allOf/oneOf/anyOf, $ref, default

## ข้อจำกัด
- **ใช้กับ Citations ไม่ได้** — error 400

## memory-chat ใช้งาน
```ts
// Memory extraction ด้วย structured output
const extraction = await extractionClient.messages.create({
  model: "claude-haiku-4-5-20251001",
  output_config: {
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          memories: { type: "array", items: { type: "string" } },
          type: { type: "string", enum: ["long_term", "daily_log"] }
        },
        required: ["memories", "type"],
        additionalProperties: false
      }
    }
  },
  messages: [...]
})
```
