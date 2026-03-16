# Web Search Tool

**Source:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool.md

## Tool versions

| Version | Feature | ZDR |
|---------|---------|-----|
| `web_search_20250305` | Basic search | ✅ ZDR eligible |
| `web_search_20260209` | + Dynamic filtering (Opus/Sonnet 4.6) | ❌ not ZDR by default |

Dynamic filtering: Claude writes code to post-process results before loading to context → reduces tokens + improves accuracy.
Dynamic filtering requires code execution tool to be enabled.

## TypeScript usage

```typescript
tools: [
  {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 5,
    allowed_domains: ["example.com"],   // mutually exclusive with blocked_domains
    blocked_domains: ["untrusted.com"],
    user_location: {
      type: "approximate",
      city: "Bangkok",
      country: "TH",
      timezone: "Asia/Bangkok"
    }
  }
]
```

## Response structure

Content array contains:
1. Claude's decision text
2. `server_tool_use` block (search query)
3. `web_search_tool_result` block (results: url, title, page_age, encrypted_content)
4. Claude's final text with inline `citations` (url, title, cited_text ≤150 chars)

```json
"server_tool_use": { "web_search_requests": 1 }
```

## Error codes

`too_many_requests` · `invalid_input` · `max_uses_exceeded` · `query_too_long` · `unavailable`

All return HTTP 200 with error embedded in `web_search_tool_result`.

## `pause_turn`

Server-side loop limit reached → `stop_reason="pause_turn"` → send response back as-is to continue.

## Pricing

- **$10 per 1,000 searches** + standard token costs
- Errors not billed
- Supports Messages Batches API at same price

## Domain filtering rules

- No scheme prefix (`example.com` not `https://example.com`)
- Subdomains auto-included
- Subpaths supported
- One wildcard `*` per entry (after domain part only)
- `allowed_domains` and `blocked_domains` are mutually exclusive

## memory-chat relevance

- memory-chat ไม่ได้ใช้ web_search ปัจจุบัน
- ถ้าจะเพิ่ม: เป็น server tool → ไม่ต้องเพิ่มใน handlers.ts
- เพิ่มใน definitions.ts เป็น server tool type แทน
