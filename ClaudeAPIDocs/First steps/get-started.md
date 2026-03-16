# Get Started with Claude

**Source:** https://platform.claude.com/docs/en/get-started.md

## Prerequisites
- Anthropic Console account
- API key (`ANTHROPIC_API_KEY`)

## TypeScript (ที่ใช้ใน memory-chat)

```bash
npm install @anthropic-ai/sdk
export ANTHROPIC_API_KEY='your-api-key-here'
```

```ts
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()

const msg = await anthropic.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 1000,
  messages: [{ role: "user", content: "Hello" }],
})

console.log(msg.content)
```

## Response Structure

```json
{
  "id": "msg_01...",
  "type": "message",
  "role": "assistant",
  "model": "claude-opus-4-6",
  "content": [{ "type": "text", "text": "..." }],
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 21,
    "output_tokens": 305
  }
}
```

## Python

```bash
pip install anthropic
```

```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1000,
    messages=[{"role": "user", "content": "Hello"}],
)
print(message.content)
```

## cURL

```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-opus-4-6",
    "max_tokens": 1000,
    "messages": [{ "role": "user", "content": "Hello" }]
  }'
```

## Next Steps
- Messages API patterns → multi-turn, system prompts, stop reasons
- Models overview → compare capability + cost
- Features overview → tools, context management, structured outputs
- Client SDKs → Python, TypeScript, Java docs
