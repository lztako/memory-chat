# Programmatic Tool Calling

**Source:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling

## Overview

Claude writes code that calls tools programmatically inside the code execution sandbox. Combines code execution + tool use — Claude can loop, branch, and aggregate results without multiple API round trips.

**Requires:** `code_execution_20260120` (NOT `_20250825` — different version)

## Setup

**1. Enable code execution tool (new version):**
```typescript
{ type: "code_execution_20260120", name: "code_execution" }
```

**2. Mark custom tools with `allowed_callers`:**
```typescript
{
  name: "get_stock_price",
  description: "...",
  input_schema: { ... },
  allowed_callers: ["code_execution_20260120"]  // ← this field
}
```

## How Claude uses it

Claude writes Python inside the sandbox:
```python
prices = []
for ticker in ["AAPL", "GOOGL", "MSFT"]:
    result = await get_stock_price(ticker=ticker)
    prices.append(result)
```

The `await tool()` syntax calls your tool handler. Claude can:
- Loop over lists
- Branch on conditions
- Aggregate / transform results
- Call multiple tools per iteration

## Key difference from normal tool use

| Normal tool use | Programmatic |
|----------------|--------------|
| Tool results added to context | Tool results NOT in Claude's context |
| Round-trip per tool call | All calls inside one sandbox run |
| Client handles loop | Claude handles loop |
| O(n) API calls for n items | 1 API call regardless of n |

**Tool results go to sandbox only** — only the final code output appears in Claude's response.

## Response: `caller` field

```typescript
// Normal direct call:
{ caller: { type: "direct" } }

// Called from code execution:
{ caller: { type: "code_execution_20260120", tool_id: "toolu_..." } }
```

Use `caller` in your handler to know context (e.g., skip UI updates when called from sandbox).

## Container lifecycle

- Container persists for ~4.5 minutes between calls
- Same container across multiple turns (state preserved)
- On expiry → new container (variables reset)

## Constraints

- No `strict: true` on tools with `allowed_callers`
- No `tool_choice` forcing programmatic tools
- No `disable_parallel_tool_use`
- MCP tools NOT supported as allowed_callers targets
- Only `code_execution_20260120` (not older version) works

## memory-chat relevance

- **Current**: memory-chat handles tool loops manually in `route.ts` (while loop)
- **Potential**: batch Tendata queries without N round trips — e.g., query 10 companies in one API call
- **Practical**: when Claude needs to loop over file rows or aggregate trade data across companies
- **Not urgent**: manual loop in route.ts works fine at current scale
- **Watch for**: `allowed_callers` field — required, easy to miss when adding new tools
