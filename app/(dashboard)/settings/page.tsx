'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, User, CreditCard, Bell, Shield, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40',
  border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4',
  text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF',
  gold: '#F59E0B', green: '#22C55E', red: '#EF4444',
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    setUser(profile)
    setFullName(profile?.full_name || '')
    setLoading(false)
  }

  const updateProfile = async () => {
    if (!user || !fullName.trim()) return
    setSaving(true)
    await supabase.from('users').update({ full_name: fullName }).eq('id', user.id)
    setUser({ ...user, full_name: fullName })
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontSize: 14, color: C.muted }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 28px', maxWidth: 700 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.white, marginBottom: 4 }}>Settings</h2>
        <p style={{ color: C.muted, fontSize: 14 }}>Manage your account and preferences.</p>
      </div>

      {/* Profile section */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <User size={18} color={C.accent} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.white }}>Profile</h3>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Full name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Email</label>
          <input value={user?.email || ''} disabled style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 14px', color: C.muted, fontSize: 14, outline: 'none', boxSizing: 'border-box', opacity: 0.6 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Level</label>
          <input value={user?.level || 'SS3'} disabled style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 14px', color: C.muted, fontSize: 14, outline: 'none', boxSizing: 'border-box', opacity: 0.6 }} />
        </div>

        <button onClick={updateProfile} disabled={saving || !fullName.trim()} style={{ background: fullName.trim() ? `linear-gradient(135deg,${C.accent},#5B21B6)` : C.border, border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: fullName.trim() ? 'pointer' : 'default' }}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {/* Subscription section */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <CreditCard size={18} color={C.gold} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.white }}>Subscription</h3>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: C.surface, borderRadius: 10, border: `1px solid ${user?.is_premium ? C.accent + '44' : C.border}` }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{user?.is_premium ? '⭐ Premium' : 'Free Plan'}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{user?.is_premium ? 'Unlimited access to all features' : 'Limited to 10 AI messages/day'}</div>
          </div>
          {!user?.is_premium && (
            <button onClick={() => {}} style={{ background: `linear-gradient(135deg,${C.cyan},${C.accent})`, border: 'none', color: '#fff', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Upgrade
            </button>
          )}
        </div>
      </div>

      {/* Account section */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Shield size={18} color={C.red} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.white }}>Account</h3>
        </div>

        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 9, border: `1px solid ${C.red}44`, background: `${C.red}11`, color: C.red, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
          <LogOut size={16} />Log out
        </button>
      </div>
    </div>
  )
}
