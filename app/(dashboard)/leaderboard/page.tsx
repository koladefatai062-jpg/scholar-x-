'use client'

import { useState, useEffect } from 'react'
import { Trophy, Flame, Star, Crown, Medal } from 'lucide-react'
import Avatar from '@/components/Avatar'
import { levelForXp, badgeInfo } from '@/lib/gamification'
import type { User } from '@/types'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40',
  border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4',
  text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF',
  gold: '#F59E0B', green: '#22C55E', red: '#EF4444',
}

interface Entry {
  id: string
  full_name: string | null
  avatar_url: string | null
  xp: number | null
  streak: number
  badges: string[]
  is_premium: boolean
  game_level: number
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [authRes, res] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/leaderboard'),
        ])
        const auth = await authRes.json()
        setMyId(auth.user?.id || null)
        const data = await res.json()
        setEntries(data.entries || [])
        setMyRank(data.my_rank)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={18} color={C.gold} />
    if (rank === 2) return <Medal size={18} color="#A8A8B8" />
    if (rank === 3) return <Medal size={18} color="#C67B3C" />
    return null
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontSize: 14, color: C.muted }}>Loading leaderboard...</div>
    </div>
  )

  return (
    <div style={{ padding: '24px 28px', maxWidth: 760 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: C.white, marginBottom: 4 }}>Leaderboard 🏆</h2>
        <p style={{ color: C.muted, fontSize: 14 }}>Top students by XP. Answer quiz questions correctly to climb the ranks.</p>
      </div>

      {myRank !== null && (
        <div style={{ background: `linear-gradient(135deg,${C.accent}22,${C.card})`, border: `1px solid ${C.accent}44`, borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Trophy size={20} color={C.gold} />
          <span style={{ fontSize: 14, color: C.text }}>
            You're ranked <strong style={{ color: C.white }}>#{myRank}</strong> in Nigeria
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>
            <Trophy size={36} color={C.border} style={{ marginBottom: 10 }} />
            <p>No XP yet. Take a quiz to earn your first points!</p>
          </div>
        )}
        {entries.map((e, i) => {
          const rank = i + 1
          const isMe = e.id === myId
          return (
            <div key={e.id} style={{ background: isMe ? `${C.accent}1E` : C.card, border: `1px solid ${isMe ? C.accent + '55' : C.border}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, textAlign: 'center', flexShrink: 0, fontSize: 14, fontWeight: 800, color: rank <= 3 ? C.gold : C.muted }}>
                {rankIcon(rank) || rank}
              </div>
              <Avatar name={e.full_name} avatarUrl={e.avatar_url} size={36} fontSize={13} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.white, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.full_name || 'Student'}
                  {e.is_premium && <span style={{ fontSize: 10, padding: '2px 6px', background: `${C.accent}22`, borderRadius: 4, color: C.accent, fontWeight: 700 }}>⚡ PRO</span>}
                  {isMe && <span style={{ fontSize: 10, padding: '2px 6px', background: `${C.green}22`, borderRadius: 4, color: C.green, fontWeight: 700 }}>YOU</span>}
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  Level {e.game_level} {e.streak > 0 && <span style={{ color: C.gold }}>· 🔥 {e.streak}d</span>}
                  {e.badges?.length > 0 && <span style={{ color: C.muted }}> · {e.badges.slice(0, 3).map(b => badgeInfo(b).emoji).join('')}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.cyan }}>{e.xp || 0}</div>
                <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', fontWeight: 600 }}>XP</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
