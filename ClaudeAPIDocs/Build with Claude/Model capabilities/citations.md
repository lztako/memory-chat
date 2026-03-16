# Citations

**Source:** https://platform.claude.com/docs/en/build-with-claude/citations.md

รองรับทุก active models ยกเว้น Haiku 3

## คืออะไร
Claude cite ข้อความจาก document ที่ให้ไปอย่าง reliable — ดีกว่า prompt-based approach

## Usage

```ts
const response = await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 1024,
  messages: [{
    role: "user",
    content: [
      {
        type: "document",
        source: { type: "text", media_type: "text/plain", data: "The grass is green. The sky is blue." },
        title: "My Document",
        citations: { enabled: true }  // ← enable citations
      },
      { type: "text", text: "What color is the sky?" }
    ]
  }]
})
```

## Document types

| Type | Source | Chunking | Citation format |
|------|--------|----------|-----------------|
| Plain text | `type: "text"` | Sentence auto | `char_location` (0-indexed char range) |
| PDF | `type: "base64"/"url"/"file"` | Sentence auto | `page_location` (1-indexed page) |
| Custom content | `type: "content"` | Manual (no auto) | `content_block_location` (0-indexed) |

## Response structure

```json
{
  "content": [
    { "type": "text", "text": "The sky is " },
    {
      "type": "text",
      "text": "blue",
      "citations": [{
        "type": "char_location",
        "cited_text": "The sky is blue.",
        "document_index": 0,
        "document_title": "My Document",
        "start_char_index": 20,
        "end_char_index": 36
      }]
    }
  ]
}
```

## กับ Prompt Caching

```ts
{
  type: "document",
  source: { type: "text", media_type: "text/plain", data: longDoc },
  citations: { enabled: true },
  cache_control: { type: "ephemeral" }  // cache document ได้
}
```

## ข้อจำกัด
- **ใช้กับ Structured Outputs ไม่ได้** — error 400
- Citations ต้อง enable ทุก document หรือ disable ทุก document (ห้าม mix)
- `cited_text` ไม่นับเป็น output tokens (cost saving)
