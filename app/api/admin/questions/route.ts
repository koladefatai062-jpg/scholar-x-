import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'

async function checkAdmin(supabase: any, adminClient: any, userId: string) {
  const { data: profile } = await adminClient.from('users').select('role').eq('id', userId).single()
  return profile?.role === 'admin'
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  if (!await checkAdmin(supabase, admin, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const searchParams = request.nextUrl.searchParams
  const exam = searchParams.get('exam')
  const subject = searchParams.get('subject')

  let query = admin.from('questions').select('*').order('created_at', { ascending: false }).limit(50)
  if (exam) query = query.eq('exam', exam)
  if (subject) query = query.eq('subject', subject)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ questions: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  if (!await checkAdmin(supabase, admin, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { questions } = body // array of questions for bulk, or single question

  if (Array.isArray(questions)) {
    const { data, error } = await admin.from('questions').insert(questions).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ questions: data, count: data?.length })
  } else {
    const { data, error } = await admin.from('questions').insert(body).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ question: data })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  if (!await checkAdmin(supabase, admin, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await request.json()
  const { error } = await admin.from('questions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  if (!await checkAdmin(supabase, admin, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, ...updates } = await request.json()
  const { data, error } = await admin.from('questions').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ question: data })
}