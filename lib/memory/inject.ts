import type { Memory } from "../types"

type GlobalInfoItem = {
  key: string
  value: string
}

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

function buildGlobalInfoSection(items: GlobalInfoItem[]): string {
  if (items.length === 0) return ""
  const lines = items.map((i) => `- ${i.key}: ${i.value}`)
  return `\n\n## เกี่ยวกับ Origo (บริษัทที่ให้บริการระบบนี้):\n${lines.join("\n")}`
}

function buildUserConfigSection(configs: UserConfig[]): string {
  if (configs.length === 0) return ""
  return `\n\n## วิธีทำงานกับ user คนนี้ (AI Config):\n${configs.map((c) => `- ${c.content}`).join("\n")}`
}

type ActiveTask = {
  id: string
  title: string
  status: string
  priority: string
  dueDate: Date | null
  linkedCompany: string | null
}

function buildActiveTasksSection(tasks: ActiveTask[]): string {
  if (tasks.length === 0) return ""
  const now = new Date()
  const fmt = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short" })
  const lines = ["\n\n## Tasks ที่ยังค้างอยู่ (ใช้ update_task พร้อม id เพื่ออัปเดต):"]
  for (const t of tasks) {
    const due = t.dueDate ? ` — ครบ ${fmt(t.dueDate)}${t.dueDate < now ? " (เลยกำหนด)" : ""}` : ""
    const company = t.linkedCompany ? ` [${t.linkedCompany}]` : ""
    lines.push(`- [${t.status}] ${t.title}${company} (priority: ${t.priority})${due} — id: ${t.id}`)
  }
  return lines.join("\n")
}

type UserFileSummary = {
  id: string
  fileName: string
  fileType: string | null
  description: string | null
  rowCount: number
  columns: string[]
}

function buildUserFilesSection(files: UserFileSummary[]): string {
  if (files.length === 0) return ""
  const lines = ["\n\n## ไฟล์ข้อมูลของ user ในระบบ (ใช้ query_user_file พร้อม id เพื่อดูข้อมูล):"]
  for (const f of files) {
    const desc = f.description ? ` — ${f.description}` : ""
    const cols = f.columns.length > 0 ? `, columns: ${f.columns.join(", ")}` : ""
    lines.push(`- ${f.fileName} [${f.fileType ?? "unknown"}] — ${f.rowCount} rows${cols}${desc} — id: ${f.id}`)
  }
  return lines.join("\n")
}

type AttachedFileSummary = {
  id: string
  fileName: string
  fileType: string
  columns?: string[]
  rowCount: number
  sheets?: Array<{ name: string; rowCount: number; columns: string[] }>
}

function buildAttachedFilesSection(files: AttachedFileSummary[]): string {
  if (files.length === 0) return ""
  const lines = ["\n\n## ไฟล์ที่แนบมาในแชทนี้ (ชั่วคราว — ใช้ query_attached_file tool):"]
  for (const f of files) {
    if (f.fileType === "txt") {
      lines.push(`- ${f.fileName} [TXT] — id: ${f.id}`)
    } else if (f.fileType === "xlsx" && f.sheets && f.sheets.length > 1) {
      // Multi-sheet xlsx — show primary sheet + list all sheets
      lines.push(
        `- ${f.fileName} [XLSX] — ${f.sheets.length} sheets, primary: "${f.sheets[0]?.name}" (${f.rowCount} rows, columns: ${f.columns?.join(", ")}) — id: ${f.id}`
      )
      lines.push(`  Sheets: ${f.sheets.map((s) => `"${s.name}" (${s.rowCount}r)`).join(", ")}`)
    } else {
      lines.push(
        `- ${f.fileName} [${f.fileType.toUpperCase()}] — ${f.rowCount} rows, columns: ${f.columns?.join(", ")} — id: ${f.id}`
      )
    }
  }
  return lines.join("\n")
}

type ResourceDocIndex = {
  id: string
  title: string
  docType: string
  parentType: string
}

function buildResourcesSection(resources: ResourceDocIndex[]): string {
  if (resources.length === 0) return ""
  const lines = ["\n\n## Resources ของ user นี้ (ใช้ read_resource พร้อม id เพื่ออ่านเนื้อหาเต็ม):"]
  for (const r of resources) {
    lines.push(`- [${r.docType}] ${r.title} — id: ${r.id}`)
  }
  return lines.join("\n")
}

type GlobalDocIndex = {
  id: string
  title: string
  docType: string
  category: string
}

function buildGlobalDocsSection(docs: GlobalDocIndex[]): string {
  if (docs.length === 0) return ""
  const byCategory = docs.reduce<Record<string, GlobalDocIndex[]>>((acc, d) => {
    ;(acc[d.category] ??= []).push(d)
    return acc
  }, {})
  const lines = ["\n\n## Origo Knowledge Base (ใช้ read_global_doc พร้อม id เพื่ออ่านเนื้อหาเต็ม):"]
  for (const [cat, items] of Object.entries(byCategory)) {
    lines.push(`### ${cat}`)
    for (const d of items) {
      lines.push(`- [${d.docType}] ${d.title} — id: ${d.id}`)
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

export type BuildSystemPromptOptions = {
  longTerm: Memory[]
  dailyLog: Memory[]
  reminderTasks?: ReminderTask[]
  userConfig?: UserConfig[]
  skills?: UserSkill[]
  message?: string
  attachedFiles?: AttachedFileSummary[]
  skillsPreFiltered?: boolean
  userFiles?: UserFileSummary[]
  activeTasks?: ActiveTask[]
  globalInfo?: GlobalInfoItem[]
  resources?: ResourceDocIndex[]
  globalDocs?: GlobalDocIndex[]
}

export function buildSystemPrompt({
  longTerm,
  dailyLog,
  reminderTasks = [],
  userConfig = [],
  skills = [],
  message = "",
  attachedFiles = [],
  skillsPreFiltered = false,
  userFiles = [],
  activeTasks = [],
  globalInfo = [],
  resources = [],
  globalDocs = [],
}: BuildSystemPromptOptions): string {
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

  const globalInfoSection = buildGlobalInfoSection(globalInfo)
  const reminderSection = buildReminderSection(reminderTasks)
  const userConfigSection = buildUserConfigSection(userConfig)
  // When skills are semantically pre-filtered, skip keyword filter
  const relevantSkills = skillsPreFiltered
    ? skills.slice(0, MAX_INJECTED_SKILLS)
    : filterRelevantSkills(skills, message)
  const skillsSection = buildSkillsSection(relevantSkills)
  const attachedFilesSection = buildAttachedFilesSection(attachedFiles)
  const userFilesSection = buildUserFilesSection(userFiles)
  const activeTasksSection = buildActiveTasksSection(activeTasks)
  const resourcesSection = buildResourcesSection(resources)
  const globalDocsSection = buildGlobalDocsSection(globalDocs)

  return `You are Origo AI — AI ผู้ช่วยด้านการนำเข้า-ส่งออกจาก Origo
วันนี้คือ ${today}${globalInfoSection}${globalDocsSection}

## สิ่งที่รู้เกี่ยวกับ user (ถาวร):
${longTermText}${dailySection}${userConfigSection}${skillsSection}${reminderSection}${activeTasksSection}${resourcesSection}${userFilesSection}${attachedFilesSection}

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
- เมื่ออ่าน resource ผ่าน read_resource แล้วพบ workflow, process, หรือ pattern ที่ user น่าจะถามซ้ำในอนาคต → เรียก save_skill อัตโนมัติทันที โดยไม่ต้องรอให้ user สั่ง ตั้งชื่อ skill ให้สื่อความหมาย เช่น "Shipment Workflow", "Contract Review Process"
- ใช้ query_attached_file เมื่อ user ส่งไฟล์มาในแชท (CSV/JSON/TXT/XLSX) — ดู system prompt ส่วน "ไฟล์ที่แนบมา" สำหรับ fileId

## การค้นหาไฟล์ (สำคัญ):
- ไฟล์ทั้งหมดของ user อยู่ใน section "ไฟล์ข้อมูลของ user" ด้านบนแล้ว — ใช้ id จากนั้น call query_user_file ได้เลย ไม่ต้อง list ก่อน
- ถ้ามี local folder เปิดอยู่ด้วย → ให้ call list_folder_tree เพื่อดูไฟล์ใน folder
- อย่าสรุปว่า "หาไม่เจอ" โดยดูแค่ที่เดียว

## Local Folder (เมื่อ user เปิด folder ไว้):
- ใช้ list_folder_tree เพื่อดูโครงสร้างไฟล์ถ้ายังไม่รู้ว่ามีไฟล์อะไร
- ใช้ read_local_file เพื่ออ่านไฟล์ — ถ้า tool ตอบว่าไฟล์ไม่อยู่ใน context ให้บอก user ตรงๆ สั้นๆ เช่น "กรุณาพูดถึงชื่อไฟล์ในข้อความ เช่น 'ดูไฟล์ journal.txt ให้หน่อย'" — ห้ามแต่งภาษาแปลกหรือสร้าง UI เอง
- ใช้ write_local_file เพื่อสร้างหรือแก้ไขไฟล์ — เนื้อหาจะถูกเขียนลงเครื่อง user จริง
- ใช้ move_local_file เพื่อเปลี่ยนชื่อหรือย้ายไฟล์`
}
