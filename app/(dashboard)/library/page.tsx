'use client'

import { useState, useEffect } from 'react'
import { Search, BookOpen, Bookmark, Lock, ExternalLink, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40',
  border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4',
  text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF',
  gold: '#F59E0B', green: '#22C55E',
}

const SUBJECTS = ['All', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Economics', 'Literature', 'Geography']
const LEVELS = ['All', 'Secondary', 'University', 'Both']

interface LibraryItem {
  id: string
  title: string
  author: string | null
  subject: string
  level: string
  description: string | null
  content: string | null
  file_url: string | null
  cover_url: string | null
  is_premium: boolean
}

export default function LibraryPage() {
  const supabase = createClient()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('All')
  const [level, setLevel] = useState('All')
  const [isMobile, setIsMobile] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null)
  const [fullContent, setFullContent] = useState<string | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetchItems()
    fetchSaved()
  }, [subject, level])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      let premium = false
      if (user) {
        const { data: profile } = await supabase.from('users').select('is_premium').eq('id', user.id).maybeSingle()
        premium = profile?.is_premium || false
      }
      setIsPremium(premium)

      let query = supabase
        .from('library_items')
        .select('id, title, author, subject, level, description, content, file_url, cover_url, is_premium')
        .order('created_at', { ascending: false })

      if (!premium) query = query.eq('is_premium', false)
      if (subject !== 'All') query = query.eq('subject', subject)
      if (level !== 'All') query = query.eq('level', level)
      if (search) query = query.ilike('title', `%${search}%`)

      const { data, error } = await query
      if (!error) setItems(data || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const fetchSaved = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('saved_items').select('item_id').eq('user_id', user.id)
      setSavedIds(data?.map(s => s.item_id) || [])
    } catch (err) {
      console.error('Failed to load saved items:', err)
    }
  }

  const toggleSave = async (itemId: string, isPremiumItem: boolean) => {
    if (isPremiumItem && !isPremium) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const isSaved = savedIds.includes(itemId)
    if (isSaved) {
      await supabase.from('saved_items').delete().eq('user_id', user.id).eq('item_id', itemId)
      setSavedIds(prev => prev.filter(id => id !== itemId))
    } else {
      await supabase.from('saved_items').insert({ user_id: user.id, item_id: itemId })
      setSavedIds(prev => [...prev, itemId])
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchItems()
  }

  const openItem = async (item: LibraryItem) => {
    if (item.is_premium && !isPremium) return
    setSelectedItem(item)
    if (item.content) {
      setFullContent(item.content)
    } else if (item.description) {
      setFullContent(item.description)
    } else {
      setFullContent(null)
    }
  }

  const subjectColors: Record<string, string> = {
    Mathematics: C.accent, Physics: C.cyan, Chemistry: C.green,
    Biology: '#34D399', English: C.gold, Economics: '#F97316',
    Literature: '#EC4899', Geography: '#8B5CF6',
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.white, marginBottom: 4 }}>Library</h2>
        <p style={{ color: C.muted, fontSize: 14 }}>Textbooks and study materials for every subject and level.</p>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px' }}>
          <Search size={15} color={C.muted} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search books and materials..."
            style={{ background: 'none', border: 'none', color: C.text, fontSize: 14, outline: 'none', flex: 1 }} />
        </div>
        <button type="submit" style={{ background: C.accent, border: 'none', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Search
        </button>
        {isMobile && (
          <button type="button" onClick={() => setShowFilters(f => !f)} style={{ background: C.card, border: `1px solid ${C.border}`, color: C.muted, padding: '10px 14px', borderRadius: 10, cursor: 'pointer' }}>
            <Filter size={16} />
          </button>
        )}
      </form>

      {(!isMobile || showFilters) && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 8 }}>SUBJECT</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUBJECTS.map(s => (
                <button key={s} onClick={() => setSubject(s)} style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${subject === s ? C.accent : C.border}`, background: subject === s ? `${C.accent}1E` : 'transparent', color: subject === s ? C.accent : C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 8 }}>LEVEL</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {LEVELS.map(l => (
                <button key={l} onClick={() => setLevel(l)} style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${level === l ? C.cyan : C.border}`, background: level === l ? `${C.cyan}18` : 'transparent', color: level === l ? C.cyan : C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isPremium && (
        <div style={{ background: `linear-gradient(135deg,${C.accent}18,${C.card})`, border: `1px solid ${C.accent}33`, borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lock size={15} color={C.accent} />
            <span style={{ fontSize: 13, color: C.text }}>Upgrade to access all premium materials</span>
          </div>
          <button style={{ background: C.accent, border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Upgrade ₦5k/yr
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, height: 200 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
          <BookOpen size={40} color={C.border} style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>No materials found</p>
          <p style={{ fontSize: 13 }}>Try a different subject or search term</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
          {items.map(item => {
            const isSaved = savedIds.includes(item.id)
            const isLocked = item.is_premium && !isPremium
            const subjectColor = subjectColors[item.subject] || C.accent
            return (
              <div key={item.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, position: 'relative', opacity: isLocked ? 0.85 : 1 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = isLocked ? C.border : `${subjectColor}55`}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                <div style={{ width: '100%', height: 90, background: `linear-gradient(135deg,${subjectColor}22,${C.surface})`, borderRadius: 8, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <BookOpen size={28} color={subjectColor} />
                  {isLocked && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,6,40,0.6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Lock size={20} color={C.accent} />
                    </div>
                  )}
                </div>
                <div onClick={() => openItem(item)} style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: C.white, marginBottom: 4, lineHeight: 1.4, cursor: isLocked ? 'default' : 'pointer' }}>{item.title}</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{item.author || item.description?.split('\n')[0]?.substring(0, 60) || item.subject}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', background: `${subjectColor}18`, borderRadius: 4, color: subjectColor, fontWeight: 600 }}>{item.subject}</span>
                  <span style={{ fontSize: 10, padding: '2px 7px', background: C.surface, borderRadius: 4, color: C.muted }}>{item.level}</span>
                  {item.is_premium && <span style={{ fontSize: 10, padding: '2px 7px', background: `${C.gold}18`, borderRadius: 4, color: C.gold, fontWeight: 600 }}>Premium</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {isLocked ? (
                    <span style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>Premium only</span>
                  ) : item.file_url ? (
                    <a href={item.file_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.cyan, fontWeight: 600, textDecoration: 'none' }}>
                      <ExternalLink size={13} />Open
                    </a>
                  ) : item.description || item.content ? (
                    <button onClick={() => openItem(item)} style={{ fontSize: 11, color: C.green, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Read</button>
                  ) : (
                    <span style={{ fontSize: 11, color: C.muted }}>No content</span>
                  )}
                  <button onClick={() => toggleSave(item.id, item.is_premium)} disabled={isLocked}
                    style={{ background: 'none', border: 'none', cursor: isLocked ? 'default' : 'pointer', color: isSaved ? C.gold : C.muted, padding: 4 }}>
                    <Bookmark size={16} fill={isSaved ? C.gold : 'none'} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => { setSelectedItem(null); setFullContent(null) }}>
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: C.white }}>{selectedItem.title}</div>
                {selectedItem.author && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>by {selectedItem.author}</div>}
              </div>
              <button onClick={() => { setSelectedItem(null); setFullContent(null) }}
                style={{ background: C.card, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Close
              </button>
            </div>
            <div style={{ padding: '22px', overflowY: 'auto', flex: 1 }}>
              {fullContent ? (
                <div style={{ fontSize: 14, lineHeight: 1.8, color: C.text, whiteSpace: 'pre-wrap' }}>{fullContent}</div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>
                  <BookOpen size={36} color={C.border} style={{ marginBottom: 12 }} />
                  <p>No content available for this item.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}