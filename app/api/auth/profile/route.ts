import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  let body: any = {}
  try {
    body = await request.json()
  } catch {}

  const { user_id, full_name, role, level } = body
  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  // Defense in depth: if a session exists it must belong to the same user,
  // otherwise anyone could write arbitrary profiles.
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user && user.id !== user_id) {
    return NextResponse.json({ error: 'Cannot modify another user\u2019s profile' }, { status: 403 })
  }
  const targetUserId = user?.id || user_id

  // Never trust a client-supplied admin role. Only secondary/university can be
  // set through this endpoint; admin is granted server-side only.
  const safeRole = role === 'university' ? 'university' : 'secondary'
  const safeLevel = typeof level === 'string' ? level.slice(0, 20) : undefined

  const admin = createAdminClient()

  // Keep an existing admin role intact (don't downgrade admins on re-submit).
  const { data: existing } = await admin
    .from('users')
    .select('role')
    .eq('id', targetUserId)
    .maybeSingle()

  const finalRole = existing?.role === 'admin' ? 'admin' : safeRole

  const { error } = await admin.from('users').upsert(
    {
      id: targetUserId,
      full_name: typeof full_name === 'string' ? full_name.slice(0, 120) : '',
      role: finalRole,
      ...(safeLevel ? { level: safeLevel } : {}),
    },
    { onConflict: 'id' }
  )

  if (error) {
    console.error('Failed to upsert user profile:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
