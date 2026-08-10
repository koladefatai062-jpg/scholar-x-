'use client'

import { useEffect, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40', border: '#1E1450',
  accent: '#7C3AED', cyan: '#06B6D4', text: '#E2D9F3', muted: '#7B6FA0',
  white: '#FFFFFF', red: '#EF4444', green: '#22C55E', gold: '#F59E0B',
}

const AUDIENCES = [
  { id: 'waitlist', label: 'Waitlist', desc: 'People who joined the waitlist but may not have accounts yet' },
  { id: 'users', label: 'All users', desc: 'Everyone with a ScholarX account' },
  { id: 'both', label: 'Everyone', desc: 'Waitlist + all registered users (deduplicated)' },
] as const

type Audience = (typeof AUDIENCES)[number]['id']

export default function AdminEmailsPage() {
  const [counts, setCounts] = useState<{ waitlist: number; users: number }>({ waitlist: 0, users: 0 })
  const [audience, setAudience] = useState<Audience>('waitlist')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number; total: number; failures?: string[] } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/broadcast')
      .then(r => r.json())
      .then(d => d.counts && setCounts(d.counts))
      .catch(() => {})
  }, [])

  const recipientCount = audience === 'waitlist' ? counts.waitlist : audience === 'users' ? counts.users : counts.waitlist + counts.users

  const doSend = async () => {
    setSending(true)
    setResult(null)
    setError('')
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience, subject, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setSending(false)
      setConfirming(false)
    }
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 760 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.white, marginBottom: 4 }}>Send email to everyone</h2>
        <p style={{ color: C.muted, fontSize: 14 }}>
          Broadcast one email to the waitlist and/or all users at once.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 8 }}>Who receives it?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {AUDIENCES.map(a => (
            <button key={a.id} onClick={() => { setAudience(a.id); setResult(null) }}
              style={{ textAlign: 'left', padding: '14px 16px', borderRadius: 10, border: `1px solid ${audience === a.id ? C.accent : C.border}`, background: audience === a.id ? `${C.accent}1E` : C.card, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: audience === a.id ? C.accent : C.text }}>{a.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, background: C.surface, padding: '3px 10px', borderRadius: 20, border: `1px solid ${C.border}` }}>
                  {a.id === 'waitlist' ? counts.waitlist : a.id === 'users' ? counts.users : counts.waitlist + counts.users} recipients
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{a.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 6, fontWeight: 600 }}>Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} placeholder="e.g. Big news from ScholarX 🎉"
            style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 6, fontWeight: 600 }}>Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={8} maxLength={10000}
            placeholder={'Write your message here.\n\nBlank lines become paragraph breaks.\n- Bullet points with "-" are fine as plain text.'}
            style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px 14px', color: C.text, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
      </div>

      {error && (
        <div style={{ background: `${C.red}18`, border: `1px solid ${C.red}44`, borderRadius: 9, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: C.red }}>{error}</div>
      )}

      {result && (
        <div style={{ background: result.failed > 0 ? `${C.gold}18` : `${C.green}18`, border: `1px solid ${result.failed > 0 ? `${C.gold}44` : `${C.green}44`}`, borderRadius: 9, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: result.failed > 0 ? C.gold : C.green }}>
          <b>Done.</b> Sent {result.sent} of {result.total}.
          {result.failed > 0 ? ` ${result.failed} failed. ${result.failures?.join('; ') || ''}` : result.sent === result.total ? ' All delivered.' : ' Nothing was actually sent — check server logs / Resend Logs.'}
        </div>
      )}

      <div style={{ fontSize: 12, color: C.gold, marginBottom: 14 }}>
        Note: Resend free plan = 100 emails/day, 2/sec. Sends are paced automatically. Also, the default
        <code style={{ background: C.surface, padding: '1px 5px', borderRadius: 4 }}> onboarding@resend.dev </code>
        sender only delivers to <b>your own</b> Resend account email — verify a domain (Settings → Domains) to reach real users, or upgrade.
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => setConfirming(true)} disabled={sending || !subject.trim() || !message.trim() || recipientCount === 0}
          style={{ flex: 1, background: sending || !subject.trim() || !message.trim() || recipientCount === 0 ? C.border : `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '13px', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: sending || !subject.trim() || !message.trim() || recipientCount === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {sending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send to {recipientCount} recipients</>}
        </button>
      </div>

      {confirming && !sending && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: C.white, marginBottom: 12 }}>Send this email?</h3>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
              You are about to email <b style={{ color: C.white }}>{recipientCount}</b> people{audience === 'both' ? ' (waitlist + users)' : audience === 'users' ? ' (all users)' : ' (waitlist)'} with subject{' '}
              <b style={{ color: C.white }}>"{subject}"</b>. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirming(false)} style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, color: C.text, padding: '11px', borderRadius: 9, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={doSend} style={{ flex: 1, background: C.accent, border: 'none', color: '#fff', padding: '11px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Yes, send it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
