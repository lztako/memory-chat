'use client'
import { useFormStatus } from 'react-dom'

export function SubmitButton({ label, loadingLabel, className }: {
  label: string
  loadingLabel: string
  className: string
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? loadingLabel : label}
    </button>
  )
}
