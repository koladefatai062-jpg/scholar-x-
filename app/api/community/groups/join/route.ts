import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { group_id } = await request.json()

  const { data: profile } = await supabase
    .from('users')
    .select('is_premium')
    .eq('id', user.id)
    .single()

  // Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('group_id', group_id)
    .single()

  if (existing) {
    // Leave group
    await supabase.from('group_members').delete().eq('id', existing.id)
    await supabase.rpc('decrement_group_members', { p_group_id: group_id })
    return NextResponse.json({ joined: false })
  }

  // Check free user limit (max 3 groups)
  if (!profile?.is_premium) {
    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count || 0) >= 3) {
      return NextResponse.json({
        error: 'free_limit',
        message: 'Free users can join up to 3 groups. Upgrade to Premium for unlimited access.',
      }, { status: 403 })
    }
  }

  // Join group
  const { data: groupInfo } = await supabase.from('groups').select('created_by').eq('id', group_id).single()
  const role = groupInfo?.created_by === user.id ? 'admin' : 'member'
  await supabase.from('group_members').insert({ user_id: user.id, group_id, role })
  await supabase.rpc('increment_group_members', { p_group_id: group_id })

  return NextResponse.json({ joined: true })
}