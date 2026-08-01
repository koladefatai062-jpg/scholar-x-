'use client'

import { useState, useEffect } from 'react'
import { Search, Zap, Trash2, Crown } from 'lucide-react'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40',
  border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4',
  text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF',
  gold: '#F59E0B', green: '#22C55E', red: '#EF4444',
}

const roleColor: Record<string, string> = { admin: C.accent, university: C.cyan, secondary: C.muted }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchUsers = async (q = '') => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('search', q)
    const res = await fetch(`/api/admin/users${params.toString() ? `?${params}` : ''}`)
    const data = await res.json()
    setUsers(data.users || [])
    setLoading(false)
  }

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const togglePremium = async (user: any) => {
    setTogglingId(user.id)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, is_premium: !user.is_premium }),
    })
    const data = await res.json()
    if (data.user) {
      setUsers(prev => prev.map(u => u.id === user.id ? data.user : u))
    }
    setTogglingId(null)
  }

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user and all their data?')) return
    await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.white, marginBottom: 4 }}>Users</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>{users.length} shown</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '0 12px' }}>
          <Search size={15} color={C.muted} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email"
            style={{ background: 'none', border: 'none', color: C.text, fontSize: 14, padding: '10px 0', outline: 'none', width: 220 }} />
        </div>
      </div>

      {loading ? (
        <div style={{ color: C.muted }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>No users found.</div>}
          {users.map(u => (
            <div key={u.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg,${C.accent},${C.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
                    {u.full_name ? u.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                  </span>
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.full_name || 'Unnamed'} {u.is_premium && <Crown size={13} color={C.gold} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email || 'no email'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, background: `${roleColor[u.role] || C.muted}18`, color: roleColor[u.role] || C.muted, fontWeight: 700, textTransform: 'uppercase' }}>
                  {u.role || 'secondary'}
                </span>

                <button
                  onClick={() => togglePremium(u)}
                  disabled={togglingId === u.id || u.role === 'admin'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    background: u.is_premium ? 'transparent' : `linear-gradient(135deg,${C.gold},#D97706)`,
                    border: `1px solid ${u.is_premium ? C.gold : 'transparent'}`,
                    color: u.is_premium ? C.gold : '#fff',
                    opacity: u.role === 'admin' ? 0.4 : 1,
                  }}>
                  <Zap size={13} />
                  {togglingId === u.id ? '...' : u.is_premium ? 'Premium ✓' : 'Make Premium'}
                </button>

                <button onClick={() => deleteUser(u.id)} disabled={u.role === 'admin'} style={{ background: 'none', border: 'none', color: C.muted, cursor: u.role === 'admin' ? 'not-allowed' : 'pointer', opacity: u.role === 'admin' ? 0.4 : 1 }}
                  onMouseEnter={e => { if (u.role !== 'admin') e.currentTarget.style.color = C.red }}
                  onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
