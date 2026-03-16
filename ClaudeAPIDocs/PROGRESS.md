# ClaudeAPIDocs — Progress Tracker

อัปเดตล่าสุด: 2026-03-15

## สถานะ

| สัญลักษณ์ | ความหมาย |
|-----------|---------|
| ✅ | บันทึกแล้ว มีไฟล์ใน ClaudeAPIDocs/ |
| 🔲 | ยังไม่ได้บันทึก |
| ⏭ | ข้ามโดยตั้งใจ (low priority / ไม่เกี่ยวกับ memory-chat) |

---

## ที่บันทึกแล้ว

| Section | Files |
|---------|-------|
| First steps/ | intro, models, first API call, SDK setup |
| Context management/ | compaction, context-editing, prompt-caching, token-counting, **context-windows** |
| Models & pricing/ | model IDs, breaking changes 4.6, migration, pricing |
| Build with Claude/ | working-with-messages, handling-stop-reasons, prompting-best-practices, overview |
| Build with Claude/Model capabilities/ | extended-thinking, adaptive-thinking, effort, fast-mode, structured-outputs, citations, streaming, batch-processing, pdf-support, search-results, vision, embeddings, multilingual-support |
| Agents and tools/Tool use/ | overview, implement-tool-use, web-search-tool, web-fetch-tool, code-execution-tool, memory-tool, bash-tool, text-editor-tool, computer-use-tool |
| Tool infrastructure/ | tool-search, programmatic-tool-calling, fine-grained-tool-streaming |
| Files & assets/ | files-api |

**Priority 1 ครบแล้ว ✅**

---

## Backlog — เรียงตาม Priority

### 🟡 Priority 2 — เกี่ยวกับ vision & roadmap

| # | Section | Topics | เหตุผล |
|---|---------|--------|--------|
| 1 | **Agent Skills/** | Overview, Quickstart, Best practices, Skills for enterprise, Using Skills with the API | memory-chat มี skill system อยู่แล้ว |
| 2 | **MCP in the API/** | MCP connector, Remote MCP servers | Tendata as MCP = roadmap item |
| 3 | **Test & evaluate/** | Define success, Evaluation Tool, Reducing latency | quality + perf |
| 4 | **Strengthen guardrails/** | Reduce hallucinations, Output consistency, Mitigate jailbreaks, Streaming refusals, Reduce prompt leak | guardrails สำหรับ production |
| 5 | **Prompt engineering/** | Overview, Console prompting tools | improve prompts ใน route.ts |

### 🟢 Priority 3 — อ้างอิงเมื่อจำเป็น

| # | Section | Topics | เหตุผล |
|---|---------|--------|--------|
| 6 | **Agent SDK/** | Overview, Quickstart, How the agent loop works | SDK-level agent building |
| 7 | **Agent SDK/Core concepts/** | Use Claude Code features, Work with sessions | advanced SDK usage |
| 8 | **Agent SDK/Guides/** | Streaming Input, Handling Permissions, Hooks, File checkpointing, Structured outputs, Hosting, Deploying, Modifying system prompts, MCP in SDK, Custom Tools, Subagents, Slash Commands, Agent Skills, Cost tracking, Todo Lists, Plugins | ใหญ่มาก ดูเป็น topic |
| 9 | **Agent SDK/SDK references/** | TypeScript SDK, TypeScript V2, Python SDK, Migration Guide | reference เมื่อ implement |
| 10 | **Claude on 3rd-party platforms/** | Amazon Bedrock, Microsoft Foundry, Vertex AI | ไม่ใช้ตอนนี้ |
| 11 | **Administration and monitoring/** | Admin API, Data residency, Workspaces, Usage API, Analytics API, ZDR | ops / enterprise |

---

## แผนการบันทึกถัดไป

**Priority 1 เสร็จหมดแล้ว** 🎉

**Batch ถัดไปที่แนะนำ:** Priority 2 — Agent Skills (5 topics) หรือ MCP in the API (2 topics)
- Agent Skills: Overview, Quickstart, Best practices, Enterprise, Using with API
- MCP in the API: MCP connector, Remote MCP servers
