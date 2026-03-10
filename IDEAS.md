# IDEAS.md — memory-chat

ไอเดียสำหรับ product ในอนาคต บันทึกไว้เพื่อ brainstorm

## Format
- `[ ]` — ยังไม่ได้ทำ
- `[x]` — ทำแล้ว

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
