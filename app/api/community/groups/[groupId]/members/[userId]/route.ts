import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string, groupId: string) {
  const { data } = await supabase
    .from('group_members')
    .select('role')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .single()
  return data?.role === 'admin'
}

// DELETE — remove a member (admin only)
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ groupId: string; userId: string }> }) {
  const { groupId, userId } = await ctx.params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.id === userId) return NextResponse.json({ error: 'Use Leave group instead' }, { status: 400 })

  if (!(await requireAdmin(supabase, user.id, groupId))) {
    return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 })
  }

  await supabase.from('group_members').delete().eq('user_id', userId).eq('group_id', groupId)
  await supabase.rpc('decrement_group_members', { p_group_id: groupId })
  return NextResponse.json({ ok: true })
}

// PATCH — promote/demote member role (admin only)
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ groupId: string; userId: string }> }) {
  const { groupId, userId } = await ctx.params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.id === userId) return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })

  if (!(await requireAdmin(supabase, user.id, groupId))) {
    return NextResponse.json({ error: 'Only admins can manage members' }, { status: 403 })
  }

  const { role } = await request.json()
  if (!['admin', 'member'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const { error } = await supabase
    .from('group_members')
    .update({ role })
    .eq('user_id', userId)
    .eq('group_id', groupId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
