import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET — fetch active groups with join status + unread counts
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: groups, error } = await supabase
    .from('groups')
    .select('*')
    .eq('status', 'active')
    .order('member_count', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, role, last_read_at')
    .eq('user_id', user.id)

  const membershipMap = new Map(memberships?.map(m => [m.group_id, m]) || [])
  const joinedGroupIds = memberships?.map(m => m.group_id) || []

  // Unread counts for joined groups
  const unreadByGroup: Record<string, number> = {}
  await Promise.all(joinedGroupIds.map(async (gid) => {
    const m = membershipMap.get(gid)
    if (!m) return
    const query = supabase
      .from('group_messages')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', gid)
      .neq('user_id', user.id)
    if (m.last_read_at) query.gt('created_at', m.last_read_at)
    const { count } = await query
    unreadByGroup[gid] = count || 0
  }))

  const groupsWithStatus = groups?.map(g => {
    const m = membershipMap.get(g.id)
    return {
      ...g,
      is_joined: Boolean(m),
      my_role: m?.role || null,
      unread_count: unreadByGroup[g.id] || 0,
    }
  })

  return NextResponse.json({
    groups: groupsWithStatus || [],
    membership_count: joinedGroupIds.length,
  })
}

// POST — create group request (premium only) and auto-add creator as admin member
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('is_premium')
    .eq('id', user.id)
    .single()

  if (!profile?.is_premium) {
    return NextResponse.json({ error: 'Premium required to create groups' }, { status: 403 })
  }

  const { name, subject, description, avatar_url } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
  }

  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      name: name.trim(),
      subject,
      description,
      avatar_url: typeof avatar_url === 'string' ? avatar_url : null,
      created_by: user.id,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ group, message: 'Group request submitted for approval' })
}
