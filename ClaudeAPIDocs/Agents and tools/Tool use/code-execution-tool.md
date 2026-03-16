# Code Execution Tool

**Source:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool.md

## Overview

Server-side tool — runs Bash commands + file operations in Anthropic's sandboxed container.

**Key:** Free when used with `web_search_20260209` or `web_fetch_20260209`. Otherwise billed by time.

Not ZDR-eligible. Not available on Bedrock or Vertex AI.

## Tool version

```typescript
tools: [{ type: "code_execution_20250825", name: "code_execution" }]
```

No parameters needed. Automatically gives Claude 2 sub-tools:
- `bash_code_execution` — run shell commands
- `text_editor_code_execution` — view/create/edit files

## Sub-tool commands (text_editor_code_execution)

`view` · `create` · `str_replace` — same semantics as client-side text editor tool.

## Response types

**Bash result:**
```json
{
  "type": "bash_code_execution_tool_result",
  "content": {
    "type": "bash_code_execution_result",
    "stdout": "...",
    "stderr": "",
    "return_code": 0
  }
}
```

**File view result:**
```json
{
  "type": "text_editor_code_execution_tool_result",
  "content": {
    "type": "text_editor_code_execution_result",
    "file_type": "text",
    "content": "...",
    "numLines": 4,
    "startLine": 1,
    "totalLines": 4
  }
}
```

**File edit result (str_replace):**
```json
{
  "content": {
    "type": "text_editor_code_execution_result",
    "oldStart": 3, "oldLines": 1, "newStart": 3, "newLines": 1,
    "lines": ["-  \"debug\": true", "+  \"debug\": false"]
  }
}
```

## Sandbox environment

| Property | Value |
|----------|-------|
| Python | 3.11.12 |
| OS | Linux x86_64 |
| RAM | 5 GiB |
| Disk | 5 GiB |
| Network | Disabled |
| Container TTL | 30 days |

**Pre-installed**: pandas, numpy, scipy, matplotlib, seaborn, scikit-learn, openpyxl, pillow, pypdf, sympy, sqlite, ripgrep

## Container reuse

```typescript
// First request
const r1 = await client.messages.create({ tools: [{ type: "code_execution_20250825", ... }], ... });
const containerId = r1.container.id;

// Second request — reuse container (files persist)
const r2 = await client.messages.create({ container: containerId, ... });
```

## File analysis (Files API)

```typescript
// Requires beta header: "files-api-2025-04-14"
messages: [{
  role: "user",
  content: [
    { type: "text", text: "Analyze this CSV data" },
    { type: "container_upload", file_id: "file_abc123" }
  ]
}]
```

Retrieve generated files: extract `file_id` from `bash_code_execution_tool_result` → `client.beta.files.download(file_id)`.

## Error codes

`unavailable` · `execution_time_exceeded` · `container_expired` · `invalid_tool_input` · `too_many_requests`
text_editor only: `file_not_found` · `string_not_found`

`pause_turn` → send response back as-is to continue.

## Pricing

- **Free** when used with `web_search_20260209` or `web_fetch_20260209`
- Otherwise: 1,550 free hours/month, then **$0.05/hour/container** (minimum 5 min)
- Files preloaded on container → billed even if tool not called

## Multi-environment warning

If you also provide a client-side bash tool → 2 separate environments, state NOT shared. Add system prompt clarification.

## Programmatic tool calling

Claude writes code to call your tools programmatically inside the container:
```typescript
{
  name: "get_weather",
  ...,
  allowed_callers: ["code_execution_20250825"]  // enables programmatic calling
}
```

## Upgrade from legacy

`code_execution_20250522` (Python only) → `code_execution_20250825` (Bash + files). Just change the type string.

## memory-chat relevance

- ไม่ได้ใช้ปัจจุบัน — เป็น server tool
- ถ้าต้องการ "AI วิเคราะห์ CSV ที่ upload มา" → ใช้ code_execution_20250825 + container_upload
- Dynamic filtering: เพิ่ม code execution เพื่อให้ web_search/web_fetch ถูกลง
