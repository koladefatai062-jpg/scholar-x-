'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import Logo from '@/components/Logo'

const C = { bg: '#0A0628', surface: '#110836', card: '#150D40', border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4', text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF', red: '#EF4444', green: '#22C55E' }

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError('Enter a valid email'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <Logo size={34} text="ScholarX" />
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg,${C.accent},${C.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Check size={28} color="#fff" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: C.white, marginBottom: 8 }}>Check your email</h2>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 8 }}>If an account exists for <b style={{ color: C.text }}>{email}</b>, we sent a reset code to it.</p>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 28 }}>The code expires in 15 minutes.</p>
            <button onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
              style={{ width: '100%', background: C.accent, border: 'none', color: '#fff', padding: '13px', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              I have a code — continue
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: C.white, marginBottom: 6 }}>Forgot your password?</h2>
            <p style={{ color: C.muted, marginBottom: 28, fontSize: 14 }}>Enter your email and we'll send you a code to reset it.</p>

            {error && (
              <div style={{ background: `${C.red}18`, border: `1px solid ${C.red}44`, borderRadius: 9, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: C.red }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 6, fontWeight: 600 }}>Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="you@email.com"
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleSend} disabled={loading}
                style={{ background: loading ? C.border : C.accent, border: 'none', color: '#fff', padding: '13px', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer' }}>
                {loading ? 'Sending...' : 'Send reset code'}
              </button>
            </div>

            <p style={{ textAlign: 'center', marginTop: 24, color: C.muted, fontSize: 13 }}>
              Remembered it?{' '}
              <button onClick={() => router.push('/login')} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Log in</button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
