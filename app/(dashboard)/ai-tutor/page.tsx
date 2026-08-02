'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Brain, Zap, Lock } from 'lucide-react'
import Logo from '@/components/Logo'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

const SUGGESTIONS = [
  'Explain integration by parts',
  'What is osmosis?',
  'How to write a WAEC essay',
  'Solve quadratic equations',
  'Explain photoelectric effect',
  'What is the law of diminishing returns?',
]

export default function AITutorPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    initConversation()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const initConversation = async () => {
    try {
      const res = await fetch('/api/ai-tutor')
      const data = await res.json()
      if (!res.ok) {
        console.error('AI tutor init failed:', data?.error || 'Unknown error')
      } else if (data.conversation) {
        setConversationId(data.conversation.id)
        setMessages(data.conversation.messages || [])
      }
      setRemaining(data.remaining)
      setIsPremium(data.is_premium)
      if (data.remaining === 0) setLimitReached(true)
    } catch (err) {
      console.error('Failed to init conversation:', err)
    }
    setInitializing(false)
  }

  const send = async () => {
    if (!input.trim() || loading || limitReached) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          conversation_id: conversationId,
        }),
      })

      let data: any = {}
      try {
        data = await res.json()
      } catch {
        data = { error: 'The AI tutor is temporarily unavailable.' }
      }

      if (res.status === 429) {
        setLimitReached(true)
        setRemaining(0)
        setLoading(false)
        return
      }

      if (!res.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data?.error || 'The AI tutor is temporarily unavailable.',
        }])
        setLoading(false)
        return
      }

      if (data.reply) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toISOString(),
        }])
        if (data.remaining !== null) setRemaining(data.remaining)
        if (data.remaining === 0) setLimitReached(true)
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'The AI tutor is temporarily unavailable. Please try again in a moment.',
      }])
    }

    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  if (initializing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#7B6FA0', fontSize: 14 }}>
        Loading AI Tutor...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'calc(100dvh - 140px)' : 'calc(100dvh - 60px)' }}>

      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #1E1450', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={36} radius={10} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>ScholarX AI Tutor</div>
            <div style={{ fontSize: 12, color: '#7B6FA0' }}>Powered by Google Gemini</div>
          </div>
        </div>

        {!isPremium && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#150D40', border: '1px solid #1E1450', borderRadius: 8, padding: '6px 12px' }}>
            <Zap size={13} color={remaining === 0 ? '#EF4444' : '#F59E0B'} />
            <span style={{ fontSize: 12, color: remaining === 0 ? '#EF4444' : '#7B6FA0', fontWeight: 600 }}>
              {remaining === 0 ? 'Limit reached' : `${remaining} left today`}
            </span>
          </div>
        )}
        {isPremium && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#7C3AED18', border: '1px solid #7C3AED33', borderRadius: 8, padding: '6px 12px' }}>
            <Zap size={13} color="#7C3AED" />
            <span style={{ fontSize: 12, color: '#7C3AED', fontWeight: 600 }}>Premium · Unlimited</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40, gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#7C3AED,#06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={26} color="#fff" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Your AI Tutor is ready</h3>
              <p style={{ fontSize: 14, color: '#7B6FA0', maxWidth: 380, lineHeight: 1.6 }}>
                Ask me anything — maths, science, essays, JAMB prep. I'll explain it properly, step by step.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  style={{ padding: '8px 14px', background: '#150D40', border: '1px solid #1E1450', borderRadius: 20, fontSize: 13, color: '#7B6FA0', cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#7C3AED,#06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0, marginTop: 2 }}>
                <Brain size={13} color="#fff" />
              </div>
            )}
            <div style={{
              maxWidth: '72%',
              background: msg.role === 'user' ? 'linear-gradient(135deg,#7C3AED,#5B21B6)' : '#150D40',
              border: msg.role === 'user' ? 'none' : '1px solid #1E1450',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              padding: '12px 16px',
            }}>
              <p style={{ fontSize: 14, color: '#E2D9F3', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#7C3AED,#06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Brain size={13} color="#fff" />
            </div>
            <div style={{ background: '#150D40', border: '1px solid #1E1450', borderRadius: '14px 14px 14px 4px', padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#7C3AED', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {limitReached && !isPremium && (
        <div style={{ margin: '0 24px 12px', background: '#EF444418', border: '1px solid #EF444433', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={15} color="#EF4444" />
            <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 600 }}>
              You've used all 10 free messages today. Resets at midnight.
            </span>
          </div>
          <button style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', border: 'none', color: '#fff', padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Upgrade ₦5k/yr
          </button>
        </div>
      )}

      <div style={{ padding: '14px 24px 20px', borderTop: '1px solid #1E1450', display: 'flex', gap: 10, flexShrink: 0 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={limitReached}
          placeholder={limitReached ? 'Daily limit reached. Upgrade for unlimited access.' : 'Ask anything — maths, science, essays, exam prep...'}
          rows={1}
          style={{
            flex: 1, background: '#150D40', border: '1px solid #1E1450', borderRadius: 10,
            padding: '12px 14px', color: '#E2D9F3', fontSize: 14, outline: 'none',
            resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
            opacity: limitReached ? 0.5 : 1,
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading || limitReached}
          style={{
            background: input.trim() && !loading && !limitReached ? 'linear-gradient(135deg,#7C3AED,#5B21B6)' : '#1E1450',
            border: 'none', color: '#fff', width: 44, height: 44, borderRadius: 10,
            cursor: input.trim() && !loading && !limitReached ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'flex-end',
          }}
        >
          <Send size={16} />
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}