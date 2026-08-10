import { NextRequest, NextResponse } from 'next/server'
import { createOtp } from '@/lib/otp'
import { otpEmailHtml, sendEmail } from '@/lib/mail'

export async function POST(request: NextRequest) {
  const { email, purpose } = await request.json().catch(() => ({}))
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }
  if (purpose !== 'signup' && purpose !== 'reset') {
    return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 })
  }

  const created = await createOtp(email, purpose)
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 429 })
  }

  const { subject, html } = otpEmailHtml({ email, code: created.code, purpose })
  const sent = await sendEmail({ to: email, subject, html })
  if (!sent) {
    return NextResponse.json({ error: 'We could not send the email right now. Try again shortly.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'Code sent to your email.' })
}
