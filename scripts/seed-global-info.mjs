const SECRET = 'ff3a827c88d46aa6488a3a5c98dc2588553e44bcbef7f835bfbc912b37f11cde'
const BASE = 'https://memory-chat-ochre.vercel.app'
const h = { 'Authorization': `Bearer ${SECRET}`, 'Content-Type': 'application/json' }

const upsert = async (key, value, sortOrder) => {
  const r = await fetch(`${BASE}/api/admin/global-info`, {
    method: 'POST', headers: h,
    body: JSON.stringify({ key, value, sortOrder })
  })
  const j = await r.json()
  console.log(`  ${r.ok ? '✅' : '❌'} ${key}`)
  return j
}

console.log('Seeding Global Info from Origo Brand Book...\n')

// Core identity
await upsert('company',         'Origo', 1)
await upsert('base',            'Singapore-based consultancy', 2)
await upsert('tagline',         'Fewer guesses. Better decisions. Faster growth. — ลดการคาดเดา ตัดสินใจแม่นยำขึ้น เร่งการเติบโตของธุรกิจ', 3)
await upsert('core_message',    'Origo reads market signals — so businesses know where, who, and when to sell. / Origo ถอดรหัสสัญญาณตลาด เพื่อให้ธุรกิจรู้ว่า ควรขายที่ไหน ขายให้ใคร และขายเมื่อไร', 4)
await upsert('description',     'Market-Signal & Decision Architecture Consultancy — ถอดรหัสสัญญาณตลาดและออกแบบระบบการตัดสินใจสำหรับผู้บริหาร ประสบการณ์เกือบ 20 ปีในตลาดระหว่างประเทศ', 5)

// What we do / don't do
await upsert('what_we_do',      'ช่วยผู้บริหารระบุสัญญาณตลาด (market signals) ออกแบบระบบการตัดสินใจ (decision architecture) และจัดลำดับการดำเนินงานก่อนลงทุน — เปลี่ยนข้อมูลตลาดที่ซับซ้อนให้เป็นทิศทาง go-to-market ที่ชัดเจน', 6)
await upsert('what_we_dont_do', 'เราไม่ขายเครื่องมือ ไม่ขายข้อมูลดิบ ไม่ขายการตัดสินใจบนสมมติฐาน (We don\'t sell tools. We don\'t sell data. We don\'t sell assumption-based decisions.)', 7)

// Core principle
await upsert('principle_92_8',  '92%/8% Principle: ระบบและ AI จัดการ 92% ของงานประจำ — เพื่อให้ผู้บริหารใช้พลัง 8% กับสิ่งที่สร้างคุณค่าจริง: ความสัมพันธ์ ลูกค้าที่ใช่ และการเติบโตระยะยาว', 8)

// 3 Pillars
await upsert('pillar_1',        'Pillar 1 — Market Signals & Direction: ถอดรหัสพฤติกรรมผู้ซื้อและการเคลื่อนไหวของตลาด แปลงเป็นทิศทางการตลาดที่แม่นยำ', 9)
await upsert('pillar_2',        'Pillar 2 — Capital Efficiency (CAC↓ / LTV↑): ออกแบบการตัดสินใจเพื่อลดต้นทุนหาลูกค้า และเพิ่มมูลค่าลูกค้าระยะยาว ก่อนตัดสินใจลงทุน', 10)
await upsert('pillar_3',        'Pillar 3 — Strategic Decision Focus: ออกแบบกรอบการตัดสินใจเพื่อให้ผู้บริหารโฟกัสกับความสัมพันธ์ ลูกค้าที่ใช่ และการเติบโตที่ยั่งยืน', 11)

// Offers
await upsert('offer_1',         'Hero Offer 1 — Market Signal Direction: 250,000 THB / 90 วัน — ถอดรหัสสัญญาณตลาด ระบุว่าควรขายที่ไหน โฟกัสใคร และไม่ควรเสียเวลากับอะไร', 12)
await upsert('offer_2',         'Hero Offer 2 — Enterprise Signal Architecture: 600,000–1,200,000 THB / 90 วัน — สถาปัตยกรรมสัญญาณระดับองค์กร เชื่อมรายได้ ต้นทุน และการดำเนินงานเข้าสู่ระบบการตัดสินใจผู้บริหาร', 13)

// Self-pitch (for AI to know how to introduce Origo)
await upsert('self_pitch',      '"We\'re Origo. We help companies decide where to sell and where not to waste time — before they spend money, build teams, or scale." / "Origo ช่วยผู้บริหารตัดสินใจให้ชัดว่า ควรขายที่ไหน โฟกัสใคร และไม่ควรเสียเวลากับอะไร ก่อนเสียเงิน เสียเวลา และขยายทีมผิดทาง"', 14)

console.log('\nDone.')
