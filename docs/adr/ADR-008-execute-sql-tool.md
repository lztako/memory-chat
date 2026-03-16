# ADR-008: execute_sql Tool — SQL Execution Against User Data

**Date:** 2026-03-14
**Status:** Accepted

## Context

### ปัญหาที่พบ

ปัจจุบัน AI ใช้ `query_user_file` tool เพื่อดึงข้อมูลจาก `UserFile.data` (JSONB) โดยรับ `filters` array และ `columns` array แล้ว return rows ที่ตรงเงื่อนไข

เมื่อ user ถามคำถามที่ต้องการ **aggregation** เช่น:
- "ยอดค้างส่งทั้งหมดเท่าไหร่" (SUM)
- "แต่ละลูกค้าสั่งกี่ตัน" (GROUP BY + SUM)
- "สัญญา Pending มีกี่รายการ" (COUNT + WHERE)

AI ต้องทำงานหลายขั้น:
1. `query_user_file` กรอง status = Pending → ได้ rows ทั้งหมด
2. ถ้า rows มากเกิน → query ซ้ำแบ่ง batch
3. นำ rows มาคำนวณเองใน context → ช้า + เสี่ยงผิด

ผลคือ **ตอบช้า 10–30 วินาที** และ **ตัวเลขไม่แน่นอน** โดยเฉพาะข้อมูลที่มีหลายร้อย rows

### ขอบเขตของปัญหา

ปัญหานี้ไม่ได้เกิดเฉพาะ user ใด user หนึ่ง — **ทุก user ที่มี data files** และถามคำถาม aggregate จะเจอปัญหาเดียวกัน เพราะ `query_user_file` ออกแบบมาสำหรับ "lookup rows" ไม่ใช่ "compute answers"

### ข้อได้เปรียบที่ขาด

Claude Cowork และ ChatGPT Advanced Data Analysis สามารถ **รัน code** กับข้อมูลได้โดยตรง ทำให้ตอบคำถาม aggregate ได้แม่นยำและเร็วใน 1 shot ซึ่งเป็น competitive advantage ที่ชัดเจน

### ข้อจำกัดที่ต้องคำนึงถึง

- ข้อมูล user อยู่ใน **PostgreSQL JSONB** (`UserFile.data`) อยู่แล้ว
- PostgreSQL มี JSON operators ที่ query JSONB ได้ครบ (`->`, `->>`, `jsonb_array_elements`)
- Security: ต้อง enforce ว่า AI เข้าได้เฉพาะข้อมูลของตัวเอง (userId isolation)
- Production DB มี Supabase connection อยู่แล้ว

---

## Decision

**เพิ่ม `execute_sql` tool** ที่ให้ AI เขียน SQL query ตรงๆ กับ PostgreSQL ที่มีอยู่แล้ว

AI จะได้รับ schema ของ `UserFile` และ column names ของไฟล์ user ผ่าน system prompt แล้วเขียน SQL ที่ query JSONB ได้โดยตรง เช่น:

```sql
SELECT
  elem->>'customer' AS customer,
  SUM((elem->>'bal')::numeric) AS total_pending
FROM "UserFile",
  jsonb_array_elements(data) AS elem
WHERE "userId" = $1
  AND "fileType" = 'shipment'
  AND (elem->>'bal')::numeric > 0
GROUP BY elem->>'customer'
ORDER BY total_pending DESC
```

Server validate → execute → return JSON results → AI format และตอบ user

---

## Alternatives Considered

### Option A: ปรับปรุง `query_user_file` + เพิ่ม user_config rules

AI ยังใช้ query เดิม แต่เพิ่ม config บอก AI ว่าต้อง filter ยังไง เช่น "ยอดค้างส่ง = sum(bal) กรอง bal > 0"

- ✅ ไม่ต้องสร้าง infrastructure ใหม่
- ✅ แก้ได้บางส่วนสำหรับ use case ที่รู้จักล่วงหน้า
- ❌ แก้ได้แค่ปัญหาที่ config ครอบคลุม — คำถามใหม่ที่ไม่มีใน config ยังช้าเหมือนเดิม
- ❌ ไม่ scalable — ต้องเพิ่ม config ทุกครั้งที่มี use case ใหม่
- ❌ ยังต้อง pull rows มาคำนวณใน context แทนที่จะ push computation ลง DB
- **Rejected:** แก้ปัญหาได้แค่บางส่วน ไม่ใช่ root cause

---

### Option B: Python Sandbox (Server-side Docker/VM)

สร้าง sandboxed environment รัน Python code ที่ AI เขียน โดยมี pandas/numpy พร้อมใช้

- ✅ ยืดหยุ่นสูงสุด — AI เขียน code ได้ทุกอย่าง
- ✅ ตรงกับ Cowork model มากที่สุด
- ✅ รองรับ visualization (matplotlib, plotly)
- ❌ Infrastructure ซับซ้อน — ต้องมี container orchestration
- ❌ Cold start latency สูง (3–10 วินาที)
- ❌ Security surface กว้าง — ต้องจัดการ network isolation, resource limits
- ❌ Cost สูง — compute ต่อ request
- ❌ Vercel serverless ไม่รองรับ long-running processes โดยตรง
- **Rejected:** Over-engineered สำหรับ use case ปัจจุบัน (data aggregation) — เหมาะกว่าเมื่อต้องการ visualization หรือ ML

---

### Option C: Pyodide (Python in Browser via WebAssembly)

รัน Python ใน browser โดยไม่ต้องมี server

- ✅ ไม่มี server cost
- ✅ Data ไม่ต้องออกจาก browser
- ❌ Initial load ~10MB — UX แย่มาก
- ❌ ต้อง serialize/deserialize ข้อมูลจาก DB ส่งมา browser ก่อน
- ❌ Memory limit ใน browser tab
- ❌ ไม่ทำงานกับ server-side tools อื่น (Tendata, memory)
- **Rejected:** UX cost สูงเกินไป ไม่เหมาะกับ architecture ที่ data อยู่ใน server

---

### Option D (Chosen): `execute_sql` Tool — Direct SQL to PostgreSQL

- ✅ ใช้ infrastructure ที่มีอยู่แล้ว (Supabase PostgreSQL) — ไม่มี infra ใหม่
- ✅ PostgreSQL เก่งมากในเรื่อง aggregation — SUM, GROUP BY, HAVING, window functions
- ✅ JSONB operators ใน Postgres ครอบคลุมการ query nested data ได้ครบ
- ✅ Latency ต่ำ — query เดียวได้คำตอบ
- ✅ AI (Claude) เขียน SQL ได้ดีมาก — trained on SQL extensively
- ✅ Row-level security ผ่าน `WHERE "userId" = $1` บังคับโดย server
- ⚠️ AI อาจเขียน SQL ผิด schema — แก้ด้วยการ inject column info ใน system prompt
- ⚠️ SQL injection risk — แก้ด้วย parameterized queries + whitelist SELECT only
- ⚠️ Performance: query ที่ซับซ้อนอาจช้า — แก้ด้วย row limit + timeout

---

## Implementation Design

### Tool Definition

```typescript
// lib/tools/definitions.ts
{
  name: "execute_sql",
  description: "Execute a read-only SQL query against the user's data files stored in the database. Use for aggregations (SUM, COUNT, GROUP BY), complex filters, or any question that requires computing across multiple rows. Always filter by userId using the $1 parameter.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "A read-only SQL SELECT query. Must include WHERE userId = $1. Use jsonb_array_elements(data) to access file rows. Reference UserFile columns: id, fileType, fileName, description."
      },
      fileType: {
        type: "string",
        description: "The fileType to query (e.g. 'shipment', 'invoice') — used for logging and validation"
      }
    },
    required: ["query", "fileType"]
  }
}
```

### SQL Executor (Security Layer)

```typescript
// lib/db/sql-executor.ts

const FORBIDDEN_PATTERNS = [
  /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE)\b/i,
  /--/,          // SQL comment injection
  /;.*\S/,       // multiple statements
  /\bpg_/i,      // system tables
  /\binformation_schema\b/i,
]

const MAX_ROWS = 500
const TIMEOUT_MS = 10_000

export async function executeSql(
  query: string,
  userId: string
): Promise<{ rows: any[]; rowCount: number; truncated: boolean }> {
  // 1. Validate: SELECT only
  if (!query.trim().toUpperCase().startsWith('SELECT')) {
    throw new Error('Only SELECT queries are allowed')
  }

  // 2. Validate: no forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(query)) {
      throw new Error('Query contains forbidden patterns')
    }
  }

  // 3. Validate: must reference userId parameter
  if (!query.includes('$1')) {
    throw new Error('Query must filter by userId ($1)')
  }

  // 4. Execute with timeout + row limit
  const limitedQuery = `
    WITH __result AS (${query})
    SELECT * FROM __result LIMIT ${MAX_ROWS + 1}
  `

  const result = await prisma.$queryRawUnsafe(limitedQuery, userId)
  // ... timeout wrapper, error handling
}
```

### System Prompt Injection

เพิ่มใน `lib/memory/inject.ts` — inject schema ของ UserFile ที่ user มี:

```
## SQL Query Guide
เมื่อต้องการ aggregate data ให้ใช้ execute_sql แทน query_user_file

Schema:
  UserFile: id, userId, fileType, fileName, data (JSONB array of objects)

User's files:
  - fileType: "shipment" | columns: team, year, customer, qty_contracted, bal, status, ...
  - fileType: "invoice"  | columns: ...

Pattern สำหรับ query JSONB:
  SELECT elem->>'column_name', SUM((elem->>'numeric_col')::numeric)
  FROM "UserFile", jsonb_array_elements(data) AS elem
  WHERE "userId" = $1 AND "fileType" = 'shipment'
  GROUP BY elem->>'column_name'
```

### Files ที่ต้องแตะ

| File | การเปลี่ยนแปลง |
|------|---------------|
| `lib/tools/definitions.ts` | เพิ่ม `execute_sql` tool definition |
| `lib/tools/handlers.ts` | เพิ่ม case `execute_sql` → เรียก `executeSql()` |
| `lib/db/sql-executor.ts` | **ไฟล์ใหม่** — validation + execution layer |
| `lib/memory/inject.ts` | เพิ่ม `buildSqlSchemaSection()` inject column info |

---

## Consequences

**ได้:**
- AI ตอบคำถาม aggregate ได้ใน 1 tool call แทนที่จะเป็น 3–5 calls
- ตัวเลขแม่นยำ 100% — คำนวณโดย DB ไม่ใช่ AI
- ใช้งานได้กับทุก user ทุก schema โดยอัตโนมัติ
- ไม่มี infra ใหม่ — ใช้ Supabase ที่มีอยู่

**เสีย:**
- AI อาจเขียน SQL ผิดใน edge cases — ต้อง handle error gracefully
- ต้อง maintain SQL schema injection ใน system prompt เมื่อ column structure เปลี่ยน
- Query ที่ซับซ้อนมากอาจช้ากว่า simple filter (ต้อง scan JSONB array ทั้งหมด)

**Trade-off ที่ยอมรับ:**
- Security risk ของ SQL injection ถูก mitigate ด้วย validation layer อย่างเข้มงวด (SELECT only + $1 required + forbidden patterns) ยอมรับ residual risk เพราะ read-only และ userId-scoped
- ยอมรับ AI เขียน SQL ผิดบางครั้ง — error message จาก DB จะช่วย AI retry ได้เอง

**ไม่เปลี่ยน:**
- `query_user_file` ยังคงอยู่สำหรับ "lookup" use case (ดึง rows เฉพาะ, ไม่ aggregate)
- สองเครื่องมือทำงานร่วมกัน — AI เลือกใช้ตามลักษณะคำถาม
