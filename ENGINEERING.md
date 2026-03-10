# ENGINEERING.md — memory-chat

หลักการและ process สำหรับการพัฒนา — ใช้เป็น reference ก่อนตัดสินใจทำอะไรใหม่

---

## Philosophy

Software ไม่มีวัน "เสร็จ" — มีแค่ "เสร็จพอสำหรับตอนนี้"
งานของเราคือ **เลือกว่าจะไม่ทำอะไร** ให้เก่งพอๆ กับการเลือกว่าจะทำอะไร

> "The best code is no code. The best feature is no feature." — Rich Hickey

---

## 1. Prioritization — Now / Next / Later

ใช้แทน Gantt chart หรือ deadline ที่แต่งขึ้น

```
NOW   → กำลังทำ, fully committed, มี owner
NEXT  → ตัดสินใจแล้วว่าจะทำ, ยังไม่ start (max 2-3 items)
LATER → บันทึกไว้, ยังไม่ commit, อาจไม่ทำก็ได้
```

**กฎสำคัญ:**
- `LATER` ไม่มีวันที่ — ใส่วันที่ได้ก็ต่อเมื่อ move ขึ้น `NEXT`
- Item ที่ไม่มีใครพูดถึงใน 60 วัน → ลบออกจาก LATER (ถ้าสำคัญจริงจะถูกพูดถึงอีก)
- Promote จาก LATER → NEXT ได้เมื่อมี forcing function จริงๆ: user feedback, competitive threat, dependency unblocked — ไม่ใช่แค่ "อยากทำ"
- `NOW` มีแค่ 1 เรื่องต่อครั้ง (single-threaded focus)

**ดู IDEAS.md** → ไอเดีย product อยู่ที่นั่น, LATER ทั้งหมด จนกว่าจะ promote

---

## 2. Before You Build — ADR (Architecture Decision Record)

เขียน ADR ก่อน implement ทุกครั้งที่:
- เลือกระหว่าง 2+ technical options จริงๆ
- การตัดสินใจนี้ยาก/แพงที่จะ reverse ในภายหลัง
- คนใหม่ในทีม 6 เดือนข้างหน้าจะถามว่า "ทำไมถึงทำแบบนี้?"

**Format (สั้นๆ ก็พอ):**

```markdown
# ADR-NNN: [ชื่อสั้นๆ]
Date: YYYY-MM-DD
Status: Accepted

## Context
ทำไมถึงต้องตัดสินใจตอนนี้? ข้อจำกัดมีอะไร?

## Decision
เราจะทำ X เพราะ...

## Alternatives Considered
- Option A: ดี/เสียอะไร → reject เพราะ
- Option B: ดี/เสียอะไร → reject เพราะ

## Consequences
ได้อะไร, เสียอะไร, trade-off ที่ยอมรับ
```

**เก็บไว้ที่:** `docs/adr/ADR-NNN-title.md`

**ตัวอย่าง ADR ที่ควรมีสำหรับ project นี้:**
- ADR-001: ใช้ Supabase แทน self-hosted PostgreSQL
- ADR-002: Memory extraction ใช้ Haiku ไม่ใช่ Sonnet (cost vs quality)
- ADR-003: Rate limit เปลี่ยนจาก in-memory → DB-backed (Tier 1)
- ADR-004: Tendata เป็น backend-only, user ค้นจาก UserTradeData table (Tier 2)

---

## 3. Appetite — ไม่ใช่ Estimate

ก่อนเริ่มงานใหม่ ถามว่า **"เรายอมทุ่มเวลาเท่าไหร่กับเรื่องนี้?"** ไม่ใช่ "นานแค่ไหน?"

| Appetite | นิยาม |
|----------|-------|
| **S** (Small) | 1-3 วัน, 1 คน |
| **M** (Medium) | 1 สัปดาห์, 1-2 คน |
| **L** (Large) | 2-4 สัปดาห์, ทั้งทีม |

**กฎ:** ถ้า scope ไม่พอดีกับ appetite → **cut scope ไม่ใช่ extend deadline**

ทุก feature ต้องมี **No-gos** ที่ชัดเจน — อะไรที่ตั้งใจจะไม่ทำใน version นี้

**ตัวอย่าง (Tier 3 — pgvector):**
- Appetite: M (1 สัปดาห์)
- In scope: embedding column ใน Memory + UserSkill, semantic search แทน top-20
- **No-go:** entity graph, cross-user learning, embedding UI — รอ cycle ถัดไป

---

## 4. Tech Debt Budget — 20% Rule

จอง **20% ของทุก cycle** ไว้สำหรับ tech debt โดยอัตโนมัติ — ไม่ใช่ทำเมื่อมีเวลา

```
Cycle 3 วัน → 0.6 วัน (ประมาณครึ่งวัน) สำหรับ debt
Cycle 1 สัปดาห์ → 1 วัน สำหรับ debt
```

**ประเภท debt ที่ควรรู้จัก:**

| ประเภท | ตัวอย่างใน project นี้ | วิธีจัดการ |
|--------|----------------------|------------|
| **Intentional** | in-memory rate limit (รู้ว่าผิด, fix แล้วใน Tier 1) | Document + fix ใน next cycle |
| **Unintentional** | memory extraction ดึงแค่ last message | Fix as found |
| **Outdated** | Tendata tools เรียก API ตรงๆ (Tier 2 แก้แล้ว) | Scheduled cleanup |

**Boy Scout Rule:** ถ้า touch ไฟล์ไหน → ทิ้งให้ clean กว่าตอนที่หยิบขึ้นมาเสมอ

---

## 5. Working Backwards — ถามก่อนสร้าง

ก่อน feature ใหม่ใดๆ เขียนตอบ 4 ข้อนี้ก่อน (ไม่ต้องยาว):

1. **ใครคือ user?** — ระบุ persona ให้ชัด ไม่ใช่ "ผู้ใช้ทั่วไป"
2. **ปัญหาคืออะไร?** — เขียนในภาษา user ไม่ใช่ภาษา engineer
3. **ถ้าทำสำเร็จ user จะพูดว่าอะไร?** — เขียน "user quote" สมมติขึ้นมา ถ้าเขียนไม่ได้ = ยังไม่เข้าใจ user ดีพอ
4. **สิ่งที่จะ not do คืออะไร?** — scope boundary ชัดเจน

---

## 6. Decision-Making — Disagree and Commit

เมื่อต้องตัดสินใจ:

1. **Debate phase** — เปิด objection ให้ครบ, บันทึกไว้ใน ADR (ส่วน Alternatives)
2. **Decision** — คนที่รับผิดชอบตัดสิน, ถ้าไม่แน่ใจ → ทำแบบ reversible ก่อน
3. **Commit** — ทุกคน execute เต็มที่ แม้จะไม่เห็นด้วย 100%

**Type 1 vs Type 2 decisions:**
- **Type 1** — reversible ยาก, cost สูง: ใช้เวลา คิดให้ดี เขียน ADR
- **Type 2** — reversible ได้, cost ต่ำ: ตัดสินใจเร็ว ทำก่อน เรียนรู้ทีหลัง
- **หลุมพราง:** treat Type 2 เหมือน Type 1 → decision paralysis

---

## 7. Feature Flags (เมื่อมี user จริงๆ)

เมื่อมี production users ใช้ pattern นี้:

```
Deploy (code ใน production, flag OFF) → Internal test → 10% → 50% → 100%
```

- Feature flag ≠ user จะเห็นทันที
- ทุก major feature ต้องมี kill switch — emergency off โดยไม่ต้อง rollback code
- Flag TTL: หลัง 100% rollout → ลบ flag ภายใน 2 สัปดาห์ (ไม่งั้น flag debt สะสม)

*สำหรับ project นี้ตอนนี้: ยังไม่จำเป็น เพราะยังไม่มี concurrent users จำนวนมาก*

---

## 8. Current Roadmap (Now / Next / Later)

### NOW
- [ ] Tier 3: pgvector semantic memory (appetite: M)

### NEXT
- [ ] Memory deduplication on write
- [ ] Production login fix (Supabase redirect URL)
- [ ] CRON_SECRET + ADMIN_SECRET setup บน Vercel

### LATER
- ดูเพิ่มเติมใน `IDEAS.md` และ `CLAUDE.md` → Roadmap section

---

## 9. ADR Index

| # | Decision | Status | Date |
|---|----------|--------|------|
| [001](docs/adr/ADR-001-supabase.md) | ใช้ Supabase PostgreSQL | Accepted | — |
| [002](docs/adr/ADR-002-haiku-extraction.md) | Memory extraction ใช้ Haiku | Accepted | — |
| [003](docs/adr/ADR-003-db-rate-limit.md) | Rate limit → DB-backed | Accepted | 2026-03-10 |
| [004](docs/adr/ADR-004-tendata-architecture.md) | Tendata backend-only via UserTradeData | Accepted | 2026-03-10 |
| [005](docs/adr/ADR-005-pgvector-semantic-memory.md) | pgvector semantic memory search | Accepted | 2026-03-10 |

---

## References

- [Shape Up — Ryan Singer (Basecamp)](https://basecamp.com/shapeup) — free book
- [ADR GitHub — Michael Nygard](https://github.com/joelparkerhenderson/architecture-decision-record)
- [Now/Next/Later — Intercom](https://www.intercom.com/blog/the-time-saving-truth-behind-roadmaps/)
- [Working Backwards — Amazon](https://www.amazon.com/Working-Backwards-Insights-Stories-Secrets/dp/1250267595)
- [Tech Debt — Martin Fowler](https://martinfowler.com/bliki/TechnicalDebt.html)
