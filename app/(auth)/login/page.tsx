'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Logo from '@/components/Logo'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40', border: '#1E1450',
  accent: '#7C3AED', cyan: '#06B6D4', text: '#E2D9F3', muted: '#7B6FA0',
  white: '#FFFFFF', red: '#EF4444',
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Fill in all fields'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }

    // If the account hasn't verified its email, force the OTP screen first.
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.user && !data.user.email_verified) {
        router.push(`/verify?email=${encodeURIComponent(email)}`)
        return
      }
    } catch {}

    const redirect = new URLSearchParams(window.location.search).get('redirect')
    router.push(redirect || '/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div style={{ maxWidth: 420, width: '100%' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <Logo size={34} text="ScholarX" />
        </div>

        <h2 style={{ fontSize: 26, fontWeight: 800, color: C.white, marginBottom: 6 }}>Welcome back</h2>
        <p style={{ color: C.muted, marginBottom: 32, fontSize: 14 }}>Log in to continue studying.</p>

        {error && (
          <div style={{ background: `${C.red}18`, border: `1px solid ${C.red}44`, borderRadius: 9, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: C.red }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 6, fontWeight: 600 }}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 6, fontWeight: 600 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Your password"
                style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px 44px 12px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
              <button onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 0 }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ background: loading ? C.border : `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '13px', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', marginTop: 4 }}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <button onClick={() => router.push('/forgot-password')} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontWeight: 500, fontSize: 12 }}>
            Forgot password?
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, color: C.muted, fontSize: 13 }}>
          No account?{' '}
          <button onClick={() => router.push('/signup')} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            Sign up free
          </button>
        </p>
      </div>
    </div>
  )
}