'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Eye, EyeOff, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40', border: '#1E1450',
  accent: '#7C3AED', cyan: '#06B6D4', text: '#E2D9F3', muted: '#7B6FA0',
  white: '#FFFFFF', red: '#EF4444', green: '#22C55E',
}

const secLevels = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3']
const uniLevels = ['100L', '200L', '300L', '400L', '500L', '600L']

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [role, setRole] = useState<'secondary' | 'university' | null>(null)
  const [level, setLevel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleStep1 = () => {
    if (!fullName || !email || !password) { setError('Fill in all fields'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError('')
    setStep(2)
  }

  const handleStep2 = () => {
    if (!role || !level) { setError('Select your track and level'); return }
    setError('')
    handleSignup()
  }

  const handleSignup = async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })
    if (error) { setError(error.message); setLoading(false); return }

    // Create/update the user's profile row server-side (bypasses RLS)
    if (data.user) {
      await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: data.user.id, full_name: fullName, role, level }),
      })
    }
    setStep(3)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div style={{ maxWidth: 440, width: '100%' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg,${C.accent},${C.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={17} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 20, color: C.white }}>
            Scholar<span style={{ background: `linear-gradient(90deg,${C.accent},${C.cyan})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>X</span>
          </span>
        </div>

        {/* Step indicator */}
        {step < 3 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
            {[1, 2].map(s => (
              <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= s ? `linear-gradient(90deg,${C.accent},${C.cyan})` : C.border, transition: 'background 0.3s' }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{ background: `${C.red}18`, border: `1px solid ${C.red}44`, borderRadius: 9, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: C.red }}>
            {error}
          </div>
        )}

        {/* STEP 1 — Account details */}
        {step === 1 && (
          <>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: C.white, marginBottom: 6 }}>Create your account</h2>
            <p style={{ color: C.muted, marginBottom: 28, fontSize: 14 }}>Join thousands of students already using ScholarX.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 6, fontWeight: 600 }}>Full name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name"
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 6, fontWeight: 600 }}>Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 6, fontWeight: 600 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"
                    style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px 44px 12px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  <button onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 0 }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button onClick={handleStep1} style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '13px', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
                Continue
              </button>
            </div>

            <p style={{ textAlign: 'center', marginTop: 24, color: C.muted, fontSize: 13 }}>
              Have an account?{' '}
              <button onClick={() => router.push('/login')} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Log in</button>
            </p>
          </>
        )}

        {/* STEP 2 — Role + Level */}
        {step === 2 && (
          <>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: C.white, marginBottom: 6 }}>What are you studying for?</h2>
            <p style={{ color: C.muted, marginBottom: 28, fontSize: 14 }}>We'll personalise everything to your track.</p>

            <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
              {(['secondary', 'university'] as const).map(r => (
                <button key={r} onClick={() => { setRole(r); setLevel(null) }}
                  style={{ flex: 1, padding: '14px 10px', borderRadius: 10, border: `1px solid ${role === r ? C.accent : C.border}`, background: role === r ? `${C.accent}1E` : 'transparent', color: role === r ? C.accent : C.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' }}>
                  {r === 'secondary' ? 'Secondary School' : 'University'}
                </button>
              ))}
            </div>

            {role && (
              <>
                <p style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600 }}>Select your level</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
                  {(role === 'secondary' ? secLevels : uniLevels).map(l => (
                    <button key={l} onClick={() => setLevel(l)}
                      style={{ padding: '8px 16px', borderRadius: 7, border: `1px solid ${level === l ? C.cyan : C.border}`, background: level === l ? `${C.cyan}18` : 'transparent', color: level === l ? C.cyan : C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button onClick={handleStep2} disabled={!level || loading}
              style={{ width: '100%', background: level && !loading ? `linear-gradient(135deg,${C.accent},#5B21B6)` : C.border, border: 'none', color: '#fff', padding: '13px', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: level && !loading ? 'pointer' : 'default', opacity: level ? 1 : 0.5 }}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </>
        )}

        {/* STEP 3 — Success */}
        {step === 3 && (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg,${C.accent},${C.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Check size={28} color="#fff" />
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: C.white, marginBottom: 8 }}>You're in.</h2>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 8 }}>Welcome to ScholarX. Check your email to verify your account.</p>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 32 }}>Then log in to access your dashboard.</p>
            <button onClick={() => router.push('/login')} style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '13px 32px', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Go to login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}