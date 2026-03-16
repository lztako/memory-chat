# Search Results (RAG Citations)

**Source:** https://platform.claude.com/docs/en/build-with-claude/search-results.md

รองรับ: Opus 4.6, Sonnet 4.6, Sonnet 4.5, Opus 4.5, Haiku 4.5 และ versions อื่น

## คืออะไร
ส่ง search results เป็น `search_result` block → Claude cite แบบ web search quality

## 2 วิธี

### Method 1: จาก tool result (Dynamic RAG)
```ts
// Tool return search_result blocks
const toolResult = [
  {
    type: "search_result",
    source: "https://docs.company.com/guide",
    title: "Product Guide",
    content: [{ type: "text", text: "Configure at Settings > Configuration..." }],
    citations: { enabled: true }
  }
]

// ส่งกลับใน tool_result
await client.messages.create({
  messages: [
    { role: "user", content: "..." },
    { role: "assistant", content: response.content },
    {
      role: "user",
      content: [{
        type: "tool_result",
        tool_use_id: toolUseId,
        content: toolResult  // ← search_result blocks ที่นี่
      }]
    }
  ]
})
```

### Method 2: Top-level content (Pre-fetched)
```ts
await client.messages.create({
  messages: [{
    role: "user",
    content: [
      {
        type: "search_result",
        source: "https://docs.company.com",
        title: "API Reference",
        content: [{ type: "text", text: "All requests require API key..." }],
        citations: { enabled: true }
      },
      { type: "text", text: "How do I authenticate?" }
    ]
  }]
})
```

## Response with citations
```json
{
  "content": [
    {
      "type": "text",
      "text": "All requests require an API key",
      "citations": [{
        "type": "search_result_location",
        "source": "https://docs.company.com",
        "title": "API Reference",
        "cited_text": "All requests require API key...",
        "search_result_index": 0,
        "start_block_index": 0,
        "end_block_index": 0
      }]
    }
  ]
}
```

## ข้อจำกัด
- Citations ต้อง enable ทุกอัน หรือ disable ทุกอัน (ห้าม mix)
- ใช้ cache_control บน search_result block ได้
