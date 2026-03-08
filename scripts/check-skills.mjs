// ตรวจสอบ UserSkill ใน DB — รันหลัง chat เพื่อดูว่า Claude เรียก save_skill ไหม
// Usage: node scripts/check-skills.mjs

import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as fs from "fs"
import * as path from "path"

// โหลด .env.local
const envPath = path.resolve(process.cwd(), ".env.local")
const lines = fs.readFileSync(envPath, "utf-8").split("\n")
for (const line of lines) {
  const [key, ...rest] = line.split("=")
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim()
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const skills = await prisma.userSkill.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true } } },
  })

  if (skills.length === 0) {
    console.log("❌ ยังไม่มี skill ถูกบันทึก — Claude ยังไม่ได้เรียก save_skill")
    console.log("\nวิธีทดสอบ:")
    console.log("1. อัปโหลดไฟล์ scripts/test-skill-csv.csv ใน app")
    console.log("2. พิมพ์: 'ช่วยดูไฟล์ที่เพิ่ง upload แล้วบอกว่า column วันที่ส่งของ เป็น format อะไร แปลงให้เป็น YYYY-MM-DD ได้เลย'")
    return
  }

  console.log(`✅ พบ ${skills.length} skill ที่บันทึกไว้:\n`)
  for (const s of skills) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📌 ${s.name}`)
    console.log(`👤 User: ${s.user.email}`)
    console.log(`🎯 Trigger: ${s.trigger}`)
    console.log(`💡 Solution: ${s.solution}`)
    console.log(`🔢 ใช้งาน: ${s.usageCount} ครั้ง`)
    console.log(`📅 บันทึก: ${s.createdAt.toLocaleString("th-TH")}`)
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
