import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notifyGroupMessage } from '@/lib/notifications'

const BASE_SELECT = `
  *,
  users (full_name, is_premium, avatar_url),
  reply:reply_to_id (id, content, file_url, file_name, file_type, user_id, users (full_name))
`

// GET — paginated messages (newest last)
export async function GET(request: NextRequest, ctx: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await ctx.params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const before = request.nextUrl.searchParams.get('before')
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50'), 100)

  let query = supabase
    .from('group_messages')
    .select(BASE_SELECT)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (before) query = query.lt('created_at', before)

  const { data: messages, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const hasMore = (messages?.length || 0) > limit
  const page = (messages || []).slice(0, limit).reverse()

  return NextResponse.json({ messages: page, has_more: hasMore })
}

// POST — send a message
export async function POST(request: NextRequest, ctx: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await ctx.params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const content = typeof body.content === 'string' ? body.content.trim() : null
  const file_url = typeof body.file_url === 'string' ? body.file_url : null
  const file_name = typeof body.file_name === 'string' ? body.file_name : null
  const file_type = typeof body.file_type === 'string' ? body.file_type : null
  const file_size = typeof body.file_size === 'number' ? body.file_size : null
  const reply_to_id = typeof body.reply_to_id === 'string' ? body.reply_to_id : null

  if (!content && !file_url) return NextResponse.json({ error: 'Message content required' }, { status: 400 })

  // Must be a member
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('group_id', groupId)
    .single()
  if (!membership) return NextResponse.json({ error: 'You must join the group first' }, { status: 403 })

  const { data: message, error } = await supabase
    .from('group_messages')
    .insert({
      group_id: groupId,
      user_id: user.id,
      content,
      file_url,
      file_name,
      file_type,
      file_size,
      reply_to_id,
    })
    .select(BASE_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire-and-forget push notification to other members
  const [groupResult, senderResult] = await Promise.all([
    supabase.from('groups').select('name').eq('id', groupId).single(),
    supabase.from('users').select('full_name').eq('id', user.id).single(),
  ])
  notifyGroupMessage({
    groupId,
    senderId: user.id,
    groupName: groupResult.data?.name || 'Group',
    senderName: senderResult.data?.full_name || 'Someone',
    content,
    fileType: file_type,
  }).catch(() => {})

  return NextResponse.json({ message }, { status: 201 })
}
