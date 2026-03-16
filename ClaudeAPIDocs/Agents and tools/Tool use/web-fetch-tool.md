# Web Fetch Tool

**Source:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool.md

## Tool versions

| Version | Feature | ZDR |
|---------|---------|-----|
| `web_fetch_20250910` | Basic fetch | ✅ ZDR eligible |
| `web_fetch_20260209` | + Dynamic filtering (Opus/Sonnet 4.6) | ❌ not ZDR by default |

Dynamic filtering requires code execution tool. To use `web_fetch_20260209` with ZDR: set `"allowed_callers": ["direct"]`.

## Limitations

- Does NOT support JavaScript-rendered pages
- Cannot fetch arbitrary URLs Claude generates — only URLs that appeared in conversation (user messages, prior search/fetch results, client tool results)

## TypeScript usage

```typescript
tools: [
  {
    type: "web_fetch_20250910",
    name: "web_fetch",
    max_uses: 5,
    allowed_domains: ["example.com"],   // mutually exclusive with blocked_domains
    blocked_domains: ["private.example.com"],
    citations: { enabled: true },
    max_content_tokens: 100000          // approximate limit, truncates if exceeded
  }
]
```

## Response structure

```
server_tool_use block → web_fetch_tool_result block
  content.type = "web_fetch_result"
  content.url = fetched URL
  content.content = document block (text or base64 PDF)
  content.retrieved_at = timestamp
```

PDF responses: `source.type="base64"`, `media_type="application/pdf"`.

Results are cached — may not reflect latest content.

## Error codes

| Code | Meaning |
|------|---------|
| `url_too_long` | URL > 250 chars |
| `url_not_allowed` | blocked by domain filter or model restriction |
| `url_not_accessible` | HTTP error |
| `unsupported_content_type` | only text and PDF supported |
| `max_uses_exceeded` | exceeded max_uses limit |

All return HTTP 200 with error in response body.

## Combined search + fetch

```typescript
tools: [
  { type: "web_search_20250305", name: "web_search", max_uses: 3 },
  { type: "web_fetch_20250910", name: "web_fetch", max_uses: 5, citations: { enabled: true } }
]
```
Flow: search → get URLs → fetch full content → analyze with citations.

## Token costs (approximate)

| Content | Tokens |
|---------|--------|
| Average web page (10 kB) | ~2,500 |
| Large doc page (100 kB) | ~25,000 |
| Research paper PDF (500 kB) | ~125,000 |

**No additional charges** beyond standard token costs.

## Security

URLs can only be fetched if they previously appeared in conversation context. Claude cannot construct arbitrary URLs. Use `allowed_domains` + `max_uses` to limit exposure.

## memory-chat relevance

- ไม่ได้ใช้ปัจจุบัน — เป็น server tool ถ้าจะเพิ่มไม่ต้องแก้ handlers.ts
- ใช้ประโยชน์ได้สำหรับ "วิเคราะห์เว็บไซต์คู่แข่ง" หรือ "ดึงข้อมูลจาก URL"
