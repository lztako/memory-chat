import Anthropic from "@anthropic-ai/sdk"

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
        taskId: { type: "string", description: "ID ของ task ที่ต้องการอัปเดต (ได้จาก list_tasks)" },
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
      "ดู tasks ทั้งหมด หรือกรองตาม status / overdue / upcoming — ใช้เมื่อ user ถามว่า 'มีอะไรต้องทำบ้าง', 'งานที่ค้างอยู่มีอะไร', 'due วันนี้มีอะไร'",
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
    name: "list_trade_companies",
    description:
      "ค้นหารายชื่อ importer หรือ exporter จาก Tendata ตาม HS Code หรือชื่อสินค้า — ถูกกว่า query_trade_data 6 เท่า ใช้เมื่อ user ต้องการแค่รายชื่อบริษัท ไม่ต้องการ records ละเอียด",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["importers", "exporters"],
          description: "ต้องการรายชื่อ importer หรือ exporter",
        },
        catalog: {
          type: "string",
          enum: ["imports", "exports"],
          description: "ทิศทางการค้า: imports หรือ exports",
        },
        hsCode: {
          type: "string",
          description: "HS Code สินค้า เช่น '63049239'",
        },
        productDesc: {
          type: "string",
          description: "คำอธิบายสินค้าเป็นภาษาอังกฤษ คั่นหลายคำด้วย ';'",
        },
        countryOfOriginCode: {
          type: "string",
          description: "รหัสประเทศต้นทาง เช่น 'CHN', 'THA'",
        },
        countryOfDestinationCode: {
          type: "string",
          description: "รหัสประเทศปลายทาง เช่น 'USA', 'JPN'",
        },
        portOfDeparture: {
          type: "string",
          description: "ท่าเรือต้นทาง เช่น 'Shanghai', 'Nhava Sheva'",
        },
        portOfArrival: {
          type: "string",
          description: "ท่าเรือปลายทาง เช่น 'Los Angeles', 'New York'",
        },
        transportType: {
          type: "string",
          description: "วิธีขนส่ง เช่น 'Sea Freight', 'Air Freight'",
        },
        weightMin: {
          type: "number",
          description: "น้ำหนักต่ำสุด หน่วย kg",
        },
        weightMax: {
          type: "number",
          description: "น้ำหนักสูงสุด หน่วย kg",
        },
        valueMinUSD: {
          type: "number",
          description: "มูลค่าการค้าต่ำสุด หน่วย USD",
        },
        valueMaxUSD: {
          type: "number",
          description: "มูลค่าการค้าสูงสุด หน่วย USD",
        },
        startDate: {
          type: "string",
          description: "วันเริ่มต้น format YYYY-MM-DD (default: 1 ปีก่อนหน้า)",
        },
        endDate: {
          type: "string",
          description: "วันสิ้นสุด format YYYY-MM-DD (default: วันนี้)",
        },
        pageSize: {
          type: "number",
          description: "จำนวนรายชื่อที่ต้องการ (default: 10, max: 20)",
        },
      },
      required: ["type", "catalog"],
    },
  },
  {
    name: "rank_trade_companies",
    description:
      "จัดอันดับ importer หรือ exporter ตามความถี่ shipment (tradeCount), มูลค่า, หรือปริมาณสินค้า — ใช้เมื่อ user ถามว่า 'ใครซื้อมากที่สุด', 'top importer คือใคร', 'rank ตามความถี่' — แพงกว่า list_trade_companies (12 points/item) แต่ได้ข้อมูลเชิงลึกต่อบริษัท",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["importers", "exporters"],
          description: "ต้องการ rank importer หรือ exporter",
        },
        catalog: {
          type: "string",
          enum: ["imports", "exports"],
          description: "ทิศทางการค้า: imports หรือ exports",
        },
        hsCode: {
          type: "string",
          description: "HS Code สินค้า เช่น '63049239'",
        },
        productDesc: {
          type: "string",
          description: "คำอธิบายสินค้าเป็นภาษาอังกฤษ คั่นหลายคำด้วย ';'",
        },
        countryOfOriginCode: {
          type: "string",
          description: "รหัสประเทศต้นทาง เช่น 'CHN', 'THA'",
        },
        countryOfDestinationCode: {
          type: "string",
          description: "รหัสประเทศปลายทาง เช่น 'USA', 'JPN'",
        },
        startDate: {
          type: "string",
          description: "วันเริ่มต้น format YYYY-MM-DD (default: 1 ปีก่อนหน้า)",
        },
        endDate: {
          type: "string",
          description: "วันสิ้นสุด format YYYY-MM-DD (default: วันนี้)",
        },
        pageSize: {
          type: "number",
          description: "จำนวนบริษัทที่ต้องการ (default: 10, max: 20) — แต่ละรายใช้ 12 points",
        },
      },
      required: ["type", "catalog"],
    },
  },
  {
    name: "list_user_files",
    description:
      "แสดงรายการไฟล์ CSV ที่ user upload ไว้ พร้อม id, ชื่อไฟล์, fileType, description, columns, และจำนวน rows — ใช้ก่อน query_user_file เพื่อดูว่ามีไฟล์อะไรบ้าง กรองตาม fileType ได้",
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
      "ดึงข้อมูลจากไฟล์ CSV ที่ user upload ไว้ — ใช้เพื่อวิเคราะห์ข้อมูล หา pattern หรือตอบคำถามจากข้อมูลในไฟล์ ได้รับ rows ทั้งหมด (สูงสุด 500 rows)",
    input_schema: {
      type: "object",
      properties: {
        fileId: {
          type: "string",
          description: "ID ของไฟล์ที่ต้องการ query (ได้จาก list_user_files)",
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
    name: "query_trade_data",
    description:
      "ค้นหาข้อมูล import/export จาก Tendata ตาม HS Code, ชื่อบริษัท importer หรือ exporter ใช้เมื่อ user ถามเกี่ยวกับข้อมูลการค้าระหว่างประเทศ เช่น 'หา importer ของ HS Code นี้', 'บริษัทนี้ export ไปที่ไหนบ้าง' — แต่ละ record เสีย 6 points จาก quota ทดสอบ ใช้ pageSize เล็กถ้าไม่จำเป็น",
    input_schema: {
      type: "object",
      properties: {
        catalog: {
          type: "string",
          enum: ["imports", "exports"],
          description: "ทิศทางการค้า: imports หรือ exports",
        },
        hsCode: {
          type: "string",
          description: "HS Code สินค้า เช่น '63049239'",
        },
        importer: {
          type: "string",
          description: "ชื่อบริษัท importer (ใช้ภาษาอังกฤษ)",
        },
        exporter: {
          type: "string",
          description: "ชื่อบริษัท exporter (ใช้ภาษาอังกฤษ)",
        },
        startDate: {
          type: "string",
          description: "วันเริ่มต้น format YYYY-MM-DD (default: 1 ปีก่อนหน้า)",
        },
        endDate: {
          type: "string",
          description: "วันสิ้นสุด format YYYY-MM-DD (default: วันนี้)",
        },
        pageSize: {
          type: "number",
          description: "จำนวน records ที่ต้องการ (default: 10, max: 20)",
        },
      },
      required: ["catalog"],
    },
  },
]
