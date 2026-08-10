import { NextRequest, NextResponse } from 'next/server'
import { consumeOtp } from '@/lib/otp'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const { email, code, new_password } = await request.json().catch(() => ({}))
  if (!email || !code || !new_password) {
    return NextResponse.json({ error: 'Email, code and new password are required' }, { status: 400 })
  }
  if (String(new_password).length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const result = await consumeOtp(email, 'reset', String(code).trim())
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: user } = await admin.from('users').select('id').eq('email', String(email).toLowerCase().trim()).maybeSingle()
  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password: String(new_password) })
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await admin.from('users').update({ email_verified: true }).eq('id', user.id)
  return NextResponse.json({ ok: true, message: 'Password updated. You can now log in.' })
}
