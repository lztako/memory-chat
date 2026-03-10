import type { Memory } from "../types"

type UserConfig = {
  content: string
}

type UserSkill = {
  name: string
  trigger: string
  solution: string
  tools: string[]
}

const MAX_INJECTED_SKILLS = 5

function filterRelevantSkills(skills: UserSkill[], message: string): UserSkill[] {
  if (skills.length === 0) return []
  const msgLower = message.toLowerCase()
  return skills
    .filter((skill) => {
      const triggerTokens = skill.trigger.toLowerCase().split(/\s+/).filter((t) => t.length >= 2)
      return triggerTokens.some((token) => msgLower.includes(token))
    })
    .slice(0, MAX_INJECTED_SKILLS)
}

function buildSkillsSection(skills: UserSkill[]): string {
  if (skills.length === 0) return ""
  return `\n\n## Skills ที่เรียนรู้จาก user นี้:\n${skills
    .map((s) => {
      const toolHint = s.tools.length > 0 ? ` | ใช้ tools: ${s.tools.join(", ")}` : ""
      return `- [${s.name}] เมื่อ: ${s.trigger} → ${s.solution}${toolHint}`
    })
    .join("\n")}`
}

export function getSkillTools(skills: UserSkill[], message: string): string[] {
  const relevant = filterRelevantSkills(skills, message)
  const toolSet = new Set<string>()
  for (const skill of relevant) {
    for (const tool of skill.tools) {
      toolSet.add(tool)
    }
  }
  return Array.from(toolSet)
}

function buildUserConfigSection(configs: UserConfig[]): string {
  if (configs.length === 0) return ""
  return `\n\n## วิธีทำงานกับ user คนนี้ (AI Config):\n${configs.map((c) => `- ${c.content}`).join("\n")}`
}

type AttachedFileSummary = {
  id: string
  fileName: string
  fileType: string
  columns?: string[]
  rowCount: number
}

function buildAttachedFilesSection(files: AttachedFileSummary[]): string {
  if (files.length === 0) return ""
  const lines = ["\n\n## ไฟล์ที่แนบมาในแชทนี้ (ชั่วคราว — ใช้ query_attached_file tool):"]
  for (const f of files) {
    if (f.fileType === "txt") {
      lines.push(`- ${f.fileName} [TXT] — id: ${f.id}`)
    } else {
      lines.push(
        `- ${f.fileName} [${f.fileType.toUpperCase()}] — ${f.rowCount} rows, columns: ${f.columns?.join(", ")} — id: ${f.id}`
      )
    }
  }
  return lines.join("\n")
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

export function buildSystemPrompt(longTerm: Memory[], dailyLog: Memory[], reminderTasks: ReminderTask[] = [], userConfig: UserConfig[] = [], skills: UserSkill[] = [], message = "", attachedFiles: AttachedFileSummary[] = [], skillsPreFiltered = false): string {
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
  // When skills are semantically pre-filtered, skip keyword filter
  const relevantSkills = skillsPreFiltered
    ? skills.slice(0, MAX_INJECTED_SKILLS)
    : filterRelevantSkills(skills, message)
  const skillsSection = buildSkillsSection(relevantSkills)
  const attachedFilesSection = buildAttachedFilesSection(attachedFiles)

  return `You are a personal AI assistant for import/export professionals.
วันนี้คือ ${today}


## สิ่งที่รู้เกี่ยวกับ user (ถาวร):
${longTermText}${dailySection}${userConfigSection}${skillsSection}${reminderSection}${attachedFilesSection}

## Rules:
- ตอบเป็นภาษาไทยถ้า user พูดภาษาไทย
- ใช้ความรู้เกี่ยวกับ user ตอบอย่างเป็นธรรมชาติ
- ห้ามพูดว่า "จาก memory ที่มี..." หรือ "ตามข้อมูลที่บันทึกไว้..."
- ถ้าไม่แน่ใจ ให้ถามแทนการเดา
- **ห้ามใช้ emoji ใดๆ ทั้งสิ้น** — ใช้ข้อความล้วน ไม่มีข้อยกเว้น

## การใช้ Tools:
- ใช้ get_context_state เมื่อ user ส่งคำตอบสั้นๆ ไม่ชัดว่ากำลังทำอะไร
- ใช้ update_context_state ทันทีหลังเริ่ม quiz หรือ task ใหม่
- ใช้ save_memory เมื่อ user บอกข้อมูลสำคัญโดยตรง
- ใช้ save_skill ทันทีหลังแก้ปัญหาที่ไม่ชัดเจน (column แปลก, format พิเศษ, logic เฉพาะของ user) เพื่อให้จำได้ครั้งต่อไป
- ใช้ query_attached_file เมื่อ user ส่งไฟล์มาในแชท (CSV/JSON/TXT) — ดู system prompt ส่วน "ไฟล์ที่แนบมา" สำหรับ fileId

## การค้นหาไฟล์ (สำคัญ):
- เมื่อ user พูดถึงชื่อไฟล์ใดๆ → ให้ใช้ list_user_files ก่อนเสมอ เพื่อดูว่าไฟล์นั้น upload ไว้ในระบบหรือเปล่า
- ถ้ามี local folder เปิดอยู่ด้วย → ให้ call ทั้ง list_user_files และ list_folder_tree พร้อมกัน (parallel) แล้วหาจากทั้งสองที่
- อย่าสรุปว่า "หาไม่เจอ" โดยดูแค่ที่เดียว

## Local Folder (เมื่อ user เปิด folder ไว้):
- ใช้ list_folder_tree เพื่อดูโครงสร้างไฟล์ถ้ายังไม่รู้ว่ามีไฟล์อะไร
- ใช้ read_local_file เพื่ออ่านไฟล์ — ถ้า tool ตอบว่าไฟล์ไม่อยู่ใน context ให้บอก user ตรงๆ สั้นๆ เช่น "กรุณาพูดถึงชื่อไฟล์ในข้อความ เช่น 'ดูไฟล์ journal.txt ให้หน่อย'" — ห้ามแต่งภาษาแปลกหรือสร้าง UI เอง
- ใช้ write_local_file เพื่อสร้างหรือแก้ไขไฟล์ — เนื้อหาจะถูกเขียนลงเครื่อง user จริง
- ใช้ move_local_file เพื่อเปลี่ยนชื่อหรือย้ายไฟล์`
}
