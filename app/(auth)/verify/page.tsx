'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check } from 'lucide-react'
import Logo from '@/components/Logo'
import VerifyCodeForm from '@/components/VerifyCodeForm'

const C = { bg: '#0A0628', surface: '#110836', card: '#150D40', border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4', text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF', red: '#EF4444', green: '#22C55E' }

function VerifyPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    const param = searchParams.get('email')
    if (param) { setEmail(param); setLoading(false); return }
    ;(async () => {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.user) {
        if (data.user.email_verified) {
          router.replace('/dashboard')
          return
        }
        setEmail(data.user.email || '')
      } else {
        router.replace('/login')
      }
      setLoading(false)
    })()
  }, [router, searchParams])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.muted, fontSize: 14 }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <Logo size={34} text="ScholarX" />
        </div>

        {verified ? (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg,${C.accent},${C.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Check size={28} color="#fff" />
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: C.white, marginBottom: 8 }}>Email verified!</h2>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 32 }}>Your account is active. Taking you to your dashboard...</p>
          </div>
        ) : email ? (
          <VerifyCodeForm email={email} purpose="signup" onVerified={() => {
            setVerified(true)
            setTimeout(() => router.push('/dashboard'), 1200)
          }} />
        ) : (
          <div style={{ color: C.muted, fontSize: 14 }}>No email to verify.</div>
        )}
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 14 }}>Loading...</div>}>
      <VerifyPageInner />
    </Suspense>
  )
}
