import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET — group detail + members
export async function GET(request: NextRequest, ctx: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await ctx.params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: group, error } = await supabase.from('groups').select('*').eq('id', groupId).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const { data: members, error: mErr } = await supabase
    .from('group_members')
    .select(`id, role, last_read_at, created_at, users (id, full_name, email, avatar_url, is_premium)`)
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })

  const { data: myMembership } = await supabase
    .from('group_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('group_id', groupId)
    .single()

  return NextResponse.json({ group, members: members || [], my_role: myMembership?.role || null })
}

// PATCH — update group info (admin only)
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await ctx.params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('group_id', groupId)
    .single()
  if (membership?.role !== 'admin') return NextResponse.json({ error: 'Only admins can edit the group' }, { status: 403 })

  const body = await request.json()
  const update: Record<string, string> = {}
  if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim()
  if (typeof body.subject === 'string') update.subject = body.subject || null
  if (typeof body.description === 'string') update.description = body.description || null

  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { data: group, error } = await supabase.from('groups').update(update).eq('id', groupId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ group })
}
