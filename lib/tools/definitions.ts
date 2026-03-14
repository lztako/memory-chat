import Anthropic from "@anthropic-ai/sdk"

// ─── Main tools (sent to Claude API) ─────────────────────────────────────────
export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "save_memory",
    description:
      "บันทึก memory ใหม่เกี่ยวกับ user ทันทีโดยไม่รอ extraction อัตโนมัติ ใช้เมื่อ user บอกข้อมูลสำคัญชัดเจน",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string", description: "เนื้อหาของ memory" },
        layer: {
          type: "string",
          enum: ["long_term", "daily_log"],
          description:
            "long_term สำหรับข้อมูลถาวร (ชื่อ งาน เป้าหมาย), daily_log สำหรับสิ่งชั่วคราว (อารมณ์วันนี้ task ปัจจุบัน)",
        },
        importance: {
          type: "number",
          description: "ระดับความสำคัญ 1-5 (5=สำคัญมาก เช่น ชื่อ งาน)",
        },
        type: {
          type: "string",
          enum: ["fact", "preference", "goal", "event"],
          description: "ประเภทของ memory",
        },
      },
      required: ["content", "layer", "importance", "type"],
    },
  },
  {
    name: "get_context_state",
    description:
      "ดู context state ปัจจุบันของการสนทนา เช่น quiz state หรือ task ที่กำลังทำ ใช้เมื่อ user ส่งคำตอบสั้นๆ ที่ไม่ชัดว่ากำลังทำอะไร",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "update_context_state",
    description:
      "อัพเดต context state ของการสนทนา ใช้ทันทีหลังเริ่ม quiz ใหม่ task ใหม่ หรือเมื่อ state เปลี่ยน",
    input_schema: {
      type: "object",
      properties: {
        currentTask: {
          type: "string",
          description: "คำอธิบาย task หรือ activity ปัจจุบัน",
        },
        quizState: {
          type: "object",
          description:
            "state ของ quiz เช่น { topic, currentQuestion, totalQuestions, score }",
        },
        pendingItems: {
          type: "array",
          items: { type: "string" },
          description: "รายการที่รอดำเนินการ",
        },
      },
      required: [],
    },
  },
  {
    name: "create_task",
    description:
      "สร้าง task หรือ action item ใหม่ — ใช้เมื่อ user พูดถึงสิ่งที่ต้องทำ เช่น 'ส่ง sample ให้ Klaus ภายในศุกร์', 'โทรหา Tanaka อาทิตย์หน้า', 'เตรียม shipping doc ภายใน 15 มีนา'",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "สิ่งที่ต้องทำ — กระชับ ชัดเจน" },
        description: { type: "string", description: "รายละเอียดเพิ่มเติม (ถ้ามี)" },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "urgent"],
          description: "ความสำคัญ (default: normal)",
        },
        dueDate: { type: "string", description: "กำหนดส่ง format ISO 8601 เช่น '2026-03-14T00:00:00Z'" },
        linkedCompany: { type: "string", description: "ชื่อบริษัทที่เกี่ยวข้อง เช่น 'Klaus Weber GmbH'" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "อัปเดต task — เปลี่ยน status, priority, dueDate หรือแก้ไข title ใช้เมื่อ user บอกว่า task เสร็จแล้ว หรือต้องการเปลี่ยนกำหนดการ",
    input_schema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "ID ของ task ที่ต้องการอัปเดต — ดูได้จาก system prompt section 'Tasks ที่ยังค้างอยู่'" },
        title: { type: "string", description: "แก้ไข title" },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "done", "cancelled"],
          description: "สถานะใหม่",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "urgent"],
          description: "ความสำคัญใหม่",
        },
        dueDate: { type: "string", description: "กำหนดส่งใหม่ format ISO 8601 หรือ null เพื่อลบ" },
      },
      required: ["taskId"],
    },
  },
  {
    name: "list_tasks",
    description:
      "Refresh รายการ tasks ล่าสุดจาก DB หรือดู tasks ที่กรองตาม status/overdue/upcoming — tasks ที่ active อยู่ดูได้จาก system prompt section 'Tasks ที่ยังค้างอยู่' โดยตรง ใช้ tool นี้เมื่อต้องการดู tasks ที่ done/cancelled หรือ filter พิเศษที่ไม่มีใน system prompt",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["pending", "in_progress", "done", "cancelled"],
          description: "กรองตาม status (ถ้าไม่ระบุจะแสดงทุกอย่างยกเว้น done)",
        },
        overdue: { type: "boolean", description: "true = แสดงเฉพาะ task ที่เลย deadline แล้ว" },
        upcoming: { type: "boolean", description: "true = แสดง task ที่ due ใน 7 วันข้างหน้า" },
      },
      required: [],
    },
  },
  {
    name: "search_market_data",
    description:
      "ค้นหาข้อมูลตลาดการค้า (ผู้นำเข้า/ส่งออก, ranking, shipment records) จากฐานข้อมูลที่ทีมงานรวบรวมไว้ ใช้เมื่อ user ถามเกี่ยวกับ supplier, ตลาด, หรือคู่แข่งสำหรับสินค้าของตัวเอง — ไม่มีค่าใช้จ่ายเพิ่มเติม",
    input_schema: {
      type: "object",
      properties: {
        skuTag: {
          type: "string",
          description: "HS Code หรือ keywords ของสินค้า เช่น '8708', 'automotive parts', 'steel pipes'",
        },
        tradeDirection: {
          type: "string",
          enum: ["import", "export"],
          description: "ทิศทางการค้า — import (หา supplier/ผู้ส่งออก) หรือ export (หาตลาด/ผู้ซื้อ)",
        },
        country: {
          type: "string",
          description: "ประเทศที่สนใจ เช่น 'Germany', 'Thailand', 'China'",
        },
        dataType: {
          type: "string",
          enum: ["company_list", "company_ranking", "shipment_records"],
          description: "ประเภทข้อมูล: company_list (รายชื่อ), company_ranking (จัดอันดับ), shipment_records (records ละเอียด)",
        },
      },
      required: ["skuTag"],
    },
  },
  {
    name: "list_user_files",
    description:
      "Refresh รายการไฟล์ล่าสุดจาก DB — ใช้เฉพาะเมื่อ user เพิ่งอัปโหลดไฟล์ใหม่ในแชทนี้และต้องการดู id ของไฟล์นั้น ไฟล์ที่มีอยู่ก่อนหน้าดูได้จาก system prompt section 'ไฟล์ข้อมูลของ user' โดยตรง ไม่ต้องเรียก tool นี้",
    input_schema: {
      type: "object",
      properties: {
        fileType: {
          type: "string",
          description: "กรองตามประเภทไฟล์ เช่น 'shipment', 'invoice', 'product', 'customer', 'lead' ถ้าไม่ระบุจะแสดงทั้งหมด",
        },
      },
      required: [],
    },
  },
  {
    name: "query_user_file",
    description:
      "ดึงและวิเคราะห์ข้อมูลจากไฟล์ที่ user อัปโหลดไว้ — ใช้ filter/aggregate/groupBy เพื่อดึงเฉพาะข้อมูลที่ต้องการ ห้ามดึงข้อมูลทั้งหมดโดยไม่มี filter หรือ aggregate เพื่อประหยัด context ถ้าต้องการ summary ให้ใช้ groupBy+aggregate แทนการดึง raw rows",
    input_schema: {
      type: "object",
      properties: {
        fileId: {
          type: "string",
          description: "ID ของไฟล์ (ได้จาก list_user_files)",
        },
        filter: {
          type: "string",
          description: 'เงื่อนไข filter — AND: "team = PSR AND status = Overdue" | OR: "team = RKX OR team = PSR" | Mixed: "team = RKX OR team = PSR AND year = 2026" | NULL: "shipment_month IS NULL" | NOT NULL: "shipment_month IS NOT NULL"',
        },
        columns: {
          type: "array",
          items: { type: "string" },
          description: "เลือกเฉพาะ columns ที่ต้องการ ถ้าไม่ระบุจะคืนทุก column",
        },
        groupBy: {
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
          description: "group ตาม column เดียว ('team') หรือหลาย column (['team', 'year']) ใช้ร่วมกับ aggregate",
        },
        aggregate: {
          type: "array",
          items: {
            type: "object",
            properties: {
              column: { type: "string", description: "ชื่อ column ที่ต้องการคำนวณ" },
              fn: { type: "string", enum: ["sum", "count", "avg", "min", "max"] },
            },
            required: ["column", "fn"],
          },
          description: "คำนวณ aggregate เช่น [{column: 'usd', fn: 'sum'}, {column: 'ton', fn: 'count'}]",
        },
        having: {
          type: "string",
          description: 'filter หลัง groupBy+aggregate — ใช้ชื่อ column จาก aggregate result เช่น "qty_contracted_sum > 10000", "fill_rate_pct >= 50", "acc_sum IS NOT NULL"',
        },
        orderBy: {
          type: "string",
          description: 'เรียงลำดับ เช่น "usd desc", "bl_date asc", "shipped desc"',
        },
        limit: {
          type: "number",
          description: "จำนวน rows สูงสุดที่ return (default 50) — ถ้าต้องการ summary ทั้งหมดให้ใช้ aggregate แทน",
        },
        compute: {
          type: "object",
          additionalProperties: { type: "string" },
          description: 'คำนวณ derived fields จาก aggregate results เช่น {"fill_rate": "acc_sum / qty_contracted_sum * 100"} — ใช้ชื่อ column จาก aggregate result เป็น operands ได้เลย',
        },
        joinFile: {
          type: "object",
          description: "JOIN กับไฟล์อื่นของ user เดียวกัน — ใช้เมื่อต้องการรวมข้อมูลจาก 2 ไฟล์ เช่น contracts + shipments",
          properties: {
            fileId: { type: "string", description: "ID ของไฟล์ที่จะ JOIN" },
            on: {
              description: 'column ที่ใช้ JOIN — ถ้า column ชื่อเดียวกัน: "customer" | ถ้าต่างกัน: ["customer", "client_name"]',
              oneOf: [
                { type: "string" },
                { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 },
              ],
            },
            type: { type: "string", enum: ["inner", "left"], description: "inner = เฉพาะที่ match | left = ทั้งหมดจากไฟล์หลัก (default: inner)" },
            columns: { type: "array", items: { type: "string" }, description: "เลือก columns จากไฟล์ที่ JOIN (ถ้าไม่ระบุจะเอาทุก column)" },
          },
          required: ["fileId", "on"],
        },
        windowFns: {
          type: "array",
          description: "Window functions เช่น RANK(), DENSE_RANK(), running sum — ใช้เมื่อต้องการ ranking หรือ cumulative ในกลุ่มเดียวกัน",
          items: {
            type: "object",
            properties: {
              fn: { type: "string", enum: ["rank", "dense_rank", "row_number", "sum", "avg", "lag", "lead"], description: "Window function ที่ต้องการ" },
              column: { type: "string", description: "column ที่คำนวณ (ต้องระบุสำหรับ sum/avg/lag/lead)" },
              partitionBy: {
                description: "แบ่ง window ตาม column — เช่น 'team' หรือ ['team', 'year']",
                oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
              },
              orderBy: { type: "string", description: 'เรียงใน window เช่น "qty_contracted_sum desc"' },
              alias: { type: "string", description: "ชื่อ column ผลลัพธ์ เช่น 'rank', 'running_total'" },
            },
            required: ["fn", "alias"],
          },
        },
      },
      required: ["fileId"],
    },
  },
  {
    name: "update_user_config",
    description:
      "อัปเดต AI config ของ user — วิธีทำงาน, ภาษา, สไตล์การตอบ, domain ที่เชี่ยวชาญ ใช้เมื่อ user บอกว่าอยากให้ AI ตอบแบบไหน หรือเมื่อเรียนรู้ preference ใหม่จากการสนทนา",
    input_schema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "ชื่อ config เช่น 'ภาษา', 'สไตล์การตอบ', 'domain', 'Incoterms', 'ตลาดหลัก'",
        },
        value: {
          type: "string",
          description: "ค่าของ config เช่น 'ตอบภาษาไทยเสมอ', 'ตรงประเด็น ไม่อธิบายยาว', 'industrial goods B2B'",
        },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "rename_user_file",
    description: "เปลี่ยนชื่อไฟล์ที่ user upload ไว้ในระบบ — ใช้เมื่อ user ต้องการเปลี่ยนชื่อไฟล์ เช่น เพิ่ม prefix หรือแก้ชื่อให้ถูกต้อง",
    input_schema: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "ID ของไฟล์ที่ต้องการเปลี่ยนชื่อ (ได้จาก list_user_files)" },
        newName: { type: "string", description: "ชื่อใหม่ของไฟล์ เช่น '01-shipment-Q1-2026.csv'" },
      },
      required: ["fileId", "newName"],
    },
  },
  {
    name: "save_skill",
    description:
      "บันทึก solution ที่แก้ปัญหาไม่ชัดเจนเป็น skill ถาวร — เรียกเมื่อแก้ปัญหาที่อาจเกิดซ้ำ เช่น column ชื่อแปลก, date format พิเศษ, การคำนวณเฉพาะของ user ครั้งต่อไปที่เจอ pattern เดิมจะใช้ skill นี้ได้เลย",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "ชื่อ skill กระชับ เช่น 'Date BE Format', 'Custom Column: วันที่ส่งของ'",
        },
        trigger: {
          type: "string",
          description: "เมื่อไหรให้ใช้ skill นี้ เช่น 'เจอ date column ในรูป DD/MM/YYYY พ.ศ.', 'ไฟล์ shipment มี column ชื่อ วันที่ส่งของ'",
        },
        solution: {
          type: "string",
          description: "วิธีแก้ปัญหาที่ใช้ได้จริง เขียนให้ชัดพอที่จะนำไปใช้ซ้ำได้เลย",
        },
        tools: {
          type: "array",
          items: { type: "string" },
          description: "ชื่อ tools ที่ควรใช้ใน context นี้ เช่น ['query_user_files', 'render_artifact'] — ถ้าไม่มีก็ไม่ต้องใส่",
        },
      },
      required: ["name", "trigger", "solution"],
    },
  },
  {
    name: "query_attached_file",
    description:
      "Query หรือ filter ข้อมูลจากไฟล์ที่ user แนบมาในแชทนี้ (CSV/JSON/TXT) — ใช้เมื่อต้องการดูข้อมูลบางส่วน, filter แถว, หรือวิเคราะห์ข้อมูลจากไฟล์ชั่วคราว ข้อมูลจะอยู่เฉพาะใน session นี้ไม่บันทึก DB",
    input_schema: {
      type: "object",
      properties: {
        fileId: {
          type: "string",
          description: "ID ของไฟล์ที่แนบมา (ได้จาก system prompt ส่วน Attached Files)",
        },
        filter: {
          type: "string",
          description:
            'เงื่อนไข filter เช่น "price > 500", "country = Thailand", "product contains steel", "status != done"',
        },
        limit: {
          type: "number",
          description: "จำนวน rows สูงสุดที่ return (default: 50)",
        },
        offset: {
          type: "number",
          description: "เริ่มจาก row ที่เท่าไหร่ สำหรับ pagination (default: 0)",
        },
      },
      required: ["fileId"],
    },
  },
  {
    name: "render_artifact",
    description:
      "แสดงผลข้อมูลใน Artifact Panel ด้านข้าง — เรียกทันทีหลังได้รับ trade data หรือต้องการแสดง visualization: rank_trade_companies → chart_bar, list/query_trade_data → table, summary/analysis → markdown",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["chart_bar", "table", "markdown"],
          description: "chart_bar = bar chart เปรียบเทียบ | table = ตารางข้อมูล | markdown = text/summary",
        },
        title: { type: "string", description: "หัวข้อ artifact เช่น 'Top 10 Importers — Cotton Fabric (HS 5208)'" },
        data: {
          type: "object",
          description:
            "chart_bar: {items:[{label:string,value:number}], unit:string} | table: {columns:string[], rows:(string|number)[][]} | markdown: {content:string}",
        },
      },
      required: ["type", "title", "data"],
    },
  },
  {
    name: "read_resource",
    description:
      "อ่านเนื้อหาเต็มของ resource, skill reference, หรือ agent memory — ใช้เมื่อ index ใน system prompt บอกว่ามี document ที่เกี่ยวข้องกับงานที่กำลังทำ เช่น workflow ของบริษัท, product spec, หรือ skill reference โดยละเอียด",
    input_schema: {
      type: "object",
      properties: {
        docId: {
          type: "string",
          description: "ID ของ document — ได้จาก section 'Resources' ใน system prompt",
        },
      },
      required: ["docId"],
    },
  },
  {
    name: "read_global_doc",
    description:
      "อ่านเนื้อหาเต็มของ GlobalDoc — ข้อมูล Origo เชิงลึก เช่น ประวัติบริษัท, บริการ, philosophy ใช้เมื่อ user ถามเกี่ยวกับ Origo และ index ใน system prompt มี document ที่เกี่ยวข้อง",
    input_schema: {
      type: "object",
      properties: {
        docId: {
          type: "string",
          description: "ID ของ GlobalDoc — ได้จาก section 'Origo Knowledge Base' ใน system prompt",
        },
      },
      required: ["docId"],
    },
  },
  {
    name: "use_agent",
    description:
      "เรียก specialist sub-agent เพื่อทำงานเฉพาะด้าน — ใช้เมื่อ task ต้องการ data หรือ expertise ที่ agent นั้นเชี่ยวชาญ\n" +
      "Agents ที่มี: 'Trade Data Analyst' (ข้อมูลตลาด Tendata), 'File Processor' (วิเคราะห์ไฟล์ CSV ของ user), 'Task Manager' (สร้าง/จัดการ tasks)\n" +
      "ไม่เรียกเมื่อ: ตอบได้โดยไม่ต้องดึงข้อมูลใหม่, คำถาม conceptual, synthesis จากข้อมูลที่มีอยู่แล้ว",
    input_schema: {
      type: "object",
      properties: {
        agentName: {
          type: "string",
          description: "ชื่อ agent เช่น 'Trade Data Analyst', 'File Processor', 'Task Manager'",
        },
        task: {
          type: "string",
          description: "งานที่ต้องการให้ agent ทำ — อธิบายให้ชัดเจนพอที่ agent ทำได้โดยไม่ต้องถามกลับ",
        },
        context: {
          type: "string",
          description: "ข้อมูล context เพิ่มเติมจากการสนทนา เช่น สินค้า SKU, ประเทศที่สนใจ, ชื่อไฟล์ที่เกี่ยวข้อง (optional)",
        },
      },
      required: ["agentName", "task"],
    },
  },
]

// ─── Local Folder Tools (Phase 3B — client-side execution, not yet in API call) ──
// Requires client-side tool execution protocol before including in toolDefinitions.
export const localFolderToolDefinitions: Anthropic.Tool[] = [
  {
    name: "list_folder_tree",
    description:
      "แสดงโครงสร้างไฟล์และโฟลเดอร์จาก Local Folder ที่ user เปิดไว้",
    input_schema: {
      type: "object",
      properties: {
        depth: { type: "number", description: "ความลึกสูงสุด (default: 2)" },
      },
      required: [],
    },
  },
  {
    name: "read_local_file",
    description: "อ่านเนื้อหาไฟล์จาก Local Folder — รองรับ CSV, JSON, TXT",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "path ของไฟล์ เช่น 'data/shipments.csv'" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_local_file",
    description: "เขียนหรือสร้างไฟล์ใน Local Folder",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "path ของไฟล์ที่จะเขียน" },
        content: { type: "string", description: "เนื้อหาที่จะเขียน" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "move_local_file",
    description: "เปลี่ยนชื่อหรือย้ายไฟล์ใน Local Folder",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "path ต้นทาง" },
        to: { type: "string", description: "path ปลายทาง" },
      },
      required: ["from", "to"],
    },
  },
]
