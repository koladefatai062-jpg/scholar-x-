'use client'

import { useState, useEffect } from 'react'
import { Search, Trash2, Download, Mail, Inbox } from 'lucide-react'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40',
  border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4',
  text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF',
  gold: '#F59E0B', green: '#22C55E', red: '#EF4444',
}

const levelLabels: Record<string, string> = {
  ss1: 'SS1', ss2: 'SS2', ss3: 'SS3 / JAMB', '100l': 'Uni 100–200L',
  '300l': 'Uni 300L+', other: 'Other', '': '—',
}

export default function AdminWaitlistPage() {
  const [signups, setSignups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchSignups = async (q = '') => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('search', q)
    const res = await fetch(`/api/admin/waitlist${params.toString() ? `?${params}` : ''}`)
    const data = await res.json()
    setSignups(data.signups || [])
    setLoading(false)
  }

  useEffect(() => {
    const t = setTimeout(() => fetchSignups(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const deleteSignup = async (id: string) => {
    if (!confirm('Remove this signup from the waitlist?')) return
    setDeletingId(id)
    await fetch('/api/admin/waitlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setSignups(prev => prev.filter(s => s.id !== id))
    setDeletingId(null)
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: C.white, marginBottom: 6 }}>Waitlist</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>Everyone waiting to get in on launch day ({signups.length} shown).</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} color={C.muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or email"
              style={{ padding: '9px 12px 9px 36px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, color: C.white, fontSize: 13, outline: 'none', minWidth: 200 }}
            />
          </div>
          <a
            href="/api/waitlist/export"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, background: C.accent, color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}
          >
            <Download size={14} /> Export CSV
          </a>
        </div>
      </div>

      {loading ? (
        <div style={{ color: C.muted, padding: 40, textAlign: 'center' }}>Loading signups...</div>
      ) : signups.length === 0 ? (
        <div style={{ color: C.muted, padding: 60, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Inbox size={32} color={C.border} /></div>
          No waitlist signups yet. Share the landing page!
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>
                {['Name', 'Email', 'Level', 'Joined', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.muted, fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signups.map(s => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: C.white }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Mail size={13} color={C.accent} /> {s.full_name || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.text }}>{s.email}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.muted }}>{levelLabels[s.level] || s.level || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.muted }}>
                    {s.created_at ? new Date(s.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => deleteSignup(s.id)}
                      disabled={deletingId === s.id}
                      style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4, opacity: deletingId === s.id ? 0.4 : 1 }}
                      onMouseEnter={e => e.currentTarget.style.color = C.red}
                      onMouseLeave={e => e.currentTarget.style.color = C.muted}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
