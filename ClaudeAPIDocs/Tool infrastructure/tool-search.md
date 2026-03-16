# Tool Search

**Source:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool

## Overview

Server-side feature — Claude dynamically discovers tools on-demand instead of loading all definitions upfront. Searches a catalog and loads only 3–5 tools needed for the current request.

**Two variants:**
| Variant | Type string | Search method |
|---------|-------------|---------------|
| Regex | `tool_search_tool_regex_20251119` | Python `re.search()` patterns |
| BM25 | `tool_search_tool_bm25_20251119` | Natural language queries |

## Setup

**Step 1 — Add search tool to `tools` array (never deferred):**
```json
{ "type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex" }
```

**Step 2 — Mark other tools as deferred:**
```json
{
  "name": "get_weather",
  "description": "...",
  "input_schema": { ... },
  "defer_loading": true
}
```

## Flow

1. Claude sees only the search tool (+ non-deferred tools) at start
2. Claude calls search with regex/BM25 query
3. API returns `tool_reference` blocks for 3–5 matches
4. References auto-expand into full definitions — no client-side handling needed
5. Claude invokes the discovered tool normally

**New response block types:** `server_tool_use` · `tool_search_tool_result` · `tool_references`

## Constraints

| Constraint | Value |
|---|---|
| Max tools in catalog | 10,000 |
| Results per search | 3–5 |
| Max regex pattern length | 200 chars |
| Model support | Sonnet 4.0+ · Opus 4.0+ only (no Haiku) |
| Not compatible with | Tool use examples |
| ZDR | Not covered (client-side custom impl IS ZDR-eligible) |

**400 errors:** all tools deferred (must keep ≥1 non-deferred) OR `tool_reference` with no matching definition.

## MCP integration

```json
{
  "type": "mcp_toolset",
  "source": { ... },
  "default_config": { "defer_loading": true }
}
```
Requires beta header `mcp-client-2025-11-20`.

## Pricing

- Tracked separately in `usage.server_tool_use.tool_search_requests`
- No extra per-search fee — billed as normal API calls
- Token savings: typical multi-service setup (GitHub+Slack+Sentry+Grafana+Splunk) costs ~55k tokens upfront → **>85% reduction** with tool search

## Optimization tips

- Keep 3-5 most frequently used tools as non-deferred
- Write clear, keyword-rich tool descriptions (Claude searches both name + description)
- Use consistent namespacing: `github_`, `slack_` prefix → search queries surface right group naturally
- Add system prompt section: `"You can search for tools to interact with Slack, GitHub, and Jira"`
- Regex is case-sensitive by default — use `(?i)` for case-insensitive
- Test regex: `import re; re.search(r"your_pattern", "tool_name")`

## Usage tracking

```json
{
  "usage": {
    "input_tokens": 1024,
    "output_tokens": 256,
    "server_tool_use": {
      "tool_search_requests": 2
    }
  }
}
```

## memory-chat relevance

- **Not needed now** — memory-chat has ~20 tools, threshold is ~30+ or >10k token definitions
- **Haiku exclusion** — `extract.ts` + `use_agent` use Haiku → tool search can't apply there
- **Main route** (`route.ts`) uses Sonnet → supported
- **Future**: if Tendata becomes MCP server, `defer_loading: true` on all Tendata tools = clean pattern
- **Trigger**: reconsider when tool count crosses ~30 or definitions consume noticeable tokens
