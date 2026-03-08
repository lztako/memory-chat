import * as fs from "fs"
import * as path from "path"

const envPath = path.resolve(process.cwd(), ".env.local")
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n")
  for (const line of lines) {
    const [key, ...rest] = line.split("=")
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim()
  }
}

async function main() {
  const { prisma } = await import("../lib/prisma")

  console.log("Creating Task table...")

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Task" (
      "id"            TEXT         NOT NULL,
      "userId"        TEXT         NOT NULL,
      "title"         TEXT         NOT NULL,
      "description"   TEXT,
      "status"        TEXT         NOT NULL DEFAULT 'pending',
      "priority"      TEXT         NOT NULL DEFAULT 'normal',
      "dueDate"       TIMESTAMP(3),
      "linkedCompany" TEXT,
      "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
    )
  `

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "Task_userId_status_idx" ON "Task"("userId", "status")
  `

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "Task_userId_dueDate_idx" ON "Task"("userId", "dueDate")
  `

  await prisma.$executeRaw`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Task_userId_fkey'
      ) THEN
        ALTER TABLE "Task"
          ADD CONSTRAINT "Task_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$
  `

  console.log("Done!")
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
