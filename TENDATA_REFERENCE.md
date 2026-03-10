# Tendata API Reference

Last updated: 2026-03-06

---

## About Tendata

Shanghai Tendata Tech Co., Ltd ก่อตั้งปี 2005 สำนักงานใหญ่ที่ Lujiazui Financial District, Shanghai
เป็น global trade data provider ชั้นนำของ Asia ให้บริการข้อมูล import/export จาก 228 ประเทศ
มีข้อมูลการค้ากว่า 10 billion transactions อัปเดตทุก 3-5 วัน ให้บริการลูกค้ากว่า 100,000 รายทั่วโลก

**Website:** https://www.tendata.com
**API Base URL:** `https://open-api.tendata.cn`
**Official API Docs:** `https://open-api.tendata.cn/en/`

---

## Test Account

| Item | Value |
|---|---|
| API Key (active ✅) | `6b80f01064d2586f44047286fddb9893` |
| API Key (Postman — ใช้ไม่ได้ ❌) | `6b80f0164d2586f44047286fddb9893` |
| Total Points | 12,000 (fixed, no top-up) |
| Test Period | 2 weeks from 2026-03-05 (expires ~2026-03-19) |
| Rate Limit | 200 req/min, 20,000 req/day |
| Re-test Fee | $30/ครั้ง (หักจากค่า contract ได้เต็มจำนวน) |

> **Key inconsistency:** Python script ใช้ key คนละตัวกับ Postman — ถ้า call fail ให้ตรวจสอบว่า key ที่ใช้คือ `6b80f0164d2586f44047286fddb9893`

### ข้อจำกัดของ Test Key

- ใช้สำหรับ **interface function verification เท่านั้น**
- ห้ามใช้ใน production, ห้าม share, ห้าม transfer, ห้าม disclose ภายนอก
- **ห้าม** stress testing / high concurrency / batch traversal / scanning โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร
- Tendata สามารถ suspend/terminate key ได้ทันทีเมื่อตรวจพบ abnormal behavior

### Test สิ้นสุดเมื่อ (อย่างใดอย่างหนึ่ง)

1. ครบ 2 สัปดาห์
2. Points หมด
3. Key ถูก suspend เพราะพฤติกรรมผิดปกติ
4. แจ้งยกเลิกล่วงหน้าเป็นลายลักษณ์อักษร

---

## Authentication (2-step)

### Step 1 — Get Access Token

```
GET https://open-api.tendata.cn/v2/access-token?apiKey=<apiKey>
```

Response:
```json
{
  "success": true,
  "code": "200",
  "msg": "OK",
  "traceId": "...",
  "data": {
    "accessToken": "<TOKEN>",
    "tokenType": "Bearer",
    "expiresIn": 7200
  }
}
```

- Token มีอายุ **7200 วินาที (2 ชั่วโมง)**
- ควร cache token และ refresh ก่อนหมดอายุ 1 นาที

### Step 2 — Use Bearer Token

```
Authorization: Bearer <accessToken>
Content-Type: application/json; charset=utf-8
```

---

## Point Cost per Endpoint

| Endpoint | Description | Points/item |
|---|---|---|
| `/v2/trade` | Trade records (full detail) | **6** |
| `/v2/trade/importers-name` | List of importer names only | **1** |
| `/v2/trade/exporters-name` | List of exporter names only | **1** |
| `/v2/trade/importers` | Importers with price info | 12 |
| `/v2/trade/exporters` | Exporters with price info | 12 |
| `/v2/trade/importers-stat` | Importers volume & price summary | 40 |
| `/v2/trade/exporters-stat` | Exporters volume & price summary | 40 |
| `/v2/trade/count` | Trade count only | (cheap) |
| `/v2/company` | Company information | 62 |
| `/v2/contact` | Contact email | 62 |

> **Strategy:** ใช้ `/importers-name` หรือ `/exporters-name` ก่อน (1 point) → ถ้าต้องการรายละเอียดค่อยเรียก `/v2/trade` (6 points)

---

## Known Issues

- `POST /v2/trade/search` — tested แล้ว แต่ response อาจ return `success=true` และ `data.content=null` → **ไม่ใช้ endpoint นี้**
- ใช้ `POST /v2/trade` แทนเสมอสำหรับ trade records

---

## Endpoints

### 1. Trade Records — `POST /v2/trade`

ดึง trade records แบบละเอียด (วันที่, บริษัท, ประเทศ, HS Code)

**Cost:** 6 points/record

**Request Body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `pageNo` | number | Yes | เริ่มจาก 1 |
| `pageSize` | number | Yes | max แนะนำ 10-20 ในช่วง test |
| `catalog` | string | Yes | `"imports"` หรือ `"exports"` |
| `startDate` | string | Yes | `YYYY-MM-DD` |
| `endDate` | string | Yes | `YYYY-MM-DD` |
| `hsCode` | string | Conditional* | HS Code เช่น `"63049239"` |
| `importer` | string | Conditional* | ชื่อบริษัท importer |
| `exporter` | string | Conditional* | ชื่อบริษัท exporter |
| `searchMode` | string | No | `"FUZZY_SINGLE"` สำหรับ fuzzy search |

*ต้องมีอย่างน้อย 1 ใน `hsCode`, `importer`, `exporter`

**Response:**
```json
{
  "success": true,
  "code": "200",
  "data": {
    "page": 1,
    "size": 10,
    "total": 1691,
    "content": [
      {
        "date": "2023-06-15",
        "importer": "AMITY IMPORTS INC",
        "exporter": "SOME EXPORTER CO LTD",
        "hsCode": "63049239",
        "countryOfOrigin": "CHINA",
        "countryOfDestination": "UNITED STATES"
      }
    ]
  }
}
```

---

### 2. List Importer Names — `POST /v2/trade/importers-name`

ดึงรายชื่อ importer ที่ match กับ criteria — **ถูกที่สุด ใช้แทน /v2/trade เมื่อต้องการแค่ชื่อ**

**Cost:** 1 point/item

**Request Body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `pageNo` | number | Yes | เริ่มจาก 1 |
| `pageSize` | number | Yes | จำนวน items ต่อหน้า |
| `catalog` | string | Yes | `"imports"` หรือ `"exports"` |
| `startDate` | string | Yes | `YYYY-MM-DD` |
| `endDate` | string | Yes | `YYYY-MM-DD` |
| `hsCode` | string | Conditional* | HS Code (4+ digits) |
| `productDesc` | string | Conditional* | คำอธิบายสินค้า คั่นด้วย `;` |
| `countryOfOriginCode` | string | No | รหัสประเทศต้นทาง เช่น `"CHN"` |
| `countryOfDestinationCode` | string | No | รหัสประเทศปลายทาง เช่น `"USA"` |
| `portOfDeparture` | string | No | ท่าเรือต้นทาง |
| `portOfArrival` | string | No | ท่าเรือปลายทาง |
| `transportType` | string | No | วิธีขนส่ง เช่น `"Sea Freight"` |
| `weight` | array | No | ช่วง weight `[min, max]` หน่วย kg |
| `sumOfUSD` | array | No | ช่วงมูลค่า `[min, max]` USD |
| `filterBlankFields` | array | No | กรองบริษัทที่ชื่อว่าง: `["importer"]` |
| `filterLogisticFields` | array | No | กรองบริษัท logistics: `["importer"]` |
| `searchMode` | string | No | `"FUZZY_SINGLE"` |
| `containProducer` | boolean | No | รวม production enterprises |

*ต้องมีอย่างน้อย 1 ใน `hsCode`, `productDesc`, `importer`, `exporter`

**Response:**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "total": 150,
    "pageNo": 1,
    "pageSize": 10,
    "list": [
      { "name": "FA HOME AND APPAREL PRIVATE LIMITED" },
      { "name": "MASTER LINENS INC" }
    ]
  }
}
```

---

### 3. List Exporter Names — `POST /v2/trade/exporters-name`

เหมือน importers-name ทุกอย่าง แต่ดึงรายชื่อ exporter

**Cost:** 1 point/item
**Path:** `POST /v2/trade/exporters-name`
**Parameters:** เหมือนกันทุก field กับ `/v2/trade/importers-name`

---

## Error Codes

| Code | Meaning | Action |
|---|---|---|
| `TOKEN_INVALID` | Token ไม่ถูกต้อง | ขอ token ใหม่ |
| `TOKEN_EXPIRED` | Token หมดอายุ | ขอ token ใหม่ แล้ว retry |
| `NOT_ENOUGH` | Points หมด | หยุดใช้งาน |
| `NOT_PERMISSION` | Account หมดอายุหรือไม่มีสิทธิ์ | ติดต่อ Tendata |
| `FREQUENCY_LIMIT` | เกิน 200 req/min | รอแล้ว retry |
| `DAY_LIMIT` | เกิน 20,000 req/day | รอวันถัดไป |
| `PARAM_ERROR` / `40003` | Parameter ไม่ครบหรือผิด | ตรวจสอบ required fields |
| `SIZE_LIMIT` | pageSize เกิน limit | ลด pageSize |

---

## Response Validation Checklist

ทุก response ต้องตรวจสอบตามลำดับนี้:

1. HTTP status = 200
2. `success` = true
3. `code` และ `msg` — ถ้า false ให้ดู code ก่อน action
4. เก็บ `traceId` ไว้ใน log เสมอ
5. Parse `data` เฉพาะเมื่อ `success=true`
6. Retry ครั้งเดียวหลัง token refresh เมื่อได้ `TOKEN_INVALID` / `TOKEN_EXPIRED`

---

## Postman Collection

ไฟล์: `tendata_trade_api.postman_collection.json`

Collection variables:
- `baseUrl` = `https://open-api.tendata.cn`
- `apiKey` = `6b80f0164d2586f44047286fddb9893`
- `accessToken` = (set อัตโนมัติหลัง step 1)

วิธีใช้:
1. Import `tendata_trade_api.postman_collection.json`
2. Run `1) Get Access Token`
3. Run `2) Query Trade Records`
4. ดู `traceId`, `total`, `content[]`

---

## Best Practices (ประหยัด Points)

1. **Cache token** — token อายุ 2 ชม. อย่า request ใหม่ทุกครั้ง
2. **Cache query results** — query เดิมซ้ำไม่เสีย points (cache 1 ชม.)
3. **ใช้ `/importers-name` ก่อน** — 1 point แทน 6 points เมื่อต้องการแค่ชื่อ
4. **pageSize เล็ก** — เริ่มด้วย 10, อย่าดึง 100 ถ้าไม่จำเป็น
5. **Filter ให้แคบ** — ระบุ country code หรือ date range ที่แคบเพื่อลด total records
6. **เก็บ traceId ทุกครั้ง** — ใช้สำหรับ debug กับ Tendata support

---

## Integration in memory-chat

### Files
- `lib/tendata/client.ts` — API client (token cache + query cache + queryTrade)
- `lib/tools/definitions.ts` — tool `query_trade_data` สำหรับ Claude
- `lib/tools/handlers.ts` — handler ที่เรียก `queryTrade()`

### Env Variable
```
TENDATA_API_KEY=<key>   # ใส่ใน .env.local เท่านั้น ห้ามขึ้น Vercel production
```

### Recommended Next Tools to Add
1. `list_trade_companies` — เรียก `/v2/trade/importers-name` หรือ `/v2/trade/exporters-name` (1 point/item)
2. `query_trade_data` (existing) — เรียก `/v2/trade` เมื่อต้องการ full records (6 points/item)
