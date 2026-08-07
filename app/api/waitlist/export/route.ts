import { NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'

async function isAdmin(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('users').select('role').eq('id', userId).single()
  return data?.role === 'admin'
}

function csvCell(value: unknown) {
  const s = value == null ? '' : String(value)
  return `"${s.replace(/"/g, '""')}"`
}

// GET — admin-only CSV export of all waitlist signups
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await isAdmin(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data } = await admin.from('waitlist').select('*').order('created_at', { ascending: false })

  const rows = data || []
  const header = 'full_name,email,level,joined_at'
  const body = rows.map(r =>
    [r.full_name, r.email, r.level, r.created_at].map(csvCell).join(',')
  ).join('\n')

  return new Response(`\uFEFF${header}\n${body}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="scholarx-waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
