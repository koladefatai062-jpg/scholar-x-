'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, TrendingUp, BookOpen, X } from 'lucide-react'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40',
  border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4',
  text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF',
  gold: '#F59E0B', green: '#22C55E', red: '#EF4444',
}

interface Course {
  id: string
  code: string
  name: string
  units: number
  score: number
  grade: string
  semester: string
  session: string
}

interface TermResult {
  id: string
  subject: string
  ca_score: number
  exam_score: number
  total: number
  term: string
  session: string
}

export default function GradesPage() {
  const [type, setType] = useState<'university' | 'secondary'>('university')
  const [courses, setCourses] = useState<Course[]>([])
  const [results, setResults] = useState<TermResult[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [scale, setScale] = useState<4 | 5>(5)

  // University form
  const [uniForm, setUniForm] = useState({ code: '', name: '', units: '', score: '', semester: 'first', session: '2025/2026' })

  // Secondary form
  const [secForm, setSecForm] = useState({ subject: '', ca_score: '', exam_score: '', term: 'first', session: '2025/2026' })

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { fetchGrades() }, [])

  const fetchGrades = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/grades')
      const data = await res.json()
      setType(data.type)
      if (data.type === 'university') setCourses(data.courses || [])
      else setResults(data.results || [])
    } catch {}
    setLoading(false)
  }

  const addCourse = async () => {
    if (!uniForm.code || !uniForm.name || !uniForm.units || !uniForm.score) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uniForm),
      })
      const data = await res.json()
      if (data.course) {
        setCourses(prev => [data.course, ...prev])
        setUniForm({ code: '', name: '', units: '', score: '', semester: 'first', session: '2025/2026' })
        setShowForm(false)
      }
    } catch {}
    setSubmitting(false)
  }

  const addResult = async () => {
    if (!secForm.subject || !secForm.ca_score || !secForm.exam_score) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(secForm),
      })
      const data = await res.json()
      if (data.result) {
        setResults(prev => [data.result, ...prev])
        setSecForm({ subject: '', ca_score: '', exam_score: '', term: 'first', session: '2025/2026' })
        setShowForm(false)
      }
    } catch {}
    setSubmitting(false)
  }

  const deleteItem = async (id: string) => {
    try {
      await fetch('/api/grades', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type }),
      })
      if (type === 'university') setCourses(prev => prev.filter(c => c.id !== id))
      else setResults(prev => prev.filter(r => r.id !== id))
    } catch {}
  }

  // CGPA calculation
  const calculateCGPA = (scale: number) => {
    if (courses.length === 0) return '0.00'
    const totalPoints = courses.reduce((acc, c) => {
      const gradePoints = scale === 5
        ? c.grade === 'A' ? 5 : c.grade === 'B' ? 4 : c.grade === 'C' ? 3 : c.grade === 'D' ? 2 : 1
        : c.grade === 'A' ? 4 : c.grade === 'B' ? 3 : c.grade === 'C' ? 2 : c.grade === 'D' ? 1 : 0
      return acc + gradePoints * c.units
    }, 0)
    const totalUnits = courses.reduce((acc, c) => acc + c.units, 0)
    return totalUnits > 0 ? (totalPoints / totalUnits).toFixed(2) : '0.00'
  }

  const cgpa = parseFloat(calculateCGPA(scale))
  const totalUnits = courses.reduce((acc, c) => acc + c.units, 0)

  const gradeColor = (grade: string) => {
    if (grade === 'A') return C.green
    if (grade === 'B') return C.cyan
    if (grade === 'C') return C.gold
    return C.red
  }

  const scoreColor = (score: number) => score >= 70 ? C.green : score >= 50 ? C.gold : C.red

  const cgpaColor = cgpa >= 4.5 ? C.cyan : cgpa >= 3.5 ? C.green : cgpa >= 2.5 ? C.gold : C.red

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.white, marginBottom: 4 }}>Grade Tracker</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>{type === 'university' ? 'Track your CGPA and course results' : 'Track your term results'}</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '10px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Plus size={15} />{type === 'university' ? 'Add course' : 'Add result'}
        </button>
      </div>

      {type === 'university' ? (
        <>
          {/* CGPA Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, gridColumn: isMobile ? 'span 2' : 'auto' }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>CGPA ({scale}.0 scale)</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: cgpaColor }}>{calculateCGPA(scale)}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {([4, 5] as const).map(s => (
                  <button key={s} onClick={() => setScale(s)} style={{ padding: '3px 10px', borderRadius: 5, border: `1px solid ${scale === s ? C.accent : C.border}`, background: scale === s ? `${C.accent}1E` : 'transparent', color: scale === s ? C.accent : C.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{s}.0</button>
                ))}
              </div>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Total Units</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.white }}>{totalUnits}</div>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Courses</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.white }}>{courses.length}</div>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Class</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: cgpaColor }}>
                {cgpa >= 4.5 ? 'First Class' : cgpa >= 3.5 ? 'Second Upper' : cgpa >= 2.5 ? 'Second Lower' : cgpa >= 1.5 ? 'Third Class' : 'No result'}
              </div>
            </div>
          </div>

          {/* Courses table */}
          {courses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
              <BookOpen size={36} color={C.border} style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>No courses yet</p>
              <p style={{ fontSize: 13 }}>Add your first course to start tracking your CGPA</p>
            </div>
          ) : (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Course Results</span>
              </div>
              {courses.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '13px 18px', borderBottom: i < courses.length - 1 ? `1px solid ${C.border}` : 'none', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{c.code} · {c.units} units · {c.semester} semester</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: scoreColor(c.score) }}>{c.score}%</div>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: `${gradeColor(c.grade)}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: gradeColor(c.grade) }}>{c.grade}</span>
                  </div>
                  <button onClick={() => deleteItem(c.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = C.red}
                    onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Secondary stats */}
          {results.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Average</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: scoreColor(results.reduce((a, r) => a + r.total, 0) / results.length) }}>
                  {(results.reduce((a, r) => a + r.total, 0) / results.length).toFixed(1)}%
                </div>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Subjects</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.white }}>{results.length}</div>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Best subject</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.green }}>
                  {results.sort((a, b) => b.total - a.total)[0]?.subject || '-'}
                </div>
              </div>
            </div>
          )}

          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
              <TrendingUp size={36} color={C.border} style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>No results yet</p>
              <p style={{ fontSize: 13 }}>Add your term results to track your performance</p>
            </div>
          ) : (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Term Results</span>
              </div>
              {results.map((r, i) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '13px 18px', borderBottom: i < results.length - 1 ? `1px solid ${C.border}` : 'none', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.subject}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>CA: {r.ca_score} · Exam: {r.exam_score} · {r.term} term</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: scoreColor(r.total) }}>{r.total}/100</div>
                  <button onClick={() => deleteItem(r.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = C.red}
                    onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.white }}>{type === 'university' ? 'Add course' : 'Add result'}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {type === 'university' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[['Course code', 'code', 'e.g. MTH101'], ['Course name', 'name', 'e.g. General Mathematics'], ['Units', 'units', 'e.g. 3'], ['Score (%)', 'score', 'e.g. 75']].map(([label, key, ph]) => (
                  <div key={key}>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</label>
                    <input value={uniForm[key as keyof typeof uniForm]} onChange={e => setUniForm(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={ph} type={key === 'units' || key === 'score' ? 'number' : 'text'}
                      style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Semester</label>
                    <select value={uniForm.semester} onChange={e => setUniForm(prev => ({ ...prev, semester: e.target.value }))}
                      style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 14px', color: C.text, fontSize: 14, outline: 'none' }}>
                      <option value="first">First</option>
                      <option value="second">Second</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Session</label>
                    <input value={uniForm.session} onChange={e => setUniForm(prev => ({ ...prev, session: e.target.value }))}
                      placeholder="2025/2026" style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <button onClick={addCourse} disabled={submitting} style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '13px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
                  {submitting ? 'Adding...' : 'Add course'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[['Subject', 'subject', 'e.g. Mathematics'], ['CA Score (out of 30)', 'ca_score', 'e.g. 25'], ['Exam Score (out of 70)', 'exam_score', 'e.g. 58']].map(([label, key, ph]) => (
                  <div key={key}>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</label>
                    <input value={secForm[key as keyof typeof secForm]} onChange={e => setSecForm(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={ph} type={key !== 'subject' ? 'number' : 'text'}
                      style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Term</label>
                    <select value={secForm.term} onChange={e => setSecForm(prev => ({ ...prev, term: e.target.value }))}
                      style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 14px', color: C.text, fontSize: 14, outline: 'none' }}>
                      <option value="first">First</option>
                      <option value="second">Second</option>
                      <option value="third">Third</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Session</label>
                    <input value={secForm.session} onChange={e => setSecForm(prev => ({ ...prev, session: e.target.value }))}
                      placeholder="2025/2026" style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <button onClick={addResult} disabled={submitting} style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '13px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
                  {submitting ? 'Adding...' : 'Add result'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}