# Effort Parameter

**Source:** https://platform.claude.com/docs/en/build-with-claude/effort.md

## คืออะไร
ควบคุม token spending ใน response ทั้งหมด (text + tool calls + thinking)
**GA — ไม่ต้องใช้ beta header**

## Supported models
- `claude-opus-4-6` — รวม `max` effort
- `claude-sonnet-4-6` — medium/low recommended
- `claude-opus-4-5`

## Effort levels

| Level | Use case |
|-------|----------|
| `max` | Maximum reasoning, Opus 4.6 only |
| `high` | Default (เหมือนไม่ใส่ parameter) |
| `medium` | Agentic tasks, coding — recommended สำหรับ Sonnet 4.6 |
| `low` | Chat, simple queries, subagents |

## Usage

```ts
await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  output_config: { effort: "medium" },
  messages: [...]
})
```

## กับ adaptive thinking

```ts
// Recommended pattern สำหรับ Opus 4.6
await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 16000,
  thinking: { type: "adaptive" },
  output_config: { effort: "medium" },  // ควบคุม thinking depth
  messages: [...]
})
```

## Effect on tool use
Low effort → fewer tool calls, terse output
High/max effort → more tool calls, detailed summaries

## Sonnet 4.6 recommendation
- **ควร set effort explicitly** (default `high` อาจทำให้ latency สูง)
- Chat/non-coding → `low`
- Agentic/coding → `medium`
- Max intelligence → `high`

## memory-chat usage
```ts
// route.ts — ปรับตาม task complexity
const effort = isComplexQuery ? "high" : "medium"
await client.messages.create({
  model: "claude-sonnet-4-6",
  output_config: { effort },
  // ...
})
```
