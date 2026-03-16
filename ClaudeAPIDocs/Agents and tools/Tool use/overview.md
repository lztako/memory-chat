# Tool Use — Overview

**Source:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview.md

## Tool types

| Type | Execution | Example |
|------|-----------|---------|
| **Client tools** | Your server | custom tools, bash, text-editor, computer-use |
| **Server tools** | Anthropic's servers | web_search, web_fetch |

Client tools → `stop_reason: "tool_use"` → you execute → return `tool_result`
Server tools → Anthropic runs them internally, Claude returns final response

## Tool definition (TypeScript)

```typescript
tools: [
  {
    name: "get_weather",
    description: "Get the current weather in a given location",
    input_schema: {
      type: "object",
      properties: {
        location: { type: "string", description: "City and state" }
      },
      required: ["location"]
    }
  }
]
```

## Client tool loop

```
User message
  → Claude: stop_reason="tool_use" + tool_use block
  → You: execute tool, send tool_result
  → Claude: final response (stop_reason="end_turn")
```

## Server tool handling

Server tools run a sampling loop (default max 10 iterations). If limit hit → `stop_reason="pause_turn"` → send response back to continue.

## Parallel tool calls

Claude may return multiple `tool_use` blocks in one response. You must return **all** results in a single `user` message with separate `tool_result` blocks.

## tool_choice

```typescript
tool_choice: { type: "auto" }   // default — Claude decides
tool_choice: { type: "any" }    // must use at least one tool
tool_choice: { type: "tool", name: "get_weather" }  // force specific tool
tool_choice: { type: "none" }   // no tools (0 system prompt tokens)
```

## MCP tools

Convert MCP tool schema: rename `inputSchema` → `input_schema`, then pass to `tools[]` like any client tool.

## Strict tool use

Add `strict: true` to tool definition → guaranteed schema conformance (no type mismatches). See structured-outputs.md.

## Pricing (system prompt overhead)

| Model | auto/none | any/tool |
|-------|-----------|----------|
| Opus 4.6, Sonnet 4.6, Haiku 4.5 | 346 tokens | 313 tokens |
| Haiku 3.5 | 264 tokens | 340 tokens |

Server tools add usage-based cost on top (e.g., web search $10/1,000 searches).

## memory-chat relevance
- memory-chat ใช้ client tools ทั้งหมด (query_user_file, create_task, etc.)
- tool loop อยู่ใน `app/api/chat/route.ts` — while loop จนไม่มี tool_use
- parallel tool calls รองรับแล้วโดย while loop
