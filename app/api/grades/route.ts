import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role, level')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'university') {
    const { data: courses } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    return NextResponse.json({ type: 'university', courses: courses || [] })
  } else {
    const { data: results } = await supabase
      .from('term_results')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    return NextResponse.json({ type: 'secondary', results: results || [] })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const body = await request.json()

  if (profile?.role === 'university') {
    const { code, name, units, score, semester, session } = body

    // Calculate grade
    const grade = score >= 70 ? 'A' : score >= 60 ? 'B' : score >= 50 ? 'C' : score >= 45 ? 'D' : 'F'

    const { data, error } = await supabase
      .from('courses')
      .insert({ user_id: user.id, code, name, units: parseInt(units), score: parseFloat(score), grade, semester, session })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ course: data })
  } else {
    const { subject, ca_score, exam_score, term, session } = body
    const total = parseFloat(ca_score) + parseFloat(exam_score)

    const { data, error } = await supabase
      .from('term_results')
      .insert({ user_id: user.id, subject, ca_score: parseFloat(ca_score), exam_score: parseFloat(exam_score), total, term, session })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ result: data })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, type } = await request.json()
  const table = type === 'university' ? 'courses' : 'term_results'

  const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}