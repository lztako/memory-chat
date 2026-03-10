# ADR-003: Rate Limit และ Token Usage เปลี่ยนจาก In-Memory → DB-Backed

**Date:** 2026-03-10
**Status:** Accepted

## Context

`lib/tendata/rate-limit.ts` และ `lib/ai/token-usage.ts` ใช้ `Map<string, number>` ใน process memory เพื่อนับ daily usage ของแต่ละ user

ปัญหาที่พบ:
1. Vercel เป็น serverless — cold start = Map หายทันที → user reset quota ได้โดยไม่ตั้งใจ (หรือตั้งใจ)
2. Multi-instance: instance A และ B นับแยกกัน → rate limit จริง = 500 × N instances
3. Token usage ไม่มี audit trail → billing report ไม่ได้

## Decision

เพิ่ม 2 tables: `TendataUsage` และ `TokenUsage` (composite unique key `userId + date`)

- **checkTendataLimit** → query DB ก่อน, atomic check
- **recordTendataUsage** → `upsert { points: { increment } }` (atomic, no race condition)
- **recordTokenUsage** → fire-and-forget DB upsert (ไม่ block response stream)
- In-memory cache ยังอยู่ แต่เป็น L1 display cache เท่านั้น (stale-ok สำหรับ UI)

## Alternatives Considered

**Option A: Redis / Upstash** — atomic increment, fast, designed for this
- ❌ ต้องการ infra เพิ่ม, cost เพิ่ม, complexity เพิ่ม
- ❌ overkill สำหรับ traffic ระดับ early-stage

**Option B: Keep in-memory + accept bug**
- ❌ correctness bug บน production — ยอมรับไม่ได้

**Option C: PostgreSQL upsert (chosen)**
- ✅ ใช้ Supabase ที่มีอยู่แล้ว, zero new infra
- ✅ atomic increment via Prisma
- ✅ history ได้ (getHistory 30 days)
- ⚠️ latency เพิ่มขึ้นเล็กน้อยต่อ Tendata call (~5-20ms) — ยอมรับได้

## Consequences

**ได้:** rate limit enforce ถูกต้องแม้ restart, billing history มี audit trail
**เสีย:** latency เล็กน้อยต่อ Tendata tool call
**Trade-off ที่ยอมรับ:** correctness > performance ในกรณีนี้

**Files changed:**
- `prisma/schema.prisma` — TendataUsage + TokenUsage tables
- `lib/repositories/tendata-usage.repo.ts` (new)
- `lib/repositories/token-usage.repo.ts` (new)
- `lib/tendata/rate-limit.ts` — async, DB-backed
- `lib/ai/token-usage.ts` — fire-and-forget DB write
