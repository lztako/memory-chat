# Text Editor Tool

**Source:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool.md

## Tool versions

| Model | Type | Name |
|-------|------|------|
| Claude 4.x | `text_editor_20250728` | `str_replace_based_edit_tool` |
| Sonnet 3.7 (deprecated) | `text_editor_20250124` | `str_replace_editor` |

**Claude 4 does NOT have `undo_edit`** — use Sonnet 3.7 if you need undo.

## Usage (Claude 4)

```typescript
tools: [
  {
    type: "text_editor_20250728",
    name: "str_replace_based_edit_tool",
    max_characters: 10000   // optional — truncate large files on view
  }
]
```

## Commands

| Command | Key Parameters | Notes |
|---------|----------------|-------|
| `view` | `path`, optional `view_range: [start, end]` | Lists dir or reads file; line numbers required for `view_range` |
| `str_replace` | `path`, `old_str`, `new_str` | `old_str` must match **exactly** one location |
| `create` | `path`, `file_text` | Creates new file |
| `insert` | `path`, `insert_line`, `insert_text` | 0 = beginning of file |
| `undo_edit` | `path` | Sonnet 3.7 only |

## Client implementation flow

1. Claude calls `view` → you read file and return contents with line numbers
2. Claude calls `str_replace` → you find exact match, replace, return success/error
3. Return appropriate error if: file not found, 0 matches, or >1 matches

## Error responses

```typescript
// Multiple matches
{ content: "Error: Found 3 matches. Provide more context.", is_error: true }

// No match
{ content: "Error: No match found. Check your text.", is_error: true }

// File not found
{ content: "Error: File not found", is_error: true }
```

## Unique match requirement

`str_replace` fails if `old_str` appears 0 or >1 times. Claude must include enough surrounding context to make it unique.

## Pricing

**+700 input tokens** per API call for both `text_editor_20250728` and `text_editor_20250124`.

## Changelog

| Date | Version | Key change |
|------|---------|-----------|
| 2025-07-28 | `text_editor_20250728` | Bug fixes + optional `max_characters` |
| 2025-04-29 | `text_editor_20250429` | Claude 4 — removes `undo_edit` |
| 2025-03-13 | `text_editor_20250124` | Sonnet 3.7 standalone |
| 2024-10-22 | `text_editor_20241022` | Initial release (Sonnet 3.5) |

## memory-chat relevance

- ไม่ได้ใช้ใน memory-chat ปัจจุบัน
- ถ้าจะสร้าง coding agent หรือ "AI แก้ไขไฟล์ของ user" → ใช้ tool นี้ร่วมกับ bash
- Claude Code เองใช้ tool นี้ (Edit tool = str_replace_based_edit_tool)
