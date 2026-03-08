import * as fs from "fs"
import * as path from "path"

// Load .env.local BEFORE prisma client initializes
const envPath = path.resolve(process.cwd(), ".env.local")
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n")
  for (const line of lines) {
    const [key, ...rest] = line.split("=")
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim()
  }
}

async function main() {
  // Dynamic import so prisma client picks up env vars above
  const { prisma } = await import("../lib/prisma")

  console.log("Adding fileType + description to UserFile...")

  await prisma.$executeRaw`
    ALTER TABLE "UserFile"
      ADD COLUMN IF NOT EXISTS "fileType"    TEXT NOT NULL DEFAULT 'other',
      ADD COLUMN IF NOT EXISTS "description" TEXT
  `

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "UserFile_userId_fileType_idx" ON "UserFile"("userId", "fileType")
  `

  console.log("Done!")
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
