import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

// POST — add a public waitlist signup and email the owner when a new user joins
export async function POST(request: NextRequest) {
  const { full_name, email, level } = await request.json().catch(() => ({}))
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: row, error } = await supabase
    .from('waitlist')
    .upsert(
      { email: String(email).toLowerCase().trim(), full_name: full_name || null, level: level || null },
      { onConflict: 'email', ignoreDuplicates: true }
    )
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!row) {
    return NextResponse.json({ ok: true, status: 'exists', message: "You're already on the waitlist." })
  }

  const resendKey = process.env.RESEND_API_KEY
  const ownerEmail = process.env.WAITLIST_EMAIL
  if (resendKey && ownerEmail) {
    try {
      const resend = new Resend(resendKey)
      await resend.emails.send({
        from: process.env.WAITLIST_FROM || 'ScholarX <onboarding@resend.dev>',
        to: ownerEmail,
        subject: 'New waitlist signup 🎉',
        html: `<div style="font-family:Inter,Arial,sans-serif;background:#0A0628;color:#E2D9F3;padding:28px;border-radius:12px">
          <h2 style="margin:0 0 16px;color:#fff">New waitlist signup</h2>
          <table style="border-collapse:collapse;width:100%;max-width:420px">
            <tr><td style="padding:8px 0;color:#7B6FA0">Name</td><td style="padding:8px 0;font-weight:600">${full_name || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#7B6FA0">Email</td><td style="padding:8px 0;font-weight:600">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#7B6FA0">Level</td><td style="padding:8px 0;font-weight:600">${level || '—'}</td></tr>
          </table>
          <p style="color:#7B6FA0;font-size:13px;margin-top:16px">View the full list in your Supabase dashboard → Table editor → waitlist.</p>
        </div>`,
      })
    } catch (e) {
      console.error('Waitlist email failed:', e)
    }
  }

  return NextResponse.json({ ok: true, status: 'added', message: 'You are on the list! We will email you when we launch.' })
}
