# Model Capabilities — Index

| File | ถามเรื่อง |
|------|----------|
| `extended-thinking.md` | Manual thinking mode (`budget_tokens`), Sonnet 4.6, interleaved, tool use + thinking |
| `adaptive-thinking.md` | Auto thinking สำหรับ Opus 4.6 + Sonnet 4.6 (`thinking: {type: "adaptive"}`) |
| `effort.md` | `output_config: {effort: "low/medium/high/max"}` — GA, ไม่ต้อง beta header |
| `fast-mode.md` | 2.5x faster output สำหรับ Opus 4.6 (beta, waitlist, 6x price) |
| `structured-outputs.md` | JSON schema output (`output_config.format`) + strict tool use |
| `citations.md` | Document citations — char/page/block location, ใช้กับ RAG |
| `streaming.md` | SSE events, thinking_delta, error recovery |
| `batch-processing.md` | Message Batches API — 50% discount, async, 100k requests/batch |
| `pdf-support.md` | PDF input — URL/base64/Files API, text+image analysis |
| `search-results.md` | RAG citations ด้วย `search_result` blocks |
| `vision.md` | Image input — base64/URL/Files API, token cost, limits |
| `embeddings.md` | Voyage AI embeddings (memory-chat ใช้ voyage-3-lite อยู่แล้ว) |
| `multilingual-support.md` | Performance data ภาษาต่างๆ รวม Thai |
