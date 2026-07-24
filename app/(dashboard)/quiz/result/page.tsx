'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy } from 'lucide-react'

export default function QuizResultPage() {
  const router = useRouter()
  const [result, setResult] = useState<{ exam: string; subject: string; score: number; total: number; time_spent: number } | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('quiz_result')
    if (!stored) {
      router.push('/quiz')
      return
    }
    setResult(JSON.parse(stored))
  }, [])

  if (!result) return null

  const percentage = Math.round((result.score / result.total) * 100)
  const color = percentage === 100 ? '#06B6D4' : percentage >= 60 ? '#22C55E' : '#F59E0B'

  const retry = () => {
    sessionStorage.removeItem('quiz_questions')
    sessionStorage.removeItem('quiz_meta')
    sessionStorage.removeItem('quiz_result')
    router.push('/quiz')
  }

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}>
      <Trophy size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
      <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Quiz complete</h2>
      <p style={{ color: '#7B6FA0', marginBottom: 8, fontSize: 15 }}>
        {result.exam} · {result.subject}
      </p>
      <p style={{ color: '#7B6FA0', marginBottom: 20, fontSize: 15 }}>
        You got {result.score} out of {result.total} correct.
      </p>
      <div style={{ fontSize: 56, fontWeight: 900, color, marginBottom: 12 }}>{percentage}%</div>
      <div style={{ fontSize: 13, color: '#7B6FA0', marginBottom: 28 }}>
        Time taken: {Math.floor(result.time_spent / 60)}m {result.time_spent % 60}s
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={retry}
          style={{
            background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', border: 'none', color: '#fff',
            padding: '12px 24px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'transparent', border: '1px solid #1E1450', color: '#E2D9F3',
            padding: '12px 24px', borderRadius: 9, fontSize: 14, cursor: 'pointer',
          }}
        >
          Dashboard
        </button>
      </div>
    </div>
  )
}
