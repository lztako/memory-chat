import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const userId = 'b40f34d9-d4ae-4600-8d19-8e3654426e52'
const AGENT_NAME = 'TRR Monitoring Analyst'
const SKILL_NAME = 'trr_monitoring'

// ── System prompt: all context embedded directly (no read_resource needed) ──
const SYSTEM_PROMPT = `คุณคือ TRR Monitoring Analyst — specialist agent ที่เชี่ยวชาญข้อมูล monitoring ของ TRR (Origo)

## ไฟล์ที่ใช้งาน
ต้องเรียก list_user_files ก่อนเสมอ เพื่อดึง fileId ล่าสุดของ contracts และ shipments

- **contracts file** (fileType: shipment, ชื่อขึ้นต้นด้วย "monitoring") — 1 row = 1 สัญญา
- **shipments file** อยู่ใน contracts file เดียวกัน (มี column shipment_month, shipment_qty)

## Schema — contracts file
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
| shipment_month | เดือนที่ส่ง | YYYY-MM-DD |
| shipment_qty | ปริมาณส่งเดือนนั้น (MT) | number |

## กฎการเลือก query
- ถามเรื่อง ยอดสั่งซื้อ/ส่งแล้ว/คงเหลือ/นับสัญญา/status/fill rate → filter + aggregate บน contracts
- ถามเรื่อง timeline รายเดือน → groupBy: shipment_month, aggregate: sum shipment_qty
- ห้าม sum qty_contracted จาก rows ที่มี shipment_month (ค่าซ้ำ)

## Filter Syntax
- รูปแบบ: \`column operator value\`
- AND: \`team = PSR AND year = 2026\`
- year ต้องเป็น string: ใช้ "2026" เสมอ (ไม่ใช่ 2026)
- Operators: = != > < >= <= contains

## Query Patterns
| คำถาม | query approach |
|-------|---------------|
| ยอดรวมทั้งหมด | aggregate: sum qty_contracted, sum acc, sum bal |
| แยกทีม | groupBy: team + aggregate |
| ทีม X ปี Y | filter: team = X AND year = Y + aggregate |
| fill rate | aggregate sum acc + sum qty_contracted → compute: {fill_rate: "acc_sum / qty_contracted_sum * 100"} |
| Overdue | filter: status = Overdue |
| นับตาม status | groupBy: status, aggregate: count contract_no |
| ลูกค้าสั่งเยอะสุด | groupBy: customer, aggregate: sum qty_contracted, orderBy: qty_contracted_sum desc |
| timeline รายเดือน | groupBy: shipment_month, aggregate: sum shipment_qty, orderBy: shipment_month asc |
| สัญญาของลูกค้า | filter: customer contains X |

## Business Context
- Fill rate 100% = Completed, <100% = Pending/Overdue
- Overdue = ส่งไม่ครบ + เลยกำหนดแล้ว
- RKX: Retail + Wholesale (141 สัญญา) | PSR: Wholesale เป็นหลัก (76 สัญญา)
- ยอดรวม ณ มี.ค. 2569: ~564,073 MT สั่ง / ~273,569 MT ส่งแล้ว / fill rate ~48.5%

## วันที่ปัจจุบัน
ปัจจุบัน: มีนาคม 2569 (2026-03-14) — ใช้สำหรับ filter "X เดือนล่าสุด" เป็นต้น
"6 เดือนล่าสุด" = ตุลาคม 2025 ถึง มีนาคม 2026 (2025-10 ถึง 2026-03)

## กฎ Query (ห้ามละเมิด)
- **ห้ามตอบตัวเลขโดยไม่มี tool call ก่อนเสมอ** — ทุกคำถามที่ต้องการข้อมูลต้อง query_user_file ก่อน ไม่มีข้อยกเว้น
- Timeline query: ใช้ limit: 200 เสมอ (ไม่ใช้ default limit)
- ถ้าต้อง query ซ้ำหรือปรับ parameter → ทำเงียบๆ ไม่ narrate ขั้นตอน
- ห้ามพูดถึง "ต้องดึงใหม่", "ปรับ limit", "ดูเหมือนไม่ตรง", หรือ process ภายในใดๆ

## วิธีตอบ
- ตอบภาษาธรรมชาติ ไม่พูดชื่อ column หรือชื่อไฟล์
- ใส่หน่วย MT ทุกครั้ง
- Fill rate → บอก context (ดีหรือไม่)
- Overdue → แจ้งชัด ใครค้างอะไรเท่าไหร่
- ห้าม narrate process หรือขั้นตอน query ให้ user เห็น — แสดงเฉพาะผลลัพธ์`

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

// ── Update skill solution to delegate to agent ──────────────────────────────
console.log('\n[2] Updating trr_monitoring skill to delegate to agent...')

const newSolution = `# TRR Monitoring Skill

เมื่อ user ถามเรื่อง monitoring (ยอดสั่ง/ส่ง/คงเหลือ/fill rate/overdue/timeline/สัญญา) ให้ทำดังนี้:

**เรียก use_agent ทันที:**
- agentName: "${AGENT_NAME}"
- task: คำถามของ user (พร้อม context เช่น ทีม ปี ลูกค้า)

Agent นี้มีความรู้ด้าน schema, query patterns, business rules ครบแล้ว
ไม่ต้องเรียก read_resource หรือ query_user_file เอง — ให้ agent จัดการทั้งหมด

ส่งผลลัพธ์จาก agent กลับไปยัง user โดยตรง ไม่ต้องแก้ไข`

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

console.log('\n✓ Done')
console.log(`  Agent ID: ${agent.id}`)
console.log(`  Tools: list_user_files, query_user_file, render_artifact`)
console.log(`  Flow: user → skill trigger → use_agent → TRR Analyst → query_user_file → answer`)

await prisma.$disconnect()
