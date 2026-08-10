import { NextRequest, NextResponse } from 'next/server'
import { consumeOtp } from '@/lib/otp'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const { email, code, purpose } = await request.json().catch(() => ({}))
  if (!email || !code || (purpose !== 'signup' && purpose !== 'reset')) {
    return NextResponse.json({ error: 'Missing email, code or purpose' }, { status: 400 })
  }

  const result = await consumeOtp(email, purpose, String(code).trim())
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // They proved they own this inbox — mark the profile verified.
  const admin = createAdminClient()
  await admin.from('users').update({ email_verified: true }).eq('email', String(email).toLowerCase().trim())

  return NextResponse.json({ ok: true })
}
