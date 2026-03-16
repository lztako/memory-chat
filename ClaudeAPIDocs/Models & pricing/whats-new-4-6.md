# What's New in Claude 4.6

**Source:** https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-6.md

## Breaking Changes (สำคัญมาก)

### 1. Prefill ไม่รองรับแล้ว (400 error)
```ts
// ❌ จะ error บน Opus/Sonnet 4.6
messages: [..., { role: "assistant", content: "ผลลัพธ์คือ:" }]

// ✅ ใช้แทน
system: "ตอบตรงๆ ไม่ต้องมี preamble"
// หรือ structured outputs
```

### 2. Tool Parameter JSON Escaping เปลี่ยน
- ใช้ `JSON.parse()` เสมอ — อย่า parse tool input เป็น raw string

## Deprecations

### thinking: {type: "enabled"} → deprecated
```ts
// ❌ Deprecated บน 4.6
thinking: { type: "enabled", budget_tokens: 32000 }

// ✅ ใช้แทน
thinking: { type: "adaptive" }
output_config: { effort: "high" } // high | medium | low | max
```

### Beta headers ที่ลบออกได้แล้ว (Opus 4.6)
- ~~`interleaved-thinking-2025-05-14`~~ — adaptive thinking เปิด interleaved อัตโนมัติ
- ~~`effort-2025-11-24`~~ — effort เป็น GA แล้ว
- ~~`fine-grained-tool-streaming-2025-05-14`~~ — GA แล้ว

## Features ใหม่ที่เกี่ยวกับ memory-chat

### Compaction API (beta)
Server-side auto-summarize สำหรับ long conversations → ดู `Context management/compaction.md`

### Web Tools เวอร์ชันใหม่
```ts
// ใช้เวอร์ชันใหม่เพื่อ dynamic filtering + code execution ฟรี
{ type: "web_search_20260209", name: "web_search" }
{ type: "web_fetch_20260209", name: "web_fetch" }
// Code execution ฟรีเมื่อมี web tool อยู่ด้วย
```

### Effort Parameter (GA — ไม่ต้อง beta header)
```ts
output_config: { effort: "max" | "high" | "medium" | "low" }
// Sonnet 4.6 default = "high" → อาจ latency สูงกว่าเดิม
```

### Fast Mode (research preview — Opus 4.6 เท่านั้น)
```ts
// 2.5x เร็วกว่า แต่ $30/$150 per MTok
{ betas: ["fast-mode-2026-02-01"], speed: "fast" }
```
