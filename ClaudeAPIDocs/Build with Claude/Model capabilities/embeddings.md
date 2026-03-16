# Embeddings (Voyage AI)

**Source:** https://platform.claude.com/docs/en/build-with-claude/embeddings.md

> Anthropic ไม่มี embedding model ของตัวเอง — แนะนำ **Voyage AI**
> memory-chat ใช้ `voyage-3-lite` อยู่แล้วใน `lib/ai/embeddings.ts`

## Voyage AI Models

| Model | Dims | Use case |
|-------|------|----------|
| `voyage-3-large` | 1024 | Best quality |
| `voyage-3.5` | 1024 | Balanced |
| `voyage-3.5-lite` | 1024 | Low latency/cost |
| `voyage-code-3` | 1024 | Code retrieval |
| **`voyage-3-lite`** | 512 | **memory-chat ใช้อยู่** |

## Usage (TypeScript)

```ts
import Anthropic from "@anthropic-ai/sdk" // ไม่ได้ใช้สำหรับ embeddings
// ใช้ voyageai package หรือ HTTP API โดยตรง

const response = await fetch("https://api.voyageai.com/v1/embeddings", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.VOYAGE_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "voyage-3-lite",
    input: ["text to embed"],
    input_type: "document"  // หรือ "query" สำหรับ search queries
  })
})
const { data } = await response.json()
const embedding = data[0].embedding  // array of 512 floats
```

## input_type parameter (สำคัญ)
- `"document"` — embed เนื้อหาที่จะถูก search
- `"query"` — embed query ที่ใช้ search

Voyage embeddings normalized → cosine similarity = dot product

## ใน memory-chat
- `lib/ai/embeddings.ts` — embed ด้วย `voyage-3-lite` (512 dims)
- `Memory.embedding` + `UserSkill.embedding` — HNSW index (vector_cosine_ops)
- Semantic retrieval ใน `memory.repo.ts` + `skill.repo.ts`
