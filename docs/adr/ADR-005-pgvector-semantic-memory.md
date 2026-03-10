# ADR-005: pgvector Semantic Memory Search

**Date:** 2026-03-10
**Status:** Accepted

## Context

ปัจจุบัน `lib/memory/inject.ts` inject memories เข้า system prompt แบบนี้:
- Long-term: top-20 เรียงตาม `importance DESC`
- Daily log: top-10 ของวันนี้
- Skills: keyword match บน `skill.trigger` → top-5

ปัญหา:
1. Importance สูง ≠ Relevant กับบทสนทนาปัจจุบัน — inject memory เรื่องเป้าหมาย 5 ปีขณะที่ user ถามราคา shipping
2. Keyword matching แม่นยำต่ำ — "stainless" ไม่ match "steel pipe", "inox"
3. Context window เสียกับ memories ที่ไม่เกี่ยว → AI ตอบด้วยข้อมูลที่ไม่จำเป็น

## Decision

เพิ่ม `embedding vector(512)?` ใน `Memory` + `UserSkill` tables
ใช้ **Voyage AI `voyage-3-lite`** (512 dims) เป็น embedding model
Search ด้วย cosine similarity (`<=>` operator) ผ่าน `prisma.$queryRaw`

**Embedding flow:**
- Memory create/update → embed `content` → save vector
- Skill create → embed `trigger + " " + solution` → save vector
- Inject time → embed last user message → semantic top-10 (long_term) + top-5 (daily_log) + top-5 (skills)
- Fallback: ถ้า `VOYAGE_API_KEY` ไม่ set หรือ embedding null → ใช้ importance ranking เดิม

## Alternatives Considered

**Option A: OpenAI text-embedding-3-small (1536 dims)**
- ✅ industry standard, accurate
- ❌ เพิ่ม OpenAI dependency ในโปรเจกต์ที่ใช้ Anthropic เท่านั้น
- ❌ 1536 dims = storage + compute สูงกว่า 3× โดยไม่จำเป็น

**Option B: Voyage AI voyage-3-lite (512 dims) — chosen**
- ✅ Anthropic officially recommends Voyage AI สำหรับ Claude apps
- ✅ 512 dims = เล็ก เร็ว ถูก (~$0.02/1M tokens)
- ✅ zero new major dependency (HTTP call เท่านั้น ไม่มี SDK)
- ⚠️ ต้องการ `VOYAGE_API_KEY` env var เพิ่ม

**Option C: Keep keyword matching + improve**
- ❌ ceiling ต่ำ — keyword จะ fail เสมอสำหรับ synonym/multilingual
- ❌ ไม่แก้ปัญหา context relevance จริงๆ

## Consequences

**ได้:**
- Memories ที่ inject relevant กับบทสนทนาจริง → AI ตอบแม่นยำขึ้น
- Skill matching ดีขึ้น (synonym, Thai/English mix)
- Graceful fallback — ไม่ break ถ้า VOYAGE_API_KEY ไม่มี

**เสีย:**
- Latency +50-100ms ต่อ message (embedding API call)
- ต้องการ VOYAGE_API_KEY env var (Vercel + local)
- Existing memories ไม่มี embedding จนกว่าจะ backfill (fallback ทำงานแทน)

**Trade-off ที่ยอมรับ:** relevance > 100ms latency สำหรับ personal assistant

**No-gos (appetite M):**
- ❌ entity graph
- ❌ cross-user learning
- ❌ embedding UI / visualization
- ❌ backfill script (เริ่มฝัง embedding เฉพาะ record ใหม่ก่อน)

**Files changed:**
- `prisma/schema.prisma` — `embedding Unsupported("vector(512)")?` ใน Memory + UserSkill
- `lib/ai/embeddings.ts` (new) — Voyage AI client + `embedText()`
- `lib/repositories/memory.repo.ts` — embed on write, `getForInjectionSemantic()`
- `lib/repositories/skill.repo.ts` — embed on create
- `lib/memory/inject.ts` — ใช้ semantic search เมื่อมี embedding
