# Fine-Grained Tool Streaming

**Source:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming

## Overview

Streams tool input parameters as they generate — without buffering for JSON validation. Reduces time-to-first-chunk from ~15s to ~3s for tool calls with large inputs.

## How to enable

Add `eager_input_streaming: true` to the tool definition:

```typescript
{
  name: "render_chart",
  description: "...",
  input_schema: { ... },
  eager_input_streaming: true   // ← this field
}
```

No beta header required. Works on all models and platforms.

## Behavior

**Without eager streaming:**
- API buffers entire tool input JSON
- Validates JSON before sending
- Client waits until all params are ready (~15s for large inputs)

**With eager streaming:**
- Params stream as tokens generate
- No JSON validation at chunk boundary
- Client receives chunks immediately (~3s latency)
- If `max_tokens` is hit mid-stream → incomplete/invalid JSON possible

## SSE events (streaming)

```
event: content_block_start
data: {"type":"tool_use", "id":"toolu_...", "name":"render_chart", ...}

event: content_block_delta
data: {"type":"input_json_delta", "partial_json":"{\"data\":[{\"x\":1,"}

event: content_block_delta
data: {"type":"input_json_delta", "partial_json":"\"y\":42}]}"}

event: content_block_stop
```

Same events as normal tool streaming — just arrives faster.

## When to use

Use when:
- Tool inputs are large (hundreds of tokens)
- User sees latency waiting for tool to "appear"
- Real-time UX matters (e.g., showing tool name/spinner immediately)

Don't use when:
- You need guaranteed valid JSON at each chunk
- Tool is called rarely with small inputs

## memory-chat relevance

- **`render_artifact` tool** — chart data can be large JSON → good candidate for `eager_input_streaming: true`
- **`query_user_file` tool** — result can be large, but this is a tool result, not input streaming
- **UI impact**: user sees "Claude is rendering chart..." indicator faster
- **Add to**: `lib/tools/definitions.ts` on the `render_artifact` definition
- **Risk**: none — if streaming cuts off, the full JSON arrives at `content_block_stop` anyway
