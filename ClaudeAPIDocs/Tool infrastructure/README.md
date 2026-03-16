# Tool Infrastructure — Index

| File | ถามเรื่อง |
|------|----------|
| `tool-search.md` | deferred loading, regex/BM25 search, catalog up to 10k tools, >85% token reduction, Sonnet 4.0+ only |
| `programmatic-tool-calling.md` | `code_execution_20260120` + `allowed_callers`, Claude writes Python loops, tool results NOT in context, `caller` field |
| `fine-grained-tool-streaming.md` | `eager_input_streaming: true`, chunk latency 15s→3s, no JSON validation, good for `render_artifact` |
