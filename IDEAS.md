# IDEAS.md — memory-chat

ไอเดียสำหรับ product ในอนาคต บันทึกไว้เพื่อ brainstorm

## Format
- `[ ]` — ยังไม่ได้ทำ
- `[x]` — ทำแล้ว

---

## Agent Layer — Phase 3 (Future)

[ ] **UserAgent table** — per-company agent ที่ Origo สร้างให้
- fields: name, systemPrompt, tools[], linkedSkills[], companyContext
- ตัวอย่าง: "sugar-export-analyst" รู้ HS 1701, ตลาด China/Indonesia, pricing ICUMSA
- บริษัท A (น้ำตาล) กับ B (เหล็ก) ได้ agent ต่างกันสิ้นเชิง
- Origo สร้าง/แก้ไข agent ผ่าน Admin UI

[ ] **Agent Workflows** — chain skills หลาย step อัตโนมัติ
- ตัวอย่าง: "monthly_report" → query shipment → Tendata → cross-ref buyers → render chart
- Phase ก่อน full agent: ใช้ skill chaining ที่มีอยู่แล้ว

[ ] **Automation / Cron Workflows**
- Agent รัน background task อัตโนมัติ เช่น Tendata sync รายสัปดาห์
- Proactive alerts ส่งหา user เมื่อ condition ตรง

---

## Admin UI — Phase 2 (Next)

[ ] **Admin UI** `/admin` — หน้า Origo team ใช้ แทนการยิง curl ด้วยมือ
- list users + สถานะ dashboard, files, skills, agents ของแต่ละ user
- set/edit widget config ผ่าน UI
- upload file แทน user ได้
- **User Graph View** — visualize การเชื่อมโยง per user (แรงบันดาลใจ: n8n, Opal, Supabase schema visualizer)
  - node: User → Files → Dashboard Widgets → Skills → Agents → Memory
  - เห็น dependency ทันทีว่า widget ไหนใช้ file ไหน, skill ไหน active, agent ไหน assign
  - ช่วย Origo debug + configure ได้เร็วโดยไม่ต้องดู raw JSON
- protected ด้วย ADMIN_SECRET
- priority: **สูง**

[ ] **File Versioning** — re-upload ไฟล์ใหม่ทดแทน fileId เดิมได้
- upload ทับ fileId เดิม → dashboard config ไม่ต้องแก้เลย
- priority: **ปานกลาง** — ทำหลัง Admin UI

---

## Local Data Sync — Architecture Decision

**ข้อเท็จจริง**: ลูกค้า Origo เก็บข้อมูลใน **local computer** ทั้งหมด

**Browser limitation**: Persistent local folder connection ทำไม่ได้ใน web — FileSystem API ต้องขอ permission ใหม่ทุก refresh (by design, ไม่มีทางเลี่ยง)

**Roadmap ที่ตัดสินใจ:**

Phase 2 — Folder Upload (Admin UI)
- ลูกค้าส่ง folder มาให้ทีม Origo (USB / WeTransfer / Line / etc.)
- ทีม Origo clean data
- Admin UI → เลือก folder ทั้งอัน → upload พร้อมกันทุกไฟล์ (`webkitdirectory`)
- เก็บใน DB → persistent ถาวร → AI + Dashboard ใช้ได้เลย
- Origo จัดการทั้งหมด ลูกค้าไม่ต้องทำอะไร ✅

Phase 3 — Desktop Companion App
- Electron / Tauri app เล็กๆ ให้ลูกค้าติดตั้ง
- เลือก folder ครั้งเดียว → watch อัตโนมัติ → sync ขึ้น server
- Origo approve → อัปเดต dashboard
- Real-time sync จริง แต่ต้องให้ลูกค้าติดตั้ง

Phase 4 — Google Drive Migration (long-term vision)
- แนะนำลูกค้าย้ายมาเก็บข้อมูลบน Google Drive
- OAuth ครั้งเดียว → sync ถาวร → ไม่ต้องติดตั้งอะไร
- เหมาะสุดระยะยาว แต่ต้องเปลี่ยน behavior ลูกค้า

---

## Dashboard — Next Steps (Priority)

[ ] **Admin UI** — หน้า `/admin` สำหรับทีม Origo แทนการยิง curl ด้วยมือ
- list users ทั้งหมด + สถานะ dashboard ของแต่ละคน
- set/edit widget config ผ่าน UI (ไม่ต้องแตะ JSON)
- upload file แทน user ได้
- protected ด้วย ADMIN_SECRET เหมือน API ปัจจุบัน
- priority: **สูง** — จำเป็นเมื่อ user เพิ่มขึ้น

[ ] **File Versioning** — re-upload ไฟล์ใหม่ทดแทน fileId เดิมได้
- ปัจจุบัน: upload ใหม่ → fileId ใหม่ → ต้องแก้ dashboard config ทุก widget
- เป้าหมาย: upload ทับ fileId เดิม → dashboard config ไม่ต้องแก้เลย
- priority: **ปานกลาง** — ทำหลัง Admin UI

---

## Ideas

[ ] Claude works directly in Excel — let Claude handle formulas, formatting, and data cleanup right inside your spreadsheets (Excel/Google Sheets integration)
[ ] Google Sheets connector — user connect Google Sheets แทน CSV upload ข้อมูล sync realtime ไม่ต้อง re-upload ทุกครั้ง
[ ] Daily briefing บน empty state `/chat` — แสดง section "วันนี้" ด้านบนหน้า greeting ทุกเช้า เช่น task เลย due, shipment ใกล้ถึง ดึงข้อมูลตอน render ไม่ต้อง cron job ไม่สร้าง conversation ขยะ

## Memory & AI Self-Development

[ ] Memory Decay — ความทรงจำที่ไม่ได้ใช้นานควรเลือนหาย เพิ่ม lastUsedAt tracking และ archive memory ที่ไม่ active นาน 3-6 เดือน
[ ] Contradiction Detection — AI จับได้เมื่อ user พูดข้อมูลที่ขัดแย้งกับ memory เดิม แล้วถามให้ชัดแทนที่จะเก็บทั้งคู่
[ ] Memory Confidence Score — memory แต่ละอันมี score พูดครั้งเดียว = low, พูดซ้ำหลายครั้ง = high ใช้แบบระมัดระวังตาม score
[ ] Skill Evolution — skill ที่ถูกเรียกใช้แล้วผิดพลาดถูก revise เอง ถ้าสำเร็จ confidence เพิ่ม เป็น skill ที่มีชีวิต
[ ] Pattern → Rule Auto-generation — AI สังเกต pattern การ reject ของ user แล้ว generate user_config ใหม่เองโดยอัตโนมัติ
[ ] Negative Memory — เก็บ "สิ่งที่ไม่ควรทำกับ user คนนี้" แยกออกมาเป็น memory กลุ่มพิเศษ
[ ] Agent Workflow — Skills หลายอันที่ใช้ต่อกันเสมอ → AI เสนอ bundle เป็น workflow ที่เรียกได้ด้วยคำเดียว เช่น "weekly report"
[ ] Memory → Skill → Agent evolution chain — pattern ซ้ำ → Skill → Skills ต่อกัน → Agent อัตโนมัติ
[ ] Cross-user learning — ถ้า users หลายคนถามเรื่องเดิมซ้ำๆ → กลายเป็น Global Skill อัตโนมัติ ความรู้ user level → platform level

## Reports / Blog Tab

[ ] **Auto-generated Daily Report Tab** — แท็บ "Report" หรือ "Digest" ที่ AI เขียนบทความ/summary ให้อัตโนมัติทุกวัน
- เนื้อหาที่น่าสนใจ: shipment summary, task overdue, market movement (จาก Tendata), บริษัทที่ active
- Trigger: cron job รายวัน หรือ generate ตอน user เปิดแท็บ (lazy) ก็ได้
- Format: Markdown article ที่ AI เขียน — ไม่ใช่ dashboard ตาราง — อ่านได้เหมือน briefing จริง
- เปรียบได้กับ morning briefing ที่ PA เตรียมให้ก่อนเริ่มงาน
- ความแตกต่างจาก News feed ทั่วไป: เนื้อหาเป็นข้อมูลภายในบริษัทของ user เอง ไม่ใช่ข่าวภายนอก
- เพิ่ม external news layer ทีหลังได้ (trade news, tariff updates) → merge กับ internal data เป็น "context-aware news"
- Personalization: AI รู้ว่า user สนใจ market ไหน, SKU ไหน → เลือก highlight ที่ relevant เท่านั้น

## AI Behavior & UX

[ ] Proactive AI — AI ถามก่อนโดยไม่รอถูกถาม เช่น รู้ว่า user จะ negotiate เดือนหน้า → เสนอเตรียมข้อมูลให้ก่อนเลย เปลี่ยนจาก reactive → proactive
[ ] Memory Summarization — เมื่อ memory สะสมมากๆ AI consolidate เองเป็นระยะ compress 20 memory → 3 อันที่สำคัญที่สุด คล้าย sleep consolidation ของสมองคน
[ ] Relationship Graph — memory เป็น graph ไม่ใช่ flat list supplier A → product B → ตลาด C → HS code D ถาม B ได้ทุกอย่างที่เกี่ยวข้องมาอัตโนมัติ
[ ] Transparency Layer — user กด "ทำไม?" ใต้ response ใดก็ได้ AI อธิบายว่าใช้ memory/skill อะไรในการตอบ สร้าง trust และความเข้าใจ
[ ] Extended Thinking (Chain of Thought) — แสดงกระบวนการ reasoning ของ AI ระหว่างรอคำตอบ ละเอียดกว่า tool badges ปัจจุบัน user เห็นว่า AI กำลังคิดถึง supplier/ราคา/ตลาดอะไรก่อนตอบ สร้าง trust และทำให้การรอไม่น่าเบื่อ (Anthropic มี Extended Thinking API รองรับอยู่แล้ว)
