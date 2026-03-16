const SECRET = 'ff3a827c88d46aa6488a3a5c98dc2588553e44bcbef7f835bfbc912b37f11cde'
const BASE = 'https://memory-chat-ochre.vercel.app'
const h = { 'Authorization': `Bearer ${SECRET}`, 'Content-Type': 'application/json' }

const upsert = async (doc) => {
  const r = await fetch(`${BASE}/api/admin/global-docs`, {
    method: 'POST', headers: h,
    body: JSON.stringify(doc)
  })
  const j = await r.json()
  if (!r.ok) { console.log(`  ❌ ${doc.title}:`, j); return }
  console.log(`  ✅ ${doc.title}`)
}

console.log('Seeding GlobalDocs from Origo Brand Book...\n')

await upsert({
  category: 'company',
  docType: 'overview',
  title: 'Origo — Who We Are',
  sortOrder: 1,
  content: `Origo is a Singapore-based Market-Signal & Decision Architecture Consultancy.

Vision: เป็นจุดเริ่มต้นที่ผู้บริหารเปลี่ยนความซับซ้อนในตลาด ให้กลายเป็นภาพที่ชัดเจนในการตัดสินใจ

Mission: ช่วยผู้บริหารเห็นสัญญาณตลาดที่ชัดเจน ออกแบบระบบตัดสินใจที่แม่นยำ และเลือกสิ่งที่ควรทำก่อน — ก่อนที่จะลงทุนทรัพยากรใดๆ

เราทำงานในระดับการตัดสินใจ ก่อนที่เครื่องมือจะถูกพัฒนา ทีมจะถูกสร้าง หรืองบจะถูกจัดสรร

What we DON'T do: เราไม่ขายเครื่องมือ ไม่ขายข้อมูลดิบ ไม่ขายการตัดสินใจบนสมมติฐาน`
})

await upsert({
  category: 'company',
  docType: 'reference',
  title: 'Origo — 3 Core Pillars',
  sortOrder: 2,
  content: `Pillar 1 — Market Signals & Direction
เราถอดรหัสพฤติกรรมผู้ซื้อ การเคลื่อนไหวของตลาด และแปลงเป็นทิศทางการตลาดที่แม่นยำ

Pillar 2 — Capital Efficiency (CAC↓ / LTV↑)
ออกแบบการตัดสินใจเพื่อลดต้นทุนการหาลูกค้า (CAC) และเพิ่มมูลค่าลูกค้าระยะยาว (LTV) — ก่อนตัดสินใจลงทุน เลือกคู่ค้า หรือสร้างแบรนด์ในตลาด

Pillar 3 — Strategic Decision Focus (92%/8%)
ระบบและ Automation จัดการ 92% ของงานประจำ — เพื่อให้ผู้บริหารใช้พลัง 8% กับสิ่งที่สร้างคุณค่าจริง: ความสัมพันธ์ ลูกค้าที่ใช่ และการเติบโตที่ยั่งยืน`
})

await upsert({
  category: 'company',
  docType: 'service',
  title: 'Origo — Hero Offers & Pricing',
  sortOrder: 3,
  content: `HERO OFFER 1 — Market Signal Direction
ราคา: 250,000 THB | ระยะเวลา: 90 วัน
"ถอดรหัสสัญญาณตลาด — เพื่อรู้ว่าควรขายที่ไหน โฟกัสใคร และไม่ควรเสียเวลากับอะไร"

Signal Validation Layer (Add-on +50,000 THB)
ยืนยันว่าสัญญาณตลาดและการตอบสนองจากผู้ซื้อมีอยู่จริง

สิ่งที่ได้รับ:
- Market landscape mapping
- Buyer & customer prioritisation
- Signal-based market selection
- Sales direction & outreach playbook
- Visualized in Notion

ผลลัพธ์: ทิศทางที่ชัดว่าควรขายที่ไหน โฟกัสใคร และอะไรที่ควรตัดออก — ภายใน 90 วัน

---

HERO OFFER 2 — Enterprise Signal Architecture
ราคา: 600,000–1,200,000 THB | ระยะเวลา: 90 วัน
"สถาปัตยกรรมสัญญาณระดับองค์กร — เชื่อมรายได้ ต้นทุน และการดำเนินงานเข้าสู่ระบบการตัดสินใจผู้บริหาร"

สิ่งที่ได้รับ:
1. Executive-level performance architecture (EPM)
2. Cost & efficiency mapping
3. Sales, purchasing & supply-chain visibility
4. Scenario modelling ("What happens if…?")
→ ออกแบบ "ตรรกะการตัดสินใจ" ก่อนสร้างหรือเลือกใช้ซอฟต์แวร์ใดๆ`
})

await upsert({
  category: 'company',
  docType: 'workflow',
  title: 'Origo — Sales Playbook & Self-Pitch',
  sortOrder: 4,
  content: `THE MASTER SELF-PITCH (10 seconds)
EN: "We're Origo. We help companies decide where to sell and where not to waste time — before they spend money, build teams, or scale."
TH: "Origo ช่วยผู้บริหารตัดสินใจให้ชัดว่า ควรขายที่ไหน โฟกัสใคร และไม่ควรเสียเวลากับอะไร ก่อนเสียเงิน เสียเวลา และขยายทีมผิดทาง"

---

SALES PLAYBOOK — 3 Steps

Step 1: Open Questions (Signal-to-Noise Awakening)
- "กำไรต่อดีลเฉลี่ยประมาณเท่าไรครับ?"
- "โดยเฉลี่ยทีมขายปิดได้ประมาณกี่ดีลต่อเดือนครับ?"
- "ต้นทุนหาลูกค้ารวมๆ ปีละประมาณเท่าไร? (งบ+เวลา+ทีม+อีเวนต์)"
- "มีตัวเลขที่ 'เสียไป' จากการเลือกตลาด/ลูกค้าผิดไหมครับ?"
- "ถ้าช่วยไม่เสียไปอีก 1 เดือน หรือเพิ่มดีลที่ใช่ได้ 1 ดีล มูลค่าประมาณเท่าไร?"

Step 2: Reframe
"หลายธุรกิจไม่ได้พลาดเพราะบริหารไม่เป็น แต่พลาดเพราะทำ 'ผิดทาง' นานเกินไป"

Step 3: CTA
ประเมิน Sales + Marketing + Exhibition budget → คำนวณ Value → ปิดที่ราคาที่ลูกค้าไม่ควรจ่ายเกิน 2xx,xxx บาท

---

Q&A — Data Sources:
Type 1 — Buyer Activity Signals: ติดตามว่าใครกำลังซื้ออยู่ในตลาด
Type 2 — Market Behaviour Signals: สังเกตการเคลื่อนไหวของตลาดในช่วงเวลา
Type 3 — Execution Reality Signals: ยืนยันด้วย real sales conversations

Why NOT search tools: "Search tools tell you what exists. They don't tell you what's moving, who's serious, when's timing to sell."`
})

await upsert({
  category: 'knowledge',
  docType: 'reference',
  title: 'Origo — What We Believe (92/8 Principle)',
  sortOrder: 5,
  content: `เราเชื่อว่าอุตสาหกรรมทั่วโลกกำลังถูกออกแบบใหม่ด้วยสถาปัตยกรรมข้อมูลและ AI ที่เปลี่ยนโครงสร้างตลาด ลำดับความสำคัญ และสัญญาณในการตัดสินใจ

The 92%/8% Principle:
ความได้เปรียบทางการแข่งขันจะเกิดกับผู้นำที่สามารถวางระบบบนสถาปัตยกรรมใหม่นี้ และจัดการ 92% ของการดำเนินงานให้เป็นโครงสร้างที่ขับเคลื่อนด้วยข้อมูล

เพื่อให้ 8% ของการตัดสินใจของผู้บริหารถูกใช้กับสิ่งที่สำคัญที่สุด: ลูกค้าและคู่ค้าที่เหมาะสม การสร้างความสัมพันธ์ และการเติบโตอย่างยั่งยืนในระยะยาว

"Origo ออกแบบ 92% เพื่อให้ 8% ของผู้บริหารถูกใช้กับสิ่งที่สร้างการเติบโตจริง"`
})

console.log('\nDone.')
