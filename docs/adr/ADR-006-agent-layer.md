# ADR-006: Agent Layer — Per-User Sub-Agents (Claude Code Architecture in Web)

**Date:** 2026-03-11
**Status:** Accepted (design phase — not yet implemented)

---

## Context

ปัจจุบัน memory-chat มีการแปลง Claude Code concepts มาแล้ว 3/4:

| Claude Code | memory-chat | Status |
|-------------|-------------|--------|
| `CLAUDE.md` | AI Config (`type:"user_config"`) | ✅ Done |
| `MEMORY.md` | Memory table (long_term + daily_log) | ✅ Done |
| `~/.claude/skills/` | UserSkill table | ✅ Done |
| `~/.claude/agents/` | UserAgent table | ❌ Missing |

ปัญหาที่เห็น:
- System prompt ยาวขึ้นเรื่อยๆ เมื่อมี memory + skills + config + tools ทั้งหมดใน single call
- Task บางอย่าง (Tendata search, CSV processing) ไม่จำเป็นต้องใช้ Sonnet — Haiku เพียงพอ
- ไม่มีทางให้ Origo กำหนด "capability boundary" ต่อ user ได้ (user A เข้าถึง tool ไหนได้บ้าง)
- เมื่อ user base โตขึ้น อยากให้ Origo สร้าง specialized agents ครั้งเดียว แล้ว assign ให้ user ได้

Forcing function: Phase 3 roadmap + conversation กับ user เรื่อง "ต่อยอดจาก Claude Code concept"

---

## Decision

สร้าง **Agent Layer** ที่ประกอบด้วย:

### 1. UserAgent table (schema)

```prisma
model UserAgent {
  id           String   @id @default(cuid())
  userId       String?  // null = global agent (ทุก user ใช้ได้)
  name         String
  description  String
  systemPrompt String   @db.Text
  tools        String[] // tool names จาก definitions.ts
  model        String   @default("claude-haiku-4-5-20251001")
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User? @relation(fields: [userId], references: [id])
}
```

### 2. use_agent tool

เพิ่ม tool ใหม่ใน `definitions.ts`:

```typescript
{
  name: "use_agent",
  description: "เรียก sub-agent ที่มี systemPrompt + tools เฉพาะทาง",
  input_schema: {
    type: "object",
    properties: {
      agentName: { type: "string", description: "ชื่อ agent" },
      task:      { type: "string", description: "งานที่ต้องการให้ agent ทำ" },
      context:   { type: "string", description: "ข้อมูล context เพิ่มเติม (optional)" }
    },
    required: ["agentName", "task"]
  }
}
```

### 3. Handler logic

```
use_agent handler:
1. ดึง UserAgent โดย name + (userId หรือ isGlobal)
2. สร้าง Anthropic client call แยก:
   - model: agent.model
   - system: agent.systemPrompt
   - tools: กรองเฉพาะ agent.tools จาก definitions
   - messages: [{ role: "user", content: task + context }]
3. รัน tool loop เหมือน chat/route.ts แต่ isolated
4. return { result: string, toolsUsed: string[] }
```

### 4. Global agents (Origo สร้างล่วงหน้า)

| Agent name | Model | Tools | หน้าที่ |
|------------|-------|-------|---------|
| `Trade Data Analyst` | Haiku | list_trade_companies, rank_trade_companies, query_trade_data | วิเคราะห์ Tendata |
| `File Processor` | Haiku | query_user_files, list_user_files | อ่าน/สรุป CSV |
| `Task Manager` | Haiku | create_task, update_task, list_tasks | จัดการ tasks |

### 5. Admin UI — Agents tab

เพิ่ม tab "Agents" ใน `/admin/[id]` (และ `/admin/agents` สำหรับ global agents):
- List agents ที่ user นี้มี + global agents
- สร้าง/แก้ agent: name, description, systemPrompt textarea, tools checkboxes, model dropdown
- Toggle isActive

---

## Alternatives Considered

**Option A: ไม่ทำ sub-agents — ใส่ทุก tool ใน main call**
- ✅ Simple — ไม่มี overhead ใหม่
- ❌ System prompt ยาวขึ้นเรื่อยๆ (cost เพิ่ม, coherence ลด)
- ❌ ไม่สามารถ isolate tools ต่อ user ได้
- ❌ ทุก call ใช้ Sonnet แม้ task ง่าย → cost สูง
- **Reject**

**Option B: Worker queue / background jobs (Celery/Bull pattern)**
- ✅ Async — main conversation ไม่รอ
- ❌ Over-engineer สำหรับ user base ปัจจุบัน (< 10 users)
- ❌ ต้องการ Redis + worker process แยก
- ❌ UX ซับซ้อน (polling / SSE สำหรับ background result)
- **Reject — appetite ไม่พอ**

**Option C (chosen): Inline sub-agent call**
- ✅ Simple — ใช้ Anthropic client เดิม, แค่ call ใหม่แบบ isolated
- ✅ Synchronous — result กลับมาใน streaming response เดิม
- ✅ Model routing ได้ (Haiku สำหรับ sub-task)
- ⚠️ Latency เพิ่ม (sequential calls) — acceptable เพราะ user base เล็ก
- ⚠️ Rate limit Tendata ต้องระวัง (sub-agent ก็ burn points เหมือนกัน)

---

## Consequences

**ได้:**
- ต้นทุนลดลง (sub-tasks ใช้ Haiku ≈ 5x ถูกกว่า Sonnet)
- Origo ควบคุม capability ต่อ user ได้ชัดเจน
- Architecture ครบ 4/4 Claude Code concepts
- Admin UI มี visibility ครบ (Graph tab จะแสดง Agents ด้วย)

**เสีย:**
- Latency เพิ่มเมื่อ main agent เรียก sub-agent (2 round trips)
- Debug ยากขึ้น — ต้อง log sub-agent calls แยก
- Context isolation — sub-agent ไม่เห็น conversation history (by design)

**Trade-off ที่ยอมรับ:**
- Latency เพิ่ม acceptable เพราะ user base น้อย + Haiku เร็วกว่า Sonnet อยู่แล้ว
- Context isolation เป็น feature ไม่ใช่ bug — ป้องกัน token leak + focus sub-agent

---

## Implementation Plan (Appetite: M — 1 สัปดาห์)

```
Day 1: schema + migration (UserAgent table)
Day 2: use_agent tool (definitions + handler + isolated call loop)
Day 3: seed global agents (Trade Data Analyst, File Processor, Task Manager)
Day 4: Admin UI — Agents tab ใน /admin/[id] + /admin/agents (global)
Day 5: Update UserGraphView — เพิ่ม Agents spoke + test end-to-end
```

**No-gos (version นี้):**
- ไม่ทำ async/background agents
- ไม่ทำ agent-to-agent chaining (A เรียก B เรียก C)
- ไม่ทำ agent marketplace / user เลือก agent เอง
- ไม่ทำ agent versioning

---

## Files ที่ต้องแตะ

| File | การเปลี่ยนแปลง |
|------|----------------|
| `prisma/schema.prisma` | เพิ่ม UserAgent model |
| `lib/repositories/agent.repo.ts` | สร้างใหม่ — CRUD UserAgent |
| `lib/tools/definitions.ts` | เพิ่ม `use_agent` tool |
| `lib/tools/handlers.ts` | เพิ่ม case `use_agent` + isolated call loop |
| `app/api/admin/users/[id]/agents/route.ts` | GET/POST/DELETE per-user agents |
| `app/api/admin/agents/route.ts` | GET/POST/DELETE global agents |
| `app/admin/[id]/page.tsx` | เพิ่ม Agents tab |
| `app/admin/agents/page.tsx` | สร้างใหม่ — global agents management |
| `components/admin/UserGraphView.tsx` | เพิ่ม Agents spoke (5th category) |

---

## Ideas for Future Cycles (LATER)

- **Agent chaining**: main agent เรียก sub-agent ที่เรียก sub-agent อีกทีได้ (DAG)
- **Agent memory**: sub-agent บันทึก result ลง Memory table → ครั้งต่อไปไม่ต้อง call API ซ้ำ
- **Per-user agent customization**: user แก้ systemPrompt ของ agent ตัวเองได้ผ่าน Settings
- **Agent analytics**: admin เห็น agent ไหน invoke บ่อยสุด, cost เท่าไหร่
- **Streaming sub-agent**: SSE stream ผล sub-agent แบบ real-time แทนรอจนจบ
