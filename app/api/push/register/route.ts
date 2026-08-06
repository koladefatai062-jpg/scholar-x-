import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// POST — register a push token
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token, platform } = await request.json()
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const { error } = await supabase
    .from('push_tokens')
    .upsert({ user_id: user.id, token, platform: platform || 'web' }, { onConflict: 'user_id,token' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — remove a push token
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await request.json()
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  await supabase.from('push_tokens').delete().eq('user_id', user.id).eq('token', token)
  return NextResponse.json({ ok: true })
}
