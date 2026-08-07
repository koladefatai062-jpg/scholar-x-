'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { createClient } from '@/lib/supabase'

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

export default function QuizPage() {
  const router = useRouter()
  const supabase = createClient()
  const [exam, setExam] = useState('JAMB')
  const [subject, setSubject] = useState('Mathematics')
  const [count, setCount] = useState(10)
  const [loading, setLoading] = useState(false)

  const startQuiz = async () => {
    setLoading(true)

    // Premium questions are only served to premium members.
    let isPremium = false
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('users').select('is_premium').eq('id', user.id).maybeSingle()
      isPremium = profile?.is_premium || false
    }

    const { data, error } = await supabase
      .from('questions')
      .select('id, exam, subject, question_text, option_a, option_b, option_c, option_d, is_premium')
      .eq('exam', exam)
      .eq('subject', subject)
      .order('id')
      .limit(count * 3)

    const available = (data || []).filter(q => isPremium || !q.is_premium)

    if (error || available.length === 0) {
      alert('No questions found for this selection yet. Try another subject.')
      setLoading(false)
      return
    }

    const shuffled = [...available].sort(() => Math.random() - 0.5).slice(0, count)

    const activeQuestions = shuffled.map(q => ({
      id: q.id,
      exam: q.exam,
      subject: q.subject,
      question_text: q.question_text,
      options: [
        { key: 'a', text: q.option_a },
        { key: 'b', text: q.option_b },
        { key: 'c', text: q.option_c },
        { key: 'd', text: q.option_d },
      ],
      is_premium: q.is_premium,
    }))

    sessionStorage.setItem('quiz_questions', JSON.stringify(activeQuestions))
    sessionStorage.setItem('quiz_meta', JSON.stringify({ exam, subject }))
    router.push('/quiz/active')
    setLoading(false)
  }

  return (
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
}
