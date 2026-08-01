'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface QuestionOption {
  key: string
  text: string
}

interface Question {
  id: string
  exam: string
  subject: string
  question_text: string
  options: QuestionOption[]
  is_premium: boolean
}

export default function ActiveQuizPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [meta, setMeta] = useState({ exam: '', subject: '' })
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [correctOption, setCorrectOption] = useState<string | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [time, setTime] = useState(45)
  const [loading, setLoading] = useState(false)
  const [checkError, setCheckError] = useState(false)
  const [startTime] = useState(Date.now())
  const answersRef = useRef<any[]>([])
  const reviewRef = useRef<any[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('quiz_questions')
    const storedMeta = sessionStorage.getItem('quiz_meta')
    if (!stored) {
      router.push('/quiz')
      return
    }
    setQuestions(JSON.parse(stored))
    if (storedMeta) setMeta(JSON.parse(storedMeta))
  }, [])

  useEffect(() => {
    if (questions.length === 0 || answered) return
    setTime(45)
    timerRef.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          handleAnswer(null) // timeout = no answer
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [current, questions])

  const handleAnswer = async (optionKey: string | null) => {
    if (answered) return
    if (timerRef.current) clearInterval(timerRef.current)
    setSelected(optionKey)
    setAnswered(true)
    setLoading(true)

    const q = questions[current]
    try {
      const res = await fetch('/api/quiz/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: q.id, selected_option: optionKey }),
      })
      const data = await res.json()
      setCorrectOption(data.correct_option)
      setExplanation(data.explanation)
      if (data.is_correct) setScore(s => s + 1)

      answersRef.current.push({
        question_id: q.id,
        selected_option: optionKey,
        is_correct: data.is_correct,
      })

      reviewRef.current.push({
        question_text: q.question_text,
        options: q.options,
        selected: optionKey,
        correct: data.correct_option,
        explanation: data.explanation,
        is_correct: data.is_correct,
      })
    } catch (err) {
      console.error('Failed to check answer:', err)
      setCheckError(true)
    }
    setLoading(false)
  }

  const next = async () => {
    if (current + 1 >= questions.length) {
      await submitAttempt()
      router.push('/quiz/result')
      return
    }
    setCurrent(c => c + 1)
    setSelected(null)
    setAnswered(false)
    setCorrectOption(null)
    setExplanation(null)
  }

  const submitAttempt = async () => {
    const timeSpent = Math.round((Date.now() - startTime) / 1000)
    const result = {
      exam: meta.exam,
      subject: meta.subject,
      score,
      total: questions.length,
      time_spent: timeSpent,
    }
    sessionStorage.setItem('quiz_result', JSON.stringify(result))
    sessionStorage.setItem('quiz_review', JSON.stringify(reviewRef.current))

    try {
      await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...result, answers: answersRef.current }),
      })
    } catch (err) {
      console.error('Failed to save quiz attempt:', err)
    }
  }

  if (questions.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#7B6FA0' }}>
        Loading questions...
      </div>
    )
  }

  const q = questions[current]

  return (
    <div style={{ padding: '24px 28px', maxWidth: 680 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: '#7B6FA0' }}>
          Question {current + 1} of {questions.length}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: time < 10 ? '#EF4444' : '#7B6FA0' }}>
          {time}s
        </span>
      </div>

      <div style={{ height: 4, background: '#1E1450', borderRadius: 4, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${((current + 1) / questions.length) * 100}%`,
          background: 'linear-gradient(90deg,#7C3AED,#06B6D4)',
          transition: 'width 0.4s',
        }} />
      </div>

      <div style={{ background: '#150D40', border: '1px solid #1E1450', borderRadius: 14, padding: 26, marginBottom: 20 }}>
        <p style={{ fontSize: 17, color: '#fff', lineHeight: 1.65, fontWeight: 500, margin: 0 }}>
          {q.question_text}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
        {q.options.map((opt) => {
          let borderColor = '#1E1450'
          let bg = 'transparent'
          let color = '#E2D9F3'

          if (answered) {
            if (opt.key === correctOption) {
              borderColor = '#22C55E'; bg = '#22C55E18'; color = '#22C55E'
            } else if (opt.key === selected) {
              borderColor = '#EF4444'; bg = '#EF444418'; color = '#EF4444'
            }
          } else if (selected === opt.key) {
            borderColor = '#7C3AED'; bg = '#7C3AED15'
          }

          return (
            <button
              key={opt.key}
              onClick={() => handleAnswer(opt.key)}
              disabled={answered}
              style={{
                background: bg, border: `1px solid ${borderColor}`, borderRadius: 10,
                padding: '14px 18px', textAlign: 'left', color, fontSize: 15,
                cursor: answered ? 'default' : 'pointer', transition: 'all 0.14s',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: borderColor === '#1E1450' ? '#7B6FA0' : borderColor, flexShrink: 0 }}>
                {opt.key.toUpperCase()}.
              </span>
              {opt.text}
            </button>
          )
        })}
      </div>

      {checkError && (
        <div style={{ background: '#EF444418', border: '1px solid #EF444433', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: '#EF4444' }}>
          Could not verify that answer. Your score may not reflect it — please check your connection and try the next question.
        </div>
      )}

      {answered && explanation && (
        <div style={{ background: '#7C3AED12', border: '1px solid #7C3AED33', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
            Explanation
          </div>
          <p style={{ fontSize: 14, color: '#E2D9F3', lineHeight: 1.6, margin: 0 }}>{explanation}</p>
        </div>
      )}

      {answered && !explanation && q.is_premium === false && (
        <div style={{ background: '#1E145080', border: '1px solid #1E1450', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: '#7B6FA0' }}>
          Upgrade to Premium to see detailed explanations for every question.
        </div>
      )}

      {answered && (
        <button
          onClick={next}
          disabled={loading}
          style={{
            width: '100%', background: 'linear-gradient(135deg,#7C3AED,#5B21B6)',
            border: 'none', color: '#fff', padding: 13, borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {current + 1 >= questions.length ? 'See results →' : 'Next question →'}
        </button>
      )}
    </div>
  )
}
