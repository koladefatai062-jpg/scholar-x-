import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { post_id } = await request.json()

  // Check if already liked
  const { data: existing } = await supabase
    .from('post_likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('post_id', post_id)
    .single()

  if (existing) {
    // Unlike
    await supabase.from('post_likes').delete().eq('id', existing.id)
    await supabase.rpc('decrement_likes', { p_post_id: post_id })
    return NextResponse.json({ liked: false })
  } else {
    // Like
    await supabase.from('post_likes').insert({ user_id: user.id, post_id })
    await supabase.rpc('increment_likes', { p_post_id: post_id })
    return NextResponse.json({ liked: true })
  }
}