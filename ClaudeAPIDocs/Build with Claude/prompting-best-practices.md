# Prompting Best Practices

**Source:** https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices.md

## หลักการพื้นฐาน

- **ชัดเจนและตรงประเด็น** — บอกให้ชัดว่าต้องการอะไร อย่า assume ว่า AI รู้
- **ให้ context ว่าทำไม** — "ห้ามใช้ ellipsis เพราะ TTS จะอ่านผิด" ดีกว่า "ห้ามใช้ ellipsis"
- **XML tags** สำหรับ structured prompts — `<instructions>`, `<context>`, `<examples>`
- **Long context**: ใส่ document ไว้ต้น prompt, query ไว้ท้าย (+30% performance)

## Parallel Tool Calling (สำคัญมากสำหรับ memory-chat)

เพิ่มใน system prompt เพื่อให้ AI call tools แบบ parallel:

```
<use_parallel_tool_calls>
If you intend to call multiple tools and there are no dependencies between the tool calls,
make all of the independent tool calls in parallel. Prioritize calling tools simultaneously
whenever the actions can be done in parallel rather than sequentially.
Maximize use of parallel tool calls where possible to increase speed and efficiency.
If some tool calls depend on previous calls, call them sequentially instead.
Never use placeholders or guess missing parameters.
</use_parallel_tool_calls>
```

## Tool Use — ให้ชัดเจนว่าต้องการให้ทำหรือแค่แนะนำ

```
// AI จะแค่แนะนำ
"Can you suggest changes to improve this function?"

// AI จะลงมือทำ
"Change this function to improve its performance."
```

## Thinking / Adaptive Thinking

```ts
// Sonnet 4.6 — adaptive thinking
client.messages.create({
  model: "claude-sonnet-4-6",
  thinking: { type: "adaptive" },
  output_config: { effort: "medium" }, // low | medium | high
  max_tokens: 64000,
  messages: [...]
})
```

Effort แนะนำตาม use case:
- Chat, content → `low`
- Coding, agentic → `medium`
- Complex reasoning → `high`

## Agentic Systems — Context Window

เพิ่มใน system prompt เพื่อให้ AI ไม่หยุดกลางคัน:

```
Your context window will be automatically compacted as it approaches its limit,
allowing you to continue working indefinitely from where you left off.
Do not stop tasks early due to token budget concerns.
```

## หลีกเลี่ยง Over-engineering (Sonnet/Opus 4.6 มีแนวโน้มนี้)

```
Avoid over-engineering. Only make changes that are directly requested or clearly necessary.
Don't add features, refactor code, or make improvements beyond what was asked.
Don't add docstrings or comments to code you didn't change.
Don't create helpers or abstractions for one-time operations.
```

## Format Control

```
// แทนที่จะบอกว่า "ห้ามใช้ markdown"
"Your response should be composed of smoothly flowing prose paragraphs."

// ถ้าต้องการ output ใน tags
"Write your response in <answer> tags."
```

## Prefill Migration (deprecated บน 4.6)

| เดิม | ใหม่ |
|------|------|
| Prefill JSON → force format | structured outputs |
| Prefill ลบ preamble | system: "ตอบตรงๆ ไม่ต้อง 'Here is...'" |
| Prefill continuation | user: "ต่อจากที่ค้างไว้..." |
