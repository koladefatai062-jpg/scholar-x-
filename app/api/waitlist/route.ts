import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { mailTemplate, sendEmail } from '@/lib/mail'

// Simple in-memory rate limit: 5 signups per IP per hour
const ipHits = new Map<string, number[]>()
const MAX_PER_HOUR = 5

function rateLimited(ip: string) {
  const now = Date.now()
  const hits = (ipHits.get(ip) || []).filter(t => now - t < 3600_000)
  if (hits.length >= MAX_PER_HOUR) return true
  hits.push(now)
  ipHits.set(ip, hits)
  return false
}

// POST — add a public waitlist signup and email the owner when a new user joins
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (rateLimited(ip)) {
      return NextResponse.json({ error: 'Too many signups from this device. Try again later.' }, { status: 429 })
    }

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
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!row) {
      return NextResponse.json({ ok: true, status: 'exists', message: "You're already on the waitlist." })
    }

    const resendKey = process.env.RESEND_API_KEY
    const ownerEmail = process.env.WAITLIST_EMAIL
    if (resendKey && ownerEmail) {
      await sendEmail({
        to: ownerEmail,
        subject: 'New waitlist signup 🎉',
        html: mailTemplate('New waitlist signup', `<table style="border-collapse:collapse;width:100%;max-width:420px">
            <tr><td style="padding:8px 0;color:#7B6FA0">Name</td><td style="padding:8px 0;font-weight:600">${full_name || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#7B6FA0">Email</td><td style="padding:8px 0;font-weight:600">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#7B6FA0">Level</td><td style="padding:8px 0;font-weight:600">${level || '—'}</td></tr>
          </table>`),
      })
    }

    return NextResponse.json({ ok: true, status: 'added', message: 'You are on the list! We will email you when we launch.' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
