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
]
