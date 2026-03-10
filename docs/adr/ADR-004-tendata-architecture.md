# ADR-004: Tendata Architecture — Backend-Only via UserTradeData

**Date:** 2026-03-10
**Status:** Accepted

## Context

Tendata tools (`list_trade_companies`, `rank_trade_companies`, `query_trade_data`) ถูก implement ให้ AI เรียก Tendata API ตรงๆ ทุกครั้งที่ user ถาม

ปัญหาที่พบ:
1. **Point burn ควบคุมไม่ได้** — user ถามซ้ำ 10 ครั้ง = เผา 10× points ข้อมูลเดิม
2. **Cost model ผิด** — ลูกค้า search ตรง = ลูกค้า burn Tendata points ของเรา (ยิ่งใช้ ยิ่งขาดทุน)
3. **User experience ผิด** — ลูกค้า Origo ไม่ควรรู้ว่า Tendata คืออะไร → เราเป็น data moat ให้เขา
4. **Rate limit ไม่พอ** — 500 pts/user/day ทำให้ advanced queries ที่แพง (rank = 12pt/item) ใช้ได้แค่ไม่กี่ครั้ง

Business model จริง:
- เราวิเคราะห์ business ของลูกค้า → รู้ว่า SKU ของเขาคืออะไร
- เรา (ทีม Origo) query Tendata สำหรับ SKU นั้น → เก็บผลลงใน DB ของเรา
- ลูกค้า search ใน **ฐานข้อมูลของเรา** — ฟรี ไม่ burn points

## Decision

แทนที่ 3 Tendata tools ด้วย architecture ใหม่:

**ฝั่ง AI (user-facing):**
- ลบ `list_trade_companies`, `rank_trade_companies`, `query_trade_data` ออกจาก tool definitions
- เพิ่ม `search_market_data(skuTag, tradeDirection?, country?, dataType?)` — query `UserTradeData` table (ฟรี)

**ฝั่ง Admin (team-facing):**
- `POST /api/admin/trade-sync` (protected by ADMIN_SECRET) — ทีม Origo ใช้ populate data ต่อ user/SKU
- เรียก Tendata API จริง → upsert ผลลงใน `UserTradeData` → track usage ภายใน

**Staleness policy:**
- `company_list`, `company_ranking` — stale หลัง 90 วัน (แสดง warning แต่ยังใช้ได้)
- `shipment_records` — ไม่มี expiry (historical data ไม่เปลี่ยน)

## Alternatives Considered

**Option A: Keep direct API tools + aggressive caching (1 ชั่วโมง)**
- ❌ cache miss ครั้งแรกยัง burn points เต็ม
- ❌ ไม่แก้ปัญหา cost model — ยิ่งใช้ ยิ่งแพง
- ❌ user query อิสระ = ควบคุม scope ไม่ได้

**Option B: Direct tools แต่ให้ user เห็น point cost ก่อน confirm**
- ❌ UX แย่ — interrupt flow ทุกครั้ง
- ❌ ยังไม่แก้ปัญหา cost model จริง

**Option C: UserTradeData + admin sync (chosen)**
- ✅ ลูกค้า search ฟรี — cost model ถูกต้อง
- ✅ ทีม Origo control ว่า SKU ไหนมีข้อมูลอะไร → competitive positioning
- ✅ Tendata points ใช้แบบ batch (efficient กว่า on-demand 10× ขึ้นไป)
- ✅ Data ค้างไว้ใน DB → AI response เร็วขึ้น, offline-capable
- ⚠️ ต้อง manual sync เมื่อ onboard ลูกค้าใหม่ หรือ SKU เปลี่ยน → acceptable สำหรับ B2B niche

## Consequences

**ได้:**
- Cost model ถูกต้อง: เรา control Tendata spend ทั้งหมด
- Scalability: ลูกค้า 100 คน ถามซ้ำ = 0 extra points (query DB เท่านั้น)
- Curated data: เราคัดกรองแล้วก่อน user เห็น → quality สูงกว่า raw results

**เสีย:**
- ต้อง sync ก่อน user ถาม — lazy-on-demand ไม่ได้อีกต่อไป
- Admin overhead: ทีมต้องรัน trade-sync ตอน onboard ลูกค้าใหม่
- Data freshness: ขึ้นอยู่กับความถี่ที่ทีม sync

**Trade-off ที่ยอมรับ:** business correctness + cost control > convenience of on-demand queries

**Files changed:**
- `prisma/schema.prisma` — UserTradeData table
- `lib/repositories/trade-data.repo.ts` (new)
- `lib/tools/definitions.ts` — remove 3 tools, add search_market_data
- `lib/tools/handlers.ts` — remove 3 cases, add search_market_data case
- `app/api/admin/trade-sync/route.ts` (new)
