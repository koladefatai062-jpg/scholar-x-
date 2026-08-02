'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, Bell, CreditCard, Info, LogOut, ChevronRight, Check, X, Zap, ShieldCheck, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Avatar from '@/components/Avatar'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40',
  border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4',
  text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF',
  gold: '#F59E0B', green: '#22C55E', red: '#EF4444',
}

const SEC_LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3']
const UNI_LEVELS = ['100L', '200L', '300L', '400L', '500L', '600L']

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: string
  level: string
  is_premium: boolean
  premium_expires_at: string | null
  streak: number
  avatar_url: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [level, setLevel] = useState('')

  // Password form
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [pushNotifs, setPushNotifs] = useState(true)

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { fetchUser() }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        setFullName(data.user.full_name || '')
        setLevel(data.user.level || '')
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    }
    setLoading(false)
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, level }),
      })
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (err) {
      console.error('Failed to save profile:', err)
    }
    setSaving(false)
  }

  const updateAvatarUrl = async (avatarUrl: string | null) => {
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: avatarUrl }),
    })
    const data = await res.json()
    if (data.user) setUser(data.user)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { alert('Only PNG, JPG or WEBP images allowed'); return }
    if (file.size > 2 * 1024 * 1024) { alert('Max image size is 2MB'); return }

    setUploadingAvatar(true)
    try {
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const fileName = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
      await updateAvatarUrl(publicUrl)
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || 'Please try again'))
    }
    setUploadingAvatar(false)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  const handleRemoveAvatar = async () => {
    if (!user?.avatar_url) return
    setUploadingAvatar(true)
    try {
      const oldPath = user.avatar_url.split('/avatars/')[1]
      if (oldPath) await supabase.storage.from('avatars').remove([oldPath])
    } catch {}
    await updateAvatarUrl(null)
    setUploadingAvatar(false)
  }

  const handleUpgrade = async () => {
    setUpgrading(true)
    try {
      const res = await fetch('/api/paystack/initialize', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
        setUpgrading(false)
        return
      }
      // Redirect to Paystack payment page
      window.location.href = data.authorization_url
    } catch {
      alert('Something went wrong. Please try again.')
      setUpgrading(false)
    }
  }

  const changePassword = async () => {
    setPasswordError('')
    if (newPassword.length < 8) { setPasswordError('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return }
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (data.error) { setPasswordError(data.error); return }
      setPasswordSaved(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => { setPasswordSaved(false); setShowPasswordForm(false) }, 2000)
    } catch { setPasswordError('Something went wrong. Try again.') }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const deleteAccount = async () => {
    try {
      await fetch('/api/settings', { method: 'DELETE' })
      router.push('/')
    } catch (err) {
      console.error('Failed to delete account:', err)
    }
  }

  const levels = user?.role === 'university' ? UNI_LEVELS : SEC_LEVELS

  if (loading) return <div style={{ padding: 40, color: C.muted, textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 28px', maxWidth: 600 }}>
      <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.white, marginBottom: 24 }}>Settings</h2>

      {/* Profile section */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <User size={15} color={C.accent} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Profile</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar name={user?.full_name} avatarUrl={user?.avatar_url} size={56} fontSize={20} />
            <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} style={{ display: 'none' }} />
            <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}
              style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: `linear-gradient(135deg,${C.accent},${C.cyan})`, border: '2px solid', borderColor: C.card, color: '#fff', cursor: uploadingAvatar ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <Camera size={12} />
            </button>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{user?.full_name || 'Student'}</div>
              {user?.avatar_url && (
                <button onClick={handleRemoveAvatar} disabled={uploadingAvatar} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Remove</button>
              )}
            </div>
            <div style={{ fontSize: 13, color: C.muted }}>{user?.email}</div>
            <div style={{ fontSize: 12, color: user?.is_premium ? C.accent : C.muted, marginTop: 2 }}>
              {user?.is_premium ? '⚡ Premium member' : 'Free plan'} · {user?.streak || 0} day streak 🔥
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Full name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)}
            style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Email address</label>
          <input value={user?.email || ''} disabled
            style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 14px', color: C.muted, fontSize: 14, outline: 'none', boxSizing: 'border-box', opacity: 0.7 }} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 8 }}>Your level</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {levels.map(l => (
              <button key={l} onClick={() => setLevel(l)} style={{ padding: '7px 14px', borderRadius: 7, border: `1px solid ${level === l ? C.cyan : C.border}`, background: level === l ? `${C.cyan}18` : 'transparent', color: level === l ? C.cyan : C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{l}</button>
            ))}
          </div>
        </div>

        <button onClick={saveProfile} disabled={saving}
          style={{ background: saving ? C.border : `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '11px 22px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          {saved ? <><Check size={15} />Saved!</> : saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {/* Admin section */}
      {user?.role === 'admin' && (
        <div style={{ background: C.card, border: `1px solid ${C.cyan}44`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <ShieldCheck size={15} color={C.cyan} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Admin</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 4 }}>Admin dashboard</div>
              <div style={{ fontSize: 13, color: C.muted }}>Manage questions, library, news, opportunities, groups and users.</div>
            </div>
            <button onClick={() => router.push('/admin')}
              style={{ background: `linear-gradient(135deg,${C.cyan},${C.accent})`, border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
              <ShieldCheck size={15} />Go to Admin Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Plan section */}
      <div style={{ background: user?.is_premium ? `linear-gradient(160deg,${C.accent}15,${C.card})` : C.card, border: `1px solid ${user?.is_premium ? C.accent + '44' : C.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <CreditCard size={15} color={C.accent} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Plan</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 4 }}>
              {user?.is_premium ? '⚡ Premium' : 'Free plan'}
            </div>
            <div style={{ fontSize: 13, color: C.muted }}>
              {user?.is_premium
                ? `Expires: ${user.premium_expires_at ? new Date(user.premium_expires_at).toLocaleDateString('en-NG') : 'N/A'}`
                : 'Upgrade for unlimited AI tutor, all past questions, and more'}
            </div>
          </div>

          {/* Upgrade button with Paystack flow */}
          {!user?.is_premium && (
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              style={{ background: upgrading ? C.border : `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '11px 22px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: upgrading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
              <Zap size={15} />
              {upgrading ? 'Loading...' : 'Upgrade — ₦5,000/yr'}
            </button>
          )}
        </div>

        {/* Premium features list for free users */}
        {!user?.is_premium && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600 }}>PREMIUM INCLUDES:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {['Unlimited AI tutor', 'All past questions', 'Answer explanations', 'Unlimited groups', 'Premium library', 'Advanced grades'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.text }}>
                  <Check size={12} color={C.green} />{f}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Premium active state */}
        {user?.is_premium && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.green }}>
              <Check size={15} color={C.green} />
              You have full access to all ScholarX features
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Bell size={15} color={C.accent} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Notifications</span>
        </div>
        {[['Push notifications', pushNotifs, setPushNotifs], ['Email updates', emailNotifs, setEmailNotifs]].map(([label, val, set]: any) => (
          <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, color: C.text }}>{label as string}</span>
            <button onClick={() => set((v: boolean) => !v)}
              style={{ width: 44, height: 24, borderRadius: 12, background: val ? `linear-gradient(135deg,${C.accent},#5B21B6)` : C.border, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: 3, left: val ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>
        ))}
      </div>

      {/* Security */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Lock size={15} color={C.accent} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Security</span>
        </div>

        <button onClick={() => setShowPasswordForm(f => !f)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', color: C.text, cursor: 'pointer', padding: '6px 0', fontSize: 14 }}>
          <span>Change password</span>
          <ChevronRight size={16} color={C.muted} />
        </button>

        {showPasswordForm && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            {[['New password', newPassword, setNewPassword], ['Confirm password', confirmPassword, setConfirmPassword]].map(([label, val, set]: any) => (
              <div key={label as string} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>{label as string}</label>
                <input type="password" value={val as string} onChange={e => set(e.target.value)}
                  style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            {passwordError && <p style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{passwordError}</p>}
            {passwordSaved && <p style={{ fontSize: 12, color: C.green, marginBottom: 10 }}>Password changed successfully!</p>}
            <button onClick={changePassword}
              style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Update password
            </button>
          </div>
        )}
      </div>

      {/* About */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Info size={15} color={C.accent} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>About</span>
        </div>
        {[['ScholarX', "Nigeria's smartest study platform"], ['Version', '1.0.0'], ['Terms of Service', 'scholarx.com/terms'], ['Privacy Policy', 'scholarx.com/privacy']].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 14, color: C.text }}>{label}</span>
            <span style={{ fontSize: 13, color: C.muted }}>{value}</span>
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 8 }}>FOLLOW US</div>
          {[
            ['Instagram', 'https://instagram.com/scholarx'],
            ['X (Twitter)', 'https://x.com/scholarx'],
            ['WhatsApp', 'https://wa.me/2348000000000'],
            ['TikTok', 'https://tiktok.com/@scholarx'],
            ['Email', 'mailto:hello@scholarx.com'],
          ].map(([label, url]) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}`, color: C.text, textDecoration: 'none', fontSize: 14 }}>
              <span>{label}</span>
              <span style={{ fontSize: 12, color: C.cyan }}>{url.replace('https://', '')}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button onClick={logout}
        style={{ width: '100%', background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}>
        <LogOut size={16} />Log out
      </button>

      {/* Delete account */}
      <button onClick={() => setShowDeleteConfirm(true)}
        style={{ width: '100%', background: 'transparent', border: `1px solid ${C.red}33`, color: C.red, padding: '12px', borderRadius: 10, fontSize: 14, cursor: 'pointer', opacity: 0.7 }}>
        Delete account
      </button>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${C.red}18`, border: `1px solid ${C.red}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <X size={24} color={C.red} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: C.white, marginBottom: 8 }}>Delete account?</h3>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
              This will permanently delete your account, quiz history, grades, and all your data. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, color: C.text, padding: '11px', borderRadius: 9, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={deleteAccount}
                style={{ flex: 1, background: C.red, border: 'none', color: '#fff', padding: '11px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}