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

### NOW (2026-03-12)

**Ops 1 — Brief analysis** ✅ (วิเคราะห์แล้ว 2026-03-12)
- [x] อ่านและสรุป brief จากหัวหน้า (`trr/raw/brief-2026-03-12.txt`)

**Ops 2 — TRR Account** ⏳ รอข้อมูลใหม่ช่วงเที่ยง (2026-03-12)
- [ ] สร้าง user account สำหรับ TRR Group (ไทยรุ่งเรือง)
- [ ] Clean data ไฟล์ใหม่ — known issues ที่ต้องเช็ค:
  - ชื่อลูกค้าไม่ consistent ข้ามชีต (สั้น vs เต็ม เช่น "Wilmar" vs "Wilmar Trading")
  - Invoice No. มีเว้นวรรคหรือ format ต่างกัน (เช่น "CW001/69" vs "CW 001/69")
  - รูปแบบวันที่ไม่ตรงกัน (dd/mm/yyyy vs yyyy-mm-dd vs พ.ศ.)
  - Header row อาจอยู่คนละ row ต่างชีต (เหมือนไฟล์เก่า)
- [ ] Upload ไฟล์ที่ clean แล้วเข้า account TRR

**Ops 3 — Clean Data .xlsx (TRR)** ✅ เสร็จแล้ว
- [x] Clean Container Truck + Conventional monitoring 2026
- [x] Merge → 162 rows, 9 columns (invoice, customer, contract, destination, crop_year, volume_mt, etd, loading_date, vessel_name)
- [x] มกราคม 2026 ส่งทั้งหมด 6,137 MT จาก 36 shipments

**Feature 1 — Global Info (Origo identity)** ✅ เสร็จแล้ว (2026-03-12)
- [x] `GlobalInfo` table — key/value rows, unique key, sortOrder
- [x] `lib/repositories/globalInfo.repo.ts` — list, upsert, update, delete
- [x] `GET/POST /api/admin/global-info` + `PATCH/DELETE /api/admin/global-info/[id]`
- [x] Inject ก่อน user memory ใน system prompt (`buildGlobalInfoSection()`)
- [x] AI identity เปลี่ยนเป็น "Origo AI" (ไม่ใช่ generic AI)
- [x] Admin UI `/admin/global` — list + inline edit + add + delete + seed defaults + preview
- [x] Admin topbar — Users / Global Info nav links

**Feature 2 — Admin File Browser** ✅ เสร็จแล้ว (2026-03-12)
- [x] `components/admin/FileBrowser.tsx` — tree view group by fileType, collapse/expand, Replace/Download/Delete
- [x] `DELETE /api/admin/users/[id]/files/[fileId]` — admin delete endpoint
- [x] `GET /api/admin/users/[id]/files/[fileId]/data` — download endpoint
- [x] แสดง size, updatedAt, createdAt, rowCount, cols ต่อไฟล์

**Feature 3 — Document Layer: UserDoc + GlobalDoc + Resources** ✅ Core done (2026-03-13)

Build order (เรียงตาม dependency):
- [x] `UserDoc` table — id, userId, parentId, parentType, docType, title, content, embedding
- [x] `read_resource` tool — definitions + handlers + repo
- [x] Resources index inject ใน `buildSystemPrompt` (~50 tokens)
- [x] `GlobalDoc` table + `read_global_doc` tool (Origo knowledge base ทุก user)
- [x] Skill sub-docs (reference.md, examples) ผ่าน UserDoc — TRR monitoring เป็น pilot
- [ ] Admin UI — upload/manage resource docs ต่อ user → **ดู Feature 4 (Admin Structure Tab)**
- [ ] Feedback loop — resource upload → AI generate workflow → `save_skill` อัตโนมัติ
- [ ] UserGraphView — เพิ่ม Resources spoke
- [ ] Agent sub-docs ผ่าน UserDoc

**Ops — TRR Monitoring Setup** ✅ เสร็จแล้ว (2026-03-14)
- [x] Clean data: `Update-Conventional monitoring @130326.xlsx` → 2 CSV files
  - `monitoring_contracts.csv` (217 rows, 1 row/contract)
  - `monitoring_shipments.csv` (252 rows, long format 1 row/month)
- [x] Fix `query_user_file` 3 bugs: aggregate without groupBy, count non-numeric, AND filter support
- [x] Upload ทั้ง 2 ไฟล์ + user_config `monitoring_file_rule` (Thai column aliases)
- [x] UserSkill `trr_monitoring` — proper SKILL.md ที่ reference 3 UserDocs
- [x] UserDocs: Schema / Query Patterns / Business Rules (parentType: resource)

### DONE (ล่าสุด)
- [x] Global Info — Origo identity inject ทุก account · GlobalInfo table · Admin UI /admin/global · seed defaults
- [x] Admin File Browser — tree view by fileType · Replace/Download/Delete · FileBrowser.tsx
- [x] Tier 3: pgvector semantic memory — Voyage AI voyage-3-lite, HNSW indexes, graceful fallback
- [x] Production login fix — Supabase redirect URL เพิ่มแล้ว
- [x] CRON_SECRET + ADMIN_SECRET — set บน Vercel แล้ว
- [x] Memory deduplication on write — cosine distance < 0.15 → update แทน create
- [x] Admin UI Phase 1 — backend: GET /api/admin/users, GET/POST /api/admin/users/[id]/{files,config}
- [x] Admin UI Phase 2 — frontend: /admin (users list + user detail **6 tabs**: Graph/Files/Memories/Skills/Tasks/Config + upload modal + file replace modal + widget config editor)
- [x] File Versioning — PUT /api/files/[id] + PUT /api/admin/users/[id]/files/[fileId] · replace in-place (keeps fileId) · UserFile.updatedAt added
- [x] Admin UI — User Graph View — pure SVG radial spoke · User→Files/Skills/Memory/Tasks · hover tooltip · zero dependencies
- [x] xlsx UC1 — parse .xlsx in chat (SheetJS, auto header detection, multi-sheet) · attach from empty state · badge inside input card
- [x] Agent Layer — UserAgent table · use_agent tool (isolated Haiku loop) · seed 3 global agents · Admin UI Agents tab · UserGraphView 5th spoke (purple) · ADR-006
- [x] Feature 4 — Admin Structure Tab (2026-03-14) — tree view Skills→Docs (lazy load) + side panel editor · skill CRUD routes + UserDoc PATCH + parentType/parentId filter · StructureTree.tsx · link-trr-docs-to-skill script · TRR monitoring docs linked under skill

**Feature 5 — SQL JSONB Query Engine** ⏳ in progress (2026-03-14)
- [ ] Replace JS in-memory query ใน `query_user_file` handler ด้วย PostgreSQL `jsonb_to_recordset` + `$queryRawUnsafe`
- [ ] ได้: filter OR/AND/NULL, GROUP BY multi-col, HAVING, window functions, JOIN cross-file
- [ ] Tech Debt Level 3 (FileRow migration) ยกเลิก — `jsonb_to_recordset` ให้ SQL power เท่ากันโดยไม่ต้องเปลี่ยน schema
- Appetite: M | No-go: window functions (ทำใน Phase 2), cross-file JOIN (Phase 2)

### NEXT
- **Agent Teams + Custom Sub-agents** — design พร้อมแล้ว (2026-03-12)
  - Full design: `~/.claude/projects/.../memory/project_agent_architecture.md`
  - Subagent gaps: maxTurns configurable, memory (UserDoc), skills[] preload, hooks
  - **Hooks**: `UserAgent.hooks` field + PreToolUse check ใน use_agent loop
    - http hook → POST /api/hooks/pre-tool-use (native Next.js pattern)
    - prompt hook → Haiku judge ok/false (เหมือน extract.ts)
    - events: PreToolUse, PostToolUse, UserPromptSubmit, Stop, SubagentStart/Stop
  - Agent Teams: shared task list + mailbox + use_agent_team (รอ design ชัดขึ้น)
  - Full build order (item 1-16): `~/.claude/projects/.../memory/project_agent_architecture.md`

### LATER
- ดูเพิ่มเติมใน `IDEAS.md` และ `CLAUDE.md` → Roadmap section
- **Tendata + Memory as MCP server** — expose เป็น MCP server เพื่อให้ Claude Code CLI / future products ใช้ได้ (ตอนนี้ไม่จำเป็น เพราะ app เราควบคุม Tendata เองอยู่แล้ว)
- **`.mcp.json` project scope** — commit MCP server configs (supabase, github, context7) ลง repo เพื่อให้ทุกคนใน team ได้ toolset เดียวกัน (S appetite, no-brainer เมื่อมี team)

**Tech Debt (จาก Global Info review — 2026-03-12)** ✅ Done 2026-03-12
- [x] `checkAuth` → extract `lib/admin/auth.ts` (12 admin routes)
- [x] `buildSystemPrompt` 11 positional args → `BuildSystemPromptOptions` object
- [x] `globalInfoRepo.list()` → in-memory cache 5 min + invalidate on write

**Tech Debt (จาก headless/programmatic usage review — 2026-03-12)**
- [ ] `session_id` — extract จาก API response → store ใน Conversation table (enable resumption)
- [ ] Parallel read-only tools ใน `handlers.ts` — tools ที่ไม่ depend กัน รันพร้อมกันได้
- [ ] `eager_input_streaming` บน Tendata tool definitions — ⚠️ verify SDK support ก่อน

**Tech Debt (จาก MCP + memory system review — 2026-03-12)**
- [ ] `buildSystemPrompt` ไม่มี token budget — prompt โตได้ไม่จำกัด (files + skills + memories รวมกัน); ref: MCP Tool Search auto-triggers เมื่อ tools > 10% context — เราควรทำแบบเดียวกัน (truncate/skip ถ้า budget เกิน)
- [ ] `extract.ts` เรียก Haiku 2 รอบต่อ conversation (analyze + layer validation) → รวมเป็น 1 prompt เดียวได้ ลด latency + cost
- [ ] Skill injection ใช้ keyword matching ล้วน → false negative สูง; semantic path มีแล้ว (`listByUserSemantic`) แต่ไม่ได้ใช้เป็น default ใน inject.ts
- [ ] `handlers.ts` + `definitions.ts` โตแบบ monolith → แตกเป็น domain files: `tendata.ts`, `memory.ts`, `tasks.ts`, `files.ts`

**Tech Debt — Context Window & Performance (จาก TRR onboarding test — 2026-03-13)**

Root cause: ระบบปัจจุบัน "โหลดข้อมูลทั้งหมดใส่ให้ AI อ่าน" แทนที่จะ "ให้ AI บอกว่าต้องการอะไร แล้วค่อยเอาไปให้" — ทำให้ช้าและ context เต็มเมื่อคุยยาว

Level 1 — Quick Fix (S appetite, แก้ก่อน):
- [ ] **Truncate tool results ใน conversation history** — ใน `chat/route.ts` ก่อน build messages ให้แทนที่ tool result ที่ใหญ่กว่า ~500 tokens ด้วย summary เช่น `[query_file: 262 rows analyzed — see prior response]` แก้ปัญหา crash เมื่อ context เต็ม
- [ ] **File data cache ใน handlers.ts** — Map<fileId, {data, expiry}> TTL 30 นาที ลด DB round-trip ทุกครั้งที่ถามใหม่

Level 2 — Smarter Tool (M appetite, ทำหลัง Level 1):
- [ ] **Smart `query_file` filters** — เพิ่ม optional params: `filter`, `columns`, `limit`, `groupBy`, `aggregate` เพื่อให้ tool return เฉพาะ rows ที่ต้องการแทนทั้งหมด ลด tool result size 80-90%
  - No-go: ไม่ทำ full SQL engine — แค่ simple filter + aggregate พอ

Level 3 — Architecture (L appetite, รอ user feedback จริงก่อน):
- [ ] **Pre-computed aggregates ตอน upload** — เมื่อ upload ไฟล์ คำนวณ summary (count by group, sum ต่อ column) เก็บใน `UserFile.summary` JSONB — KPI queries ไม่ต้องโหลดไฟล์เลย
- [ ] **Conversation summarization** — หลังทุก 6 messages ให้ Haiku สรุป conversation เก็บใน `Conversation.summary` แทนส่ง full history — คุยได้ไม่จำกัดโดยไม่ overflow
- [ ] **FileRow table migration** — แยก `UserFile.data` JSONB ออกเป็น `FileRow` table (fileId, rowIndex, data JSONB) → enable SQL filter/aggregate โดยตรง แก้ root cause จริง (Type 1 decision → เขียน ADR ก่อน implement)

---

## 9. ADR Index

| # | Decision | Status | Date |
|---|----------|--------|------|
| [001](docs/adr/ADR-001-supabase.md) | ใช้ Supabase PostgreSQL | Accepted | — |
| [002](docs/adr/ADR-002-haiku-extraction.md) | Memory extraction ใช้ Haiku | Accepted | — |
| [003](docs/adr/ADR-003-db-rate-limit.md) | Rate limit → DB-backed | Accepted | 2026-03-10 |
| [004](docs/adr/ADR-004-tendata-architecture.md) | Tendata backend-only via UserTradeData | Accepted | 2026-03-10 |
| [005](docs/adr/ADR-005-pgvector-semantic-memory.md) | pgvector semantic memory search | Accepted | 2026-03-10 |
| [006](docs/adr/ADR-006-agent-layer.md) | Agent Layer — per-user sub-agents (Claude Code in web) | Accepted | 2026-03-11 |
| [007](docs/adr/ADR-007-userdoc-single-table.md) | UserDoc single table สำหรับ skill/agent sub-docs + resources | Accepted | 2026-03-12 |

---

## References

- [Shape Up — Ryan Singer (Basecamp)](https://basecamp.com/shapeup) — free book
- [ADR GitHub — Michael Nygard](https://github.com/joelparkerhenderson/architecture-decision-record)
- [Now/Next/Later — Intercom](https://www.intercom.com/blog/the-time-saving-truth-behind-roadmaps/)
- [Working Backwards — Amazon](https://www.amazon.com/Working-Backwards-Insights-Stories-Secrets/dp/1250267595)
- [Tech Debt — Martin Fowler](https://martinfowler.com/bliki/TechnicalDebt.html)
