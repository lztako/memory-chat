import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
const userId = 'b40f34d9-d4ae-4600-8d19-8e3654426e52'
const SKILL_NAME = 'trr_monitoring'
const DOC_TITLES = [
  'TRR Monitoring — Schema',
  'TRR Monitoring — Query Patterns',
  'TRR Monitoring — Business Rules',
]

// 1. Find skill
const skill = await prisma.userSkill.findFirst({ where: { userId, name: SKILL_NAME } })
if (!skill) {
  console.error(`Skill "${SKILL_NAME}" not found for user ${userId}`)
  process.exit(1)
}
console.log(`Skill: ${skill.name} (${skill.id})`)

// 2. Update each doc → parentType: 'skill', parentId: skill.id
for (const title of DOC_TITLES) {
  const doc = await prisma.userDoc.findFirst({ where: { userId, title } })
  if (!doc) {
    console.warn(`  Doc not found: "${title}"`)
    continue
  }
  await prisma.userDoc.update({
    where: { id: doc.id },
    data: { parentType: 'skill', parentId: skill.id },
  })
  console.log(`  Linked: "${title}" → parentId ${skill.id}`)
}

console.log('\n✓ Done')
await prisma.$disconnect()
