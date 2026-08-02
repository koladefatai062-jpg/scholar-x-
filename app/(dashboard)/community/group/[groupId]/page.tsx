'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Send, ArrowLeft, Users, Paperclip, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Avatar from '@/components/Avatar'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40',
  border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4',
  text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF',
  gold: '#F59E0B', green: '#22C55E', red: '#EF4444',
}

interface Message {
  id: string
  user_id: string
  content: string | null
  file_url: string | null
  file_name: string | null
  file_type: string | null
  created_at: string
  users: { full_name: string; is_premium: boolean; avatar_url: string | null }
}

interface Group {
  id: string
  name: string
  subject: string | null
  member_count: number
}

export default function GroupChatPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.groupId as string
  const supabase = createClient()

  const [group, setGroup] = useState<Group | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dailyUploads, setDailyUploads] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { init() }, [groupId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel(`group-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, () => fetchMessages())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [groupId])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUserId(user.id)

    const { data: profile } = await supabase.from('users').select('is_premium').eq('id', user.id).single()
    setIsPremium(profile?.is_premium || false)

    const { data: membership } = await supabase.from('group_members').select('id').eq('user_id', user.id).eq('group_id', groupId).single()
    if (!membership) { router.push('/community'); return }

    const { data: groupData } = await supabase.from('groups').select('*').eq('id', groupId).single()
    setGroup(groupData)

    const today = new Date().toISOString().split('T')[0]
    const { data: uploads } = await supabase.from('group_file_uploads').select('count').eq('user_id', user.id).eq('date', today).single()
    setDailyUploads(uploads?.count || 0)

    fetchMessages()
  }

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('group_messages')
      .select('*, users(full_name, is_premium, avatar_url)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(50)
    setMessages(data || [])
  }

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    await supabase.from('group_messages').insert({ group_id: groupId, user_id: currentUserId, content: input.trim() })
    setInput('')
    fetchMessages()
    setSending(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!isPremium && dailyUploads >= 1) { alert('Free users can only upload 1 file per day. Upgrade to Premium.'); return }
    const maxSize = isPremium ? 20 * 1024 * 1024 : 5 * 1024 * 1024
    if (file.size > maxSize) { alert(`File too large. Max ${isPremium ? '20MB' : '5MB'}`); return }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) { alert('Only PDF and images allowed'); return }

    setUploading(true)
    try {
      const fileName = `${groupId}/${Date.now()}.${file.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('group-files').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('group-files').getPublicUrl(fileName)
      await supabase.from('group_messages').insert({ group_id: groupId, user_id: currentUserId, content: null, file_url: publicUrl, file_name: file.name, file_type: file.type.startsWith('image') ? 'image' : 'pdf' })
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('group_file_uploads').upsert({ user_id: currentUserId, date: today, count: dailyUploads + 1 }, { onConflict: 'user_id,date' })
      setDailyUploads(prev => prev + 1)
      fetchMessages()
    } catch (err: any) { alert('Upload failed: ' + err.message) }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const timeStr = (date: string) => new Date(date).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'calc(100dvh - 140px)' : 'calc(100dvh - 60px)' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: C.surface }}>
        <button onClick={() => router.push('/community')} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.accent}44,${C.cyan}33)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Users size={16} color={C.accent} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>{group?.name || 'Loading...'}</div>
          <div style={{ fontSize: 12, color: C.muted }}>{group?.member_count || 0} members{group?.subject ? ` · ${group.subject}` : ''}</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted }}>
            <Users size={36} color={C.border} style={{ marginBottom: 10 }} />
            <p style={{ fontSize: 14 }}>No messages yet. Say hello! 👋</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.user_id === currentUserId
          const showName = i === 0 || messages[i - 1].user_id !== msg.user_id
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
              {showName && !isOwn && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 4 }}>
                  <Avatar name={msg.users?.full_name} avatarUrl={msg.users?.avatar_url} size={22} fontSize={10} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>{msg.users?.full_name || 'Student'}</span>
                  {msg.users?.is_premium && <span style={{ fontSize: 9, padding: '1px 5px', background: `${C.accent}22`, borderRadius: 3, color: C.accent, fontWeight: 700 }}>PRO</span>}
                </div>
              )}
              <div style={{ maxWidth: isMobile ? '80%' : '65%', background: isOwn ? `linear-gradient(135deg,${C.accent},#5B21B6)` : C.card, border: isOwn ? 'none' : `1px solid ${C.border}`, borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '10px 14px' }}>
                {msg.content && <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, margin: 0 }}>{msg.content}</p>}
                {msg.file_url && msg.file_type === 'image' && <img src={msg.file_url} alt={msg.file_name || 'image'} style={{ maxWidth: '100%', borderRadius: 8, display: 'block' }} />}
                {msg.file_url && msg.file_type === 'pdf' && (
                  <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.cyan, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                    📄 {msg.file_name || 'View PDF'}
                  </a>
                )}
                <div style={{ fontSize: 10, color: isOwn ? 'rgba(255,255,255,0.6)' : C.muted, marginTop: 4, textAlign: 'right' }}>{timeStr(msg.created_at)}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {!isPremium && dailyUploads >= 1 && (
        <div style={{ margin: '0 20px 8px', background: `${C.gold}18`, border: `1px solid ${C.gold}33`, borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Lock size={13} color={C.gold} />
          <span style={{ fontSize: 12, color: C.gold }}>Daily file limit reached. Upgrade for unlimited uploads.</span>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 20px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
        <input ref={fileRef} type="file" accept=".pdf,image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading || (!isPremium && dailyUploads >= 1)}
          style={{ background: 'none', border: `1px solid ${C.border}`, color: (!isPremium && dailyUploads >= 1) ? C.border : C.muted, width: 40, height: 40, borderRadius: 10, cursor: (!isPremium && dailyUploads >= 1) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Paperclip size={16} />
        </button>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." rows={1}
          style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
        <button onClick={sendMessage} disabled={!input.trim() || sending}
          style={{ background: input.trim() ? `linear-gradient(135deg,${C.accent},#5B21B6)` : C.border, border: 'none', color: '#fff', width: 40, height: 40, borderRadius: 10, cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}