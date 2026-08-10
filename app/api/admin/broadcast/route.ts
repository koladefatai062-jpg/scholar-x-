import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { APP_FROM, mailTemplate } from '@/lib/mail'
import { Resend } from 'resend'

const BATCH_SIZE = 50
const CHUNK_DELAY_MS = 1100
const MAX_RETRIES = 3

async function isAdmin(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('users').select('role').eq('id', userId).single()
  return data?.role === 'admin'
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function textToHtml(text: string) {
  return text.split(/\r?\n/).map(line => {
    const t = escapeHtml(line.trim())
    return t ? `<p style="margin:0 0 12px">${t}</p>` : ''
  }).filter(Boolean).join('')
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const [{ count: waitlist }, { count: users }] = await Promise.all([
    admin.from('waitlist').select('id', { count: 'exact', head: true }),
    admin.from('users').select('id', { count: 'exact', head: true }),
  ])
  return NextResponse.json({ counts: { waitlist: waitlist || 0, users: users || 0 } })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not set on the server' }, { status: 500 })
  }

  const { audience, subject, message } = await request.json().catch(() => ({}))
  if (!['waitlist', 'users', 'both'].includes(audience)) {
    return NextResponse.json({ error: 'Invalid audience' }, { status: 400 })
  }
  const subjectStr = String(subject || '').trim()
  if (!subjectStr || subjectStr.length > 200) {
    return NextResponse.json({ error: 'A subject (max 200 chars) is required' }, { status: 400 })
  }
  const messageStr = String(message || '').trim()
  if (!messageStr || messageStr.length > 10000) {
    return NextResponse.json({ error: 'A message (max 10000 chars) is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const emails = new Map<string, string>()

  if (audience === 'waitlist' || audience === 'both') {
    const { data: rows } = await admin.from('waitlist').select('email')
    for (const row of rows || []) {
      const e = String(row.email || '').toLowerCase().trim()
      if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) emails.set(e, e)
    }
  }
  if (audience === 'users' || audience === 'both') {
    const { data: rows } = await admin.from('users').select('email')
    for (const row of rows || []) {
      const e = String(row.email || '').toLowerCase().trim()
      if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) emails.set(e, e)
    }
  }

  const targets = Array.from(emails.values())
  if (targets.length === 0) {
    return NextResponse.json({ error: 'No valid email addresses in the selected audience' }, { status: 400 })
  }

  const html = mailTemplate(subjectStr, textToHtml(messageStr))
  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0
  let failed = 0
  const failures: string[] = []

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const chunk = targets.slice(i, i + BATCH_SIZE).map(to => ({ from: APP_FROM, to, subject: subjectStr, html }))
    let ok = false
    for (let attempt = 0; attempt < MAX_RETRIES && !ok; attempt++) {
      try {
        const results = await resend.batch.send(chunk)
        const body = results.data as any
        const items = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : null

        if (results.error) {
          failed += chunk.length
          if (failures.length < 5) failures.push(results.error.message)
          console.error('[broadcast] batch error:', results.error.message)
        } else if (Array.isArray(items)) {
          sent += items.length
          console.log(`[broadcast] chunk sent ${items.length}/${chunk.length}`)
        } else {
          failed += chunk.length
          if (failures.length < 5) failures.push('unexpected batch response')
          console.error('[broadcast] unexpected response:', JSON.stringify(results).slice(0, 500))
        }
        ok = true
      } catch (e) {
        const err = e as Error & { statusCode?: number; retryAfterSeconds?: number }
        const isRateLimit = err.statusCode === 429 || /rate.?limit|too many requests/i.test(err.message || '')
        if (!isRateLimit || attempt === MAX_RETRIES - 1) {
          failed += chunk.length
          if (failures.length < 5) failures.push(err.message || 'batch failed')
          ok = true
          break
        }
        // Rate limited — wait, then retry the same chunk.
        await new Promise(res => setTimeout(res, 1000 * (attempt + 2)))
      }
    }
    if (!ok) {
      failed += chunk.length
      if (failures.length < 5) failures.push('unable to send chunk after retries')
    }
    if (i + BATCH_SIZE < targets.length) {
      await new Promise(res => setTimeout(res, CHUNK_DELAY_MS))
    }
  }

  return NextResponse.json({ sent, failed, total: targets.length, failures })
}
