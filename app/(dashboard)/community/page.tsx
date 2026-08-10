'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, ThumbsUp, MessageCircle, Users, Plus, X, Lock, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/Avatar'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40',
  border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4',
  text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF',
  gold: '#F59E0B', green: '#22C55E', red: '#EF4444',
}

const SUBJECTS = ['all', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Economics']

interface Post {
  id: string
  content: string
  subject: string | null
  likes_count: number
  is_liked: boolean
  created_at: string
  users: { full_name: string; level: string; is_premium: boolean; avatar_url: string | null }
}

interface Group {
  id: string
  name: string
  subject: string | null
  description: string | null
  avatar_url: string | null
  member_count: number
  status: string
  is_joined: boolean
}

export default function CommunityPage() {
  const [tab, setTab] = useState<'feed' | 'groups'>('feed')
  const [posts, setPosts] = useState<Post[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [membershipCount, setMembershipCount] = useState(0)
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [postInput, setPostInput] = useState('')
  const [subject, setSubject] = useState('all')
  const [posting, setPosting] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupForm, setGroupForm] = useState({ name: '', subject: '', description: '' })
  const [isMobile, setIsMobile] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetchProfile()
    if (tab === 'feed') fetchPosts()
    else fetchGroups()
  }, [tab, subject])

  // Realtime subscription for new posts
  useEffect(() => {
    const channel = supabase
      .channel('posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
        fetchPosts()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setIsPremium(data.user?.is_premium || false)
    } catch {}
  }

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (subject !== 'all') params.set('subject', subject)
      const res = await fetch(`/api/community/posts?${params}`)
      const data = await res.json()
      setPosts(data.posts || [])
    } catch {}
    setLoading(false)
  }

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/community/groups')
      const data = await res.json()
      setGroups(data.groups || [])
      setMembershipCount(data.membership_count || 0)
    } catch {}
    setLoading(false)
  }

  const createPost = async () => {
    if (!postInput.trim() || posting) return
    setPosting(true)
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: postInput, subject: subject !== 'all' ? subject : null }),
      })
      const data = await res.json()
      if (data.post) {
        setPosts(prev => [{ ...data.post, is_liked: false }, ...prev])
        setPostInput('')
      }
    } catch {}
    setPosting(false)
  }

  const toggleLike = async (postId: string) => {
    try {
      const res = await fetch('/api/community/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
      })
      const data = await res.json()
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        is_liked: data.liked,
        likes_count: data.liked ? p.likes_count + 1 : p.likes_count - 1,
      } : p))
    } catch {}
  }

  const joinGroup = async (groupId: string) => {
    try {
      const res = await fetch('/api/community/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId }),
      })
      const data = await res.json()
      if (data.error === 'free_limit') {
        alert(data.message)
        return
      }
      setGroups(prev => prev.map(g => g.id === groupId ? {
        ...g,
        is_joined: data.joined,
        member_count: data.joined ? g.member_count + 1 : g.member_count - 1,
      } : g))
      setMembershipCount(prev => data.joined ? prev + 1 : prev - 1)
    } catch {}
  }

  const createGroup = async () => {
    if (!groupForm.name.trim()) return
    try {
      const res = await fetch('/api/community/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupForm),
      })
      const data = await res.json()
      if (data.error) { alert(data.message || data.error); return }
      alert('Group request submitted! It will go live after admin approval.')
      setShowCreateGroup(false)
      setGroupForm({ name: '', subject: '', description: '' })
    } catch {}
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.white, marginBottom: 4 }}>Community</h2>
        <p style={{ color: C.muted, fontSize: 14 }}>Connect with students across Nigeria.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['feed', 'groups'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 20px', borderRadius: 8, border: `1px solid ${tab === t ? C.accent : C.border}`, background: tab === t ? `${C.accent}1E` : 'transparent', color: tab === t ? C.accent : C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {tab === 'feed' ? (
        <div style={{ maxWidth: 680 }}>
          {/* Subject filter */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {SUBJECTS.map(s => (
              <button key={s} onClick={() => setSubject(s)} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${subject === s ? C.accent : C.border}`, background: subject === s ? `${C.accent}1E` : 'transparent', color: subject === s ? C.accent : C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{s}</button>
            ))}
          </div>

          {/* Create post */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <textarea
              value={postInput}
              onChange={e => setPostInput(e.target.value)}
              placeholder="Share something with the community..."
              rows={3}
              style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: '10px 14px', color: C.text, fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button onClick={createPost} disabled={!postInput.trim() || posting} style={{ background: postInput.trim() ? `linear-gradient(135deg,${C.accent},#5B21B6)` : C.border, border: 'none', color: '#fff', padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: postInput.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Send size={14} />{posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>

          {/* Posts */}
          {loading ? (
            <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading posts...</div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>
              <MessageCircle size={36} color={C.border} style={{ marginBottom: 10 }} />
              <p>No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {posts.map(post => (
                <div key={post.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <Avatar name={post.users?.full_name} avatarUrl={post.users?.avatar_url} size={36} fontSize={13} />
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{post.users?.full_name || 'Student'}</span>
                        {post.users?.is_premium && <span style={{ fontSize: 10, padding: '2px 6px', background: `${C.accent}22`, borderRadius: 4, color: C.accent, fontWeight: 700 }}>⚡ PRO</span>}
                        {post.subject && <span style={{ fontSize: 11, padding: '2px 7px', background: C.surface, borderRadius: 4, color: C.muted }}>{post.subject}</span>}
                        <span style={{ fontSize: 12, color: C.muted }}>{timeAgo(post.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: C.text, lineHeight: 1.65, marginBottom: 14 }}>{post.content}</p>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <button onClick={() => toggleLike(post.id)} style={{ background: 'none', border: 'none', color: post.is_liked ? C.accent : C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: post.is_liked ? 700 : 400 }}>
                      <ThumbsUp size={14} fill={post.is_liked ? C.accent : 'none'} />{post.likes_count}
                    </button>
                    <button style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                      <MessageCircle size={14} />Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Groups header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: C.muted }}>
              {!isPremium && <span>Joined <strong style={{ color: C.text }}>{membershipCount}/3</strong> groups · <span style={{ color: C.accent }}>Upgrade for unlimited</span></span>}
              {isPremium && <span style={{ color: C.accent }}>⚡ Premium · Unlimited groups</span>}
            </div>
            {isPremium && (
              <button onClick={() => setShowCreateGroup(true)} style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={14} />Create group
              </button>
            )}
          </div>

          {/* Create group modal */}
          {showCreateGroup && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: C.white }}>Create study group</h3>
                  <button onClick={() => setShowCreateGroup(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={20} /></button>
                </div>
                {[['Group name', 'name', 'e.g. JAMB 2026 Squad'], ['Subject', 'subject', 'e.g. Mathematics'], ['Description', 'description', 'What is this group about?']].map(([label, key, ph]) => (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</label>
                    <input value={groupForm[key as keyof typeof groupForm]} onChange={e => setGroupForm(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={ph} style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
                <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>⚠️ Group will be reviewed by admin before going live.</p>
                <button onClick={createGroup} style={{ width: '100%', background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '12px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Submit for approval
                </button>
              </div>
            </div>
          )}

          {/* Groups grid */}
          {loading ? (
            <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading groups...</div>
          ) : groups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>
              <Users size={36} color={C.border} style={{ marginBottom: 10 }} />
              <p>No groups yet. Check back soon!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
              {groups.map(group => (
                <div key={group.id} style={{ background: C.card, border: `1px solid ${group.is_joined ? C.accent + '44' : C.border}`, borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: group.avatar_url ? 'transparent' : `linear-gradient(135deg,${C.accent}44,${C.cyan}33)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {group.avatar_url
                        ? <img src={group.avatar_url} alt={group.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 10 }} />
                        : <Users size={18} color={C.accent} />}
                    </div>
                    {group.is_joined && <span style={{ fontSize: 10, padding: '3px 8px', background: `${C.green}20`, border: `1px solid ${C.green}44`, borderRadius: 4, color: C.green, fontWeight: 600 }}>Joined</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 4 }}>{group.name}</div>
                  {group.description && <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>{group.description}</div>}
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>{group.member_count.toLocaleString()} members {group.subject && `· ${group.subject}`}</div>
                  <button onClick={() => joinGroup(group.id)} style={{ width: '100%', padding: '9px', borderRadius: 8, border: `1px solid ${group.is_joined ? C.border : C.accent}`, background: group.is_joined ? 'transparent' : `${C.accent}1E`, color: group.is_joined ? C.muted : C.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {group.is_joined ? 'Leave group' : !isPremium && membershipCount >= 3 ? '🔒 Upgrade to join' : 'Join group'}
                  </button>
                  {group.is_joined && (
                    <button onClick={() => router.push(`/community/group/${group.id}`)} style={{ width: '100%', padding: '9px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,${C.accent},#5B21B6)`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      Open chat <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}