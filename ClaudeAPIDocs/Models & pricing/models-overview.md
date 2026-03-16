# Models Overview

**Source:** https://platform.claude.com/docs/en/about-claude/models/overview.md

## Current Models (ใช้ใน memory-chat)

| Model | API ID | Context | Max Output | Input | Output |
|-------|--------|---------|------------|-------|--------|
| Claude Opus 4.6 | `claude-opus-4-6` | 1M | 128k | $5/MTok | $25/MTok |
| **Claude Sonnet 4.6** ← ใช้อยู่ | `claude-sonnet-4-6` | 1M | 64k | $3/MTok | $15/MTok |
| Claude Haiku 4.5 ← extraction | `claude-haiku-4-5-20251001` | 200k | 64k | $1/MTok | $5/MTok |

## Model Capabilities

| | Opus 4.6 | Sonnet 4.6 | Haiku 4.5 |
|--|----------|-----------|----------|
| Extended thinking | ✅ | ✅ | ✅ |
| Adaptive thinking | ✅ | ✅ | ❌ |
| Context window | 1M | 1M | 200k |
| Latency | Moderate | Fast | Fastest |

## Retirement Dates (Active Models)
| Model | ไม่ retire ก่อน |
|-------|----------------|
| `claude-sonnet-4-6` | Feb 17, 2027 |
| `claude-opus-4-6` | Feb 5, 2027 |
| `claude-haiku-4-5-20251001` | Oct 15, 2026 |

## ⚠️ Deprecated (อย่าใช้)
- `claude-3-haiku-20240307` — retire Apr 20, 2026 → ย้ายไป `claude-haiku-4-5-20251001`
