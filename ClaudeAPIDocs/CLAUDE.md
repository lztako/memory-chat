# ClaudeAPIDocs — Index

คลังเอกสาร Anthropic อย่างเป็นทางการสำหรับ memory-chat
อ่านไฟล์นี้ก่อน แล้ว Read README ของ subfolder ที่เกี่ยวข้อง

## Subfolders

| Folder | เนื้อหา | README |
|--------|---------|--------|
| `First steps/` | Claude intro, models, first API call, SDK setup | `First steps/README.md` |
| `Context management/` | compaction, caching, token counting, context editing | `Context management/README.md` |
| `Models & pricing/` | model IDs, breaking changes 4.6, migration checklist, pricing | `Models & pricing/README.md` |
| `Build with Claude/` | messages API, stop reasons, parallel tools, prompting best practices + Model capabilities subfolder (13 files) | `Build with Claude/README.md` |
| `Agents and tools/Tool use/` | tool types, implement-tool-use, web-search, web-fetch, code-execution, memory-tool, bash, text-editor, computer-use (9 files) | `Agents and tools/Tool use/README.md` |
| `Tool infrastructure/` | tool-search (deferred loading), programmatic-tool-calling (allowed_callers), fine-grained-tool-streaming (eager_input_streaming) | `Tool infrastructure/README.md` |
| `Files & assets/` | Files API beta (upload/list/delete, file_id reference, PDF/image only — CSV/XLSX ไม่ support) | `Files & assets/README.md` |

## Trigger — เปิด docs นี้เมื่อ
- แก้ `route.ts` เรื่อง context, caching, compaction
- implement beta feature ใหม่ (ตรวจ header + params)
- ไม่แน่ใจว่า Claude API behavior เป็นยังไง
- เพิ่ม tool ใหม่ หรือสงสัยว่า server tool vs client tool ต่างกันยังไง
