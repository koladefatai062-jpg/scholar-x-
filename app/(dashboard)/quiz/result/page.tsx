'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Eye, Check, X, Sparkles } from 'lucide-react'
import { badgeInfo } from '@/lib/gamification'

interface ReviewItem {
  question_text: string
  options: { key: string; text: string }[]
  selected: string | null
  correct: string
  explanation: string | null
  is_correct: boolean
}

interface Gamification {
  xp_gained: number
  xp: number
  level: number
  streak: number
  badges: string[]
  new_badges: string[]
}

export default function QuizResultPage() {
  const router = useRouter()
  const [result, setResult] = useState<{ exam: string; subject: string; score: number; total: number; time_spent: number } | null>(null)
  const [review, setReview] = useState<ReviewItem[]>([])
  const [showReview, setShowReview] = useState(false)
  const [aiExplanations, setAiExplanations] = useState<string[] | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainError, setExplainError] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [gamification, setGamification] = useState<Gamification | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('quiz_result')
    if (!stored) {
      router.push('/quiz')
      return
    }
    setResult(JSON.parse(stored))

    const storedReview = sessionStorage.getItem('quiz_review')
    if (storedReview) setReview(JSON.parse(storedReview))

    const storedGam = sessionStorage.getItem('quiz_gamification')
    if (storedGam) setGamification(JSON.parse(storedGam))
  }, [])

  const generateExplanations = async () => {
    setExplainLoading(true)
    setExplainError(null)
    try {
      const res = await fetch('/api/quiz/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: review }),
      })
      const data = await res.json()
      if (data.explanations) {
        setAiExplanations(data.explanations)
        setIsPremium(!!data.is_premium)
        setShowReview(true)
      } else {
        setExplainError(data.error || 'Failed to generate explanations. Please try again.')
      }
    } catch {
      setExplainError('Something went wrong. Please try again.')
    }
    setExplainLoading(false)
  }

  if (!result) return null

  const newBadges = gamification?.new_badges || []

  const percentage = Math.round((result.score / result.total) * 100)
  const color = percentage === 100 ? '#06B6D4' : percentage >= 60 ? '#22C55E' : '#F59E0B'

  const retry = () => {
    sessionStorage.removeItem('quiz_questions')
    sessionStorage.removeItem('quiz_meta')
    sessionStorage.removeItem('quiz_result')
    sessionStorage.removeItem('quiz_review')
    sessionStorage.removeItem('quiz_gamification')
    router.push('/quiz')
  }

  return (
    <div style={{ padding: '24px 28px', paddingTop: 60, maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
        <Trophy size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Quiz complete</h2>
        <p style={{ color: '#7B6FA0', marginBottom: 8, fontSize: 15 }}>
          {result.exam} · {result.subject}
        </p>
        <p style={{ color: '#7B6FA0', marginBottom: 20, fontSize: 15 }}>
          You got {result.score} out of {result.total} correct.
        </p>
        <div style={{ fontSize: 56, fontWeight: 900, color, marginBottom: 12 }}>{percentage}%</div>
        <div style={{ fontSize: 13, color: '#7B6FA0', marginBottom: 16 }}>
          Time taken: {Math.floor(result.time_spent / 60)}m {result.time_spent % 60}s
        </div>
        {gamification && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ background: '#150D40', border: '1px solid #1E1450', borderRadius: 10, padding: '10px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#06B6D4' }}>+{gamification.xp_gained} XP</div>
              <div style={{ fontSize: 11, color: '#7B6FA0' }}>Total {gamification.xp} · Level {gamification.level}</div>
            </div>
            <div style={{ background: '#150D40', border: '1px solid #1E1450', borderRadius: 10, padding: '10px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#F59E0B' }}>🔥 {gamification.streak}d</div>
              <div style={{ fontSize: 11, color: '#7B6FA0' }}>Streak</div>
            </div>
          </div>
        )}
        {newBadges.length > 0 && (
          <div style={{ background: '#7C3AED18', border: '1px solid #7C3AED44', borderRadius: 12, padding: '14px 20px', marginBottom: 24, maxWidth: 420 }}>
            <div style={{ fontSize: 12, color: '#A78BFA', fontWeight: 700, marginBottom: 10, textAlign: 'center' }}>🎉 NEW BADGE{newBadges.length > 1 ? 'S' : ''} EARNED</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              {newBadges.map(b => (
                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#150D40', border: '1px solid #7C3AED44', borderRadius: 10, padding: '8px 14px' }}>
                  <span style={{ fontSize: 22 }}>{badgeInfo(b).emoji}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{badgeInfo(b).label}</div>
                    <div style={{ fontSize: 11, color: '#7B6FA0' }}>{badgeInfo(b).desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {review.length > 0 && (
            <>
              <button
                onClick={() => setShowReview(s => !s)}
                style={{
                  background: 'transparent', border: '1px solid #1E1450', color: '#E2D9F3',
                  padding: '12px 24px', borderRadius: 9, fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}
              >
                <Eye size={15} />{showReview ? 'Hide review' : 'Review answers'}
              </button>
              <button
                onClick={generateExplanations}
                disabled={explainLoading}
                style={{
                  background: 'linear-gradient(135deg,#06B6D4,#7C3AED)', border: 'none', color: '#fff',
                  padding: '12px 24px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: explainLoading ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}
              >
                <Sparkles size={15} />{explainLoading ? 'Explaining...' : aiExplanations ? 'Regenerate explanations' : 'Explain with AI'}
              </button>
            </>
          )}
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

      {explainError && (
        <div style={{ background: '#150D40', border: '1px solid #EF444444', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#EF4444' }}>
          {explainError}
        </div>
      )}

      {aiExplanations && (
        <div style={{ background: '#110836', border: '1px solid #06B6D433', borderRadius: 14, padding: 18, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Sparkles size={16} color="#06B6D4" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>AI Explanations</span>
          </div>
          <div style={{ fontSize: 12, color: '#7B6FA0', marginBottom: 4 }}>
            {isPremium
              ? 'Premium depth — full step-by-step breakdowns for every question.'
              : 'Brief explanations. Upgrade to Premium for deep, step-by-step breakdowns.'}
          </div>
          {!isPremium && (
            <button onClick={() => router.push('/settings')}
              style={{ background: 'none', border: 'none', color: '#F59E0B', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 8 }}>
              Upgrade to Premium ⚡
            </button>
          )}
        </div>
      )}

      {showReview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {review.map((item, i) => (
            <div key={i} style={{ background: '#150D40', border: `1px solid ${item.is_correct ? '#22C55E44' : '#EF444444'}`, borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#7B6FA0' }}>Q{i + 1}</span>
                {item.is_correct
                  ? <span style={{ fontSize: 12, fontWeight: 700, color: '#22C55E', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={13} />Correct</span>
                  : <span style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4 }}><X size={13} />Wrong</span>}
              </div>
              <p style={{ fontSize: 14, color: '#fff', lineHeight: 1.6, marginBottom: 12 }}>{item.question_text}</p>
              <div style={{ fontSize: 13, color: '#7B6FA0', marginBottom: 4 }}>
                Your answer: <span style={{ color: item.is_correct ? '#22C55E' : '#EF4444', fontWeight: 600 }}>
                  {item.selected ? `${item.selected.toUpperCase()}. ${item.options.find(o => o.key === item.selected)?.text || ''}` : 'Skipped'}
                </span>
              </div>
              {!item.is_correct && (
                <div style={{ fontSize: 13, color: '#7B6FA0', marginBottom: 4 }}>
                  Correct answer: <span style={{ color: '#22C55E', fontWeight: 600 }}>
                    {item.correct.toUpperCase()}. {item.options.find(o => o.key === item.correct)?.text || ''}
                  </span>
                </div>
              )}
              {item.explanation && (
                <div style={{ marginTop: 10, background: '#06B6D412', border: '1px solid #06B6D422', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#06B6D4', fontWeight: 700, marginBottom: 4 }}>EXPLANATION</div>
                  <p style={{ fontSize: 13, color: '#E2D9F3', lineHeight: 1.6, margin: 0 }}>{item.explanation}</p>
                </div>
              )}
              {aiExplanations && aiExplanations[i] && (
                <div style={{ marginTop: 10, background: '#7C3AED18', border: '1px solid #7C3AED33', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#A78BFA', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Sparkles size={12} />AI EXPLANATION {!isPremium && <span style={{ fontWeight: 500, color: '#7B6FA0' }}>(brief — upgrade for deep breakdown)</span>}
                  </div>
                  <p style={{ fontSize: 13, color: '#E2D9F3', lineHeight: 1.6, margin: 0 }}>{aiExplanations[i]}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
