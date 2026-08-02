import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: convs, error } = await supabase
    .from('ai_conversations')
    .select('id, title, created_at, updated_at, messages')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const conversations = (convs || []).map((c: any) => {
    const msgs = Array.isArray(c.messages) ? c.messages : []
    const lastUser = [...msgs].reverse().find((m: any) => m.role === 'user')
    const preview = String(lastUser?.content || '').trim()
    return {
      id: c.id,
      title: c.title || preview.slice(0, 50) || 'New chat',
      updated_at: c.updated_at,
      preview,
      message_count: msgs.length,
    }
  })

  return NextResponse.json({ conversations })
}
