'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check } from 'lucide-react'
import Logo from '@/components/Logo'

const C = { bg: '#0A0628', surface: '#110836', card: '#150D40', border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4', text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF', red: '#EF4444', green: '#22C55E' }

function ResetPasswordPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleReset = async () => {
    if (!email) { router.replace('/forgot-password'); return }
    if (code.length !== 6) { setError('Enter the 6-digit code from your email'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, new_password: password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reset failed')
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setResending(true)
    setError('')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'reset' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not resend')
      setSuccess('A new code was sent to your email.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend')
    } finally {
      setResending(false)
    }
  }

  if (!email) {
    router.replace('/forgot-password')
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <Logo size={34} text="ScholarX" />
        </div>

        {done ? (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg,${C.accent},${C.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Check size={28} color="#fff" />
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: C.white, marginBottom: 8 }}>Password updated!</h2>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 32 }}>You can now log in with your new password.</p>
            <button onClick={() => router.push('/login')} style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '13px 32px', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Go to login
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: C.white, marginBottom: 6 }}>Reset your password</h2>
            <p style={{ color: C.muted, marginBottom: 28, fontSize: 14 }}>
              Enter the 6-digit code sent to <b style={{ color: C.text }}>{email}</b> and your new password. Code expires in 15 minutes.
            </p>

            {error && (
              <div style={{ background: `${C.red}18`, border: `1px solid ${C.red}44`, borderRadius: 9, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: C.red }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ background: `${C.green}18`, border: `1px solid ${C.green}44`, borderRadius: 9, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: C.green }}>
                {success}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 6, fontWeight: 600 }}>Verification code</label>
                <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••" inputMode="numeric" autoComplete="one-time-code"
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px 14px', color: C.text, fontSize: 18, fontWeight: 700, letterSpacing: '8px', textAlign: 'center', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 6, fontWeight: 600 }}>New password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReset()} placeholder="Min. 8 characters"
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleReset} disabled={loading}
                style={{ background: loading ? C.border : `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '13px', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer' }}>
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </div>

            <p style={{ textAlign: 'center', marginTop: 20, color: C.muted, fontSize: 13 }}>
              Didn't get a code?{' '}
              <button onClick={resend} disabled={resending} style={{ background: 'none', border: 'none', color: C.cyan, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                {resending ? 'Sending...' : 'Resend code'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 14 }}>Loading...</div>}>
      <ResetPasswordPageInner />
    </Suspense>
  )
}
