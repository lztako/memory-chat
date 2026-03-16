# Pricing

**Source:** https://platform.claude.com/docs/en/about-claude/pricing.md

## Model Pricing (Active Models เท่านั้น)

| Model | Input | Output | Cache Write 5m | Cache Read |
|-------|-------|--------|----------------|------------|
| Opus 4.6 | $5 | $25 | $6.25 | $0.50 |
| **Sonnet 4.6** ← ใช้อยู่ | $3 | $15 | $3.75 | $0.30 |
| Haiku 4.5 ← extraction | $1 | $5 | $1.25 | $0.10 |

ราคาทั้งหมดต่อ MTok (million tokens)

## Batch API (50% discount)

| Model | Input | Output |
|-------|-------|--------|
| Sonnet 4.6 | $1.50 | $7.50 |
| Haiku 4.5 | $0.50 | $2.50 |

ใช้สำหรับ non-time-sensitive tasks (memory extraction, title generation)

## Feature Pricing ที่สำคัญ

### Web Search
**$10 per 1,000 searches** + standard token costs
- memory-chat ใช้ max_uses: 3 → ~$0.03 ต่อ conversation ถ้า search ครบ

### Web Fetch
**ฟรี** — แค่จ่าย token costs ปกติ
- avg page 10kB ≈ 2,500 tokens → ~$0.0075 ต่อ fetch

### Code Execution
- **ฟรี** เมื่อใช้กับ `web_search_20260209` หรือ `web_fetch_20260209`
- Standalone: $0.05/hour (free 1,550 hours/org/month)

### Tool Use Overhead (Sonnet 4.6)
- `tool_choice: "auto"` → +346 tokens ต่อ request
- `tool_choice: "any"` → +313 tokens ต่อ request

### Prompt Caching Multipliers
| Operation | Multiplier |
|-----------|-----------|
| Cache write 5m | 1.25x |
| Cache write 1h | 2x |
| Cache read | 0.1x |

Cache คุ้มหลังจาก 1 read (5m) หรือ 2 reads (1h)

## Fast Mode (Opus 4.6 เท่านั้น)
$30/$150 per MTok (6x ราคาปกติ) — ใช้เฉพาะถ้า latency สำคัญมาก

## Cost Estimation สำหรับ memory-chat

conversation เฉลี่ย (~5k tokens in + ~500 tokens out) ด้วย Sonnet 4.6:
- Input: $0.015
- Output: $0.0075
- รวม: ~$0.022 ต่อ conversation (ก่อน caching)
- หลัง cache hit (system prompt): ลดได้ ~60-70%
