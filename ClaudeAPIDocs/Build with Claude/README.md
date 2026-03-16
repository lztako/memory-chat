# Build with Claude — Index

| File | ถามเรื่อง |
|------|----------|
| `overview.md` | feature map ของ Claude API — model capabilities, tools, context management |
| `working-with-messages.md` | basic request, multi-turn, response structure, vision/image input |
| `handling-stop-reasons.md` | stop reasons ทั้งหมด (pause_turn, refusal, tool_use, context_exceeded) + patterns |
| `prompting-best-practices.md` | parallel tools, effort, agentic prompts, format control, prefill migration |

## Subfolder: Model capabilities/

| File | ถามเรื่อง |
|------|----------|
| `extended-thinking.md` | Manual thinking (`budget_tokens`), Sonnet 4.6, interleaved, tool use |
| `adaptive-thinking.md` | Auto thinking Opus/Sonnet 4.6 (`thinking: {type: "adaptive"}`) |
| `effort.md` | `output_config.effort` — low/medium/high/max, GA |
| `fast-mode.md` | 2.5x output speed, Opus 4.6 only, beta |
| `structured-outputs.md` | JSON schema output + strict tool use |
| `citations.md` | Document citations สำหรับ RAG |
| `streaming.md` | SSE events, thinking_delta, error recovery |
| `batch-processing.md` | Async batch — 50% discount, 100k requests |
| `pdf-support.md` | PDF input — URL/base64/Files API |
| `search-results.md` | RAG citations ด้วย search_result blocks |
| `vision.md` | Image input — formats, token cost, limits |
| `embeddings.md` | Voyage AI (memory-chat ใช้ voyage-3-lite) |
| `multilingual-support.md` | Performance ภาษาต่างๆ รวม Thai |
