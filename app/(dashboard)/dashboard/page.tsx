'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Target, TrendingUp, Brain, BookOpen, ArrowRight, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { User, News, Opportunity } from '@/types'
import { levelProgress, badgeInfo } from '@/lib/gamification'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40', border: '#1E1450',
  accent: '#7C3AED', cyan: '#06B6D4', text: '#E2D9F3', muted: '#7B6FA0',
  white: '#FFFFFF', gold: '#F59E0B', green: '#22C55E', red: '#EF4444',
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [attempts, setAttempts] = useState<any[]>([])
  const [news, setNews] = useState<News[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }

      // Unverified accounts must confirm their email before using the app.
      const me = await fetch('/api/auth/me').then(r => r.json()).catch(() => null)
      if (me?.user && !me.user.email_verified) {
        router.replace(`/verify?email=${encodeURIComponent(me.user.email)}`)
        return
      }

      const [{ data: profile }, { data: recentAttempts }, { data: newsData }, { data: oppsData }] = await Promise.all([
        supabase.from('users').select('*').eq('id', authUser.id).single(),
        supabase.from('quiz_attempts').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('news').select('*').order('created_at', { ascending: false }).limit(4),
        supabase.from('opportunities').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(3),
      ])

      setUser(profile)
      setAttempts(recentAttempts || [])
      setNews(newsData || [])
      setOpportunities(oppsData || [])
      setLoading(false)
    }
    load()
  }, [])

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const avgScore = attempts.length
    ? Math.round(attempts.reduce((a, c) => a + (c.score / c.total) * 100, 0) / attempts.length)
    : 0

  const prog = levelProgress(user?.xp || 0)
  const badges = user?.badges || []

  const catColor: Record<string, string> = { JAMB: C.accent, WAEC: C.cyan, NECO: C.green, BECE: C.gold, general: C.muted }
  const typeColor: Record<string, string> = { scholarship: C.accent, competition: C.cyan, internship: C.gold }
  const tagColor: Record<string, string> = { open: C.green, 'closing soon': C.gold }

  const getDaysLeft = (deadline: string | null) => {
    if (!deadline) return null
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
    if (days < 0) return 'Closed'
    if (days === 0) return 'Today'
    if (days <= 7) return `${days}d left`
    return null
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontSize: 14, color: C.muted }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>

      {/* GREETING */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: C.white, marginBottom: 4 }}>
          {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Student'}
        </h2>
        <p style={{ color: C.muted, fontSize: 14 }}>
          {user?.streak ? `You're on a ${user.streak}-day streak. Keep it going.` : 'Welcome to ScholarX. Start your first quiz today.'}
        </p>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Level', value: `Lv ${prog.level}`, icon: <Trophy size={16} color={C.accent} />, color: C.accent },
          { label: 'Total XP', value: `${user?.xp || 0}`, icon: <Target size={16} color={C.cyan} />, color: C.cyan },
          { label: 'Quiz streak', value: `${user?.streak || 0} days`, icon: <Zap size={16} color={C.gold} />, color: C.gold },
          { label: 'Avg score', value: `${avgScore}%`, icon: <TrendingUp size={16} color={C.green} />, color: C.green },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              {icon}
              <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* LEVEL PROGRESS */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>
            {prog.next - prog.current} XP to Level {prog.level + 1}
          </span>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>{prog.pct}%</span>
        </div>
        <div style={{ height: 8, background: C.surface, borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ height: '100%', width: `${prog.pct}%`, background: `linear-gradient(90deg,${C.accent},${C.cyan})`, borderRadius: 6 }} />
        </div>
        {badges.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {badges.map(b => {
              const info = badgeInfo(b)
              return (
                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px' }} title={info.desc}>
                  <span style={{ fontSize: 15 }}>{info.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{info.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* QUICK ACTIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Start Quiz', desc: 'Reshuffled past questions', icon: <Target size={18} color={C.accent} />, href: '/quiz' },
          { label: 'Ask AI Tutor', desc: 'Get any topic explained', icon: <Brain size={18} color={C.cyan} />, href: '/ai-tutor' },
          { label: 'Browse Library', desc: 'Textbooks + study materials', icon: <BookOpen size={18} color={C.gold} />, href: '/library' },
        ].map(({ label, desc, icon, href }) => (
          <button key={label} onClick={() => router.push(href)}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + '55'}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            <div style={{ marginBottom: 10 }}>{icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{desc}</div>
          </button>
        ))}
      </div>

      {/* RECENT QUIZZES + NEWS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20, marginBottom: 24 }}>

        {/* Recent quizzes */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.white }}>Recent quizzes</h3>
            <button onClick={() => router.push('/quiz')} style={{ background: 'none', border: 'none', color: C.accent, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Start new</button>
          </div>
          {attempts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Target size={28} color={C.border} style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, color: C.muted }}>No quizzes yet. Start one now.</p>
              <button onClick={() => router.push('/quiz')} style={{ marginTop: 12, background: C.accent, border: 'none', color: '#fff', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Start quiz</button>
            </div>
          ) : attempts.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: i < attempts.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{a.subject}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{a.exam} · {a.total} questions</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: (a.score / a.total) >= 0.8 ? C.green : (a.score / a.total) >= 0.6 ? C.gold : C.red }}>
                {Math.round((a.score / a.total) * 100)}%
              </div>
            </div>
          ))}
        </div>

        {/* News */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.white }}>Latest news</h3>
            <span style={{ fontSize: 11, color: C.muted }}>JAMB · WAEC · NECO</span>
          </div>
          {news.length === 0 ? (
            <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '24px 0' }}>No news yet. Check back soon.</p>
          ) : news.map((n, i) => (
            <div key={n.id} style={{ padding: '11px 0', borderBottom: i < news.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: catColor[n.category] || C.accent, background: `${catColor[n.category] || C.accent}18`, padding: '2px 7px', borderRadius: 4 }}>{n.category?.toUpperCase()}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{new Date(n.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
              </div>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.5, margin: 0 }}>
                {n.source_url ? (
                  <a href={n.source_url} target="_blank" rel="noopener noreferrer" style={{ color: C.text, textDecoration: 'none' }}>{n.title}</a>
                ) : n.title}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* OPPORTUNITIES */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.white }}>Opportunities</h3>
          <span style={{ fontSize: 12, color: C.muted }}>Scholarships · Competitions · Internships</span>
        </div>
        {opportunities.length === 0 ? (
          <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '24px 0' }}>No opportunities yet. Check back soon.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
            {opportunities.map(o => {
              const daysLeft = getDaysLeft(o.deadline)
              return (
                <div key={o.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: typeColor[o.type], background: `${typeColor[o.type]}18`, padding: '2px 8px', borderRadius: 4, textTransform: 'capitalize' }}>{o.type}</span>
                    {daysLeft && <span style={{ fontSize: 11, color: tagColor[daysLeft.toLowerCase()] || C.muted, fontWeight: 600 }}>{daysLeft}</span>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 3, lineHeight: 1.4 }}>{o.title}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{o.org}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.cyan }}>{o.amount || 'See details'}</span>
                    {o.apply_url && (
                      <a href={o.apply_url} target="_blank" rel="noopener noreferrer"
                        style={{ background: C.accent, color: '#fff', padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                        Apply
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* AI SUGGESTION BANNER */}
      {attempts.length > 0 && avgScore < 70 && (
        <div style={{ background: `linear-gradient(135deg,${C.accent}18,${C.card})`, border: `1px solid ${C.accent}33`, borderRadius: 14, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Brain size={20} color={C.accent} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Your average score is {avgScore}%</div>
              <div style={{ fontSize: 13, color: C.muted }}>Let the AI Tutor help you understand your weak topics</div>
            </div>
          </div>
          <button onClick={() => router.push('/ai-tutor')}
            style={{ background: C.accent, border: 'none', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            Ask AI Tutor <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* UPGRADE BANNER for free users */}
      {!user?.is_premium && (
        <div style={{ marginTop: 20, background: `linear-gradient(135deg,${C.cyan}12,${C.card})`, border: `1px solid ${C.cyan}33`, borderRadius: 14, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Upgrade to Premium</div>
            <div style={{ fontSize: 13, color: C.muted }}>Unlimited AI Tutor, all past questions, create study groups — ₦5,000/yr</div>
          </div>
          <button onClick={() => router.push('/settings')}
            style={{ background: `linear-gradient(135deg,${C.cyan},${C.accent})`, border: 'none', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Upgrade now
          </button>
        </div>
      )}
    </div>
  )
}