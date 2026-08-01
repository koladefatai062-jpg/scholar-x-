import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  let body: any = {}
  try {
    body = await request.json()
  } catch {}

  const { user_id, full_name, role, level } = body
  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('users').upsert(
    {
      id: user_id,
      full_name: full_name || '',
      role: role || 'secondary',
      level: level || 'SS1',
    },
    { onConflict: 'id' }
  )

  if (error) {
    console.error('Failed to upsert user profile:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
