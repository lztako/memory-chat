import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
const userId = 'b40f34d9-d4ae-4600-8d19-8e3654426e52'

const name = 'trr_monitoring'
const trigger = 'monitoring สัญญา ยอดส่ง ยอดสั่งซื้อ ค้างส่ง overdue fill rate คงเหลือ shipment contracts ส่งจริง ทีม RKX PSR wholesale retail'

const solution = `# TRR Monitoring — Business Logic & Query Patterns

## ภาพรวมข้อมูล
- สัญญาทั้งหมด 217 รายการ (RKX 141 + PSR 76)
- ยอดสั่งซื้อรวม 564,073.56 MT | ส่งจริงรวม 273,569.56 MT | คงเหลือ 290,504 MT
- Fill rate รวม ~48.5% (ข้อมูล ณ มี.ค. 2569)
- Overdue มี 2 สัญญา: Davis Commodities VHP 50KG (ค้าง 500 MT) และ Wilmar VHP 25KG (ค้าง 75 MT)

## การเลือกไฟล์

**ใช้ไฟล์ contracts เมื่อถามเรื่อง:**
- ยอดสั่งซื้อ / ส่งแล้ว / คงเหลือ (รายสัญญา)
- นับจำนวนสัญญา / ดู status
- เปรียบเทียบ fill rate
- ข้อมูลรายลูกค้า / รายสินค้า / รายทีม

**ใช้ไฟล์ shipments เมื่อถามเรื่อง:**
- ส่งเดือนไหน เท่าไหร่ (timeline)
- แนวโน้มการส่งรายเดือน
- ยอดส่งสะสมต่อเดือน

**ใช้ทั้งสองไฟล์เมื่อ:**
- เปรียบเทียบ "ยอดที่ตกลง" vs "ส่งจริงรายเดือน" ของสัญญาเดียวกัน

## Business Metrics

### Fill Rate (อัตราการส่งมอบ)
= ส่งแล้ว ÷ ยอดสั่งซื้อ × 100
- < 50% = ยังส่งได้น้อย (ปกติสำหรับสัญญา 2026 ที่เพิ่งเริ่ม)
- 100% = ส่งครบแล้ว (status = Completed)

### Status
- **Completed** — ส่งครบ 100% แล้ว (170 สัญญา)
- **Pending** — อยู่ระหว่างดำเนินการ ยังไม่ถึงกำหนด (45 สัญญา)
- **Overdue** — เลยกำหนดส่งแล้วแต่ยังค้างอยู่ (2 สัญญา)

### ความแตกต่าง RKX vs PSR
- RKX: ทำทั้ง Retail (สินค้าขายปลีก เช่น SADA) และ Wholesale
- PSR: ทำ Wholesale เป็นหลัก ปริมาณต่อสัญญาสูงกว่า RKX มาก

## Query Patterns

### ถามยอดรวมทีม/ปี
→ query contracts, groupBy team + year, aggregate sum qty_contracted + acc + bal

### ถามสัญญาที่ค้างอยู่
→ query contracts, filter status = Overdue, แสดง customer + product + bal

### ถามลูกค้าคนไหนสั่งเยอะสุด
→ query contracts, groupBy customer, aggregate sum qty_contracted, orderBy desc

### ถาม timeline การส่งรายเดือน
→ query shipments, groupBy shipment_month, aggregate sum shipment_qty, orderBy shipment_month

### ถาม fill rate รายทีม
→ query contracts, groupBy team, sum acc และ sum qty_contracted → คำนวณ acc_sum/qty_contracted_sum × 100

## วิธีตอบ
- ตอบเป็นภาษาธรรมชาติ ไม่พูดชื่อคอลัมน์หรือชื่อไฟล์
- แสดงตัวเลขพร้อมหน่วย MT เสมอ
- ถ้าถาม fill rate ให้แสดงเป็น % และบอก context ว่าดีหรือไม่ (สัญญา 2026 ยังต่ำเป็นเรื่องปกติ)
- ถ้ามีหลายมิติ (ทีม + ปี + ประเภท) เสนอแสดงเป็นตาราง
`

// Upsert by name
const existing = await prisma.userSkill.findFirst({
  where: { userId, name },
})

if (existing) {
  await prisma.userSkill.update({
    where: { id: existing.id },
    data: { trigger, solution },
  })
  console.log(`Updated skill: ${name} (${existing.id})`)
} else {
  const skill = await prisma.userSkill.create({
    data: { userId, name, trigger, solution },
  })
  console.log(`Created skill: ${name} (${skill.id})`)
}

await prisma.$disconnect()
