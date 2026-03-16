"use client"
import { useState, useEffect, Fragment } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ToolCall { id: string; name: string; done: boolean; input?: string }

interface Props {
  role: "user" | "assistant"
  content: string
  toolCalls?: ToolCall[]
  isStreaming?: boolean
}

const TOOL_LABELS: Record<string, string> = {
  save_memory: "Saving memory",
  get_context_state: "Getting context",
  update_context_state: "Updating context",
  create_task: "Creating task",
  update_task: "Updating task",
  list_tasks: "Listing tasks",
  search_market_data: "Searching market data",
  list_user_files: "Listing files",
  query_user_file: "Querying file data",
  update_user_config: "Updating AI config",
  rename_user_file: "Renaming file",
  save_skill: "Saving skill",
  query_attached_file: "Reading attached file",
  render_artifact: "Rendering chart",
  read_resource: "Reading resource",
  read_global_doc: "Reading document",
  execute_sql: "Running SQL",
  use_agent: "Running agent",
  web_search: "Searching the web",
  web_fetch: "Fetching webpage",
  list_folder_tree: "Reading folder",
  read_local_file: "Reading local file",
  write_local_file: "Writing local file",
  move_local_file: "Moving file",
}

const TOOL_CATEGORY: Record<string, string> = {
  execute_sql: "SQL",
  query_user_file: "Query",
  query_attached_file: "Query",
  search_market_data: "Tendata",
  web_search: "Web",
  web_fetch: "Web",
  render_artifact: "Artifact",
  use_agent: "Agent",
  save_memory: "Memory",
  create_task: "Task",
  update_task: "Task",
  list_tasks: "Task",
  save_skill: "Skill",
  read_resource: "Doc",
  read_global_doc: "Doc",
  write_local_file: "File",
  read_local_file: "File",
  move_local_file: "File",
}

function TerminalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <path d="M4 6l3 2-3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 10h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5.5 8.2l1.8 1.8 3.2-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const WORKING_FRAMES = ["·", "✻", "✽", "✶", "✳", "✢"]

function WorkingIcon() {
  const [frame, setFrame] = useState(1)
  useEffect(() => {
    const t = setInterval(() => setFrame(f => (f + 1) % WORKING_FRAMES.length), 130)
    return () => clearInterval(t)
  }, [])
  return (
    <span style={{
      color: "#c4785a", fontSize: 14, lineHeight: 1,
      fontFamily: "monospace", flexShrink: 0,
      width: 13, height: 13,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {WORKING_FRAMES[frame]}
    </span>
  )
}

function formatInput(name: string, inputStr?: string): string | null {
  if (!inputStr) return null
  try {
    const parsed = JSON.parse(inputStr)
    if (name === "execute_sql") return parsed.query ?? inputStr
    if (name === "web_search") return parsed.query ?? inputStr
    if (name === "web_fetch") return parsed.url ?? inputStr
    return JSON.stringify(parsed, null, 2)
  } catch {
    return inputStr
  }
}

function getLang(name: string): string {
  if (name === "execute_sql") return "sql"
  if (name === "web_search" || name === "web_fetch") return "text"
  return "json"
}

const ICON_COL = 20

// Fixed height for icon column — icon is vertically centered, giving equal gap above/below
const ICON_ROW_H = 28
// Height of connector div between rows (line lives here only)
const CONNECTOR_H = 8

function StepList({ toolCalls, expandedIds, toggleExpand, showDone }: {
  toolCalls: ToolCall[]
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
  showDone?: boolean
}) {
  const totalItems = toolCalls.length + (showDone ? 1 : 0)
  const hasLine = totalItems > 1

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {toolCalls.map((tc, idx) => {
        const label = TOOL_LABELS[tc.name] ?? tc.name
        const code = formatInput(tc.name, tc.input)
        const lang = getLang(tc.name)
        const expanded = expandedIds.has(tc.id)
        const isLastStep = idx === toolCalls.length - 1
        const showConnector = hasLine && (!isLastStep || showDone)

        return (
          <Fragment key={tc.id}>
            {/* Wrapper: relative so absolute line spans step + connector, growing with expanded content */}
            <div style={{ position: "relative" }}>
              {/* Line starts below icon column bottom, extends to wrapper bottom (incl. connector spacer) */}
              {showConnector && (
                <div style={{
                  position: "absolute",
                  left: ICON_COL / 2 - 0.5,
                  top: ICON_ROW_H,
                  bottom: 0,
                  width: 1,
                  background: "#3a3530",
                  pointerEvents: "none",
                }} />
              )}

              {/* Step row */}
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{
                  width: ICON_COL, height: ICON_ROW_H, flexShrink: 0,
                  display: "flex", justifyContent: "center", alignItems: "center",
                }}>
                  <span style={{ color: tc.done ? "#555" : "#888", display: "flex" }}>
                    <TerminalIcon />
                  </span>
                </div>
                <div style={{ flex: 1, paddingLeft: 10, paddingTop: (ICON_ROW_H - 13) / 2, paddingBottom: (ICON_ROW_H - 13) / 2 }}>
                  <button
                    onClick={() => tc.done && code ? toggleExpand(tc.id) : undefined}
                    style={{
                      display: "flex", alignItems: "center", width: "100%",
                      background: "none", border: "none", padding: 0,
                      cursor: tc.done && code ? "pointer" : "default", textAlign: "left",
                      fontSize: 13, lineHeight: "1",
                    }}
                  >
                    <span
                      className={!tc.done ? "thinking-text" : undefined}
                      style={tc.done ? { color: "#888" } : { padding: 0 }}
                    >{label}</span>
                  </button>

                  {expanded && code && (
                    <div style={{
                      marginTop: 6,
                      background: "#141414", borderRadius: 6, overflow: "hidden",
                      border: "1px solid #2a2a2a",
                    }}>
                      <div style={{
                        padding: "4px 10px", fontSize: 11, color: "#555",
                        borderBottom: "1px solid #222",
                        fontFamily: "var(--font-ibm-plex-mono, monospace)",
                      }}>{lang}</div>
                      <pre style={{
                        margin: 0, padding: "10px 12px", fontSize: 12, lineHeight: 1.6,
                        color: "#e0dbd4", fontFamily: "var(--font-ibm-plex-mono, monospace)",
                        overflowX: "auto", maxHeight: 240, overflowY: "auto",
                        whiteSpace: "pre-wrap", wordBreak: "break-all",
                      }}>{code}</pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Connector spacer — line extends through this gap */}
              {showConnector && <div style={{ height: CONNECTOR_H }} />}
            </div>
          </Fragment>
        )
      })}

      {/* Done row */}
      {showDone && (
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{
            width: ICON_COL, height: ICON_ROW_H, flexShrink: 0,
            display: "flex", justifyContent: "center", alignItems: "center",
          }}>
            <span style={{ color: "#e8e3dc", display: "flex" }}><CheckIcon /></span>
          </div>
          <div style={{ flex: 1, paddingLeft: 10, paddingTop: (ICON_ROW_H - 13) / 2, color: "#e8e3dc", fontSize: 13, fontWeight: 500, lineHeight: "1" }}>
            Done
          </div>
        </div>
      )}
    </div>
  )
}

function ToolSteps({ toolCalls, isStreaming, hasContent }: {
  toolCalls: ToolCall[]
  isStreaming?: boolean
  hasContent?: boolean
}) {
  const [collapsed, setCollapsed] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const allDone = !isStreaming && toolCalls.every(tc => tc.done) && toolCalls.length > 0

  // Auto-collapse as soon as text content starts streaming
  useEffect(() => {
    if (hasContent) setCollapsed(true)
  }, [hasContent])

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const headerLabel = toolCalls.length === 1
    ? (TOOL_LABELS[toolCalls[0]?.name] ?? toolCalls[0]?.name ?? "Working")
    : `Ran ${toolCalls.length} commands`

  // ── WORKING STATE — only shown when tools running AND no content yet ─────
  if (!allDone && !hasContent) {
    return (
      <div style={{ marginBottom: 10 }}>
        <StepList
          toolCalls={toolCalls}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
          showDone={false}
        />
      </div>
    )
  }

  // ── COLLAPSED HEADER — shown once content starts or all done ────────────
  return (
    <div style={{ marginBottom: 10 }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", padding: "2px 0 8px 0",
          cursor: "pointer", color: "#aaa", fontSize: 13,
        }}
      >
        <span>{headerLabel}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .15s" }}>
          <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </button>
      {!collapsed && (
        <StepList
          toolCalls={toolCalls}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
          showDone={allDone}
        />
      )}
    </div>
  )
}

export function MessageBubble({ role, content, toolCalls, isStreaming }: Props) {
  const isUser = role === "user"
  const hasTools = toolCalls && toolCalls.length > 0

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
        width: isUser ? undefined : "100%",
        background: isUser ? "var(--surface2)" : "transparent",
        alignSelf: isUser ? "flex-end" : "flex-start",
        wordBreak: "break-word",
        border: isUser ? "1px solid var(--border)" : "none",
      }}>
        {isUser ? (
          <span style={{ whiteSpace: "pre-wrap", color: "var(--text)" }}>{content}</span>
        ) : (
          <>
            {hasTools && (
              <ToolSteps toolCalls={toolCalls} isStreaming={isStreaming} hasContent={!!content} />
            )}
            {content ? (
              <div className="markdown-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ children }) => (
                      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", margin: "0.5em 0" }}>
                        <table style={{ margin: 0, width: "100%" }}>{children}</table>
                      </div>
                    ),
                  }}
                >{content.replace(/<br\s*\/?>/gi, "")}</ReactMarkdown>
              </div>
            ) : isStreaming && !hasTools ? (
              <span className="thinking-text">Thinking</span>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
