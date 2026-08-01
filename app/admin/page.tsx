// FILE: app/admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Users, HelpCircle, BookOpen, CreditCard, TrendingUp, Zap } from 'lucide-react'

const C = { card:'#150D40', border:'#1E1450', accent:'#7C3AED', cyan:'#06B6D4', text:'#E2D9F3', muted:'#7B6FA0', white:'#FFFFFF', gold:'#F59E0B', green:'#22C55E' }

export default function AdminOverview() {
  const [stats, setStats] = useState<{
    totalUsers: number
    premiumUsers: number
    totalQuestions: number
    libraryItems: number
    totalRevenue: number
    activeGroups: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => { setStats(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const cards = stats ? [
    { label: 'Total users', value: stats.totalUsers, icon: <Users size={20} color={C.accent} />, color: C.accent },
    { label: 'Premium users', value: stats.premiumUsers, icon: <Zap size={20} color={C.gold} />, color: C.gold },
    { label: 'Total questions', value: stats.totalQuestions, icon: <HelpCircle size={20} color={C.cyan} />, color: C.cyan },
    { label: 'Library items', value: stats.libraryItems, icon: <BookOpen size={20} color={C.green} />, color: C.green },
    { label: 'Total revenue', value: `₦${((stats.totalRevenue || 0) / 100).toLocaleString()}`, icon: <CreditCard size={20} color={C.gold} />, color: C.gold },
    { label: 'Active groups', value: stats.activeGroups, icon: <TrendingUp size={20} color={C.accent} />, color: C.accent },
  ] : []

  return (
    <div style={{ padding: '24px 28px' }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: C.white, marginBottom: 6 }}>Overview</h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 28 }}>ScholarX platform stats at a glance.</p>
      {loading ? <div style={{ color: C.muted }}>Loading stats...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
          {cards.map(({ label, value, icon, color }) => (
            <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ marginBottom: 12 }}>{icon}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
