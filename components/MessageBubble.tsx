"use client"
import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ToolCall { id: string; name: string; done: boolean }

interface Props {
  role: "user" | "assistant"
  content: string
  toolCalls?: ToolCall[]
  isStreaming?: boolean
}

const TOOL_LABELS: Record<string, string> = {
  list_trade_companies: "Searching companies",
  rank_trade_companies: "Ranking companies",
  query_trade_data: "Querying trade data",
  render_artifact: "Building chart",
  save_skill: "Saving skill",
  create_task: "Creating task",
  update_task: "Updating task",
  list_tasks: "Loading tasks",
  query_files: "Reading files",
  save_user_config: "Saving config",
  rename_user_file: "Renaming file",
  update_user_config: "Updating config",
}

const TOOL_STATUS: Record<string, string> = {
  list_trade_companies: "Searching trade companies...",
  rank_trade_companies: "Ranking by trade volume...",
  query_trade_data: "Querying trade database...",
  render_artifact: "Building visualization...",
  save_skill: "Saving new skill...",
  create_task: "Creating task...",
  update_task: "Updating task...",
  list_tasks: "Loading tasks...",
  query_files: "Reading your files...",
  save_user_config: "Saving configuration...",
  rename_user_file: "Renaming file...",
  update_user_config: "Updating configuration...",
}

function useElapsedTime(active: boolean) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!active) { setElapsed(0); return }
    const start = Date.now()
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - start) / 100) / 10), 100)
    return () => clearInterval(timer)
  }, [active])
  return elapsed
}

export function MessageBubble({ role, content, toolCalls, isStreaming }: Props) {
  const isUser = role === "user"
  const elapsed = useElapsedTime(!!(isStreaming && !isUser))

  // Active tool = last pending tool (most recently started)
  const pendingTools = toolCalls?.filter(tc => !tc.done) ?? []
  const activeTool = pendingTools[pendingTools.length - 1]
  const statusText = activeTool
    ? (TOOL_STATUS[activeTool.name] ?? `${TOOL_LABELS[activeTool.name] ?? activeTool.name}...`)
    : null

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: isUser ? "flex-end" : "flex-start" }}>
      {/* Bubble */}
      <div style={{
        padding: "12px 16px",
        borderRadius: 8,
        fontSize: 13,
        lineHeight: 1.6,
        border: "1.5px solid var(--border)",
        maxWidth: isUser ? 480 : 680,
        background: isUser ? "var(--surface2)" : "var(--surface)",
        alignSelf: isUser ? "flex-end" : "flex-start",
        wordBreak: "break-word",
      }}>
        {/* Tool call badges */}
        {!isUser && toolCalls && toolCalls.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: content ? 10 : 6 }}>
            {toolCalls.map((tc) => (
              <span
                key={tc.id}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: "var(--surface2)",
                  border: "1px solid var(--border2)",
                  borderRadius: 5,
                  padding: "3px 8px",
                  fontSize: 10,
                  fontFamily: "var(--font-ibm-plex-mono), monospace",
                  color: "var(--text2)",
                }}
              >
                <span
                  className={tc.done ? undefined : "tool-call-dot-pending"}
                  style={{
                    width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                    background: tc.done ? "var(--green)" : "var(--blue)",
                  }}
                />
                {TOOL_LABELS[tc.name] ?? tc.name}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        {isUser ? (
          <span style={{ whiteSpace: "pre-wrap", color: "var(--text)" }}>{content}</span>
        ) : content ? (
          <div className="markdown-content" style={{ position: "relative" }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            {isStreaming && <span className="streaming-cursor" />}
          </div>
        ) : isStreaming ? (
          statusText ? (
            /* Tool is running — context-aware status */
            <div className="processing-status">
              <span className="processing-status-dot" />
              <span className="processing-status-text">{statusText}</span>
            </div>
          ) : (
            /* Pure thinking — dots */
            <div className="thinking-dots">
              <span /><span /><span />
            </div>
          )
        ) : null}
      </div>

      {/* Elapsed time — appears after 1s, fades in */}
      {!isUser && isStreaming && elapsed >= 1 && (
        <span className="elapsed-timer">{elapsed.toFixed(1)}s</span>
      )}
    </div>
  )
}
