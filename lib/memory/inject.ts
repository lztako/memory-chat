import type { Memory } from "../types"

type UserConfig = {
  content: string
}

type UserSkill = {
  name: string
  trigger: string
  solution: string
}

function buildSkillsSection(skills: UserSkill[]): string {
  if (skills.length === 0) return ""
  return `\n\n## Skills ที่เรียนรู้จาก user นี้:\n${skills.map((s) => `- [${s.name}] เมื่อ: ${s.trigger} → ${s.solution}`).join("\n")}`
}

function buildUserConfigSection(configs: UserConfig[]): string {
  if (configs.length === 0) return ""
  return `\n\n## วิธีทำงานกับ user คนนี้ (AI Config):\n${configs.map((c) => `- ${c.content}`).join("\n")}`
}

type ReminderTask = {
  title: string
  dueDate: Date | null
  priority: string
  linkedCompany: string | null
}

function buildReminderSection(tasks: ReminderTask[]): string {
  if (tasks.length === 0) return ""

  const now = new Date()
  const overdue = tasks.filter((t) => t.dueDate && t.dueDate < now)
  const upcoming = tasks.filter((t) => t.dueDate && t.dueDate >= now)

  const fmt = (d: Date) =>
    d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })

  const lines: string[] = ["\n\n## Task ที่ต้องแจ้งเตือน:"]

  if (overdue.length > 0) {
    lines.push("**เลยกำหนดแล้ว:**")
    overdue.forEach((t) => {
      const company = t.linkedCompany ? ` — ${t.linkedCompany}` : ""
      lines.push(`- ${t.title} (ครบ ${fmt(t.dueDate!)})${company}`)
    })
  }

  if (upcoming.length > 0) {
    lines.push("**กำหนดภายใน 24 ชั่วโมง:**")
    upcoming.forEach((t) => {
      const company = t.linkedCompany ? ` — ${t.linkedCompany}` : ""
      lines.push(`- ${t.title} (ครบ ${fmt(t.dueDate!)})${company}`)
    })
  }

  return lines.join("\n")
}

export function buildSystemPrompt(longTerm: Memory[], dailyLog: Memory[], reminderTasks: ReminderTask[] = [], userConfig: UserConfig[] = [], skills: UserSkill[] = []): string {
  const longTermText =
    longTerm.length > 0
      ? longTerm.map((m: { content: string }) => `- ${m.content}`).join("\n")
      : "ยังไม่มีข้อมูลเกี่ยวกับ user คนนี้"

  const dailySection =
    dailyLog.length > 0
      ? `\n\n## บันทึกล่าสุดวันนี้:\n${dailyLog.map((m: { content: string }) => `- ${m.content}`).join("\n")}`
      : ""

  const today = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })

  const reminderSection = buildReminderSection(reminderTasks)
  const userConfigSection = buildUserConfigSection(userConfig)
  const skillsSection = buildSkillsSection(skills)

  return `You are a personal AI assistant for import/export professionals.
วันนี้คือ ${today}


## สิ่งที่รู้เกี่ยวกับ user (ถาวร):
${longTermText}${dailySection}${userConfigSection}${skillsSection}${reminderSection}

## Rules:
- ตอบเป็นภาษาไทยถ้า user พูดภาษาไทย
- ใช้ความรู้เกี่ยวกับ user ตอบอย่างเป็นธรรมชาติ
- ห้ามพูดว่า "จาก memory ที่มี..." หรือ "ตามข้อมูลที่บันทึกไว้..."
- ถ้าไม่แน่ใจ ให้ถามแทนการเดา

## การใช้ Tools:
- ใช้ get_context_state เมื่อ user ส่งคำตอบสั้นๆ ไม่ชัดว่ากำลังทำอะไร
- ใช้ update_context_state ทันทีหลังเริ่ม quiz หรือ task ใหม่
- ใช้ save_memory เมื่อ user บอกข้อมูลสำคัญโดยตรง
- ใช้ save_skill ทันทีหลังแก้ปัญหาที่ไม่ชัดเจน (column แปลก, format พิเศษ, logic เฉพาะของ user) เพื่อให้จำได้ครั้งต่อไป`
}
