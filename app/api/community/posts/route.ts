import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET — fetch posts feed
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const subject = searchParams.get('subject')
  const limit = parseInt(searchParams.get('limit') || '20')

  let query = supabase
    .from('posts')
    .select(`
      *,
      users (full_name, level, is_premium, avatar_url)
    `)
    .eq('is_flagged', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (subject && subject !== 'all') query = query.eq('subject', subject)

  const { data: posts, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get likes for current user
  const postIds = posts?.map(p => p.id) || []
  const { data: userLikes } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', user.id)
    .in('post_id', postIds)

  const likedPostIds = userLikes?.map(l => l.post_id) || []

  const postsWithLikes = posts?.map(p => ({
    ...p,
    is_liked: likedPostIds.includes(p.id),
  }))

  return NextResponse.json({ posts: postsWithLikes || [] })
}

// POST — create new post
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, subject } = await request.json()

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const { data: post, error } = await supabase
    .from('posts')
    .insert({ user_id: user.id, content: content.trim(), subject })
    .select(`*, users (full_name, level, is_premium, avatar_url)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ post })
}