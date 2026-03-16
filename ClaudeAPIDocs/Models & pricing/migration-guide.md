# Migration Guide — Claude 4.6

**Source:** https://platform.claude.com/docs/en/about-claude/models/migration-guide.md

## memory-chat ใช้ Sonnet 4.6 — Checklist

- [x] Model ID: `claude-sonnet-4-6` ✅ ใช้อยู่แล้ว
- [ ] **BREAKING:** ลบ assistant message prefills ออก (return 400)
- [ ] **BREAKING:** ตรวจ tool parameter JSON parsing ใช้ `JSON.parse()` เสมอ
- [ ] Handle stop reason `refusal`
- [ ] Handle stop reason `model_context_window_exceeded`
- [ ] ลบ beta header `fine-grained-tool-streaming-2025-05-14` (GA แล้ว)
- [ ] เปลี่ยน `output_format` → `output_config.format`
- [ ] พิจารณา effort parameter (default = `high` → latency สูง)

## Adaptive Thinking (TypeScript)

```ts
// ❌ เดิม (deprecated)
const response = await anthropic.beta.messages.create({
  model: "claude-sonnet-4-5",
  thinking: { type: "enabled", budget_tokens: 32000 },
  betas: ["interleaved-thinking-2025-05-14"],
  ...
})

// ✅ ใหม่ (GA — ไม่ต้อง beta)
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  thinking: { type: "adaptive" },
  output_config: { effort: "medium" },
  messages: [{ role: "user", content: "..." }]
} as unknown as Anthropic.MessageCreateParamsNonStreaming)
```

## Stop Reasons ใหม่ที่ต้อง handle

```ts
if (response.stop_reason === "refusal") {
  // AI ปฏิเสธ — handle gracefully
}
if (response.stop_reason === "model_context_window_exceeded") {
  // Context เต็ม — trigger compaction หรือ clear history
}
```

## Sonnet 4.6 — Effort แนะนำตาม use case

| Use case | Effort แนะนำ |
|----------|-------------|
| Chat, content, search | `low` |
| Coding, agentic tool use | `medium` |
| Complex reasoning, agents | `high` |
| Max capability | `max` (Opus เท่านั้น) |

## Prefill Alternatives

| เดิมใช้ prefill เพื่อ | ใช้แทนด้วย |
|----------------------|----------|
| Force JSON output | structured outputs / `output_config.format` |
| ลบ preamble | system: "ตอบตรงๆ ไม่ต้อง 'Here is...'" |
| Continue interrupted | user: "ต่อจากที่ค้างไว้..." |
