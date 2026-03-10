'use client'
import { useFormStatus } from 'react-dom'

export function SubmitButton({ label, loadingLabel, className, style }: {
  label: React.ReactNode
  loadingLabel: string
  className: string
  style?: React.CSSProperties
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={className} style={style}>
      {pending ? loadingLabel : label}
    </button>
  )
}
