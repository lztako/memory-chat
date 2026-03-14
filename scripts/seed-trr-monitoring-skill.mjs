import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
const userId = 'b40f34d9-d4ae-4600-8d19-8e3654426e52'
const SKILL_NAME = 'trr_monitoring'

// ── Helper: upsert UserDoc by title ──────────────────────────────────────────
async function upsertDoc({ parentType, docType, title, content }) {
  const existing = await prisma.userDoc.findFirst({
    where: { userId, title },
  })
  if (existing) {
    await prisma.userDoc.update({ where: { id: existing.id }, data: { content, docType, parentType } })
    console.log(`  Updated doc: ${title}`)
    return existing.id
  }
  const doc = await prisma.userDoc.create({
    data: { userId, parentType, docType, title, content },
  })
  console.log(`  Created doc: ${title} (${doc.id})`)
  return doc.id
}

// ── 1. Reference Docs ─────────────────────────────────────────────────────────

console.log('\n[1] Upserting reference docs...')

const schemaDocId = await upsertDoc({
  parentType: 'resource',
  docType: 'reference',
  title: 'TRR Monitoring — Schema',
  content: `# TRR Monitoring — Schema Reference

## ไฟล์ 1: contracts (1 row = 1 สัญญา)
ใช้สำหรับ: ยอดสั่งซื้อ, ส่งแล้ว, คงเหลือ, นับสัญญา, ดู status, fill rate

| column | ความหมาย | ตัวอย่าง | valid values |
|--------|-----------|----------|--------------|
| team | ทีมที่รับผิดชอบ | RKX | RKX, PSR |
| year | ปีของสัญญา (string) | 2025 | "2025", "2026" |
| type | ประเภทการขาย | Wholesale | Retail, Wholesale |
| job_no | เลขที่งาน | J001 | string หรือ blank |
| contract_date | วันที่ทำสัญญา | 2024-06-12 | YYYY-MM-DD |
| customer | ชื่อลูกค้า (canonical) | Wilmar | ดู Business Rules |
| contract_no | เลขที่สัญญา | ACC01/2025 | string |
| product | ชื่อสินค้า + หน่วย | VHP 50KG | string |
| qty_contracted | ยอดสั่งซื้อตามสัญญา (MT) | 1000 | number |
| price | ราคา (string — format ต่างกัน) | $660.00 | string |
| delivery_start | วันเริ่มส่ง | 2025-01-01 | YYYY-MM-DD |
| delivery_end | วันสิ้นสุดส่ง | 2025-03-31 | YYYY-MM-DD |
| acc | ส่งจริงสะสม (MT) | 500 | number |
| bal | คงเหลือ = qty_contracted - acc (MT) | 500 | number |
| status | สถานะสัญญา | Pending | Completed, Pending, Overdue |

## ไฟล์ 2: shipments (1 row = 1 เดือนที่ส่ง)
ใช้สำหรับ: timeline การส่งรายเดือน, ยอดส่งแต่ละเดือน

| column | ความหมาย | ตัวอย่าง |
|--------|-----------|----------|
| team | ทีม | RKX |
| year | ปี (string) | "2025" |
| type | ประเภท | Wholesale |
| job_no | เลขที่งาน | string |
| contract_no | เลขที่สัญญา (เชื่อมกับ contracts) | ACC01/2025 |
| customer | ชื่อลูกค้า | Wilmar |
| product | ชื่อสินค้า | VHP 50KG |
| shipment_month | เดือนที่ส่ง (date format) | 2025-01-01 |
| shipment_qty | ปริมาณที่ส่งเดือนนั้น (MT) | 250 |

## ข้อมูล ณ มีนาคม 2569
- contracts: 217 rows (RKX 141 + PSR 76)
- shipments: 252 rows
`,
})

const filtersDocId = await upsertDoc({
  parentType: 'resource',
  docType: 'reference',
  title: 'TRR Monitoring — Query Patterns',
  content: `# TRR Monitoring — Query Patterns

## กฎการเลือกไฟล์
- ถามเรื่อง ยอดสั่งซื้อ / ส่งแล้ว / คงเหลือ / นับสัญญา / status / fill rate → **contracts file**
- ถามเรื่อง ส่งเดือนไหน / timeline / ยอดรายเดือน → **shipments file**
- ห้าม sum qty_contracted จาก shipments file (ค่าซ้ำเพราะ long format)

## Filter Syntax
รูปแบบ: \`column operator value\`
รองรับ AND: \`team = RKX AND year = 2026\`

Operators: = != > < >= <= contains

## Query Patterns ตาม use case

### ยอดรวมทั้งหมด
- file: contracts
- aggregate: sum qty_contracted, sum acc, sum bal
- (ไม่มี filter)

### แยกตามทีม
- file: contracts
- groupBy: team
- aggregate: sum qty_contracted, sum acc, sum bal

### แยกตามทีม + ปี
- file: contracts
- filter: team = PSR AND year = 2026
- aggregate: sum qty_contracted, sum acc, sum bal

### แยกตามทีม + ปี + ประเภท (wholesale/retail)
- file: contracts
- filter: team = RKX AND year = 2025 AND type = Wholesale
- aggregate: sum qty_contracted, sum acc, sum bal

### สัญญาที่ค้าง (Overdue)
- file: contracts
- filter: status = Overdue
- columns: customer, product, contract_no, qty_contracted, acc, bal, delivery_end

### นับจำนวนสัญญาตาม status
- file: contracts
- groupBy: status
- aggregate: count contract_no

### ลูกค้าที่สั่งเยอะสุด
- file: contracts
- groupBy: customer
- aggregate: sum qty_contracted
- orderBy: qty_contracted_sum desc

### Fill rate รายทีม
- file: contracts
- groupBy: team
- aggregate: sum qty_contracted, sum acc
- แล้วคำนวณ acc_sum / qty_contracted_sum × 100

### Timeline รายเดือน
- file: shipments
- groupBy: shipment_month
- aggregate: sum shipment_qty
- orderBy: shipment_month asc

### Timeline รายเดือน แยกทีม
- file: shipments
- filter: team = PSR
- groupBy: shipment_month
- aggregate: sum shipment_qty
- orderBy: shipment_month asc

### หาสัญญาของลูกค้าคนหนึ่ง
- file: contracts
- filter: customer contains Wilmar
- columns: contract_no, product, qty_contracted, acc, bal, status

### ดู shipment timeline ของสัญญาหนึ่ง
- file: shipments
- filter: contract_no = ACC01/2025
- columns: shipment_month, shipment_qty
- orderBy: shipment_month asc

## ข้อควรระวัง
- year เป็น string เสมอ: ใช้ "2026" ไม่ใช่ 2026
- qty_contracted ใน contracts file เท่านั้น — ห้ามดูจาก shipments
- filter AND ใช้ได้หลาย condition: team = RKX AND year = 2026 AND type = Retail
`,
})

const businessDocId = await upsertDoc({
  parentType: 'resource',
  docType: 'reference',
  title: 'TRR Monitoring — Business Rules',
  content: `# TRR Monitoring — Business Rules

## Fill Rate (อัตราการส่งมอบ)
= ส่งจริง ÷ ยอดสั่งซื้อ × 100

ตีความ:
- 100% = ส่งครบแล้ว (Completed)
- 50-99% = กำลังส่ง (Pending ปกติ)
- < 50% = ยังส่งน้อย — ปกติสำหรับสัญญา 2026 ที่เพิ่งเริ่ม หรือสัญญาที่ยังไม่ถึงกำหนด
- > 0% แต่เลยกำหนดแล้ว = Overdue

## ตัวเลขภาพรวม (ณ มี.ค. 2569)
- ยอดสั่งซื้อรวม: 564,073.56 MT
- ส่งจริงรวม: 273,569.56 MT
- คงเหลือ: 290,504 MT
- Fill rate รวม: ~48.5%

## Status
| status | ความหมาย | จำนวน |
|--------|-----------|-------|
| Completed | ส่งครบ 100% | 170 สัญญา |
| Pending | อยู่ระหว่างดำเนินการ ยังไม่ถึงกำหนด | 45 สัญญา |
| Overdue | เลยกำหนดส่งแล้วแต่ยังค้างอยู่ | 2 สัญญา |

## Overdue Contracts (2 รายการ)
1. BO00018 — Davis Commodities — VHP 50KG — ค้าง 500 MT
2. P04875 — Wilmar — VHP 25KG — ค้าง 75 MT

## ทีม RKX vs PSR
| | RKX | PSR |
|---|---|---|
| ประเภท | Retail + Wholesale | Wholesale เป็นหลัก |
| จำนวนสัญญา | 141 | 76 |
| ปริมาณต่อสัญญา | เล็กกว่า (Retail = หน่วยย่อย) | ใหญ่กว่า |
| สินค้า Retail | SADA (1KG, 500G) | ไม่มี |

## ลูกค้าหลัก (canonical names)
PSR: COFCO, Czarnikow, Alvean, LDC, Wilmar, Pacific Source, Kirirom, Micronesian, Sangsangysang, Transworld, Professional Business
RKX: ACC Austpac, PCS, Davis Commodities, Wilmar, Banrai, Grocers, J Square และอื่นๆ

## วิธีนำเสนอผล
- ตอบภาษาธรรมชาติ ไม่พูดชื่อ column หรือชื่อไฟล์
- ใส่หน่วย MT ทุกครั้ง
- ถ้าหลายมิติ → เสนอเป็นตาราง
- Fill rate → บอก context ว่าดีหรือไม่ตาม benchmark ข้างต้น
- Overdue → แจ้งชัดว่าใครค้างอะไรเท่าไหร่
`,
})

// ── 2. Rewrite UserSkill as proper SKILL.md ───────────────────────────────────

console.log('\n[2] Rewriting UserSkill as proper SKILL.md...')

const skillSolution = `# TRR Monitoring Skill

คุณมี reference docs สำหรับข้อมูล monitoring ของ TRR ใน Resources section ชื่อขึ้นต้นด้วย "TRR Monitoring"

## วิธีใช้ก่อนตอบทุกคำถามเกี่ยวกับ monitoring

**Step 1 — อ่าน docs ที่จำเป็น** (เรียก read_resource):
- "TRR Monitoring — Schema" → รู้ว่ามี column อะไร, valid values คืออะไร
- "TRR Monitoring — Query Patterns" → รู้ว่าต้อง query อย่างไรสำหรับคำถามแบบนี้
- "TRR Monitoring — Business Rules" → รู้ context ธุรกิจ (fill rate, status, overdue)

อ่านพร้อมกันได้ทีละหลาย tool call เพื่อประหยัดเวลา

**Step 2 — Compose query** จาก Query Patterns doc แล้วเรียก query_user_file

**Step 3 — ตอบ** ตามหลักใน Business Rules doc (ภาษาธรรมชาติ, ไม่พูด column, ใส่หน่วย MT)

## หมายเหตุ
- fileId ของ contracts และ shipments อยู่ใน list_user_files
- year filter ต้องเป็น string: "2025" หรือ "2026"
- ห้าม sum qty_contracted จาก shipments file
`

const existingSkill = await prisma.userSkill.findFirst({
  where: { userId, name: SKILL_NAME },
})

if (existingSkill) {
  await prisma.userSkill.update({
    where: { id: existingSkill.id },
    data: {
      trigger: 'monitoring สัญญา ยอดส่ง ยอดสั่งซื้อ ค้างส่ง overdue fill rate คงเหลือ shipment ส่งจริง ทีม RKX PSR wholesale retail อัตราส่งมอบ',
      solution: skillSolution,
    },
  })
  console.log(`  Updated skill: ${SKILL_NAME} (${existingSkill.id})`)
} else {
  const skill = await prisma.userSkill.create({
    data: {
      userId,
      name: SKILL_NAME,
      trigger: 'monitoring สัญญา ยอดส่ง ยอดสั่งซื้อ ค้างส่ง overdue fill rate คงเหลือ shipment ส่งจริง ทีม RKX PSR wholesale retail อัตราส่งมอบ',
      solution: skillSolution,
    },
  })
  console.log(`  Created skill: ${SKILL_NAME} (${skill.id})`)
}

console.log('\n✓ Done')
console.log(`  Schema doc:   ${schemaDocId}`)
console.log(`  Filters doc:  ${filtersDocId}`)
console.log(`  Business doc: ${businessDocId}`)

await prisma.$disconnect()
