"use client"
import { useState } from "react"

interface Props {
  onSend: (message: string) => void
  onStop?: () => void
  disabled?: boolean
  isStreaming?: boolean
}

export function ChatInput({ onSend, onStop, disabled, isStreaming }: Props) {
  const [value, setValue] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t bg-white">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="พิมพ์ข้อความ... (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
        disabled={isStreaming ? false : disabled}
        rows={1}
        className="flex-1 px-4 py-2 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
      />
      {isStreaming ? (
        <button
          type="button"
          onClick={onStop}
          className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium"
        >
          หยุด
        </button>
      ) : (
        <button
          type="submit"
          disabled={!value.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl disabled:opacity-50 hover:bg-blue-600 text-sm font-medium"
        >
          ส่ง
        </button>
      )}
    </form>
  )
}
