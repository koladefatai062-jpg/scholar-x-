'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { BarChart2, HelpCircle, BookOpen, Newspaper, Briefcase, Users, LayoutDashboard, LogOut, Menu, X, Mail, Send } from 'lucide-react'
import Logo from '@/components/Logo'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40',
  border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4',
  text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF',
  gold: '#F59E0B', red: '#EF4444',
}

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/admin' },
  { id: 'questions', label: 'Questions', icon: HelpCircle, path: '/admin/questions' },
  { id: 'library', label: 'Library', icon: BookOpen, path: '/admin/library' },
  { id: 'news', label: 'News', icon: Newspaper, path: '/admin/news' },
  { id: 'opportunities', label: 'Opportunities', icon: Briefcase, path: '/admin/opportunities' },
  { id: 'groups', label: 'Groups', icon: Users, path: '/admin/groups' },
  { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
  { id: 'waitlist', label: 'Waitlist', icon: Mail, path: '/admin/waitlist' },
  { id: 'emails', label: 'Send Email', icon: Send, path: '/admin/emails' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user?.role === 'admin') {
          setAuthorized(true)
        } else {
          router.replace('/dashboard')
        }
      })
      .catch(err => {
        console.error('Admin check failed:', err)
        router.replace('/login')
      })
  }, [router])

  const INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000
  const LAST_ACTIVE_KEY = 'scholarx_last_active'

  useEffect(() => {
    const now = Date.now()
    const stored = localStorage.getItem(LAST_ACTIVE_KEY)
    if (stored) {
      const last = Number(stored)
      if (Number.isFinite(last) && now - last > INACTIVITY_MS) {
        localStorage.removeItem(LAST_ACTIVE_KEY)
        fetch('/api/auth/logout', { method: 'POST' })
          .catch(() => {})
          .finally(() => router.push('/login'))
        return
      }
    }
    localStorage.setItem(LAST_ACTIVE_KEY, String(now))
  }, [router])

  useEffect(() => {
    const touch = () => localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()))
    const onVisible = () => { if (document.visibilityState === 'visible') touch() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', touch)
    window.addEventListener('pointerdown', touch)
    const id = setInterval(touch, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', touch)
      window.removeEventListener('pointerdown', touch)
      clearInterval(id)
    }
  }, [])

  if (!authorized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: C.bg, color: C.muted, fontSize: 14 }}>
        Checking access...
      </div>
    )
  }

  const isActive = (path: string) => path === '/admin' ? pathname === '/admin' : pathname.startsWith(path)

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const Sidebar = () => (
    <aside style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={32} text="ScholarX" />
          <div style={{ fontSize: 10, color: C.accent, fontWeight: 700 }}>ADMIN</div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ id, label, icon: Icon, path }) => {
          const active = isActive(path)
          return (
            <button key={id} onClick={() => { router.push(path); setMobileOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, border: 'none', background: active ? `${C.accent}22` : 'transparent', color: active ? C.accent : C.muted, fontSize: 14, fontWeight: active ? 700 : 500, cursor: 'pointer', textAlign: 'left', width: '100%' }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = `${C.border}88`; e.currentTarget.style.color = C.text } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted } }}>
              <Icon size={16} />{label}
            </button>
          )
        })}
      </nav>

      <div style={{ padding: '12px 10px 20px', borderTop: `1px solid ${C.border}` }}>
        <button onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, border: 'none', background: 'transparent', color: C.muted, fontSize: 14, cursor: 'pointer', width: '100%', marginBottom: 4 }}>
          <BarChart2 size={16} />Go to app
        </button>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, border: 'none', background: 'transparent', color: C.muted, fontSize: 14, cursor: 'pointer', width: '100%' }}
          onMouseEnter={e => e.currentTarget.style.color = C.red}
          onMouseLeave={e => e.currentTarget.style.color = C.muted}>
          <LogOut size={16} />Log out
        </button>
      </div>
    </aside>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: "'Inter',-apple-system,sans-serif" }}>
      {!isMobile && (
        <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100 }}>
          <Sidebar />
        </div>
      )}

      {isMobile && mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 150 }} />
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 200 }}>
            <Sidebar />
          </div>
        </>
      )}

      <div style={{ flex: 1, marginLeft: isMobile ? 0 : 220, display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: 60, background: 'rgba(10,6,40,0.95)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <button onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer' }}>
                <Menu size={22} />
              </button>
            )}
            <span style={{ fontSize: 15, fontWeight: 700, color: C.white }}>Admin Panel</span>
          </div>
          <div style={{ fontSize: 12, padding: '4px 10px', background: `${C.accent}22`, border: `1px solid ${C.accent}44`, borderRadius: 6, color: C.accent, fontWeight: 700 }}>
            ADMIN
          </div>
        </header>
        <main style={{ flex: 1, overflowY: 'auto', color: C.text }}>
          {children}
        </main>
      </div>
    </div>
  )
}