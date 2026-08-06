import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// PATCH — edit own message
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ groupId: string; messageId: string }> }) {
  const { messageId } = await ctx.params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const { data: existing } = await supabase.from('group_messages').select('user_id, deleted_at').eq('id', messageId).single()
  if (!existing) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  if (existing.user_id !== user.id) return NextResponse.json({ error: 'Only your own messages can be edited' }, { status: 403 })
  if (existing.deleted_at) return NextResponse.json({ error: 'Message was deleted' }, { status: 400 })

  const { data, error } = await supabase
    .from('group_messages')
    .update({ content: content.trim(), edited_at: new Date().toISOString() })
    .eq('id', messageId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: data })
}

// DELETE — soft-delete own message (or any message as group admin)
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ groupId: string; messageId: string }> }) {
  const { groupId, messageId } = await ctx.params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase.from('group_messages').select('user_id, deleted_at').eq('id', messageId).single()
  if (!existing) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  if (existing.deleted_at) return NextResponse.json({ error: 'Message already deleted' }, { status: 400 })

  if (existing.user_id !== user.id) {
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('group_id', groupId)
      .single()
    if (membership?.role !== 'admin') return NextResponse.json({ error: 'Only admins can delete others\' messages' }, { status: 403 })
  }

  const { error } = await supabase
    .from('group_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
