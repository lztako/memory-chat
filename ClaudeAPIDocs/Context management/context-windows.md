# Context Windows

**Source:** https://platform.claude.com/docs/en/build-with-claude/context-windows

## What is a context window?

All text Claude can reference when generating a response — including the response itself. "Working memory", distinct from training data.

**Key insight: more context ≠ better.** As token count grows, accuracy degrades (**context rot**). Curation matters as much as capacity.

## Token limits by model

| Model | Context Window | Notes |
|-------|----------------|-------|
| Claude Opus 4.6 | 1M tokens | default |
| Claude Sonnet 4.6 | 1M tokens | default |
| Claude Sonnet 4.5 | 200k default; 1M with beta | `context-1m-2025-08-07` header + tier 4 |
| Claude Sonnet 4 | 200k default; 1M with beta | same header requirement |
| All other models | 200k tokens | no 1M option |

**Image/PDF per request:**
- 1M context models: up to 600 images or PDF pages
- 200k context models: up to 100 images or PDF pages

## How context accumulates

Each turn: input (all history + current message) → output (response joins future input). Growth is linear — no automatic truncation.

**Sonnet 3.7+ breaking change:** Returns **validation error** when prompt + output tokens exceed context — NOT silent truncation. Must manage tokens proactively.

## Extended thinking + context window

- All tokens (input + output + thinking) count toward context
- Thinking tokens are subset of `max_tokens`, billed as output tokens
- **Previous thinking blocks are auto-stripped** by API when passed back — you don't need to strip them manually

```
context_window = (input_tokens - previous_thinking_tokens) + current_turn_tokens
```

**With tool use + extended thinking:**
- Turn 2 (tool result): must return thinking block alongside tool results (only mandatory case)
- Turn 3: thinking block from turns 1-2 auto-stripped → new thinking block generated
- Cryptographic signatures on thinking blocks — modifying them = API error
- Claude 4 models: support interleaved thinking (thinking between tool calls)
- Claude Sonnet 3.7: does NOT support interleaved thinking

## Context awareness (Sonnet 4.6 / 4.5 / Haiku 4.5)

Built-in token budget tracking. Claude receives at conversation start:
```xml
<budget:token_budget>1000000</budget:token_budget>
```

After each tool call:
```xml
<system_warning>Token usage: 35000/1000000; 965000 remaining</system_warning>
```

Claude paces itself across long agent sessions automatically. Best for long-running agents and multi-context-window workflows.

## Managing context — strategies

| Strategy | When to use |
|----------|-------------|
| **Server-side Compaction** (recommended) | Long conversations, agentic workflows. Beta for Opus 4.6 + Sonnet 4.6. Auto-summarizes earlier turns. |
| **Context Editing** | Fine-grained control: clear old tool results, manage thinking blocks manually |
| **Token Counting API** | Count before sending — critical for Sonnet 3.7+ (errors not truncates) |

## Production best practices

1. **Count tokens before sending** — Sonnet 3.7+ errors instead of truncating
2. **Curate context actively** — don't let history grow unchecked (context rot)
3. **Use compaction for long conversations** — lowest friction for multi-turn chat
4. **Clear old tool results** in agentic workflows when no longer needed
5. **Design for session recovery** — don't assume context persists across sessions
6. **Leverage context awareness models** — Sonnet 4.6/4.5/Haiku 4.5 auto-track budget
7. **Never modify thinking blocks** — cryptographic signature check → API error

## memory-chat relevance

- **route.ts** uses Sonnet 4.6 → 1M context, context awareness active
- **History truncation** (keep 4 full turns, commit d39aa73) = manual context editing
- **Tool result 8k limit** (commit d39aa73) = clearing large tool results proactively
- **Compaction** — บันทึกแล้วใน `compaction.md` — server-side option สำหรับ production
- **Sonnet 3.7+ validation error** ทำให้ keep 4 turns + 8k limit สำคัญ — หากไม่ตัด → request ล้มเหลว
- **Context awareness**: Haiku ใน `extract.ts` / `use_agent` → budget tracking อัตโนมัติ
