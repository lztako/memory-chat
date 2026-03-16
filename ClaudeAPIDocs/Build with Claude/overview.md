# Build with Claude — Features Overview

**Source:** https://platform.claude.com/docs/en/build-with-claude/overview.md

## Model Capabilities (ที่เกี่ยวกับ memory-chat)

| Feature | เกี่ยวข้อง | หมายเหตุ |
|---------|-----------|---------|
| Context windows | ✅ | 1M tokens — Sonnet 4.6 |
| Adaptive thinking | ✅ | `thinking: {type: "adaptive"}` — Opus/Sonnet 4.6 |
| Batch processing | ⚡ อนาคต | 50% ถูกกว่า — memory extraction, title gen |
| Structured outputs | ✅ | แทน prefill ที่ deprecated |
| Extended thinking | ✅ | manual mode — Sonnet 4.6 |
| PDF support | ⚡ อนาคต | analyze PDFs |

## Server-side Tools (ใช้ใน memory-chat)

| Tool | ใช้อยู่ | Cost |
|------|---------|------|
| Web search | ✅ | $10/1,000 searches |
| Web fetch | ✅ | ฟรี (token costs only) |
| Code execution | ⚡ | ฟรีเมื่อมี web tool |

## Context Management (ดู subfolder แยก)
- Compaction → `Context management/compaction.md`
- Prompt caching → `Context management/prompt-caching.md`
- Token counting → `Context management/token-counting.md`
- Context editing → `Context management/context-editing.md`
