'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, Plus, X, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40',
  border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4',
  text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF',
  gold: '#F59E0B', green: '#22C55E', red: '#EF4444',
}

interface Grade {
  id: string
  course: string
  score: number
  grade: string
  credit_units: number
  semester: string
  session: string
  created_at: string
}

export default function GradesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ course: '', score: '', credit_units: '3', semester: 'first', session: '2024/2025' })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { fetchGrades() }, [])

  const fetchGrades = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('grades')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setGrades(data || [])
    setLoading(false)
  }

  const getGrade = (score: number): string => {
    if (score >= 70) return 'A'
    if (score >= 60) return 'B'
    if (score >= 50) return 'C'
    if (score >= 40) return 'D'
    return 'F'
  }

  const gradePoints: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, F: 0 }

  const addGrade = async () => {
    if (!form.course.trim() || !form.score) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const score = parseInt(form.score)
    const grade = getGrade(score)

    const { error } = await supabase.from('grades').insert({
      user_id: user.id,
      course: form.course,
      score,
      grade,
      credit_units: parseInt(form.credit_units),
      semester: form.semester,
      session: form.session,
    })

    if (!error) {
      setForm({ course: '', score: '', credit_units: '3', semester: 'first', session: '2024/2025' })
      setShowAdd(false)
      fetchGrades()
    }
  }

  const deleteGrade = async (id: string) => {
    await supabase.from('grades').delete().eq('id', id)
    setGrades(prev => prev.filter(g => g.id !== id))
  }

  const totalCredits = grades.reduce((a, g) => a + g.credit_units, 0)
  const totalPoints = grades.reduce((a, g) => a + (gradePoints[g.grade] || 0) * g.credit_units, 0)
  const cgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00'

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 28px', maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.white, marginBottom: 4 }}>Grade Tracker</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>Track your academic performance.</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} />Add grade
        </button>
      </div>

      {/* CGPA Card */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>CGPA</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: parseFloat(cgpa) >= 3.5 ? C.green : parseFloat(cgpa) >= 2.5 ? C.gold : C.red }}>{cgpa}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>out of 5.0</div>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Courses</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.white }}>{grades.length}</div>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Credits</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.white }}>{totalCredits}</div>
        </div>
      </div>

      {/* Add grade modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.white }}>Add grade</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {[
              ['Course name', 'course', 'e.g. MAT 101'],
              ['Score', 'score', 'e.g. 75'],
              ['Credit units', 'credit_units', 'e.g. 3'],
              ['Session', 'session', 'e.g. 2024/2025'],
            ].map(([label, key, ph]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</label>
                <input value={form[key as keyof typeof form]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={ph} style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Semester</label>
              <select value={form.semester} onChange={e => setForm(prev => ({ ...prev, semester: e.target.value }))} style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                <option value="first">First Semester</option>
                <option value="second">Second Semester</option>
              </select>
            </div>
            <button onClick={addGrade} disabled={!form.course.trim() || !form.score} style={{ width: '100%', background: form.course.trim() && form.score ? `linear-gradient(135deg,${C.accent},#5B21B6)` : C.border, border: 'none', color: '#fff', padding: '12px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: form.course.trim() && form.score ? 'pointer' : 'default' }}>
              Add grade
            </button>
          </div>
        </div>
      )}

      {/* Grades list */}
      {loading ? (
        <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading grades...</div>
      ) : grades.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
          <TrendingUp size={36} color={C.border} style={{ marginBottom: 10 }} />
          <p>No grades yet. Add your first course grade.</p>
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr auto auto' : '2fr 1fr 1fr 1fr 1fr auto', gap: 0, padding: '12px 18px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
            {['Course', ...(!isMobile ? ['Score', 'Grade', 'Units', 'Semester'] : []), ''].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
            ))}
          </div>
          {grades.map((g, i) => (
            <div key={g.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr auto auto' : '2fr 1fr 1fr 1fr 1fr auto', gap: 0, padding: '14px 18px', borderBottom: i < grades.length - 1 ? `1px solid ${C.border}` : 'none', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.white }}>{g.course}</div>
                {isMobile && <div style={{ fontSize: 12, color: C.muted }}>{g.score}% · {g.grade} · {g.credit_units}u</div>}
              </div>
              {!isMobile && <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{g.score}%</span>}
              {!isMobile && <span style={{ fontSize: 14, fontWeight: 700, color: g.grade === 'A' ? C.green : g.grade === 'F' ? C.red : C.gold }}>{g.grade}</span>}
              {!isMobile && <span style={{ fontSize: 14, color: C.muted }}>{g.credit_units}</span>}
              {!isMobile && <span style={{ fontSize: 12, color: C.muted, textTransform: 'capitalize' }}>{g.semester} sem</span>}
              <button onClick={() => deleteGrade(g.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
