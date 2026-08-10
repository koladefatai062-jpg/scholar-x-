'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

const C = {
  surface: '#110836', card: '#150D40', border: '#1E1450', accent: '#7C3AED',
  cyan: '#06B6D4', text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF',
  red: '#EF4444', green: '#22C55E',
}

type Props = {
  email: string
  purpose: 'signup' | 'reset'
  onVerified: () => void
  subtitle?: string
}

export default function VerifyCodeForm({ email, purpose, onVerified, subtitle }: Props) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const startCountdown = () => {
    setResendIn(60)
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => {
      setResendIn(s => {
        if (s <= 1) {
          if (timer.current) clearInterval(timer.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  useEffect(() => {
    sendCode()
    return () => { if (timer.current) clearInterval(timer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendCode = async () => {
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not send code')
      startCountdown()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send code')
    } finally {
      setSending(false)
    }
  }

  const verify = async (value: string) => {
    if (value.length !== 6 || verifying) return
    setVerifying(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose, code: value }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')
      onVerified()
    } catch (e) {
      setCode('')
      setError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: C.white, marginBottom: 6 }}>
        {purpose === 'reset' ? 'Check your email' : 'Verify your email'}
      </h2>
      <p style={{ color: C.muted, marginBottom: 28, fontSize: 14 }}>
        {subtitle || `We sent a 6-digit code to ${email}. It expires in 15 minutes.`}
      </p>

      {error && (
        <div style={{ background: `${C.red}18`, border: `1px solid ${C.red}44`, borderRadius: 9, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: C.red }}>
          {error}
        </div>
      )}

      <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 8, fontWeight: 600 }}>Enter code</label>
      <input
        value={code}
        onChange={e => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 6)
          setCode(v)
          if (v.length === 6) verify(v)
        }}
        disabled={verifying || sending}
        placeholder="••••••"
        inputMode="numeric"
        autoComplete="one-time-code"
        style={{
          width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9,
          padding: '14px', color: C.text, fontSize: 28, fontWeight: 700, textAlign: 'center',
          letterSpacing: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: 16, fontFamily: 'inherit',
        }}
      />

      {verifying ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: C.muted, fontSize: 14, padding: '13px', border: `1px solid ${C.border}`, borderRadius: 9 }}>
          <Loader2 size={16} className="animate-spin" /> Verifying...
        </div>
      ) : (
        <button onClick={() => code.length === 6 && verify(code)} disabled={code.length !== 6}
          style={{ width: '100%', background: code.length === 6 ? `linear-gradient(135deg,${C.accent},#5B21B6)` : C.border, border: 'none', color: '#fff', padding: '13px', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: code.length === 6 ? 'pointer' : 'default', opacity: code.length === 6 ? 1 : 0.5 }}>
          Verify code
        </button>
      )}

      <p style={{ textAlign: 'center', marginTop: 20, color: C.muted, fontSize: 13 }}>
        {resendIn > 0 ? `Resend code in ${resendIn}s` : sending ? 'Sending...' : (
          <>
            Didn't get it?{' '}
            <button onClick={sendCode} style={{ background: 'none', border: 'none', color: C.cyan, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              Resend code
            </button>
          </>
        )}
      </p>
    </div>
  )
}
