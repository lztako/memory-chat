# Multilingual Support

**Source:** https://platform.claude.com/docs/en/build-with-claude/multilingual-support.md

## ประสิทธิภาพเทียบกับ English (zero-shot, with extended thinking)

| Language | Sonnet 4.6 | Haiku 4.5 |
|----------|-----------|-----------|
| English (baseline) | 100% | 100% |
| Spanish | 98.2% | 96.4% |
| French | 97.5% | 95.7% |
| Arabic | 97.2% | 92.5% |
| Chinese (Simplified) | 96.9% | 94.2% |
| Korean | 96.7% | 93.3% |
| Japanese | 96.8% | 93.5% |
| Hindi | 96.7% | 92.4% |
| **Thai** | ไม่อยู่ใน benchmark แต่ใกล้เคียง Asian languages |

## Best practices
1. ระบุ output language ใน prompt ชัดเจน ("ตอบเป็นภาษาไทย")
2. ส่ง text เป็น native script ไม่ใช่ transliteration
3. Claude ตอบ auto ตาม language ของ user message ถ้าไม่ระบุ

## memory-chat relevance
- ลูกค้า Thai → Claude ตอบภาษาไทยได้ดี (~95%+ relative to English)
- System prompt ภาษาไทยทำงานได้ปกติ — inject Thai instructions ได้
- Memory extraction ทำงานกับ Thai content ได้
