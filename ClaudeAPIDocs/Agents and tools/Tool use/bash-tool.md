# Bash Tool

**Source:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/bash-tool.md

## Overview

Client-side tool (`bash_20250124`) — Claude runs shell commands in a **persistent bash session**.

Model compatibility: Claude 4.x + Sonnet 3.7

## Usage

```typescript
tools: [{ type: "bash_20250124", name: "bash" }]
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `command` | Yes* | Shell command to run |
| `restart` | No | `true` to restart bash session |

*Required unless using restart.

## Key behaviors

- **Persistent session**: cwd, env vars, files created persist between commands in the same conversation
- State is lost between separate API calls (not truly persistent across conversations)
- No interactive commands (`vim`, `less`, password prompts)
- No GUI applications

## Pricing

**+245 input tokens** per API call (schema overhead).

## Implementation pattern

```typescript
// Client handles tool_use blocks
for (const block of response.content) {
  if (block.type === "tool_use" && block.name === "bash") {
    const { command, restart } = block.input;
    const result = restart
      ? restartBashSession()
      : executeCommand(command);
    toolResults.push({
      type: "tool_result",
      tool_use_id: block.id,
      content: result
    });
  }
}
```

## Security requirements

- Run in isolated environment (Docker/VM)
- Command filtering / allowlist for dangerous patterns
- Resource limits: `ulimit` for CPU, memory, disk
- Log all commands
- Minimal user permissions (not root)

## Dangerous patterns to block

`rm -rf /` · `format` · `:(){:|:&};:` (fork bomb) · `sudo` · `chmod 777 /`

## Handle large outputs

Truncate at ~100 lines with `... Output truncated (N total lines) ...` suffix.

## Git-based checkpointing (agentic pattern)

1. Commit baseline before agent work
2. Commit per feature → rollback points
3. Read `git log` + progress file at session start
4. `git checkout` to revert on failure

## Combined with text editor

Bash + text editor = classic coding agent pattern:
- text editor: view/edit files
- bash: run tests, install packages, git ops

Note: If code execution tool is also enabled → 2 separate environments (local bash vs Anthropic sandbox). State NOT shared.

## memory-chat relevance

- ไม่ได้ใช้ใน memory-chat — เป็น tool สำหรับ coding agents
- ถ้าจะสร้าง "File Processor agent" ที่รัน Python scripts → ใช้ bash_20250124
- ต้องรัน Claude Code ใน sandboxed container ก่อนถึงจะ safe ในการ expose
