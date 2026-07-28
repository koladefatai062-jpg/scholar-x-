'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, X } from 'lucide-react'

const C = { bg:'#0A0628',surface:'#110836',card:'#150D40',border:'#1E1450',accent:'#7C3AED',cyan:'#06B6D4',text:'#E2D9F3',muted:'#7B6FA0',white:'#FFFFFF',gold:'#F59E0B',green:'#22C55E',red:'#EF4444' }
const SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','English','Economics','Government','Literature','Geography','Agricultural Science','Commerce','Basic Science','Social Studies']
const EMPTY = { title:'',author:'',subject:'Mathematics',level:'secondary',description:'',file_url:'',cover_url:'',source:'custom',is_premium:false }

export default function AdminLibraryPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/library')
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }

  const submit = async () => {
    if (!form.title || !form.file_url) return
    setSubmitting(true)
    const res = await fetch('/api/admin/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (data.item) { setItems(p => [data.item, ...p]); setForm(EMPTY); setShowForm(false) }
    setSubmitting(false)
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return
    await fetch('/api/admin/library', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setItems(p => p.filter(i => i.id !== id))
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.white, marginBottom: 4 }}>Library</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>{items.length} items</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} />Add item
        </button>
      </div>

      {loading ? <div style={{ color: C.muted }}>Loading...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => (
            <div key={item.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{item.author} · {item.subject} · {item.level}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', background: item.is_premium ? `${C.gold}18` : `${C.green}18`, borderRadius: 4, color: item.is_premium ? C.gold : C.green, fontWeight: 700 }}>{item.is_premium ? 'Premium' : 'Free'}</span>
                </div>
              </div>
              <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.color = C.red} onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.white }}>Add library item</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {[['Title *', 'title', 'text'], ['Author', 'author', 'text'], ['File URL *', 'file_url', 'text'], ['Cover URL', 'cover_url', 'text'], ['Description', 'description', 'text']].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</label>
                <input type={type} value={form[key as keyof typeof form] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Subject</label>
                <select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none' }}>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Level</label>
                <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none' }}>
                  <option value="secondary">Secondary</option>
                  <option value="university">University</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 18 }}>
              <input type="checkbox" checked={form.is_premium} onChange={e => setForm(p => ({ ...p, is_premium: e.target.checked }))} />
              <span style={{ fontSize: 14, color: C.text }}>Premium only</span>
            </label>
            <button onClick={submit} disabled={submitting} style={{ width: '100%', background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '13px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {submitting ? 'Adding...' : 'Add item'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}