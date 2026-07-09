'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Trophy, ArrowRight, RotateCcw, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Question, User } from '@/types'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40', border: '#1E1450',
  accent: '#7C3AED', cyan: '#06B6D4', text: '#E2D9F3', muted: '#7B6FA0',
  white: '#FFFFFF', gold: '#F59E0B', green: '#22C55E', red: '#EF4444',
}

const EXAMS = ['JAMB', 'WAEC', 'NECO', 'BECE', 'POST-UTME']
const SUBJECTS: Record<string, string[]> = {
  JAMB: ['Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature'],
  WAEC: ['Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Geography', 'Literature'],
  NECO: ['Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology', 'Agricultural Science', 'Commerce', 'Civic Education'],
  BECE: ['Mathematics', 'English Language', 'Basic Science', 'Social Studies', 'Basic Technology', 'Agricultural Science'],
  'POST-UTME': ['Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology', 'Economics'],
}
const COUNTS = [10, 20, 40]

type Mode = 'select' | 'active' | 'result' | 'review'

export default function QuizPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [mode, setMode] = useState<Mode>('select')
  const [exam, setExam] = useState('JAMB')
  const [subject, setSubject] = useState('Mathematics')
  const [count, setCount] = useState(10)
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [time, setTime] = useState(45)
  const [totalTime, setTotalTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase.from('users').select('*').eq('id', data.user.id).single().then(({ data: p }) => setUser(p))
    })
  }, [])

  // per-question timer
  useEffect(() => {
    if (mode !== 'active') return
    setTime(45)
    timerRef.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          // auto skip — mark as wrong
          setAnswered(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [mode, current])

  // total time tracker
  useEffect(() => {
    if (mode !== 'active') { clearInterval(totalTimerRef.current!); return }
    totalTimerRef.current = setInterval(() => setTotalTime(t => t + 1), 1000)
    return () => clearInterval(totalTimerRef.current!)
  }, [mode])

  const startQuiz = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('exam', exam)
      .eq('subject', subject)
      .order('id') // will be randomised via RPC or client shuffle
      .limit(count * 3) // fetch more then shuffle

    if (error || !data || data.length === 0) {
      alert('No questions found for this selection yet. Try another subject.')
      setLoading(false)
      return
    }

    // shuffle client-side
    const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, count)
    setQuestions(shuffled)
    setCurrent(0)
    setAnswers({})
    setAnswered(false)
    setScore(0)
    setTotalTime(0)
    setMode('active')
    setLoading(false)
  }

  const handleAnswer = (option: string) => {
    if (answered) return
    clearInterval(timerRef.current!)
    const isCorrect = option === questions[current].correct_option
    setAnswers(prev => ({ ...prev, [current]: option }))
    setAnswered(true)
    if (isCorrect) setScore(s => s + 1)
  }

  const next = () => {
    if (current + 1 >= questions.length) {
      saveAttempt()
      setMode('result')
      return
    }
    setCurrent(c => c + 1)
    setAnswered(false)
  }

  const saveAttempt = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    const { data: attempt } = await supabase.from('quiz_attempts').insert({
      user_id: authUser.id, exam, subject, score, total: questions.length, time_spent: totalTime
    }).select().single()

    if (attempt) {
      const answerRows = questions.map((q, i) => ({
        attempt_id: attempt.id,
        question_id: q.id,
        selected_option: answers[i] || null,
        is_correct: answers[i] === q.correct_option,
      }))
      await supabase.from('quiz_answers').insert(answerRows)
    }
  }

  const restart = () => {
    setMode('select')
    setQuestions([])
    setAnswers({})
    setCurrent(0)
    setScore(0)
    setTotalTime(0)
  }

  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0

  // ── SELECT SCREEN ──
  if (mode === 'select') return (
    <div style={{ padding: '24px 28px', maxWidth: 700 }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: C.white, marginBottom: 6 }}>Quiz Practice</h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 28 }}>Questions are reshuffled every session — no two users get the same set.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Exam */}
        <div>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Exam</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EXAMS.map(e => (
              <button key={e} onClick={() => { setExam(e); setSubject(SUBJECTS[e][0]) }}
                style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${exam === e ? C.accent : C.border}`, background: exam === e ? `${C.accent}1E` : 'transparent', color: exam === e ? C.accent : C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Subject</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SUBJECTS[exam].map(s => (
              <button key={s} onClick={() => setSubject(s)}
                style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${subject === s ? C.cyan : C.border}`, background: subject === s ? `${C.cyan}18` : 'transparent', color: subject === s ? C.cyan : C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <div>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Number of questions</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {COUNTS.map(n => (
              <button key={n} onClick={() => setCount(n)}
                style={{ padding: '9px 24px', borderRadius: 8, border: `1px solid ${count === n ? C.gold : C.border}`, background: count === n ? `${C.gold}18` : 'transparent', color: count === n ? C.gold : C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Summary card */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 6 }}>{exam} · {subject}</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>{count} questions · 45 seconds each · Reshuffled</div>
          <button onClick={startQuiz} disabled={loading}
            style={{ background: loading ? C.border : `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '12px 28px', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Play size={16} />{loading ? 'Loading questions...' : 'Start quiz'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── ACTIVE QUIZ ──
  if (mode === 'active') {
    const q = questions[current]
    const opts = [
      { key: 'a', text: q.option_a },
      { key: 'b', text: q.option_b },
      { key: 'c', text: q.option_c },
      { key: 'd', text: q.option_d },
    ]
    return (
      <div style={{ padding: '24px 28px', maxWidth: 680 }}>
        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: C.muted }}>Question {current + 1} of {questions.length}</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: time <= 10 ? C.red : time <= 20 ? C.gold : C.muted }}>{time}s</span>
        </div>
        <div style={{ height: 4, background: C.border, borderRadius: 4, marginBottom: 28, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((current + 1) / questions.length) * 100}%`, background: `linear-gradient(90deg,${C.accent},${C.cyan})`, transition: 'width 0.4s' }} />
        </div>

        {/* Question */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{exam} · {subject} {q.year ? `· ${q.year}` : ''}</div>
          <p style={{ fontSize: 16, color: C.white, lineHeight: 1.7, fontWeight: 500, margin: 0 }}>{q.question_text}</p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          {opts.map(({ key, text }) => {
            const isSelected = answers[current] === key
            const isCorrect = key === q.correct_option
            let bc = C.border, bg = 'transparent', col = C.text
            if (answered) {
              if (isCorrect) { bc = C.green; bg = `${C.green}18`; col = C.green }
              else if (isSelected) { bc = C.red; bg = `${C.red}18`; col = C.red }
            } else if (isSelected) { bc = C.accent; bg = `${C.accent}15` }
            return (
              <button key={key} onClick={() => handleAnswer(key)}
                style={{ background: bg, border: `1px solid ${bc}`, borderRadius: 10, padding: '14px 18px', textAlign: 'left', color: col, fontSize: 15, cursor: answered ? 'default' : 'pointer', transition: 'all 0.14s', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: bc === C.border ? C.muted : bc, flexShrink: 0, marginTop: 2 }}>{key.toUpperCase()}.</span>
                <span>{text}</span>
              </button>
            )
          })}
        </div>

        {/* Explanation (premium only) */}
        {answered && user?.is_premium && q.explanation && (
          <div style={{ background: `${C.cyan}12`, border: `1px solid ${C.cyan}33`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.cyan, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Explanation</div>
            <p style={{ fontSize: 13, color: C.text, lineHeight: 1.65, margin: 0 }}>{q.explanation}</p>
          </div>
        )}

        {/* Free user explanation teaser */}
        {answered && !user?.is_premium && q.explanation && (
          <div style={{ background: `${C.accent}12`, border: `1px solid ${C.accent}33`, borderRadius: 10, padding: 14, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 13, color: C.muted }}>🔒 Upgrade to see the full explanation</div>
            <button onClick={() => router.push('/settings')} style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Upgrade</button>
          </div>
        )}

        {answered && (
          <button onClick={next} style={{ width: '100%', background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {current + 1 >= questions.length ? 'See results' : 'Next question'} <ArrowRight size={16} />
          </button>
        )}
      </div>
    )
  }

  // ── RESULT SCREEN ──
  if (mode === 'result') return (
    <div style={{ padding: '24px 28px', maxWidth: 560, margin: '0 auto', textAlign: 'center', paddingTop: 48 }}>
      <Trophy size={52} color={C.gold} style={{ margin: '0 auto 16px' }} />
      <h2 style={{ fontSize: 28, fontWeight: 800, color: C.white, marginBottom: 6 }}>Quiz complete</h2>
      <p style={{ color: C.muted, fontSize: 15, marginBottom: 24 }}>{exam} · {subject}</p>

      <div style={{ fontSize: 64, fontWeight: 900, color: pct >= 80 ? C.green : pct >= 60 ? C.gold : C.red, marginBottom: 8 }}>{pct}%</div>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 32 }}>{score} out of {questions.length} correct · {Math.floor(totalTime / 60)}m {totalTime % 60}s</p>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 28, textAlign: 'left' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 12 }}>Performance breakdown</div>
        {[
          { label: 'Correct', value: score, color: C.green },
          { label: 'Wrong', value: questions.length - score, color: C.red },
          { label: 'Score', value: `${pct}%`, color: pct >= 80 ? C.green : pct >= 60 ? C.gold : C.red },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setMode('review')} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text, padding: '12px 22px', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Eye size={15} />Review answers
        </button>
        <button onClick={startQuiz} style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '12px 22px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <RotateCcw size={15} />Try again
        </button>
        <button onClick={restart} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, padding: '12px 22px', borderRadius: 9, fontSize: 14, cursor: 'pointer' }}>
          New quiz
        </button>
      </div>
    </div>
  )

  // ── REVIEW SCREEN ──
  if (mode === 'review') return (
    <div style={{ padding: '24px 28px', maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setMode('result')} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14 }}>← Back to results</button>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: C.white, marginBottom: 20 }}>Answer Review</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {questions.map((q, i) => {
          const selected = answers[i]
          const isCorrect = selected === q.correct_option
          return (
            <div key={q.id} style={{ background: C.card, border: `1px solid ${isCorrect ? C.green + '44' : C.red + '44'}`, borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: C.muted }}>Q{i + 1}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: isCorrect ? C.green : C.red }}>{isCorrect ? '✓ Correct' : '✗ Wrong'}</span>
              </div>
              <p style={{ fontSize: 14, color: C.white, lineHeight: 1.6, marginBottom: 12 }}>{q.question_text}</p>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>Your answer: <span style={{ color: isCorrect ? C.green : C.red, fontWeight: 600 }}>{selected ? `${selected.toUpperCase()}. ${(q as any)[`option_${selected}`]}` : 'Skipped'}</span></div>
              {!isCorrect && <div style={{ fontSize: 13, color: C.muted }}>Correct answer: <span style={{ color: C.green, fontWeight: 600 }}>{q.correct_option.toUpperCase()}. {(q as any)[`option_${q.correct_option}`]}</span></div>}
              {user?.is_premium && q.explanation && (
                <div style={{ marginTop: 12, background: `${C.cyan}12`, border: `1px solid ${C.cyan}22`, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: C.cyan, fontWeight: 700, marginBottom: 4 }}>EXPLANATION</div>
                  <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, margin: 0 }}>{q.explanation}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return null
}