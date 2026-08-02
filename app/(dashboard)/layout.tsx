'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Home, Target, Brain, BookOpen, Users,
  TrendingUp, Settings, LogOut, Menu, X,
  Bell, GraduationCap, ChevronRight
} from 'lucide-react'
import Logo from '@/components/Logo'
import Avatar from '@/components/Avatar'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
  { id: 'quiz', label: 'Quiz', icon: Target, path: '/quiz' },
  { id: 'ai-tutor', label: 'AI Tutor', icon: Brain, path: '/ai-tutor' },
  { id: 'library', label: 'Library', icon: BookOpen, path: '/library' },
  { id: 'community', label: 'Community', icon: Users, path: '/community' },
  { id: 'grades', label: 'Grades', icon: TrendingUp, path: '/grades' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
]

const BOTTOM_NAV = NAV_ITEMS.slice(0, 5)

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40',
  border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4',
  text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [user, setUser] = useState<{ full_name?: string; email?: string; is_premium?: boolean; role?: string; avatar_url?: string | null } | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.user) setUser(data.user)
    } catch (err) {
      console.error('Failed to load user:', err)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (err) {
      console.error('Logout failed:', err)
    }
    router.push('/')
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  const getPageTitle = () => {
    const item = NAV_ITEMS.find(n => isActive(n.path))
    return item?.label || 'Dashboard'
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* DESKTOP SIDEBAR */}
      {!isMobile && (
        <aside style={{
          width: 220, background: C.surface, borderRight: `1px solid ${C.border}`,
          height: '100vh', position: 'fixed', left: 0, top: 0,
          display: 'flex', flexDirection: 'column', zIndex: 100, overflowY: 'auto',
        }}>
          <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Logo size={32} />
            </div>
          </div>

          <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV_ITEMS.slice(0, 6).map(({ id, label, icon: Icon, path }) => {
              const active = isActive(path)
              return (
                <button
                  key={id}
                  onClick={() => router.push(path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 9, border: 'none',
                    background: active ? `${C.accent}22` : 'transparent',
                    color: active ? C.accent : C.muted,
                    fontSize: 14, fontWeight: active ? 700 : 500,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = `${C.border}88`; e.currentTarget.style.color = C.text } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted } }}
                >
                  <Icon size={16} />
                  {label}
                  {active && <ChevronRight size={13} style={{ marginLeft: 'auto' }} />}
                </button>
              )
            })}
            {user?.role === 'admin' && (
              <button
                onClick={() => router.push('/admin')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 9, border: 'none',
                  background: isActive('/admin') ? `${C.cyan}22` : 'transparent',
                  color: isActive('/admin') ? C.cyan : C.muted,
                  fontSize: 14, fontWeight: isActive('/admin') ? 700 : 500,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }}
              >
                <GraduationCap size={16} />
                Admin Panel
                {isActive('/admin') && <ChevronRight size={13} style={{ marginLeft: 'auto' }} />}
              </button>
            )}
          </nav>

          <div style={{ padding: '10px 10px 16px', borderTop: `1px solid ${C.border}` }}>
            <button
              onClick={() => router.push('/settings')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 9, border: 'none',
                background: isActive('/settings') ? `${C.accent}22` : 'transparent',
                color: isActive('/settings') ? C.accent : C.muted,
                fontSize: 14, cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: 4,
              }}
            >
              <Settings size={16} />Settings
            </button>

            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 9, border: 'none',
                background: 'transparent', color: C.muted,
                fontSize: 14, cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
              onMouseLeave={e => e.currentTarget.style.color = C.muted}
            >
              <LogOut size={16} />Log out
            </button>

            <div style={{ marginTop: 12, padding: '10px 12px', background: C.card, borderRadius: 10, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={user?.full_name} avatarUrl={user?.avatar_url} size={32} fontSize={12} />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.full_name || 'Student'}
                  </div>
                  <div style={{ fontSize: 11, color: user?.is_premium ? C.accent : C.muted }}>
                    {user?.is_premium ? '⚡ Premium' : 'Free plan'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}
      

      {/* MOBILE SIDEBAR OVERLAY */}
      {isMobile && mobileMenuOpen && (
        <>
          <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 150 }} />
          <aside style={{
            position: 'fixed', left: 0, top: 0, bottom: 0, width: 260,
            background: C.surface, borderRight: `1px solid ${C.border}`,
            zIndex: 200, display: 'flex', flexDirection: 'column',
            animation: 'slideIn 0.2s ease',
          }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Logo size={30} />
              </div>
              <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {NAV_ITEMS.map(({ id, label, icon: Icon, path }) => {
                const active = isActive(path)
                return (
                  <button
                    key={id}
                    onClick={() => { router.push(path); setMobileMenuOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 14px', borderRadius: 9, border: 'none',
                      background: active ? `${C.accent}22` : 'transparent',
                      color: active ? C.accent : C.muted,
                      fontSize: 15, fontWeight: active ? 700 : 500,
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                  >
                    <Icon size={17} />{label}
                  </button>
                )
              })}
              {user?.role === 'admin' && (
                <button
                  onClick={() => { router.push('/admin'); setMobileMenuOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 9, border: 'none',
                    background: isActive('/admin') ? `${C.cyan}22` : 'transparent',
                    color: isActive('/admin') ? C.cyan : C.muted,
                    fontSize: 15, fontWeight: isActive('/admin') ? 700 : 500,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <GraduationCap size={17} />Admin Panel
                </button>
              )}
            </nav>

            <div style={{ padding: '10px 10px 20px', borderTop: `1px solid ${C.border}` }}>
              <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 9, border: 'none', background: 'transparent', color: '#EF4444', fontSize: 15, cursor: 'pointer', width: '100%' }}>
                <LogOut size={17} />Log out
              </button>
            </div>
          </aside>
        </>
      )}

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, marginLeft: isMobile ? 0 : 220, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header style={{
          height: 60, background: 'rgba(10,6,40,0.95)', backdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 20px',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer', padding: 4 }}>
                <Menu size={22} />
              </button>
            )}
            <span style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{getPageTitle()}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4, position: 'relative' }}>
              <Bell size={19} />
              <div style={{ position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: '50%', background: C.accent }} />
            </button>
            <div onClick={() => router.push('/settings')} style={{ cursor: 'pointer', display: 'flex' }}>
              <Avatar name={user?.full_name} avatarUrl={user?.avatar_url} size={34} fontSize={13} />
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', paddingBottom: isMobile ? 80 : 0, color: C.text }}>
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: C.surface, borderTop: `1px solid ${C.border}`,
          display: 'flex', zIndex: 100,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {BOTTOM_NAV.map(({ id, label, icon: Icon, path }) => {
            const active = isActive(path)
            return (
              <button
                key={id}
                onClick={() => router.push(path)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '10px 4px 8px', border: 'none', background: 'none',
                  color: active ? C.accent : C.muted, cursor: 'pointer', gap: 3,
                }}
              >
                <Icon size={21} />
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{label}</span>
                {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.accent, marginTop: 1 }} />}
              </button>
            )
          })}
        </nav>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}