# Implement Tool Use

**Source:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use.md

## Model choice

- **Opus 4.6** — complex tools, ambiguous queries, seeks clarification when info missing
- **Haiku 4.5** — simple tools, but may infer missing parameters without asking

## Tool definition structure

```typescript
{
  name: "get_weather",          // regex: ^[a-zA-Z0-9_-]{1,64}$
  description: "...",           // 3-4 sentences minimum — most important field
  input_schema: {               // JSON Schema
    type: "object",
    properties: { ... },
    required: ["location"]
  },
  input_examples: [...]         // optional, adds ~20-200 tokens each
}
```

## Tool definition best practices

- **Description is the most important field** — 3-4 sentences: what it does, when to use, parameters, caveats
- Consolidate related ops into one tool with `action` param (not 3 separate tools)
- Namespace names: `github_list_prs`, not just `list_prs`
- Return only high-signal info — stable IDs + only fields Claude needs
- `input_examples`: validates against schema (invalid → 400 error), not for server tools

## tool_choice

```typescript
tool_choice: { type: "auto" }            // default
tool_choice: { type: "any" }             // must use at least one tool
tool_choice: { type: "tool", name: "X" } // force specific tool
tool_choice: { type: "none" }            // no tools
```

`any` and `tool` are incompatible with extended thinking — use `auto` or `none` with thinking.

## Parallel tool use

Claude may return multiple `tool_use` blocks. Disable: `disable_parallel_tool_use: true`.

Prompt to encourage parallel:
```text
For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially.
```

## Tool result format

When Claude returns `stop_reason: "tool_use"`:

```typescript
// Claude's response contains:
{ type: "tool_use", id: "toolu_abc", name: "get_weather", input: { location: "Bangkok" } }

// Your reply:
{
  role: "user",
  content: [
    {
      type: "tool_result",
      tool_use_id: "toolu_abc",   // matches tool_use.id
      content: "27°C, sunny",     // string OR array of {type:"text"/"image"/"document"}
      is_error: false             // optional, true if execution failed
    }
    // ... more tool_results first, then text blocks after
  ]
}
```

**Ordering rule**: `tool_result` blocks must come **first** in the content array; text blocks must come **after** all tool results.

## Tool runner (beta)

SDK helpers that auto-handle the tool call loop. Available in Python, TypeScript, Ruby SDKs.

**Python** — `@beta_tool` decorator (inspects type hints + docstring → generates JSON schema):
```python
from anthropic import beta_tool

@beta_tool
def get_weather(location: str, unit: str = "fahrenheit") -> str:
    """Get the current weather in a given location.
    Args:
        location: The city and state, e.g. San Francisco, CA
        unit: Temperature unit, either 'celsius' or 'fahrenheit'
    """
    return json.dumps({"temperature": "20°C", "condition": "Sunny"})

runner = client.beta.messages.tool_runner(model=..., tools=[get_weather], messages=[...])
final = runner.until_done()  # or iterate: for message in runner: ...
```

**TypeScript** — `betaZodTool()` (Zod 3.25+) or `betaTool()` (JSON Schema):
```typescript
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
const tool = betaZodTool({
  name: "get_weather",
  description: "...",
  inputSchema: z.object({ location: z.string() }),
  run: async (input) => JSON.stringify({ temp: "20°C" })
});
const finalMessage = await client.beta.messages.toolRunner({ tools: [tool], ... });
```

**Features**: automatic compaction, streaming, error interception, modify tool results (e.g. add `cache_control`).

**Debugging errors**: `ANTHROPIC_LOG=info` shows tool errors; errors passed back to Claude with `is_error: true` by default.

**tool_result content types**: `text` · `image` (base64) · `document` (base64 text/plain or application/pdf)

## Auto-injected system prompt

When `tools` are provided, the API prepends:
```
In this environment you have access to a set of tools you can use to answer the user's question.
[formatting instructions]
Here are the functions available in JSONSchema format:
[tool definitions]
[user system prompt]
[tool configuration]
```

## memory-chat relevance

- memory-chat tools อยู่ใน `lib/tools/definitions.ts` + `lib/tools/handlers.ts`
- Tool loop อยู่ใน `app/api/chat/route.ts` — while loop จัดการ tool_use/tool_result manually
- ทุก tool ต้องมี description ชัดเจน (3-4 sentences) → ส่งผลโดยตรงต่อ Claude's behavior
- `tool_result` ordering rule: สำคัญถ้ามีทั้ง tool results และ text ใน user message เดียวกัน
