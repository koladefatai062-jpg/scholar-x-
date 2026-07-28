'use client'

import { useState, useEffect } from 'react'
import { Check, X, Trash2 } from 'lucide-react'

const C = { bg:'#0A0628',surface:'#110836',card:'#150D40',border:'#1E1450',accent:'#7C3AED',cyan:'#06B6D4',text:'#E2D9F3',muted:'#7B6FA0',white:'#FFFFFF',gold:'#F59E0B',green:'#22C55E',red:'#EF4444' }

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => { fetchGroups() }, [])

  const fetchGroups = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/groups')
    const data = await res.json()
    setGroups(data.groups || [])
    setLoading(false)
  }

  const approve = async (id: string) => {
    const res = await fetch('/api/admin/groups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'active' }),
    })
    const data = await res.json()
    if (data.group) setGroups(p => p.map(g => g.id === id ? data.group : g))
  }

  const reject = async (id: string) => {
    const res = await fetch('/api/admin/groups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'rejected', rejection_reason: rejectReason }),
    })
    const data = await res.json()
    if (data.group) setGroups(p => p.map(g => g.id === id ? data.group : g))
    setRejectId(null)
    setRejectReason('')
  }

  const deleteGroup = async (id: string) => {
    if (!confirm('Delete this group?')) return
    await fetch('/api/admin/groups', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setGroups(p => p.filter(g => g.id !== id))
  }

  const statusColor: Record<string,string> = { pending: C.gold, active: C.green, rejected: C.red }
  const filtered = groups.filter(g => g.status === filter)

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.white, marginBottom: 4 }}>Groups</h2>
        <p style={{ color: C.muted, fontSize: 14 }}>
          {groups.filter(g => g.status === 'pending').length} pending approval
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['pending', 'active', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '7px 16px', borderRadius: 7, border: `1px solid ${filter === s ? statusColor[s] : C.border}`, background: filter === s ? `${statusColor[s]}18` : 'transparent', color: filter === s ? statusColor[s] : C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
            {s} ({groups.filter(g => g.status === s).length})
          </button>
        ))}
      </div>

      {loading ? <div style={{ color: C.muted }}>Loading...</div> : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>No {filter} groups</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(group => (
            <div key={group.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', background: `${statusColor[group.status]}18`, borderRadius: 4, color: statusColor[group.status], fontWeight: 700, textTransform: 'capitalize' }}>{group.status}</span>
                    {group.subject && <span style={{ fontSize: 10, padding: '2px 7px', background: C.surface, borderRadius: 4, color: C.muted }}>{group.subject}</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 4 }}>{group.name}</div>
                  {group.description && <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{group.description}</div>}
                  <div style={{ fontSize: 12, color: C.muted }}>
                    Created by: {group.users?.full_name || 'Unknown'} ({group.users?.email}) · {group.member_count} members
                  </div>
                  {group.rejection_reason && (
                    <div style={{ fontSize: 12, color: C.red, marginTop: 6 }}>Rejection reason: {group.rejection_reason}</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {group.status === 'pending' && (
                    <>
                      <button onClick={() => approve(group.id)}
                        style={{ background: `${C.green}18`, border: `1px solid ${C.green}44`, color: C.green, padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Check size={13} />Approve
                      </button>
                      <button onClick={() => setRejectId(group.id)}
                        style={{ background: `${C.red}18`, border: `1px solid ${C.red}44`, color: C.red, padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <X size={13} />Reject
                      </button>
                    </>
                  )}
                  <button onClick={() => deleteGroup(group.id)}
                    style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 6 }}
                    onMouseEnter={e => e.currentTarget.style.color = C.red}
                    onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: C.white, marginBottom: 16 }}>Reject group</h3>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 8 }}>Reason (optional)</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Tell the user why their group was rejected..."
              rows={3} style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 14px', color: C.text, fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setRejectId(null); setRejectReason('') }}
                style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, color: C.text, padding: '11px', borderRadius: 9, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => reject(rejectId)}
                style={{ flex: 1, background: C.red, border: 'none', color: '#fff', padding: '11px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Reject group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}