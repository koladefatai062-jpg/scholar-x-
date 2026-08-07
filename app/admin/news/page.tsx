'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, X, RefreshCw } from 'lucide-react'

const C = { bg:'#0A0628',surface:'#110836',card:'#150D40',border:'#1E1450',accent:'#7C3AED',cyan:'#06B6D4',text:'#E2D9F3',muted:'#7B6FA0',white:'#FFFFFF',gold:'#F59E0B',green:'#22C55E',red:'#EF4444' }
const EMPTY = { title:'',summary:'',source_url:'',source_name:'',category:'general',published_at: new Date().toISOString().split('T')[0] }
const catColor: Record<string,string> = { JAMB: '#7C3AED', WAEC: '#06B6D4', NECO: '#22C55E', BECE: '#F59E0B', general: '#7B6FA0' }

export default function AdminNewsPage() {
  const [news, setNews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState<string | null>(null)

  useEffect(() => { fetchNews() }, [])

  const fetchNews = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/news')
    const data = await res.json()
    setNews(data.news || [])
    setLoading(false)
  }

  const submit = async () => {
    if (!form.title) return
    setSubmitting(true)
    const res = await fetch('/api/admin/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (data.news) { setNews(p => [data.news, ...p]); setForm(EMPTY); setShowForm(false) }
    setSubmitting(false)
  }

  const deleteNews = async (id: string) => {
    if (!confirm('Delete this news item?')) return
    await fetch('/api/admin/news', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setNews(p => p.filter(n => n.id !== id))
  }

  const runScraper = async () => {
    setScraping(true)
    setScrapeResult(null)
    try {
      const res = await fetch('/api/admin/scrape', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setScrapeResult(`✅ Scraped ${data.scraped}, inserted ${data.inserted}, skipped ${data.skipped}${data.errors?.length ? ` · ${data.errors.length} source(s) failed` : ''}`)
      } else {
        setScrapeResult(`❌ ${data.message || 'No articles found'}`)
      }
      if (data.inserted > 0) fetchNews()
    } catch { setScrapeResult('❌ Scraper failed') }
    setScraping(false)
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.white, marginBottom: 4 }}>News</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>{news.length} articles</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={runScraper} disabled={scraping} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text, padding: '9px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} />{scraping ? 'Scraping...' : 'Run scraper'}
          </button>
          <button onClick={() => setShowForm(true)} style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} />Add news
          </button>
        </div>
      </div>

      {scrapeResult && <div style={{ padding: '10px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 16, fontSize: 13, color: C.text }}>{scrapeResult}</div>}

      {loading ? <div style={{ color: C.muted }}>Loading...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {news.map(item => (
            <div key={item.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', background: `${catColor[item.category] || C.muted}18`, borderRadius: 4, color: catColor[item.category] || C.muted, fontWeight: 700 }}>{item.category}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{item.source_name}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.white, marginBottom: 4 }}>{item.title}</div>
                {item.summary && <div style={{ fontSize: 12, color: C.muted }}>{item.summary}</div>}
              </div>
              <button onClick={() => deleteNews(item.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = C.red} onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.white }}>Add news</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {[['Title *', 'title'], ['Summary', 'summary'], ['Source URL', 'source_url'], ['Source name', 'source_name']].map(([label, key]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</label>
                <input value={form[key as keyof typeof form] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none' }}>
                  {['JAMB','WAEC','NECO','BECE','general'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Date</label>
                <input type="date" value={form.published_at} onChange={e => setForm(p => ({ ...p, published_at: e.target.value }))}
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <button onClick={submit} disabled={submitting} style={{ width: '100%', background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '13px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {submitting ? 'Adding...' : 'Add news'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}