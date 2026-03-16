# Memory Tool

**Source:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool.md

## What it is

Client-side tool (`memory_20250818`) — Claude stores/retrieves files in a `/memories` directory across sessions. Not Anthropic-managed storage; you implement the file ops.

Key insight: **just-in-time context retrieval** — instead of loading all context upfront, store and pull on demand → keeps context focused for long-running workflows.

## Usage

```typescript
tools: [{ type: "memory_20250818", name: "memory" }]
```

SDK helpers: subclass `BetaAbstractMemoryTool` (Python) or use `betaMemoryTool` (TypeScript).

## Commands

| Command | Parameters | Notes |
|---------|-----------|-------|
| `view` | `path`, optional `view_range: [start, end]` | Lists dir or reads file |
| `create` | `path`, `file_text` | Errors if file exists |
| `str_replace` | `path`, `old_str`, `new_str` | Errors if not found or multiple matches |
| `insert` | `path`, `insert_line`, `insert_text` | 0 = beginning |
| `delete` | `path` | Recursive for dirs |
| `rename` | `path`, `new_path` | Errors if destination exists |

## Auto-injected system prompt

When memory tool is enabled, Claude automatically:
1. `view` memory dir before starting
2. Records progress/status during work
3. Assumes context may be reset → saves to memory proactively

## Security rules

- Validate all paths start with `/memories`
- Reject `../`, `..\`, `%2e%2e%2f` (path traversal)
- Resolve canonical path and verify it's within `/memories`
- Consider max file size + memory expiration

## Integration patterns

**With context editing** (`clear_tool_uses_20250919`):
- Claude saves to memory before context cleared
- Exclude memory tool from clearing: `exclude_tools: ["memory"]`

**With compaction**:
- Compaction manages active context
- Memory persists critical info across compaction boundaries

**Multi-session dev pattern**:
1. Session 1: setup progress log + feature checklist + startup scripts in memory
2. Session N: read memory first → recover full state
3. End of session: update progress log

## memory-chat relevance

- memory-chat มี memory system ของตัวเอง (Memory table ใน DB) — ต่างจาก tool นี้
- Tool นี้ = file-based memory สำหรับ agent ที่ต้องการ persistence ข้าม session
- ถ้าจะใช้ใน use_agent: เพิ่ม memory_20250818 ใน tools ของ isolated Haiku call
- Pattern นี้ตรงกับ vision "agent ที่เรียนรู้และ improve ตัวเองข้าม session"
