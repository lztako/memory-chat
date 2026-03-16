# PDF Support

**Source:** https://platform.claude.com/docs/en/build-with-claude/pdf-support.md

รองรับทุก active models

## Limits
| | Limit |
|--|-------|
| Request size | 32 MB |
| Pages | 600 (หรือ 100 สำหรับ 200k context) |
| Format | Standard PDF (no password) |

## 3 ways to send PDFs

### 1. URL
```ts
await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 1024,
  messages: [{
    role: "user",
    content: [
      { type: "document", source: { type: "url", url: "https://example.com/doc.pdf" } },
      { type: "text", text: "Summarize this document" }
    ]
  }]
})
```

### 2. Base64
```ts
import base64 from "base-64"
const pdfBase64 = base64.encode(pdfBuffer)

{ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } }
```

### 3. Files API (recommended สำหรับ repeated use)
```ts
// Upload once
const file = await client.beta.files.upload({
  file: await toFile(fs.createReadStream("doc.pdf"), undefined, { type: "application/pdf" }),
  betas: ["files-api-2025-04-14"]
})

// Reference by file_id
{ type: "document", source: { type: "file", file_id: file.id } }
```

## How it works
1. แต่ละ page → image + extracted text
2. Claude analyze ทั้ง text และ image → เข้าใจ charts, tables, visual content

## Token cost
- ~1,500-3,000 tokens per page (text)
- Image tokens เพิ่มตาม page (เพราะ convert เป็น image)

## + Prompt caching
```ts
{
  type: "document",
  source: { ... },
  cache_control: { type: "ephemeral" }  // cache PDF content
}
```

## Best practices
- PDF ก่อน text ใน content array
- ใช้ standard fonts
- หมุน page ให้ตรง
- Dense PDFs → split เป็น sections
