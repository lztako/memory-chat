"use client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Props {
  role: "user" | "assistant"
  content: string
}

export function MessageBubble({ role, content }: Props) {
  const isUser = role === "user"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${
          isUser
            ? "bg-blue-500 text-white rounded-br-sm whitespace-pre-wrap"
            : "bg-gray-100 text-gray-900 rounded-bl-sm"
        }`}
      >
        {isUser ? (
          content
        ) : (
          <div className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
