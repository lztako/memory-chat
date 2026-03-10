'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const supabase = createClient()

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setMessage('ตรวจสอบอีเมลเพื่อยืนยันบัญชี')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/chat')
      }
    }

    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 360, padding: '0 20px' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40,
            border: '1.5px solid var(--border2)',
            borderRadius: 10,
            background: 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, margin: '0 auto 12px',
          }}>⬡</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em' }}>Origo</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-ibm-plex-mono), monospace', marginTop: 2 }}>import/export AI</div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 12,
          padding: '28px 28px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>
            {isSignUp ? 'สร้างบัญชีใหม่' : 'เข้าสู่ระบบ'}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-ibm-plex-mono), monospace', letterSpacing: '.08em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                style={{
                  width: '100%', padding: '8px 12px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 6,
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color .15s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--border2)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-ibm-plex-mono), monospace', letterSpacing: '.08em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '8px 12px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 6,
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color .15s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--border2)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {error && (
              <div style={{
                padding: '8px 12px', marginBottom: 14,
                border: '1px solid var(--red)',
                borderRadius: 6, background: 'var(--surface2)',
                fontSize: 12, color: 'var(--red)',
              }}>{error}</div>
            )}
            {message && (
              <div style={{
                padding: '8px 12px', marginBottom: 14,
                border: '1px solid var(--green)',
                borderRadius: 6, background: 'var(--surface2)',
                fontSize: 12, color: 'var(--green)',
              }}>{message}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '9px 16px',
                background: 'var(--text)',
                color: 'var(--bg)',
                border: 'none', borderRadius: 6,
                fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'opacity .15s',
              }}
            >
              {loading ? 'Loading...' : isSignUp ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}
            style={{
              width: '100%', marginTop: 14,
              padding: '6px 0',
              background: 'none', border: 'none',
              fontSize: 11, fontFamily: 'var(--font-ibm-plex-mono), monospace',
              color: 'var(--text3)', cursor: 'pointer',
              transition: 'color .15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text3)')}
          >
            {isSignUp ? 'มีบัญชีแล้ว → เข้าสู่ระบบ' : 'ยังไม่มีบัญชี → สมัครสมาชิก'}
          </button>
        </div>

      </div>
    </div>
  )
}
