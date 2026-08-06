'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Send, ArrowLeft, Users, Paperclip, Lock, MoreVertical, Reply, Copy, Pencil, Trash2, Forward, Check, CheckCheck, X, UserMinus, Shield, Info, Edit3 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Avatar from '@/components/Avatar'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40',
  border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4',
  text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF',
  gold: '#F59E0B', green: '#22C55E', red: '#EF4444',
}

const MSG_SELECT = `*, users (full_name, is_premium, avatar_url), reply:reply_to_id (id, content, file_url, file_name, file_type, user_id, users (full_name))`

interface Member {
  id: string
  role: string
  users: { id: string; full_name: string; email: string; avatar_url: string | null; is_premium: boolean }
}

interface Message {
  id: string
  user_id: string
  content: string | null
  file_url: string | null
  file_name: string | null
  file_type: string | null
  file_size: number | null
  reply_to_id: string | null
  edited_at: string | null
  deleted_at: string | null
  read_count: number
  created_at: string
  users: { full_name: string; is_premium: boolean; avatar_url: string | null }
  reply?: { id: string; user_id: string; content: string | null; file_url: string | null; file_name: string | null; file_type: string | null; users: { full_name: string } } | null
}

interface Group {
  id: string
  name: string
  subject: string | null
  description: string | null
  member_count: number
}

export default function GroupChatPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.groupId as string
  const supabase = createClient()

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [myRole, setMyRole] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dailyUploads, setDailyUploads] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [typingIds, setTypingIds] = useState<Set<string>>(new Set())
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editing, setEditing] = useState<Message | null>(null)
  const [editText, setEditText] = useState('')
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [actionMsg, setActionMsg] = useState<Message | null>(null)
  const [groupForm, setGroupForm] = useState({ name: '', subject: '', description: '' })
  const [savingGroup, setSavingGroup] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const markReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { init() }, [groupId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    if (messages.length) scheduleMarkRead()
  }, [messages.length, groupId])

  // Realtime: messages, presence, typing
  useEffect(() => {
    const channel = supabase
      .channel(`group-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, async (payload) => {
        const row = payload.new as any
        if (row.user_id === currentUserId) return
        const { data } = await supabase.from('group_messages').select(MSG_SELECT).eq('id', row.id).single()
        if (data) setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data])
        scheduleMarkRead()
        refreshGroupInfo()
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        const row = payload.new as any
        setMessages(prev => prev.map(m => m.id === row.id ? { ...m, content: row.content, edited_at: row.edited_at, deleted_at: row.deleted_at, read_count: row.read_count } : m))
      })
      .on('presence', { event: 'sync' }, () => {
        const present = channel.presenceState<{ user_id: string }>()
        const ids = new Set(Object.values(present).map(p => p[0]?.user_id).filter(Boolean))
        setOnlineIds(ids)
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload || payload.user_id === currentUserId) return
        setTypingIds(prev => {
          const next = new Set(prev)
          if (payload.typing) next.add(payload.user_id)
          else next.delete(payload.user_id)
          return next
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentUserId) {
          await channel.track({ user_id: currentUserId })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [groupId, currentUserId])

  const refreshGroupInfo = useCallback(async () => {
    const { data } = await supabase.from('groups').select('*').eq('id', groupId).single()
    if (data) setGroup(data)
  }, [groupId])

  const scheduleMarkRead = () => {
    if (markReadTimer.current) clearTimeout(markReadTimer.current)
    markReadTimer.current = setTimeout(() => {
      supabase.rpc('mark_group_messages_read', { p_group_id: groupId }).then(() => {})
    }, 600)
  }

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUserId(user.id)

    const { data: profile } = await supabase.from('users').select('is_premium').eq('id', user.id).single()
    setIsPremium(profile?.is_premium || false)

    const { data: membership } = await supabase.from('group_members').select('id, role').eq('user_id', user.id).eq('group_id', groupId).single()
    if (!membership) { router.push('/community'); return }
    setMyRole(membership.role)

    await Promise.all([refreshGroupInfo(), fetchMembers(), fetchMessages(true)])

    const today = new Date().toISOString().split('T')[0]
    const { data: uploads } = await supabase.from('group_file_uploads').select('count').eq('user_id', user.id).eq('date', today).single()
    setDailyUploads(uploads?.count || 0)
  }

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('group_members')
      .select(`id, role, users (id, full_name, email, avatar_url, is_premium)`)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
    const mapped: Member[] = (data ?? []).map((m: any) => ({
      id: m.id,
      role: m.role,
      users: Array.isArray(m.users) ? m.users[0] : m.users,
    }))
    setMembers(mapped)
  }

  const fetchMessages = async (reset = false) => {
    const before = reset ? undefined : (messages[0]?.created_at)
    if (!reset) setLoadingMore(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (before) params.set('before', before)
      const res = await fetch(`/api/community/groups/${groupId}/messages?${params}`)
      const data = await res.json()
      if (data.messages) {
        setMessages(prev => reset ? data.messages : [...data.messages, ...prev])
        setHasMore(data.has_more || false)
      }
    } catch {}
    setLoadingMore(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || sending || !currentUserId) return
    setSending(true)
    try {
      await fetch(`/api/community/groups/${groupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.trim(), reply_to_id: replyTo?.id || null }),
      })
      setInput('')
      setReplyTo(null)
      broadcastTyping(false)
      fetchMessages(true)
      refreshGroupInfo()
    } catch {}
    setSending(false)
  }

  const broadcastTyping = (typing: boolean) => {
    supabase.channel(`group-${groupId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: currentUserId, typing },
    })
  }

  const handleTyping = (v: string) => {
    setInput(v)
    if (!typingTimer.current) broadcastTyping(true)
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => { broadcastTyping(false); typingTimer.current = null }, 1600)
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
      await fetch(`/api/community/groups/${groupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: publicUrl, file_name: file.name,
          file_type: file.type.startsWith('image') ? 'image' : 'pdf',
          file_size: file.size, reply_to_id: replyTo?.id || null,
        }),
      })
      setReplyTo(null)
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('group_file_uploads').upsert({ user_id: currentUserId, date: today, count: dailyUploads + 1 }, { onConflict: 'user_id,date' })
      setDailyUploads(prev => prev + 1)
      fetchMessages(true)
    } catch (err: any) { alert('Upload failed: ' + err.message) }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const editMessage = async () => {
    if (!editing || !editText.trim()) return
    await fetch(`/api/community/groups/${groupId}/messages/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editText.trim() }),
    })
    setEditing(null)
    setEditText('')
  }

  const deleteMessage = async (msg: Message) => {
    if (!confirm('Delete this message for everyone?')) return
    await fetch(`/api/community/groups/${groupId}/messages/${msg.id}`, { method: 'DELETE' })
    setActionMsg(null)
  }

  const copyMessage = async (msg: Message) => {
    if (msg.content) { try { await navigator.clipboard.writeText(msg.content) } catch {} }
    setActionMsg(null)
  }

  const forwardSend = async (targetGroupId: string) => {
    if (!forwardMsg) return
    await fetch(`/api/community/groups/${targetGroupId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: forwardMsg.content,
        file_url: forwardMsg.file_url,
        file_name: forwardMsg.file_name,
        file_type: forwardMsg.file_type,
        file_size: forwardMsg.file_size ?? null,
      }),
    })
    setForwardMsg(null)
  }

  const updateGroup = async () => {
    if (!groupForm.name.trim()) return
    setSavingGroup(true)
    await fetch(`/api/community/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(groupForm),
    })
    await refreshGroupInfo()
    setSavingGroup(false)
  }

  const removeMember = async (userId: string) => {
    if (!confirm('Remove this member?')) return
    await fetch(`/api/community/groups/${groupId}/members/${userId}`, { method: 'DELETE' })
    await Promise.all([fetchMembers(), refreshGroupInfo()])
  }

  const setMemberRole = async (userId: string, role: string) => {
    await fetch(`/api/community/groups/${groupId}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    fetchMembers()
  }

  const leaveGroup = async () => {
    if (!confirm('Leave this group?')) return
    await fetch('/api/community/groups/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId }),
    })
    router.push('/community')
  }

  const openEdit = (msg: Message) => {
    setEditing(msg)
    setEditText(msg.content || '')
    setActionMsg(null)
  }

  const timeStr = (date: string) => new Date(date).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })

  const dayLabel = (date: string) => {
    const d = new Date(date)
    const today = new Date()
    const yest = new Date(); yest.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yest.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const typingNames = Array.from(typingIds)
    .map(id => members.find(m => m.users.id === id)?.users.full_name || 'Someone')
    .slice(0, 2)

  const isAdmin = myRole === 'admin'
  const onlineCount = onlineIds.size

  const renderBubble = (msg: Message) => {
    const isOwn = msg.user_id === currentUserId
    const isDeleted = Boolean(msg.deleted_at)
    return (
      <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, maxWidth: '100%' }}>
          {!isOwn && (
            <div style={{ flexShrink: 0 }}>
              <Avatar name={msg.users?.full_name} avatarUrl={msg.users?.avatar_url} size={28} fontSize={11} />
            </div>
          )}
          <div style={{ maxWidth: isMobile ? '82vw' : '62%' }}>
            {msg.reply && (
              <div style={{ background: 'rgba(255,255,255,0.06)', borderLeft: `3px solid ${isOwn ? 'rgba(255,255,255,0.5)' : C.accent}`, borderRadius: 6, padding: '6px 10px', marginBottom: 6, fontSize: 12 }}>
                <div style={{ color: isOwn ? 'rgba(255,255,255,0.75)' : C.accent, fontWeight: 700, marginBottom: 2 }}>
                  {msg.reply.user_id === currentUserId ? 'You' : (msg.reply.users?.full_name || 'Member')}
                </div>
                <div style={{ color: isOwn ? 'rgba(255,255,255,0.6)' : C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {msg.reply.file_type === 'image' ? '📷 Image' : msg.reply.file_type === 'pdf' ? `📄 ${msg.reply.file_name}` : msg.reply.content}
                </div>
              </div>
            )}
            <div style={{ background: isOwn ? `linear-gradient(135deg,${C.accent},#5B21B6)` : C.card, border: isOwn ? 'none' : `1px solid ${C.border}`, borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '10px 14px' }}>
              {isDeleted ? (
                <p style={{ fontSize: 13, color: isOwn ? 'rgba(255,255,255,0.55)' : C.muted, fontStyle: 'italic', margin: 0 }}>This message was deleted</p>
              ) : (
                <>
                  {msg.content && <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</p>}
                  {msg.file_url && msg.file_type === 'image' && <img src={msg.file_url} alt={msg.file_name || 'image'} style={{ maxWidth: 260, maxHeight: 300, borderRadius: 8, display: 'block', marginTop: msg.content ? 8 : 0 }} />}
                  {msg.file_url && msg.file_type === 'pdf' && (
                    <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: isOwn ? '#fff' : C.cyan, textDecoration: 'none', fontSize: 13, fontWeight: 600, marginTop: msg.content ? 8 : 0 }}>
                      📄 {msg.file_name || 'View PDF'}
                    </a>
                  )}
                  <div style={{ fontSize: 10, color: isOwn ? 'rgba(255,255,255,0.6)' : C.muted, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <span>{timeStr(msg.created_at)}{msg.edited_at ? ' · edited' : ''}</span>
                    {isOwn && (msg.read_count > 0 ? <CheckCheck size={13} color="#7DD3FC" /> : <Check size={13} color="rgba(255,255,255,0.6)" />)}
                  </div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, padding: '2px 4px', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
              <button onClick={() => { setReplyTo(msg); setActionMsg(null) }} style={actionBtnStyle} title="Reply"><Reply size={13} /></button>
              <button onClick={() => copyMessage(msg)} style={actionBtnStyle} title="Copy"><Copy size={13} /></button>
              {isOwn && !isDeleted && <button onClick={() => openEdit(msg)} style={actionBtnStyle} title="Edit"><Pencil size={13} /></button>}
              {(isOwn || isAdmin) && <button onClick={() => deleteMessage(msg)} style={actionBtnStyle} title="Delete"><Trash2 size={13} /></button>}
              {!isOwn && <button onClick={() => { setForwardMsg(msg); setActionMsg(null) }} style={actionBtnStyle} title="Forward"><Forward size={13} /></button>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const actionBtnStyle = { background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }

  const daySeparators: { label: string; index: number }[] = []
  messages.forEach((m, i) => {
    if (i === 0) { daySeparators.push({ label: dayLabel(m.created_at), index: i }); return }
    if (new Date(m.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString()) {
      daySeparators.push({ label: dayLabel(m.created_at), index: i })
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'calc(100dvh - 140px)' : 'calc(100dvh - 60px)', position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: C.surface }}>
        <button onClick={() => router.push('/community')} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} />
        </button>
        <button onClick={() => setInfoOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', flex: 1, textAlign: 'left', padding: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.accent}44,${C.cyan}33)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={16} color={C.accent} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>{group?.name || 'Loading...'}</div>
            <div style={{ fontSize: 12, color: typingNames.length ? C.cyan : C.muted }}>
              {typingNames.length ? `${typingNames.join(', ')} ${typingNames.length > 1 ? 'are' : 'is'} typing...` : onlineCount > 1 ? `${onlineCount} online` : `${group?.member_count || 0} members`}
            </div>
          </div>
        </button>
        <button onClick={() => setInfoOpen(true)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}>
          <Info size={19} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {hasMore && (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <button onClick={() => fetchMessages(false)} disabled={loadingMore} style={{ background: `${C.accent}22`, border: `1px solid ${C.accent}44`, color: C.accent, padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {loadingMore ? 'Loading...' : 'Load earlier messages'}
            </button>
          </div>
        )}
        {daySeparators.map(({ label, index }) => (
          <div key={`d-${index}`} style={{ textAlign: 'center', margin: '4px 0' }}>
            <span style={{ fontSize: 11, color: C.muted, background: C.card, padding: '3px 12px', borderRadius: 10, border: `1px solid ${C.border}` }}>{label}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted }}>
            <Users size={36} color={C.border} style={{ marginBottom: 10 }} />
            <p style={{ fontSize: 14 }}>No messages yet. Say hello! 👋</p>
          </div>
        )}
        {messages.map(msg => renderBubble(msg))}
        {typingNames.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 12, padding: '4px 8px' }}>
            <span style={{ display: 'inline-flex', gap: 3 }}>{[0, 1, 2].map(i => (
              <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: C.accent, display: 'inline-block', animation: 'blink 1.2s infinite', animationDelay: `${i * 0.2}s` }} />
            ))}</span>
            <span>{typingNames.join(', ')} {typingNames.length > 1 ? 'are' : 'is'} typing...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!isPremium && dailyUploads >= 1 && (
        <div style={{ margin: '0 16px 8px', background: `${C.gold}18`, border: `1px solid ${C.gold}33`, borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Lock size={13} color={C.gold} />
          <span style={{ fontSize: 12, color: C.gold }}>Daily file limit reached. Upgrade for unlimited uploads.</span>
        </div>
      )}

      {/* Reply / edit bar */}
      {(replyTo || editing) && (
        <div style={{ margin: '0 16px 8px', background: C.card, border: `1px solid ${C.accent}44`, borderLeft: `3px solid ${C.accent}`, borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {editing ? (
            <div style={{ flex: 1, fontSize: 12, color: C.muted }}>✏️ Editing message</div>
          ) : replyTo && (
            <div style={{ flex: 1, fontSize: 12, color: C.muted, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <span style={{ color: C.accent, fontWeight: 700 }}>Replying to {replyTo.user_id === currentUserId ? 'you' : (replyTo.users?.full_name || 'member')}: </span>
              {replyTo.file_type === 'image' ? '📷 Image' : replyTo.file_type === 'pdf' ? `📄 ${replyTo.file_name}` : replyTo.content}
            </div>
          )}
          <button onClick={() => { setReplyTo(null); setEditing(null) }} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={15} /></button>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
        <input ref={fileRef} type="file" accept=".pdf,image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading || (!isPremium && dailyUploads >= 1)}
          style={{ background: 'none', border: `1px solid ${C.border}`, color: (!isPremium && dailyUploads >= 1) ? C.border : C.muted, width: 40, height: 40, borderRadius: 10, cursor: (!isPremium && dailyUploads >= 1) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Paperclip size={16} />
        </button>
        {editing ? (
          <div style={{ flex: 1, display: 'flex', gap: 8 }}>
            <input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') editMessage() }} style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 14, outline: 'none' }} />
            <button onClick={editMessage} disabled={!editText.trim()} style={{ background: C.green, border: 'none', color: '#fff', padding: '0 16px', borderRadius: 10, cursor: editText.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 700 }}>Save</button>
          </div>
        ) : (
          <>
            <textarea value={input} onChange={e => handleTyping(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." rows={1}
              style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
            <button onClick={sendMessage} disabled={!input.trim() || sending}
              style={{ background: input.trim() ? `linear-gradient(135deg,${C.accent},#5B21B6)` : C.border, border: 'none', color: '#fff', width: 40, height: 40, borderRadius: 10, cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Send size={16} />
            </button>
          </>
        )}
      </div>

      {/* Group info modal */}
      {infoOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => { if (e.target === e.currentTarget) setInfoOpen(false) }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, width: '100%', maxWidth: 440, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.white }}>Group info</h3>
              <button onClick={() => setInfoOpen(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {isAdmin && (
              <div style={{ marginBottom: 16, padding: 12, background: C.card, borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><Edit3 size={13} /> Edit group</div>
                {[['Name', 'name'], ['Subject', 'subject'], ['Description', 'description']].map(([label, key]) => (
                  <input key={key} value={groupForm[key as 'name' | 'subject' | 'description']} onChange={e => setGroupForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={label} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
                ))}
                <button onClick={updateGroup} disabled={savingGroup} style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {savingGroup ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            )}

            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: 600 }}>Members · {members.length}</div>
            {members.map(m => {
              const isMe = m.users.id === currentUserId
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}22` }}>
                  <Avatar name={m.users.full_name} avatarUrl={m.users.avatar_url} size={34} fontSize={12} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.white, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.users.full_name || 'Student'}{isMe ? ' (you)' : ''}</span>
                      {m.role === 'admin' && <span style={{ fontSize: 9, padding: '2px 6px', background: `${C.accent}22`, borderRadius: 4, color: C.accent, fontWeight: 700 }}>ADMIN</span>}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {onlineIds.has(m.users.id) ? <span style={{ color: C.green }}>● Online</span> : 'Offline'}
                    </div>
                  </div>
                  {isAdmin && !isMe && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {m.role !== 'admin' && (
                        <button onClick={() => setMemberRole(m.users.id, 'admin')} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', padding: '5px 8px', borderRadius: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Shield size={12} /> Admin
                        </button>
                      )}
                      <button onClick={() => removeMember(m.users.id)} style={{ background: 'none', border: `1px solid ${C.red}44`, color: C.red, cursor: 'pointer', padding: '5px 8px', borderRadius: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <UserMinus size={12} /> Remove
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            <button onClick={leaveGroup} style={{ width: '100%', marginTop: 16, padding: '10px', borderRadius: 8, border: `1px solid ${C.red}44`, background: `${C.red}14`, color: C.red, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Leave group
            </button>
          </div>
        </div>
      )}

      {/* Forward picker */}
      {forwardMsg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => { if (e.target === e.currentTarget) setForwardMsg(null) }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: C.white }}>Forward to</h3>
              <button onClick={() => setForwardMsg(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <ForwardPicker groupId={groupId} onSelect={forwardSend} />
          </div>
        </div>
      )}

      <style>{`@keyframes blink { 0%,80%,100% { opacity: 0.2 } 40% { opacity: 1 } }`}</style>
    </div>
  )
}

function ForwardPicker({ groupId, onSelect }: { groupId: string; onSelect: (id: string) => void }) {
  const C = {
    surface: '#110836', card: '#150D40', border: '#1E1450',
    accent: '#7C3AED', text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF',
  }
  const [groups, setGroups] = useState<{ id: string; name: string; member_count: number }[]>([])
  useEffect(() => {
    fetch('/api/community/groups').then(r => r.json()).then(d => setGroups((d.groups || []).filter((g: any) => g.is_joined && g.id !== groupId)))
  }, [groupId])
  if (!groups.length) return <p style={{ fontSize: 13, color: C.muted, padding: '20px 0', textAlign: 'center' }}>No other joined groups.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
      {groups.map(g => (
        <button key={g.id} onClick={() => onSelect(g.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 14px', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: `${C.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={15} color={C.accent} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.white }}>{g.name}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{g.member_count} members</div>
          </div>
          <Forward size={15} color={C.muted} />
        </button>
      ))}
    </div>
  )
}
