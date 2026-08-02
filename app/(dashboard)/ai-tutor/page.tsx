'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Brain, Zap, Lock, Paperclip, X, FileText } from 'lucide-react'
import Logo from '@/components/Logo'

interface Attachment {
  name?: string
  mimeType: string
  data: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  attachments?: Attachment[]
  image?: { mimeType: string; data: string } | null
}

const SUGGESTIONS = [
  'Explain integration by parts',
  'What is osmosis?',
  'How to write a WAEC essay',
  'Solve quadratic equations',
  'Explain photoelectric effect',
  'What is the law of diminishing returns?',
]

const MAX_ATTACHMENTS = 2
const MAX_FILE_BYTES = 4 * 1024 * 1024
const ACCEPT = 'image/*,application/pdf'

const FOLLOW_UPS = ['Give me a practice question', 'Explain it more simply', 'Another example, please']

const formatTime = (iso?: string) => iso
  ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  : ''

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
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const readAsBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (fileInputRef.current) fileInputRef.current.value = ''

    for (const file of files) {
      if (attachments.length + 1 > MAX_ATTACHMENTS) { alert(`You can attach up to ${MAX_ATTACHMENTS} files`); break }
      const allowed = /^image\/(png|jpeg|jpg|webp|gif)$/.test(file.type) || file.type === 'application/pdf'
      if (!allowed) { alert('Only images and PDFs can be uploaded'); continue }
      if (file.size > MAX_FILE_BYTES) { alert('Each file must be under 4MB'); continue }
      try {
        const data = await readAsBase64(file)
        setAttachments(prev => [...prev, { name: file.name, mimeType: file.type, data }])
      } catch {
        alert('Could not read that file. Please try another one.')
      }
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const send = async (suggested?: string) => {
    const text = (suggested ?? input).trim()
    if ((!text && attachments.length === 0) || loading || limitReached) return

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      attachments: attachments.length ? attachments : undefined,
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setAttachments([])
    setLoading(true)

    try {
      const res = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
            image: m.image,
          })),
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

      if (data.reply || data.image) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply || '',
          image: data.image || null,
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
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Scholar</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block', animation: 'onlinePing 1.6s ease-in-out infinite' }} />
              <span style={{ fontSize: 12, color: '#7B6FA0' }}>Online · replies instantly</span>
            </div>
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
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Hey! I'm Scholar 👋</h3>
              <p style={{ fontSize: 14, color: '#7B6FA0', maxWidth: 420, lineHeight: 1.6 }}>
                Your personal AI tutor. Ask me anything — maths, science, essays, JAMB prep. Upload a photo or PDF and I'll read it for you, or ask me to draw/generate an image. I'm online 24/7!
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

        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, paddingLeft: 38 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9F8FCC', letterSpacing: 0.4, textTransform: 'uppercase' }}>Scholar</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', width: '100%' }}>
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
                  minWidth: 0,
                  boxShadow: msg.role === 'user' ? '0 4px 14px rgba(124,58,237,0.25)' : 'none',
                }}>
                  {msg.image?.data && (
                    <img
                      src={`data:${msg.image.mimeType || 'image/png'};base64,${msg.image.data}`}
                      alt="Generated"
                      style={{ display: 'block', maxWidth: '100%', maxHeight: 320, borderRadius: 10, marginBottom: msg.content ? 10 : 0 }}
                    />
                  )}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: msg.content ? 8 : 0 }}>
                      {msg.attachments.map((a, ai) => (
                        <div key={ai} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.1)', padding: '5px 9px', borderRadius: 6, maxWidth: 220 }}>
                          {a.mimeType.startsWith('image/') ? <Brain size={12} /> : <FileText size={12} />}
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name || (a.mimeType.startsWith('image/') ? 'Image' : 'PDF')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.content && (
                    <p style={{ fontSize: 14, color: '#E2D9F3', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </p>
                  )}
                </div>
              </div>
              {msg.timestamp && (
                <div style={{ fontSize: 11, color: '#5A4E80', marginTop: 4, paddingLeft: msg.role === 'user' ? 0 : 38, paddingRight: msg.role === 'user' ? 4 : 0 }}>
                  {formatTime(msg.timestamp)}
                </div>
              )}
              {msg.role === 'assistant' && isLast && !loading && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, paddingLeft: 38 }}>
                  {FOLLOW_UPS.map(f => (
                    <button key={f} onClick={() => send(f)}
                      style={{ padding: '6px 12px', background: '#150D40', border: '1px solid #7C3AED55', borderRadius: 16, fontSize: 12, color: '#C4B5FD', cursor: 'pointer', transition: 'all 0.2s' }}>
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, paddingLeft: 38 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9F8FCC', letterSpacing: 0.4, textTransform: 'uppercase' }}>Scholar is thinking</span>
            </div>
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

      {attachments.length > 0 && (
        <div style={{ padding: '10px 24px 0', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          {attachments.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#150D40', border: '1px solid #1E1450', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#E2D9F3', maxWidth: 200 }}>
              {a.mimeType.startsWith('image/') ? <Brain size={13} color="#7C3AED" /> : <FileText size={13} color="#7C3AED" />}
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name || (a.mimeType.startsWith('image/') ? 'Image' : 'PDF')}</span>
              <button onClick={() => removeAttachment(i)} style={{ background: 'none', border: 'none', color: '#7B6FA0', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '14px 24px 20px', borderTop: '1px solid #1E1450', display: 'flex', gap: 10, flexShrink: 0 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading || limitReached || attachments.length >= MAX_ATTACHMENTS}
          title="Upload image or PDF"
          style={{
            background: 'none', border: `1px solid ${loading || limitReached || attachments.length >= MAX_ATTACHMENTS ? '#1E1450' : '#1E1450'}`, color: '#7B6FA0',
            width: 44, height: 44, borderRadius: 10, cursor: loading || limitReached ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'flex-end',
          }}
        >
          <Paperclip size={16} />
        </button>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={limitReached}
          placeholder={limitReached ? 'Daily limit reached. Upgrade for unlimited access.' : 'Ask, upload a photo, or say "draw..."/"generate an image of..."'}
          rows={1}
          style={{
            flex: 1, background: '#150D40', border: '1px solid #1E1450', borderRadius: 10,
            padding: '12px 14px', color: '#E2D9F3', fontSize: 14, outline: 'none',
            resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
            opacity: limitReached ? 0.5 : 1,
          }}
        />
        <button
          onClick={() => send()}
          disabled={(!input.trim() && attachments.length === 0) || loading || limitReached}
          style={{
            background: (input.trim() || attachments.length > 0) && !loading && !limitReached ? 'linear-gradient(135deg,#7C3AED,#5B21B6)' : '#1E1450',
            border: 'none', color: '#fff', width: 44, height: 44, borderRadius: 10,
            cursor: (input.trim() || attachments.length > 0) && !loading && !limitReached ? 'pointer' : 'default',
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
        @keyframes onlinePing {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          50% { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
        }
      `}</style>
    </div>
  )
}