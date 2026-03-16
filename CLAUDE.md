# CLAUDE.md — memory-chat

## Claude API Knowledge Base
> **`ClaudeAPIDocs/`** — คลังเอกสาร Anthropic อย่างเป็นทางการ อ่าน `ClaudeAPIDocs/CLAUDE.md` ก่อนเสมอเมื่อ:
> - implement หรือแก้ไข `app/api/chat/route.ts` (context management, caching, compaction)
> - เพิ่ม beta feature ใหม่ (ต้องตรวจ beta header + parameter ที่ถูกต้อง)
> - มีคำถามเกี่ยวกับ Claude API behavior, token counting, หรือ prompt caching
> - ไม่แน่ใจว่า feature ใหม่ใน SDK ทำงานยังไง

## Development Process
> **ดู [`ENGINEERING.md`](./ENGINEERING.md)** สำหรับหลักการพัฒนาทั้งหมด: Now/Next/Later roadmap, ADR format, Appetite/No-gos, Tech Debt 20% rule, Working Backwards, Disagree & Commit, Feature Flags
>
> กฎ auto สำหรับ Claude:
> - ก่อนตัดสินใจ architecture ใหม่ → เขียน ADR ก่อน (`docs/adr/ADR-NNN-title.md`)
> - ก่อนเริ่ม feature → ถาม appetite: S/M/L และระบุ No-gos
> - ทุก cycle จอง 20% สำหรับ tech debt (Boy Scout Rule)
> - Prioritize จาก ENGINEERING.md roadmap section (NOW → NEXT → LATER)

## Project Overview
AI assistant สำหรับผู้ประกอบการ **นำเข้า-ส่งออก** โดยเฉพาะ — สร้างโดย **Origo** (18+ ปีใน import/export)
Stack: Next.js 16 + React 19 + Tailwind 4, Prisma, Supabase PostgreSQL, @anthropic-ai/sdk

### Business Context
- กลุ่มลูกค้า: ผู้ประกอบการ import/export เท่านั้น (niche, high-value) — 100% ของลูกค้าปัจจุบัน
- **1 user account = 1 บริษัท** — แต่ละ account แทน 1 บริษัทลูกค้า ไม่ใช่ individual user
- แต่ละบริษัทมีไฟล์หลายประเภท: ข้อมูลการเงิน, shipment records, product data ฯลฯ (flexible schema ต่างกันทุกบริษัท)
- **Data validation: human-in-the-loop** — ลูกค้า upload ไฟล์ → ทีม Origo review + clean ก่อนเสมอ ไม่ automated
- Data moat: Tendata — private trade data ที่คนทั่วไปเข้าไม่ถึง
- Lock-in strategy: AI เข้าใจ user ลึกขึ้นทุกวัน → ต้นทุนย้ายออกสูงมาก (ต้องสอน AI ใหม่ตั้งแต่ต้น)
- ใช้ **Claude API เท่านั้น** (Anthropic)

### Business Model — สำคัญมาก อ่านก่อนตัดสินใจทุกอย่าง
- **Invite-only, not self-serve** — ลูกค้าไม่ได้ register เอง ทีม Origo เป็นคนสร้าง account แล้วส่ง credentials ให้ลูกค้า login
- **Managed service** — ทีม Origo setup ทุกอย่างให้ลูกค้า (dashboard config, trade data sync, onboarding) ลูกค้าแค่ใช้งาน
- **ลูกค้าน้อย คุณภาพสูง** — ไม่ได้ออกแบบมาสำหรับ mass market → feature ที่ "scale ไม่ได้ถ้ามีลูกค้า 1,000 คน" ไม่ใช่ปัญหา
- **consequence สำหรับ Claude**: อย่าเสนอ self-serve flow เช่น "ให้ user config เอง" หรือ "ให้ user สมัครเอง" — ทีม Origo ทำให้ทั้งหมด

## Key Architecture

### Adding a New Claude Tool
ต้องแตะ 3 ไฟล์เสมอ:
1. `lib/tools/definitions.ts` — เพิ่ม tool definition (input_schema)
2. `lib/tools/handlers.ts` — เพิ่ม case ใน `executeToolCall()`
3. `lib/tendata/client.ts` — ถ้า tool เรียก Tendata API ให้เพิ่ม function ที่นี่

### Tendata Tools (3 tools)
| Tool | Endpoint | Cost |
|------|----------|------|
| `list_trade_companies` | `/v2/trade/importers-name` or `/exporters-name` | 1 pt/item |
| `rank_trade_companies` | `/v2/trade/importers` or `/exporters` | 12 pt/item |
| `query_trade_data` | `/v2/trade` | 6 pt/record |

- Response field: `data.content` (ไม่ใช่ `data.list`)
- Rate limit: 500 points/user/day (`lib/tendata/rate-limit.ts`)
- Cache: in-memory 1 ชั่วโมง (ใน `lib/tendata/client.ts`)

### Test Key Info
- Key: `6b80f01064d2586f44047286fddb9893`
- หมดอายุ: ~2026-03-19
- Total quota: 12,000 points (ไม่สามารถเติมได้)
- **ห้าม** stress test / batch / high concurrency

### Memory System
- `long_term` — ข้อมูลถาวร (ชื่อ งาน เป้าหมาย)
- `daily_log` — ข้อมูลชั่วคราว reset ทุกวัน
- Extraction: Haiku (`lib/memory/extract.ts`) หลังทุก conversation
- Injection: `lib/memory/inject.ts` → system prompt

### Rate Limiting
- Tendata: `lib/tendata/rate-limit.ts` — DAILY_POINT_LIMIT = 500
- AI tokens: `lib/ai/token-usage.ts` — tracking only (ไม่มี hard limit)
- Usage API: `GET /api/usage`

## File Structure
```
lib/
  tendata/
    client.ts         — Tendata API client (token cache + query cache)
    rate-limit.ts     — per-user daily point limit (500 pts/day)
  ai/
    token-usage.ts    — per-user daily token tracking
  tools/
    definitions.ts    — Claude tool schemas (ทุก tool อยู่ที่นี่)
    handlers.ts       — tool execution (receives userId)
  memory/
    extract.ts        — memory extraction (Haiku)
    inject.ts         — memory injection to system prompt
    title.ts          — conversation title generation
  repositories/
    conversation.repo.ts
    memory.repo.ts
    context.repo.ts
    file.repo.ts      — UserFile CRUD
    task.repo.ts      — Task CRUD
app/
  api/
    chat/route.ts     — main chat endpoint (streaming + tool loop)
    usage/route.ts    — GET usage stats
    conversations/    — CRUD conversations
    files/
      route.ts        — GET list / DELETE files (ใช้ Supabase auth — ใช้จาก Admin UI ไม่ได้)
      upload/route.ts — POST upload CSV → parse → JSONB
    config/
      route.ts        — GET list / POST upsert user_config
      [id]/route.ts   — PATCH / DELETE individual config
  chat/
    page.tsx          — empty state (functional input + quick chips)
    [id]/             — chat UI
  settings/
    page.tsx          — Account + AI Config settings
  admin/
    [id]/page.tsx     — Admin user detail (7 tabs: Graph/Files/Memories/Skills/Tasks/Agents/Config)
    api/admin/users/[id]/files/[fileId]/route.ts     — PUT replace / DELETE file (ADMIN_SECRET auth)
    api/admin/users/[id]/files/[fileId]/data/route.ts — GET JSONB data for download
components/
  admin/
    FileBrowser.tsx   — tree view group UserFiles by fileType เป็น folder (Admin Files tab)
    UserGraphView.tsx — radial spoke SVG graph (Admin Graph tab)
```

## DB Schema (Tables)
| Table | หน้าที่ |
|-------|---------|
| `User` | auth user |
| `Conversation` | การสนทนาแต่ละครั้ง |
| `Message` | messages ใน conversation |
| `Memory` | long_term + daily_log per user |
| `ConversationContext` | quiz state, current task, pending items |
| `UserFile` | CSV files (JSONB) — fileType, description, columns flexible |
| `Task` | action items — title, status, priority, dueDate, linkedCompany |

### UserFile Design
- **Flexible schema**: แต่ละ user มี fileType ต่างกัน (shipment, invoice, product, customer, lead, other)
- **ไม่มี fixed columns**: columns เก็บเป็น `TEXT[]`, data เก็บเป็น `JSONB`
- บริษัท A และ B อาจมี shipment file แต่ columns ต่างกันได้ — ไม่มีปัญหา
- Pattern: Core fields fixed (userId, fileType, status) + JSONB สำหรับส่วนที่ยืดหยุ่น

### Task Design
- status: `pending` | `in_progress` | `done` | `cancelled`
- priority: `low` | `normal` | `high` | `urgent`
- `linkedCompany` — optional เชื่อม task กับบริษัทที่เกี่ยวข้อง
- `dueDate` — optional สำหรับ reminder ในอนาคต

## UI Conventions (ตัดสินใจแล้ว)
- **ห้ามใช้ emoji เด็ดขาด** — ใช้ inline SVG icons เท่านั้น (Lucide-style paths)
- **Sidebar navigation**: Brand → [＋ New Chat] → CHATS list → divider → NAVIGATE → Footer
- **NAVIGATE**: Market | Tasks (2 items เท่านั้น — ไม่มี Company, ไม่มี Data, ไม่มี Plugins)
- **Plugins/Skills**: ถูกลบออกจาก sidebar และ right panel แล้ว (auto-injected ใน system prompt เท่านั้น)
- **Right Panel**: แสดง Connectors เท่านั้น — External (Tendata) + Internal Data (company files) + Upload button
  - เมื่อมี artifact → แสดง ArtifactPanel แทน
- **Tab row**: ถูกลบออกจาก topbar แล้ว — navigation อยู่ใน sidebar เท่านั้น
- **Topbar**: title + Share (→ "Copied" feedback) + Sonnet 4.6 label (non-interactive) เท่านั้น — ไม่มี Customize button แล้ว
- **Chat input**: "+" popover button เท่านั้น (แทน toolbar) → Attach file | Open folder
- **Folder badge**: แสดงเหนือ input box เมื่อ folder connected (badge + "AI can edit" label)
- **Empty state** (`/chat`): greeting + centered input + quick chips (หา Supplier, วิเคราะห์ตลาด, HS Code, คำนวณราคา, Shipment)
- **Active state**: `background: var(--accent)` + `color: var(--bg)` + `borderRadius: 6px`
- **Footer**: avatar + email + gear link (/settings) + sign-out SVG icon (logout arrow)
- **New Chat button**: `className="new-chat-btn-sidebar"` ใน globals.css

## Conventions
- `pageSize` default = 10, max = 20 สำหรับ Tendata calls
- ทุก Tendata case ใน handlers ต้อง: check limit → call API → record usage
- ไม่ over-engineer — ทำเฉพาะที่จำเป็น
- path alias `@/` = project root

## Data Cleaning Workflow (ทีม Origo ทำเอง ไม่ใช่ลูกค้า)

### Convention
- โฟลเดอร์: `data-cleaning/YYYY-MM-DD-<name>/`
- ไฟล์ในแต่ละโฟลเดอร์: `clean_<name>.py` + `PLAN.md` + `README.md` + output CSV
- ภาษา: **Python + openpyxl + csv** (ไม่ใช้ pandas — ไม่ต้องการ dependency เพิ่ม)
- เมื่อมีไฟล์ใหม่ที่ format เดิม → copy script เดิมแล้วปรับ `INPUT_FILE` + `OUTPUT_FILE` ได้เลย

### Upload / Update ไฟล์เข้า webapp
- **ไฟล์ใหม่**: `POST /api/admin/users/<userId>/files` พร้อม `file` + `fileType` + `description`
- **อัปเดตไฟล์เดิม**: `PUT /api/admin/users/<userId>/files/<fileId>` — fileId ยังอยู่ AI ไม่หลุด reference
- Auth: `Authorization: Bearer <ADMIN_SECRET>`

### ไฟล์ที่ upload แล้ว (Origo — userId: b40f34d9)
| fileId (ย่อ) | fileName | fileType |
|---|---|---|
| `cmmoawi5...` | monitoring_clean.csv | shipment |
| (finance) | finance.csv | invoice |

### Customer Canonical Names (monitoring ↔ finance ต้องตรงกัน)
COFCO · Czarnikow · Alvean · LDC · Wilmar · Transworld · Kirirom · Micronesian · Sangsangysang · Pacific Source · Professional Business · Davis Commodities · Byfar · Golden Agri · ED&F Man · Sucden · Czarnikow · ETG · ACC Austpac · Green Keeper · ICI System · NESTO · Ng Chee Lee · ORCO

ลูกค้าใหม่ยังไม่มีใน finance: `Banrai` · `Grocers` · `J Square`

### Product Format Rule
หน่วย KG/G ติดตัวเลข ไม่มี space + uppercase เสมอ: `50KG` `500G` `1KG` `2KG`

## Behavior Rules (Auto)
Claude ควรทำสิ่งเหล่านี้อัตโนมัติโดยไม่ต้องสั่ง:
- เมื่อต้องเพิ่ม Tendata tool → แตะ 3 ไฟล์ (definitions + handlers + client) ครบเสมอ พร้อม rate limit check
- เมื่อไม่แน่ใจว่า feature ทำไปแล้วหรือยัง → ใช้ subagent scan codebase ก่อน ไม่ assume
- เมื่อ API response ไม่ตรงที่คาด → สร้าง debug script call ตรงๆ ก่อน ไม่แก้ code โดยไม่มีข้อมูล
- เมื่อ user ถามว่า "งานวันนี้มีอะไร" → อ่าน ENGINEERING.md NOW section โดยตรง (Task DB = user-facing tasks เท่านั้น ไม่ใช่ dev tasks)
- เมื่อ clean data xlsx ใน terminal → ใช้ Python + pandas โดยตรง (เร็วกว่า upload ผ่าน app) — common issues: header row ไม่ consistent ข้ามชีต / merged cells → ffill() / title rows ฝังใน data
- เมื่องานใหญ่หรือต้องค้นหาหลายไฟล์พร้อมกัน → ใช้ subagent ทำ parallel

## Skills & Plugins — Auto-Trigger Rules
Claude ต้อง invoke skill/plugin เหล่านี้เองทันที เมื่อ context ตรง ไม่ต้องรอให้ user สั่ง:

### UI / Frontend
- `/frontend-design` — **ทุกครั้ง**ที่สร้างหรือแก้ไข component, page, layout, style, design — ไม่ว่างานเล็กหรือใหญ่

### Codebase & Feature Development
- `/explore` — ทุกครั้งที่ไม่แน่ใจว่า feature ทำไปแล้วหรือยัง หรือต้องการเข้าใจ flow ก่อนแก้ code
- `/feature-dev` — เมื่อ user ขอ build feature ใหม่ที่ยังไม่มีใน codebase (ไม่ใช่ bug fix หรือแก้ไขเล็กน้อย)

### Tendata & API
- `/add-tendata-tool` — เมื่อต้องเพิ่ม Tendata tool ใหม่ (definitions + handlers + client + rate limit)
- `/debug-api` — เมื่อ API response ผิด, unexpected, หรือ error ที่ยังไม่รู้สาเหตุ

### Database
- `/add-repo` — เมื่อต้องเพิ่ม feature ที่ต้องการ DB table ใหม่ (schema + migration + repo)
- `/prisma-workflow` — เมื่อต้องแก้ schema.prisma, เพิ่ม column, เปลี่ยน relation, หรือ sync DB (**ใช้แทน migrate dev เสมอ**)
- `/adr-write` — เมื่อกำลังตัดสินใจ architecture ที่ reverse ยาก หรือมี 2+ technical options ให้เลือก → เขียน ADR ก่อน implement
- `/tendata-admin-sync` — เมื่อต้อง populate trade data ให้ user ใหม่, SKU ใหม่, หรือ refresh ข้อมูลที่ stale

### Testing & Verification
- `/test-runner` — เมื่อ implement เสร็จแล้วต้อง verify ว่าทำงานได้จริง (manual trigger)

### Git & Deploy
- `/commit` — เมื่อ user บอกให้ commit หรืองานเสร็จแล้ว
- `/commit-push-pr` — เมื่อ user ต้องการ commit + push + เปิด PR ในครั้งเดียว
- `/vercel:deploy` — เมื่อ user บอกให้ deploy หรือ "ขึ้น production"
- `/vercel:logs` — เมื่อ deploy fail หรือ user ถามว่า error อะไร

### Skills & Project Memory
- `/skill-creator` — เมื่อต้องสร้าง skill ใหม่, แก้ skill ที่มีอยู่, หรือ eval skill performance
- `/feature-dev:feature-dev` — ชื่อเต็ม (ไม่ใช่ `/feature-dev`) เมื่อ build feature ใหม่ที่ต้องการ structured process
- `/claude-md-management:revise-claude-md` — เมื่อ session มีการตัดสินใจ architecture ใหม่ หรือ pattern สำคัญที่ควรบันทึก
- `/claude-md-management:claude-md-improver` — เมื่อ user ขอ audit หรือปรับปรุง CLAUDE.md

Skills อยู่ที่ `~/.claude/skills/<name>/SKILL.md` (directory format)

## Agents (Claude เรียกอัตโนมัติเมื่อเหมาะสม)
- `codebase-explorer` — scan codebase read-only ด้วย Haiku, ตอบคำถาม "ทำไปแล้วหรือยัง"
- `test-runner` — รัน test/debug scripts แล้ว summarize ผล
- `db-inspector` — query DB ตรงๆ ด้วย Prisma (Haiku, read-only) เมื่อต้องการตรวจสอบ data state เช่น "user X มี trade data อะไรบ้าง?", "memory มีกี่รายการ?", "usage วันนี้เท่าไหร่?"

Agents อยู่ที่ `~/.claude/agents/<name>.md`

## Big Ideas (Vision)

### 1. Per-User AI Config — "Claude Code สำหรับแต่ละ user" ✅ Done
แต่ละ user มี AI environment ของตัวเอง:
- **Storage**: Memory table `type:"user_config"` · content = `"key: value"` · importance 5 (max)
- **Tool**: `update_user_config` — AI สามารถ upsert config ได้เองระหว่างสนทนา
- **Inject**: `buildUserConfigSection()` ใน `lib/memory/inject.ts` → section ใน system prompt ทุก request
- **UI**: `/settings` → AIConfigPanel — list/edit/delete/presets/add custom
- **API**: `GET/POST /api/config` · `PATCH/DELETE /api/config/[id]`

### 2. Auto-Skill Generation
- AI เจอปัญหากับไฟล์ของ user (column ชื่อแปลก, format พิเศษ) → แก้ได้ → บันทึก solution เป็น skill อัตโนมัติ
- ครั้งต่อไปเจอ pattern เดิม → เรียก skill ได้เลย ไม่เรียนรู้ใหม่
- Mechanism: `save_skill` tool → DB ต่อ user → inject relevant skills ตาม context

### 3. Lead Management (Backlog)
- ตัดสินใจยังไม่ทำตอนนี้ — รอ feedback จากการใช้งานจริงก่อน
- Task management cover use case หลักได้แล้ว
- เมื่อทำ: Lead (companyName, status) + metadata JSONB (flexible per user) + LeadNote (แยก table)

## Roadmap
- [x] Chat UI + streaming
- [x] Memory system (long_term + daily_log + extraction + injection)
- [x] Tendata tools (list, rank, query) + rate limiting (500 pts/day)
- [x] Supabase Auth + conversation management
- [x] Token usage tracking + usage widget
- [x] File upload (CSV → JSONB, fileType, description, query tool)
- [x] Task management (create, update, list + overdue/upcoming filter)
- [x] Sidebar redesign v2 (SVG icons, New Chat btn, Market+Tasks nav, Connectors-only right panel)
- [x] Empty state `/chat` (greeting + functional input + quick chips)
- [x] Chat input "+" popover (Attach file / Open folder, folder badge)
- [x] Local Folder file operations (read/analyze/write/rename via FileSystem API + SSE)
- [x] DB file rename tool (`rename_user_file`)
- [x] Per-user AI config (Memory type:"user_config" · update_user_config tool · inject · Settings UI · API CRUD)
- [x] Auto-skill generation (save_skill tool + relevance inject)
- [x] Settings page `/settings` (Account + AI Config panel)
- [x] Admin File Browser — FileBrowser.tsx tree view, DELETE/download endpoints
- [x] Global Info — Origo identity inject ทุก account · GlobalInfo table · Admin UI /admin/global · AI identity = "Origo AI"
- [ ] Reminder system (background job / cron — ปัจจุบัน inject prompt แล้ว แต่ยังไม่มี push notification)
- [ ] Production login fix (เพิ่ม Supabase redirect URL สำหรับ https://memory-chat-ochre.vercel.app/**)
- [ ] Lead management — backlog
