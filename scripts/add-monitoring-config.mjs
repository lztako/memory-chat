import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
const userId = 'b40f34d9-d4ae-4600-8d19-8e3654426e52'

const configs = [
  {
    key: 'monitoring_file_rule',
    value: `ห้ามพูดถึงชื่อ column หรือชื่อไฟล์ในคำตอบเด็ดขาด — ตอบด้วยภาษาปกติเท่านั้น เช่น "ยอดสั่งซื้อ" ไม่ใช่ "qty_contracted" หรือ "column year"
ห้ามบอก user ว่า query รอบแรกไม่พบข้อมูล — ตอบเฉพาะผลลัพธ์สุดท้ายที่ถูกต้องเท่านั้น
field year เก็บเป็น string เสมอ ใช้ filter "2025" หรือ "2026" (ไม่ใช่ตัวเลข)

ข้อมูล monitoring มี 2 ไฟล์:
(1) monitoring_contracts.csv — ใช้เมื่อถามเรื่อง ยอดสั่งซื้อ / ยอดส่งจริง / คงเหลือ / จำนวนสัญญา / สถานะ (1 row = 1 สัญญา)
(2) monitoring_shipments.csv — ใช้เมื่อถามเรื่อง การส่งรายเดือน / timeline / ส่งเดือนไหนเท่าไหร่ (1 row = 1 เดือน)
ห้าม sum ยอดสั่งซื้อจาก shipments file เด็ดขาด

ชื่อคอลัมน์ใน contracts file:
- "ยอดสั่งซื้อ" / "จำนวนตามสัญญา" / "qty ที่ตกลง" = qty_contracted
- "ส่งแล้ว" / "ยอดสะสม" / "accumulated" = acc
- "คงเหลือ" / "ยังไม่ได้ส่ง" / "balance" = bal
- "สถานะ" = status (Overdue / In Progress / Completed)
- "ลูกค้า" / "ผู้ซื้อ" = customer
- "สินค้า" = product
- "ทีม" = team (RKX หรือ PSR)
- "ปี" = year

ชื่อคอลัมน์ใน shipments file:
- "ยอดส่งรายเดือน" / "ส่งเดือนนี้" = shipment_qty
- "เดือนที่ส่ง" = shipment_month

คอลัมน์ร่วมทั้ง 2 ไฟล์:
- "เลขที่สัญญา" / "หมายเลขสัญญา" = contract_no
- "เลขที่งาน" / "job" = job_no
- "ราคา" / "ราคาต่อตัน" = price
- "งวดส่ง" / "วันเริ่มส่ง" = shipment_start
- "วันสิ้นสุด" / "ส่งถึงวันที่" = shipment_end`,
  },
]

for (const { key, value } of configs) {
  const content = `${key}: ${value}`
  const existing = await prisma.memory.findFirst({
    where: { userId, type: 'user_config', content: { startsWith: `${key}:` } },
  })
  if (existing) {
    await prisma.memory.update({ where: { id: existing.id }, data: { content } })
    console.log(`Updated: ${key}`)
  } else {
    const m = await prisma.memory.create({
      data: { userId, type: 'user_config', content, importance: 5, layer: 'long_term' },
    })
    console.log(`Created: ${key} (${m.id})`)
  }
}

await prisma.$disconnect()
