'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react'

const C = { bg:'#0A0628',surface:'#110836',card:'#150D40',border:'#1E1450',accent:'#7C3AED',cyan:'#06B6D4',text:'#E2D9F3',muted:'#7B6FA0',white:'#FFFFFF',gold:'#F59E0B',green:'#22C55E',red:'#EF4444' }
const EMPTY = { title:'',org:'',type:'scholarship',level:'both',description:'',amount:'',deadline:'',apply_url:'',is_active:true }
const typeColor: Record<string,string> = { scholarship: '#7C3AED', competition: '#06B6D4', internship: '#F59E0B' }

export default function AdminOpportunitiesPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/opportunities')
    const data = await res.json()
    setItems(data.opportunities || [])
    setLoading(false)
  }

  const submit = async () => {
    if (!form.title || !form.org) return
    setSubmitting(true)
    const res = await fetch('/api/admin/opportunities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (data.opportunity) { setItems(p => [data.opportunity, ...p]); setForm(EMPTY); setShowForm(false) }
    setSubmitting(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    const res = await fetch('/api/admin/opportunities', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: !current }) })
    const data = await res.json()
    if (data.opportunity) setItems(p => p.map(i => i.id === id ? data.opportunity : i))
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this opportunity?')) return
    await fetch('/api/admin/opportunities', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setItems(p => p.filter(i => i.id !== id))
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.white, marginBottom: 4 }}>Opportunities</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>{items.length} items</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: C.accent, border: 'none', color: '#fff', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} />Add opportunity
        </button>
      </div>

      {loading ? <div style={{ color: C.muted }}>Loading...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => (
            <div key={item.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, opacity: item.is_active ? 1 : 0.5 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', background: `${typeColor[item.type]}18`, borderRadius: 4, color: typeColor[item.type], fontWeight: 700 }}>{item.type}</span>
                  <span style={{ fontSize: 10, padding: '2px 7px', background: C.surface, borderRadius: 4, color: C.muted }}>{item.level}</span>
                  <span style={{ fontSize: 10, padding: '2px 7px', background: item.is_active ? `${C.green}18` : `${C.red}18`, borderRadius: 4, color: item.is_active ? C.green : C.red, fontWeight: 700 }}>{item.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{item.org} · {item.amount} · Deadline: {item.deadline}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => toggleActive(item.id, item.is_active)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}>
                  {item.is_active ? <ToggleRight size={20} color={C.green} /> : <ToggleLeft size={20} />}
                </button>
                <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.color = C.red} onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.white }}>Add opportunity</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {[['Title *', 'title'], ['Organisation *', 'org'], ['Amount', 'amount'], ['Apply URL', 'apply_url'], ['Description', 'description']].map(([label, key]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</label>
                <input value={form[key as keyof typeof form] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
              {[['Type', 'type', ['scholarship','competition','internship']], ['Level', 'level', ['secondary','university','both']]].map(([label, key, opts]: any) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</label>
                  <select value={form[key as keyof typeof form] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 10px', color: C.text, fontSize: 13, outline: 'none' }}>
                    {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Deadline</label>
                <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 10px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <button onClick={submit} disabled={submitting} style={{ width: '100%', background: C.accent, border: 'none', color: '#fff', padding: '13px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {submitting ? 'Adding...' : 'Add opportunity'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}