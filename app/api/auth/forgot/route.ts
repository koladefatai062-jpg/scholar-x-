import { NextRequest, NextResponse } from 'next/server'
import { createOtp } from '@/lib/otp'
import { otpEmailHtml, sendEmail } from '@/lib/mail'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const { email } = await request.json().catch(() => ({}))
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  const emailNorm = String(email).toLowerCase().trim()

  // Always respond the same way so accounts can't be enumerated.
  const admin = createAdminClient()
  const { data: user, error: userError } = await admin.from('users').select('id').eq('email', emailNorm).maybeSingle()
  if (userError) {
    console.error('[forgot] lookup failed:', userError.message)
  }
  if (user) {
    const created = await createOtp(emailNorm, 'reset')
    if (created.ok) {
      const { subject, html } = otpEmailHtml({ email: emailNorm, code: created.code, purpose: 'reset' })
      const sent = await sendEmail({ to: emailNorm, subject, html })
      console.log(`[forgot] reset code for ${emailNorm}: ${sent ? 'sent' : 'SEND FAILED (check RESEND_API_KEY / recipient allowed?)'}`)
    } else {
      console.warn(`[forgot] code not created for ${emailNorm}: ${created.error}`)
    }
  } else {
    console.log(`[forgot] no account found for ${emailNorm} in users table`)
  }

  return NextResponse.json({ ok: true })
}
