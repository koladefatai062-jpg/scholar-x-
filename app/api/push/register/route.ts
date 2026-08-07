import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// POST — register a web-push subscription (stored as JSON in `token`)
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subscription, platform } = await request.json()
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Subscription required' }, { status: 400 })
  }

  const token = JSON.stringify(subscription)
  const { error } = await supabase
    .from('push_tokens')
    .upsert({ user_id: user.id, token, platform: platform || 'web' }, { onConflict: 'user_id,token' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — remove a web-push subscription by its endpoint
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint } = await request.json()
  if (!endpoint) return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })

  const { data: rows } = await supabase
    .from('push_tokens')
    .select('id, token')
    .eq('user_id', user.id)

  const ids = (rows || [])
    .filter(r => {
      try {
        return (JSON.parse(r.token) as { endpoint?: string })?.endpoint === endpoint
      } catch {
        return false
      }
    })
    .map(r => r.id)

  if (ids.length) await supabase.from('push_tokens').delete().in('id', ids)
  return NextResponse.json({ ok: true })
}
