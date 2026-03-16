# Vision (Image Input)

**Source:** https://platform.claude.com/docs/en/build-with-claude/vision.md

## Supported formats
JPEG, PNG, GIF, WebP (`image/jpeg`, `image/png`, `image/gif`, `image/webp`)

## Limits
- API: up to 600 images per request (100 สำหรับ 200k context)
- Max size: 8000×8000 px (single image), 2000×2000 px (>20 images)
- Files API: 5 MB per image

## 3 ways

### 1. Base64
```ts
await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 1024,
  messages: [{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64String } },
      { type: "text", text: "Describe this image." }
    ]
  }]
})
```

### 2. URL
```ts
{ type: "image", source: { type: "url", url: "https://example.com/image.jpg" } }
```

### 3. Files API (แนะนำสำหรับ multi-turn)
```ts
// Upload once
const file = await client.beta.files.upload({
  file: await toFile(fs.createReadStream("image.jpg"), undefined, { type: "image/jpeg" }),
  betas: ["files-api-2025-04-14"]
})

// Reference ใน conversation — ไม่ต้อง resend base64 ทุก turn
{ type: "image", source: { type: "file", file_id: file.id } }
```

## Token cost
```
tokens ≈ (width × height) / 750
```
ตัวอย่าง: 1000×1000 px → ~1,334 tokens (~$0.004 ที่ Sonnet 4.6 rate)

## Best practices
- Images ก่อน text ใน content array (+performance)
- Resize ถ้า long edge > 1568 px (ลด latency TTFT)
- Multi-image: ใส่ label `"Image 1:"` และ `"Image 2:"` ก่อนแต่ละรูป

## ข้อจำกัด
- ไม่สามารถ identify บุคคลในรูป (safety policy)
- ไม่ generate/edit images
- Spatial reasoning อ่อน (counting, exact positions)
