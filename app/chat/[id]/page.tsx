"use client"
import { useState, useEffect, useRef } from "react"
import { MessageBubble } from "@/components/MessageBubble"
import { ChatInput } from "@/components/ChatInput"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const [conversationId, setConversationId] = useState<string>("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    params.then((p) => setConversationId(p.id))
  }, [params])

  useEffect(() => {
    if (!conversationId) return
    setIsLoadingMessages(true)
    fetch(`/api/conversations/${conversationId}/messages`)
      .then((res) => res.json())
      .then((data: Message[]) => setMessages(data))
      .catch(console.error)
      .finally(() => setIsLoadingMessages(false))
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleStop = () => {
    abortRef.current?.abort()
  }

  const handleSend = async (message: string) => {
    setMessages((prev) => [...prev, { role: "user", content: message }])
    setIsStreaming(true)
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId }),
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new Error(`เกิดข้อผิดพลาด (${res.status})`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + text,
          }
          return updated
        })
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error(err)
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: "⚠️ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
          }
          return updated
        })
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      <header className="p-4 border-b bg-white">
        <h1 className="font-semibold text-gray-800">AI Chat</h1>
        <p className="text-xs text-gray-400">จำคุณได้ข้ามการสนทนา</p>
      </header>
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {isLoadingMessages ? (
          <p className="text-center text-gray-400 mt-16 text-sm">กำลังโหลด...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-400 mt-16 text-sm">เริ่มการสนทนา...</p>
        ) : (
          messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        disabled={isStreaming}
        isStreaming={isStreaming}
      />
    </div>
  )
}
