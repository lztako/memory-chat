# ADR-007: UserDoc — Single Table for Skill Sub-docs, Agent Sub-docs, and Resources

**Date:** 2026-03-12
**Status:** Accepted

## Context

Feature 3 (Document Layer) ต้องการเก็บ documents 3 ประเภท:
1. **Skill sub-docs** — reference.md, examples/ ต่อ skill (ตอนนี้ไม่มีเลย)
2. **Agent sub-docs** — persistent memory ต่อ agent
3. **Resources** — company context ต่อ user (overview, workflows, products)

ทั้ง 3 ประเภทมี pattern เหมือนกัน: ผูกกับ user, inject แค่ index (~50 tok), fetch เนื้อหาจริง on-demand ผ่าน tool — เหมือน MCP Resources pattern

ต้องตัดสินใจว่าจะออกแบบ schema อย่างไร ก่อน implement เพราะ schema เปลี่ยนยากภายหลัง

## Decision

ใช้ **table เดียว `UserDoc`** ครอบทั้ง 3 ประเภท โดยแยกด้วย `parentType` + `docType` fields:

```
UserDoc (
  id, userId,
  parentId,    -- FK → UserSkill.id หรือ UserAgent.id หรือ null (resource)
  parentType,  -- "skill" | "agent" | "resource"
  docType,     -- "reference" | "example" | "workflow" | "overview" | "contact" | "product"
  title,
  content,     -- full markdown text
  embedding,   -- vector(512) สำหรับ semantic search
  createdAt, updatedAt
)
```

## Alternatives Considered

**Option A: 3 tables แยก (UserSkillDoc + UserAgentDoc + UserResource)**
- ✅ type-safe, query ชัดเจนต่อประเภท
- ❌ repo code ซ้ำ 3 ชุด (create/read/delete เหมือนกันหมด)
- ❌ ถ้าเพิ่มประเภทใหม่ในอนาคต → สร้าง table ใหม่ทุกครั้ง
- ❌ migration 3 ครั้งแทนที่จะเป็น 1 ครั้ง
- → reject เพราะ pattern เดียวกัน, DRY principle

**Option B: JSONB ใน UserSkill + UserAgent tables ที่มีอยู่แล้ว**
- ✅ ไม่ต้อง table ใหม่
- ❌ embedding vector ใน JSONB ทำ index ไม่ได้
- ❌ query on-demand ทำได้ยาก, ไม่มี row-level control
- ❌ content ขนาดใหญ่ทำให้ parent table โต
- → reject เพราะ semantic search ต้องการ vector column ที่ index ได้

**Option C: Single UserDoc table (chosen)**
- ✅ repo เดียว, migration เดียว
- ✅ รองรับ parentType ใหม่ในอนาคตโดยไม่ต้อง schema change
- ✅ embedding + HNSW index ทำได้เหมือน Memory table (pattern เดิม)
- ✅ `read_resource` tool ใช้ได้กับทั้ง 3 ประเภทด้วย API เดียว
- ⚠️ query ต้อง filter parentType เสมอ (เล็กน้อย, แก้ด้วย repo helper)

## Consequences

**ได้:**
- 1 table, 1 repo (`userDoc.repo.ts`), 1 migration
- `read_resource` tool ทำงานได้กับทุก docType
- Semantic search ข้าม doc types ได้ในอนาคต
- Pattern ตรงกับ Memory table ที่มีอยู่แล้ว (reuse embedding logic)

**เสีย:**
- ต้องระวัง query ที่ลืม filter parentType → ดึงข้าม skill/agent/resource โดยไม่ตั้งใจ
- Type safety ต้องทำ manually ใน repo layer (TypeScript types)

**Trade-off ที่ยอมรับ:**
- Polymorphic table แลกกับ simplicity — acceptable เพราะ pattern เหมือนกันทุกประเภท และ repo layer จัดการ filter ให้

**Files ที่จะสร้าง/แก้:**
- `prisma/schema.prisma` — เพิ่ม `UserDoc` model
- `lib/repositories/userDoc.repo.ts` — CRUD + getByParent + semantic search
- `lib/tools/definitions.ts` — เพิ่ม `read_resource` tool
- `lib/tools/handlers.ts` — เพิ่ม handler สำหรับ `read_resource`
- `lib/memory/inject.ts` — เพิ่ม resources index section
