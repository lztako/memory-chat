# Files API

**Source:** https://platform.claude.com/docs/en/build-with-claude/files

**Beta header required:** `anthropic-beta: files-api-2025-04-14` on ALL requests

**Not available on:** Amazon Bedrock · Google Vertex AI · ZDR

## Overview

Upload files once → reference by `file_id` in multiple requests. Avoids re-uploading the same content repeatedly.

**Best for:** PDFs, images, code execution inputs/outputs — NOT CSV/XLSX (see below).

## Upload

```typescript
// POST https://api.anthropic.com/v1/files
// multipart/form-data with `file` field

const uploaded = await client.beta.files.upload({
  file: [filename, fileBuffer, mimeType]
});
// returns: { id, type, filename, mime_type, size_bytes, created_at, downloadable }
```

## List / Retrieve / Delete

```typescript
client.beta.files.list()                    // GET /v1/files
client.beta.files.retrieve_metadata(id)     // GET /v1/files/{id}
client.beta.files.delete(id)                // DELETE /v1/files/{id}

// Download (only files created by code execution / skills — NOT uploaded files):
// GET /v1/files/{id}/content
```

## Supported file types

| File type | MIME | Content block | Notes |
|-----------|------|---------------|-------|
| PDF | `application/pdf` | `document` | text analysis |
| Plain text | `text/plain` | `document` | text analysis |
| Images | `image/jpeg/png/gif/webp` | `image` | visual tasks |
| Datasets | varies | `container_upload` | code execution tool |
| **CSV/XLSX** | — | ❌ not supported | must convert to text inline |

**DOCX with images** → convert to PDF first before uploading.

## Reference in messages

**Document block (PDF / plain text):**
```json
{
  "type": "document",
  "source": {
    "type": "file",
    "file_id": "file_011CNha..."
  },
  "title": "Optional title",
  "context": "Optional context",
  "citations": { "enabled": true }
}
```

**Image block:**
```json
{
  "type": "image",
  "source": {
    "type": "file",
    "file_id": "file_011CPMx..."
  }
}
```

## Lifecycle

- **Scope:** workspace-scoped (any API key in workspace can use any file)
- **Expiry:** no automatic expiration — persist until deleted
- **Deletion:** permanent, cannot recover — inaccessible shortly after delete
- **Beta rate limit:** ~100 file API requests/minute

## Limits & pricing

| Item | Limit |
|------|-------|
| Max file size | 500 MB |
| Total storage | 100 GB / organization |
| File operations | **Free** (upload/list/delete) |
| Content in Messages | Billed as normal input tokens |

A file that exceeds context window → 400 error.

## memory-chat relevance

**Current CSV/XLSX flow stays the same** — CSV/XLSX ไม่ support เป็น document block → ยังต้อง parse ด้วย SheetJS + inject inline เหมือนเดิมใน `/api/files/attach`

**Where Files API adds value:**
1. **PDF uploads** — ถ้า user อัปโหลด PDF report → store ครั้งเดียว, reference ด้วย `file_id` ทุก request (ไม่ต้อง re-send ทุกครั้ง)
2. **Global docs** — Origo Brand Book หรือ reference docs ขนาดใหญ่ → upload ครั้งเดียว แทนการ inject text ทุก request
3. **Code execution outputs** — ถ้าใช้ code execution tool generate chart/CSV → download ผ่าน Files API

**Not urgent now** — primary file types (CSV/XLSX) ยังต้อง inline injection ต่อไป. Files API มีประโยชน์เมื่อ PDF support กลายเป็น priority
