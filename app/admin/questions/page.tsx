'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, X, HelpCircle, Camera, Scan } from 'lucide-react'

const C = { bg:'#0A0628',surface:'#110836',card:'#150D40',border:'#1E1450',accent:'#7C3AED',cyan:'#06B6D4',text:'#E2D9F3',muted:'#7B6FA0',white:'#FFFFFF',gold:'#F59E0B',green:'#22C55E',red:'#EF4444' }
const EXAMS = ['JAMB', 'WAEC', 'NECO', 'BECE', 'POST-UTME']
const SUBJECTS = ['Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature', 'Geography', 'Agricultural Science', 'Commerce', 'Civic Education', 'Basic Science', 'Social Studies', 'Basic Technology']
const EMPTY = { exam:'JAMB', subject:'Mathematics', year:'', question_text:'', option_a:'', option_b:'', option_c:'', option_d:'', correct_option:'a', explanation:'', is_premium:false }

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exam, setExam] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [mode, setMode] = useState<'single' | 'bulk' | 'image'>('single')
  const [form, setForm] = useState(EMPTY)
  const [bulkJson, setBulkJson] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [ocrImage, setOcrImage] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)

  const fetchQuestions = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (exam) params.set('exam', exam)
    const res = await fetch(`/api/admin/questions${params.toString() ? `?${params}` : ''}`)
    const data = await res.json()
    setQuestions(data.questions || [])
    setLoading(false)
  }

  useEffect(() => { fetchQuestions() }, [exam])

  const submitSingle = async () => {
    if (!form.question_text || !form.option_a) { setMessage('Question text and Option A are required'); return }
    setSubmitting(true)
    setMessage(null)
    const res = await fetch('/api/admin/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (data.question) {
      setQuestions(p => [data.question, ...p])
      setForm(EMPTY)
      setShowForm(false)
    } else {
      setMessage(data.error || 'Failed to add question')
    }
    setSubmitting(false)
  }

  const submitBulk = async () => {
    let parsed: any[]
    try {
      parsed = JSON.parse(bulkJson)
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error()
    } catch {
      setMessage('Bulk import must be a non-empty JSON array')
      return
    }
    setSubmitting(true)
    setMessage(null)
    const res = await fetch('/api/admin/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questions: parsed }) })
    const data = await res.json()
    if (data.count > 0) {
      setQuestions(p => [...data.questions, ...p])
      setBulkJson('')
      setShowForm(false)
      setMessage(null)
    } else {
      setMessage(data.error || 'Failed to import questions')
    }
    setSubmitting(false)
  }

  const deleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return
    await fetch('/api/admin/questions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setQuestions(p => p.filter(q => q.id !== id))
  }

  const handleFile = async (file: File) => {
    if (!file) return
    setOcrError(null)
    setOcrLoading(true)
    setMessage(null)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = reader.result as string
        setOcrImage(dataUrl)
        const res = await fetch('/api/admin/questions/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl }),
        })
        const data = await res.json()
        if (data.question) {
          setForm(prev => ({ ...prev, ...data.question }))
          setMode('single')
        } else {
          setOcrError(data.error || 'Could not read the question from that image.')
        }
        setOcrLoading(false)
      }
      reader.onerror = () => { setOcrLoading(false); setOcrError('Failed to read the image file.') }
      reader.readAsDataURL(file)
    } catch {
      setOcrLoading(false)
      setOcrError('Failed to upload the image.')
    }
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.white, marginBottom: 4 }}>Questions</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>{questions.length} question(s)</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={exam} onChange={e => setExam(e.target.value)}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none' }}>
            <option value="">All exams</option>
            {EXAMS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <button onClick={() => setShowForm(true)} style={{ background: C.accent, border: 'none', color: '#fff', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} />Add question
          </button>
        </div>
      </div>

      {message && <div style={{ padding: '10px 14px', background: `${C.red}15`, border: `1px solid ${C.red}33`, borderRadius: 8, marginBottom: 16, fontSize: 13, color: C.red }}>{message}</div>}

      {loading ? <div style={{ color: C.muted }}>Loading...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {questions.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>No questions yet. Add one or bulk import.</div>}
          {questions.map(q => (
            <div key={q.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', background: `${C.accent}18`, borderRadius: 4, color: C.accent, fontWeight: 700 }}>{q.exam}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', background: `${C.cyan}18`, borderRadius: 4, color: C.cyan, fontWeight: 700 }}>{q.subject}</span>
                    {q.is_premium && <span style={{ fontSize: 10, padding: '2px 7px', background: `${C.gold}18`, borderRadius: 4, color: C.gold, fontWeight: 700 }}>PREMIUM</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.white, marginBottom: 8 }}>{q.question_text}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    {['a','b','c','d'].map(k => (
                      <div key={k} style={{ fontSize: 12, color: q.correct_option === k ? C.green : C.muted, fontWeight: q.correct_option === k ? 700 : 400 }}>
                        {k.toUpperCase()}. {q[`option_${k}`]}
                      </div>
                    ))}
                  </div>
                  {q.explanation && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>💡 {q.explanation}</div>}
                </div>
                <button onClick={() => deleteQuestion(q.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.color = C.red} onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.white }}>Add questions</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <button onClick={() => setMode('single')} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${mode === 'single' ? C.accent : C.border}`, background: mode === 'single' ? `${C.accent}1E` : 'transparent', color: mode === 'single' ? C.accent : C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Single question</button>
              <button onClick={() => setMode('bulk')} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${mode === 'bulk' ? C.cyan : C.border}`, background: mode === 'bulk' ? `${C.cyan}18` : 'transparent', color: mode === 'bulk' ? C.cyan : C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Bulk import (JSON)</button>
              <button onClick={() => setMode('image')} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${mode === 'image' ? C.gold : C.border}`, background: mode === 'image' ? `${C.gold}18` : 'transparent', color: mode === 'image' ? C.gold : C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Camera size={14} />Snap from image
              </button>
            </div>

            {mode === 'image' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                    Take a photo or upload a question image
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.card, border: `1px dashed ${C.border}`, borderRadius: 12, padding: '28px 20px', cursor: 'pointer', textAlign: 'center' }}>
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
                    {ocrLoading ? (
                      <>
                        <Scan size={22} color={C.gold} />
                        <span style={{ fontSize: 13, color: C.text }}>Reading question with AI...</span>
                      </>
                    ) : ocrImage ? (
                      <>
                        <img src={ocrImage} alt="Captured question" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
                        <span style={{ fontSize: 12, color: C.muted }}>Click to choose a different image</span>
                      </>
                    ) : (
                      <>
                        <Camera size={24} color={C.gold} />
                        <span style={{ fontSize: 13, color: C.text }}>Snap a photo of the question</span>
                        <span style={{ fontSize: 11, color: C.muted }}>The AI will extract the question, options and answer for you to review</span>
                      </>
                    )}
                  </label>
                </div>
                {ocrError && <div style={{ padding: '10px 14px', background: `${C.red}15`, border: `1px solid ${C.red}33`, borderRadius: 8, marginBottom: 12, fontSize: 13, color: C.red }}>{ocrError}</div>}
                {!ocrLoading && ocrImage && (
                  <button onClick={() => { setOcrImage(null); setForm(EMPTY) }} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text, padding: '11px', borderRadius: 9, fontSize: 14, cursor: 'pointer', width: '100%' }}>
                    Cancel
                  </button>
                )}
              </>
            )}

            {mode === 'single' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Exam</label>
                    <select value={form.exam} onChange={e => setForm(p => ({ ...p, exam: e.target.value }))}
                      style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none' }}>
                      {EXAMS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Subject</label>
                    <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} list="subjects"
                      style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                    <datalist id="subjects">{SUBJECTS.map(s => <option key={s} value={s} />)}</datalist>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Year</label>
                    <input value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} placeholder="e.g. 2024"
                      style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Question *</label>
                  <textarea value={form.question_text} onChange={e => setForm(p => ({ ...p, question_text: e.target.value }))} rows={2}
                    style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  {['a','b','c','d'].map(k => (
                    <div key={k}>
                      <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Option {k.toUpperCase()} {k === 'a' ? '*' : ''}</label>
                      <input value={form[`option_${k}` as keyof typeof form] as string} onChange={e => setForm(p => ({ ...p, [`option_${k}`]: e.target.value }))}
                        style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Correct option</label>
                    <select value={form.correct_option} onChange={e => setForm(p => ({ ...p, correct_option: e.target.value }))}
                      style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none' }}>
                      {['a','b','c','d'].map(k => <option key={k} value={k}>{k.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Premium</label>
                    <select value={form.is_premium ? 'yes' : 'no'} onChange={e => setForm(p => ({ ...p, is_premium: e.target.value === 'yes' }))}
                      style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none' }}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Explanation</label>
                  <textarea value={form.explanation} onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))} rows={2}
                    style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
                </div>

                <button onClick={submitSingle} disabled={submitting} style={{ width: '100%', background: C.accent, border: 'none', color: '#fff', padding: '13px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {submitting ? 'Adding...' : 'Add question'}
                </button>
              </>
            )}

            {mode === 'bulk' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Questions JSON array</label>
                  <textarea value={bulkJson} onChange={e => setBulkJson(e.target.value)} rows={10}
                    placeholder='[{ "exam": "JAMB", "subject": "Mathematics", "question_text": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_option": "a", "explanation": "...", "is_premium": false }]'
                    style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', resize: 'vertical' }} />
                </div>
                <button onClick={submitBulk} disabled={submitting} style={{ width: '100%', background: `linear-gradient(135deg,${C.cyan},#0E7490)`, border: 'none', color: '#fff', padding: '13px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {submitting ? 'Importing...' : 'Import questions'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
