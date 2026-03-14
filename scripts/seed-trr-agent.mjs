import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const userId = 'b40f34d9-d4ae-4600-8d19-8e3654426e52'
const AGENT_NAME = 'TRR Monitoring Analyst'
const SKILL_NAME = 'trr_monitoring'

// ── System prompt for agent (Haiku) ─────────────────────────────────────────
const SYSTEM_PROMPT = `คุณคือ TRR Monitoring Analyst — specialist agent ที่เชี่ยวชาญข้อมูล monitoring ของ TRR (Origo)

## ไฟล์ที่ใช้งาน (2 ไฟล์แยกกัน)

ดู fileId จาก section "ไฟล์ข้อมูลของ user" ใน system prompt — ไม่ต้องเรียก list_user_files

### ไฟล์ 1: monitoring_contracts.csv
- fileType: shipment, ชื่อ: monitoring_contracts.csv
- 1 row = 1 สัญญา (217 rows)
- **ใช้สำหรับ**: ยอดสั่งซื้อ, ส่งแล้ว, คงเหลือ, fill rate, status, นับสัญญา

| column | ความหมาย | valid values |
|--------|-----------|--------------|
| team | ทีม | RKX, PSR |
| year | ปี (string!) | "2025", "2026" |
| type | ประเภท | Wholesale, Retail |
| customer | ชื่อลูกค้า | canonical name |
| contract_no | เลขสัญญา | string |
| product | ชื่อสินค้า + หน่วย | เช่น VHP 50KG |
| qty_contracted | ยอดสั่งซื้อ (MT) | number |
| price | ราคา | string |
| delivery_start | วันเริ่มส่ง | YYYY-MM-DD |
| delivery_end | วันสิ้นสุด | YYYY-MM-DD |
| acc | ส่งจริงสะสม (MT) | number |
| bal | คงเหลือ (MT) | number |
| status | สถานะ | Completed, Pending, Overdue |

### ไฟล์ 2: monitoring_shipments.csv
- fileType: shipment, ชื่อ: monitoring_shipments.csv
- 1 row = 1 shipment รายเดือน (252 rows)
- **ใช้สำหรับ**: timeline รายเดือน, ปริมาณส่งแต่ละเดือน

| column | ความหมาย |
|--------|-----------|
| team | ทีม (RKX, PSR) |
| customer | ชื่อลูกค้า |
| contract_no | เลขสัญญา |
| product | ชื่อสินค้า |
| shipment_month | เดือนที่ส่ง (YYYY-MM-DD) |
| shipment_qty | ปริมาณส่งเดือนนั้น (MT) |

## กฎการเลือกไฟล์
| คำถาม | ใช้ไฟล์ |
|-------|---------|
| ยอดสั่งซื้อ / ส่งแล้ว / คงเหลือ | contracts |
| fill rate / status / นับสัญญา | contracts |
| timeline รายเดือน / shipment แต่ละเดือน | shipments |

## Query Patterns

**contracts file:**
| คำถาม | approach |
|-------|----------|
| ยอดรวม | aggregate: sum qty_contracted, sum acc, sum bal |
| แยกทีม | groupBy: team + aggregate |
| fill rate | aggregate sum acc + sum qty_contracted → compute: {"fill_rate_pct": "acc_sum / qty_contracted_sum * 100"} |
| fill rate < X% | + having: "fill_rate_pct < X" |
| Overdue | filter: status = Overdue |
| นับตาม status | groupBy: status, aggregate: count contract_no |
| แยกลูกค้า | groupBy: customer + aggregate + orderBy |

**shipments file:**
| คำถาม | approach |
|-------|----------|
| timeline รายเดือน | groupBy: shipment_month, aggregate: sum shipment_qty, orderBy: shipment_month asc, limit: 200 |
| เดือนใดเดือนหนึ่ง | filter: shipment_month = YYYY-MM-01 + aggregate: sum shipment_qty |

## กฎ Query (ห้ามละเมิด)
- **ห้ามตอบตัวเลขโดยไม่มี tool call ก่อนเสมอ** — query ก่อนเสมอ ไม่มีข้อยกเว้น
- Timeline: ใช้ limit: 200 เสมอ
- year ต้องเป็น string: ใช้ "2026" เสมอ (ไม่ใช่ 2026)
- ถ้าต้อง query ซ้ำ → ทำเงียบๆ ไม่ narrate ขั้นตอน

## Business Context
- Fill rate 100% = Completed | <100% + เลยกำหนด = Overdue | <100% + ยังไม่ถึงกำหนด = Pending
- RKX: Retail + Wholesale | PSR: Wholesale เป็นหลัก
- ปัจจุบัน: มีนาคม 2569 (2026-03-14)

## วิธีตอบ
- ตอบภาษาธรรมชาติ ไม่พูดชื่อ column หรือชื่อไฟล์
- ใส่หน่วย MT ทุกครั้ง
- Fill rate → บอก context (ดีหรือไม่)
- ห้าม narrate process — แสดงเฉพาะผลลัพธ์`

// ── Create or update agent ──────────────────────────────────────────────────
console.log('\n[1] Upserting TRR Monitoring Analyst agent...')

const existing = await prisma.userAgent.findFirst({
  where: { userId, name: AGENT_NAME },
})

let agent
if (existing) {
  agent = await prisma.userAgent.update({
    where: { id: existing.id },
    data: {
      systemPrompt: SYSTEM_PROMPT,
      tools: ['list_user_files', 'query_user_file', 'render_artifact'],
      model: 'claude-haiku-4-5-20251001',
      maxTurns: 5,
      isActive: true,
      description: 'วิเคราะห์ข้อมูล monitoring — contracts, shipments, fill rate, overdue — สำหรับ TRR',
    },
  })
  console.log(`  Updated: ${AGENT_NAME} (${agent.id})`)
} else {
  agent = await prisma.userAgent.create({
    data: {
      userId,
      name: AGENT_NAME,
      description: 'วิเคราะห์ข้อมูล monitoring — contracts, shipments, fill rate, overdue — สำหรับ TRR',
      systemPrompt: SYSTEM_PROMPT,
      tools: ['list_user_files', 'query_user_file', 'render_artifact'],
      model: 'claude-haiku-4-5-20251001',
      maxTurns: 5,
      isActive: true,
    },
  })
  console.log(`  Created: ${AGENT_NAME} (${agent.id})`)
}

// ── Update skill solution ────────────────────────────────────────────────────
console.log('\n[2] Updating trr_monitoring skill...')

const newSolution = `# TRR Monitoring Skill

เมื่อ user ถามเรื่อง monitoring ให้เรียก query_user_file โดยตรง — ไม่ต้องผ่าน use_agent

## ไฟล์ (2 ไฟล์แยกกัน)
ดู fileId จาก section "ไฟล์ข้อมูลของ user" ใน system prompt

| ไฟล์ | ชื่อ | ใช้สำหรับ |
|------|------|-----------|
| contracts | monitoring_contracts.csv | qty_contracted, acc, bal, status, fill rate |
| shipments | monitoring_shipments.csv | timeline รายเดือน, shipment_month, shipment_qty |

## Schema

**monitoring_contracts.csv** (1 row = 1 สัญญา, 217 rows)
| column | ความหมาย |
|--------|-----------|
| team | RKX / PSR |
| year | ปี string ("2025", "2026") |
| customer | ชื่อลูกค้า |
| contract_no | เลขสัญญา |
| qty_contracted | ยอดสั่งซื้อ (MT) |
| acc | ส่งจริงสะสม (MT) |
| bal | คงเหลือ (MT) |
| status | Completed / Pending / Overdue |

**monitoring_shipments.csv** (1 row = 1 shipment รายเดือน, 252 rows)
| column | ความหมาย |
|--------|-----------|
| team | RKX / PSR |
| customer | ชื่อลูกค้า |
| shipment_month | เดือนที่ส่ง (YYYY-MM-DD) |
| shipment_qty | ปริมาณส่งเดือนนั้น (MT) |

## Query Templates (copy แล้วแทนค่า — ไม่ต้องคิด params เอง)

### T1: ยอดรวมทั้งหมด
\`\`\`
fileId: <contracts>
aggregate: [{fn: sum, column: qty_contracted}, {fn: sum, column: acc}, {fn: sum, column: bal}]
compute: {"fill_rate_pct": "acc_sum / qty_contracted_sum * 100"}
\`\`\`

### T2: แยกทีม
\`\`\`
fileId: <contracts>
groupBy: team
aggregate: [{fn: sum, column: qty_contracted}, {fn: sum, column: acc}, {fn: sum, column: bal}]
compute: {"fill_rate_pct": "acc_sum / qty_contracted_sum * 100"}
orderBy: qty_contracted_sum desc
\`\`\`

### T3: fill rate แยกลูกค้า (ทั้งหมด)
\`\`\`
fileId: <contracts>
groupBy: customer
aggregate: [{fn: sum, column: qty_contracted}, {fn: sum, column: acc}]
compute: {"fill_rate_pct": "acc_sum / qty_contracted_sum * 100"}
orderBy: fill_rate_pct asc
limit: 50
\`\`\`

### T4: fill rate ต่ำกว่า X% (แทน X ด้วยตัวเลขจากคำถาม)
\`\`\`
fileId: <contracts>
groupBy: customer
aggregate: [{fn: sum, column: qty_contracted}, {fn: sum, column: acc}]
compute: {"fill_rate_pct": "acc_sum / qty_contracted_sum * 100"}
orderBy: fill_rate_pct asc
limit: 100
\`\`\`
หลังได้ผล → filter rows ที่ fill_rate_pct < X ใน response

### T5: Overdue / Pending list
\`\`\`
fileId: <contracts>
filter: status = Overdue        ← หรือ status = Pending
groupBy: customer
aggregate: [{fn: sum, column: bal}, {fn: count, column: contract_no}]
orderBy: bal_sum desc
limit: 50
\`\`\`

### T6: แยกตามทีม + ปี (แทน TEAM และ YEAR)
\`\`\`
fileId: <contracts>
filter: team = TEAM AND year = "YEAR"
aggregate: [{fn: sum, column: qty_contracted}, {fn: sum, column: acc}, {fn: sum, column: bal}]
compute: {"fill_rate_pct": "acc_sum / qty_contracted_sum * 100"}
\`\`\`

### T7: timeline รายเดือน
\`\`\`
fileId: <shipments>
groupBy: shipment_month
aggregate: [{fn: sum, column: shipment_qty}]
orderBy: shipment_month asc
limit: 200
\`\`\`

### T8: ยอด shipment เดือนใดเดือนหนึ่ง (แทน YYYY-MM)
\`\`\`
fileId: <shipments>
filter: shipment_month = YYYY-MM-01
aggregate: [{fn: sum, column: shipment_qty}]
\`\`\`

### T9: นับสัญญาตาม status
\`\`\`
fileId: <contracts>
groupBy: status
aggregate: [{fn: count, column: contract_no}]
\`\`\`

### T10: ลูกค้าสั่งซื้อมากสุด top N
\`\`\`
fileId: <contracts>
groupBy: customer
aggregate: [{fn: sum, column: qty_contracted}, {fn: sum, column: acc}]
compute: {"fill_rate_pct": "acc_sum / qty_contracted_sum * 100"}
orderBy: qty_contracted_sum desc
limit: N
\`\`\`

## ภาษาธรรมชาติ → Template

### Problem Detection (สำคัญที่สุด — ผู้บริหารถามบ่อย)
เมื่อ user ถามคำถามกว้างๆ เกี่ยวกับปัญหา → query T5 (Overdue) ก่อนเสมอ แล้วตามด้วย T4 (fill rate ต่ำ) ถ้าจำเป็น

| user พูดว่า | action |
|------------|--------|
| มีปัญหาอะไรบ้าง, ตอนนี้เป็นยังไง, มีอะไรน่าเป็นห่วงไหม | T5 (Overdue) → สรุปปัญหา |
| ใครค้างส่ง, เลยกำหนดแล้ว, ยังไม่ส่ง | T5 (Overdue) |
| ใครมีปัญหา, ลูกค้าไหนมีปัญหา | T5 + T4 |
| ภาพรวมเป็นยังไง, summary | T1 + T5 |

### Query ทั่วไป
| user พูดว่า | ใช้ template |
|------------|-------------|
| ส่งของได้แค่ไหน, ส่งไปเท่าไหร่แล้ว, fill rate | T1 (fill rate รวม) |
| ทีมไหนทำได้ดี, แยกทีม, RKX PSR | T2 |
| ใครยัง fill rate ต่ำ, ใครส่งไม่ครบ | T3 หรือ T4 |
| ปีนี้ทีม X เป็นยังไง, ปี 2026 | T6 |
| เดือนนี้ส่งเท่าไหร่, trend การส่ง, รายเดือน | T7 หรือ T8 |
| มีกี่สัญญา, นับสัญญา | T9 |
| ใครสั่งเยอะสุด, top ลูกค้า | T10 |
| ยังค้างส่งรวมเท่าไหร่, balance คงเหลือ | T1 (ดู bal_sum) |

### วิธีสรุปปัญหา (เมื่อเจอ Overdue)
- บอกจำนวนสัญญา + ลูกค้าที่ค้าง + ยอด MT รวมที่ยังค้าง
- เรียงจากมากไปน้อย
- ถ้า Overdue มาก → แนะนำให้ติดตามลูกค้าอันดับต้นๆ ก่อน

## กฎสำคัญ
- **ใช้ template ข้างบนทันที** — ไม่ต้องคิด params ใหม่ตั้งแต่ต้น
- T4 (fill rate < X%): query ทั้งหมดก่อน แล้วกรองใน response เพราะ having ทำงานบน SQL alias ไม่ใช่ computed field
- Timeline: ใช้ shipments file + limit: 200 เสมอ
- year ต้องเป็น string: "2026" (ไม่ใช่ 2026)
- ห้าม narrate process — แสดงเฉพาะผลลัพธ์
- **ห้ามพูด intro ก่อนผลลัพธ์** — ขึ้นผลลัพธ์ทันที

## Business Context
- Fill rate 100% = Completed | <100% + เลยกำหนด = Overdue
- RKX: Retail + Wholesale | PSR: Wholesale เป็นหลัก`

const skill = await prisma.userSkill.findFirst({
  where: { userId, name: SKILL_NAME },
})

if (skill) {
  await prisma.userSkill.update({
    where: { id: skill.id },
    data: { solution: newSolution },
  })
  console.log(`  Updated skill: ${SKILL_NAME}`)
} else {
  console.warn(`  Skill "${SKILL_NAME}" not found — skip update`)
}

// ── Seed executive profile memory ───────────────────────────────────────────
console.log('\n[3] Seeding executive profile memory...')

const execMemories = [
  {
    content: 'ผู้ใช้คือผู้บริหาร TRR — ต้องการรู้ปัญหาของบริษัทเป็นหลัก ไม่ใช่ข้อมูลดิบ เมื่อถามกว้างๆ เช่น "เป็นยังไงบ้าง" ให้สรุปปัญหาทันที (Overdue, fill rate ต่ำ) ก่อนเสมอ',
    type: 'long_term',
    importance: 5,
  },
  {
    content: 'KPI หลักที่ผู้บริหาร TRR ติดตาม: สัญญา Overdue (ค้างส่งเลยกำหนด), fill rate รวมและรายลูกค้า, ยอดส่งสินค้ารายเดือน',
    type: 'long_term',
    importance: 5,
  },
  {
    content: 'สไตล์การรับข้อมูล: ต้องการ summary และ insight — บอกว่ามีปัญหาอะไร ใครเป็นปัญหาหลัก ควรทำอะไรก่อน ไม่ต้องแสดงตารางข้อมูลดิบถ้าไม่จำเป็น',
    type: 'long_term',
    importance: 4,
  },
]

for (const mem of execMemories) {
  const existing = await prisma.memory.findFirst({
    where: { userId, content: mem.content },
  })
  if (!existing) {
    await prisma.memory.create({
      data: { userId, ...mem },
    })
    console.log(`  Added: "${mem.content.slice(0, 60)}..."`)
  } else {
    console.log(`  Already exists: "${mem.content.slice(0, 60)}..."`)
  }
}

console.log('\n✓ Done')
console.log(`  Agent ID: ${agent.id}`)
console.log(`  Files: monitoring_contracts.csv (qty/status) | monitoring_shipments.csv (timeline)`)

await prisma.$disconnect()
