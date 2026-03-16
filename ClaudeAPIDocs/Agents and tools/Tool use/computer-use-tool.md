# Computer Use Tool

**Source:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool.md

## Overview

Beta client-side tool — Claude takes screenshots and controls mouse/keyboard to automate desktop environments. You implement all actions.

Not ZDR-eligible (beta).

## Tool versions + beta headers

| Models | Tool type | Beta header |
|--------|-----------|-------------|
| Opus 4.6, Sonnet 4.6, Opus 4.5 | `computer_20251124` | `computer-use-2025-11-24` |
| All others (Sonnet 4.5, Haiku 4.5, Opus 4, Sonnet 4, Opus 4.1, Sonnet 3.7) | `computer_20250124` | `computer-use-2025-01-24` |

`computer_20251124` adds: `zoom` action (requires `enable_zoom: true`).

## Usage (TypeScript)

```typescript
// Must use client.beta.messages.create
const response = await client.beta.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 1024,
  tools: [
    {
      type: "computer_20251124",
      name: "computer",
      display_width_px: 1024,
      display_height_px: 768,
      display_number: 1,       // optional, for X11
      enable_zoom: true        // optional, 20251124 only
    },
    { type: "text_editor_20250728", name: "str_replace_based_edit_tool" },
    { type: "bash_20250124", name: "bash" }
  ],
  messages: [{ role: "user", content: "Save a picture of a cat to my desktop." }],
  betas: ["computer-use-2025-11-24"]
});
```

## Available actions

**All versions:** `screenshot` · `left_click` · `type` · `key` · `mouse_move`

**`computer_20250124`+:** `scroll` · `left_click_drag` · `right_click` · `middle_click` · `double_click` · `triple_click` · `left_mouse_down/up` · `hold_key` · `wait`

**`computer_20251124` only:** `zoom` (region: `[x1,y1,x2,y2]`)

**Modifier keys** on click/scroll: use `text: "shift"` / `"ctrl"` / `"alt"` / `"super"` parameter.

## Agent loop pattern

```python
while True and iterations < max_iterations:
    response = client.beta.messages.create(...)
    messages.append({"role": "assistant", "content": response.content})

    tool_results = []
    for block in response.content:
        if block.type == "tool_use":
            result = execute_action(block.input["action"], block.input)
            tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": result})

    if not tool_results:
        break  # task done

    messages.append({"role": "user", "content": tool_results})
```

Always set `max_iterations` to prevent runaway API costs.

## Coordinate scaling

API constrains images to max 1568px longest edge + 1.15MP total. Claude returns coords in scaled space but your tool clicks in original space.

```python
scale = min(1.0, 1568/max(w,h), math.sqrt(1_150_000/(w*h)))
# Capture screenshot at: int(w*scale) × int(h*scale)
# Execute click at: (x/scale, y/scale)
```

## Pricing

- System prompt: +466-499 tokens
- Tool definition: +735 input tokens (Claude 4.x + Sonnet 3.7)
- Screenshots: standard vision pricing per image
- Each bash/text-editor tool alongside: their own overhead

## Security requirements

1. Run in VM/container with minimal privileges
2. No sensitive data/credentials in context
3. Limit internet to allowlist domains
4. Human approval for consequential actions (transactions, consent clicks)
5. Classifiers auto-flag prompt injection in screenshots (can opt-out via support)

## Prompting tips

- `After each step, take a screenshot and verify the outcome before proceeding`
- Provide keyboard shortcuts when mouse interactions fail (dropdowns, scrollbars)
- Include example screenshots of successful outcomes for repeatable tasks
- Enable thinking (`budget_tokens: 1024`) for better reasoning visibility

## Reference implementation

`https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo` — Docker + Xvfb + agent loop + web UI.

## memory-chat relevance

- ไม่เกี่ยวกับ memory-chat โดยตรง
- คือ tool สำหรับ desktop automation agents (ซับซ้อนมาก ต้องมี VM)
- ถ้าจะใช้: ต้องมี compute infrastructure แยก + ไม่เหมาะกับ web-only app
