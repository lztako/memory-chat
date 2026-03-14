"use client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ToolCall { id: string; name: string; done: boolean }

interface Props {
  role: "user" | "assistant"
  content: string
  toolCalls?: ToolCall[]
  isStreaming?: boolean
}

export function MessageBubble({ role, content, isStreaming }: Props) {
  const isUser = role === "user"

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 4,
      alignItems: isUser ? "flex-end" : "flex-start",
      animation: "msgFadeUp .28s ease both",
    }}>
      <div style={{
        padding: isUser ? "10px 16px" : "2px 0",
        borderRadius: isUser ? 18 : 0,
        fontSize: 15,
        lineHeight: 1.75,
        maxWidth: isUser ? 540 : "100%",
        background: isUser ? "var(--surface2)" : "transparent",
        alignSelf: isUser ? "flex-end" : "flex-start",
        wordBreak: "break-word",
        border: isUser ? "1px solid var(--border)" : "none",
      }}>
        {isUser ? (
          <span style={{ whiteSpace: "pre-wrap", color: "var(--text)" }}>{content}</span>
        ) : content ? (
          <div className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", margin: "0.75em -32px" }}>
                    <table style={{ margin: 0, width: "100%" }}>{children}</table>
                  </div>
                ),
              }}
            >{content}</ReactMarkdown>
          </div>
        ) : isStreaming ? (
          <span className="thinking-text">Thinking</span>
        ) : null}
      </div>
    </div>
  )
}
