import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const exam = searchParams.get('exam')
  const subject = searchParams.get('subject')
  const count = parseInt(searchParams.get('count') || '10')

  if (!exam || !subject) {
    return NextResponse.json({ error: 'exam and subject are required' }, { status: 400 })
  }

  // Check if user is premium (so they can access premium questions too)
  const { data: profile } = await supabase
    .from('users')
    .select('is_premium')
    .eq('id', user.id)
    .single()

  const isPremium = profile?.is_premium || false

  // Build query — RLS already filters premium questions based on user's plan,
  // but we explicitly filter here too for clarity and to avoid relying solely on RLS
  let query = supabase
    .from('questions')
    .select('id, exam, subject, year, question_text, option_a, option_b, option_c, option_d, is_premium')
    .eq('exam', exam)
    .eq('subject', subject)

  if (!isPremium) {
    query = query.eq('is_premium', false)
  }

  const { data: questions, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: 'No questions found for this exam/subject combination' }, { status: 404 })
  }

  // Shuffle questions — this ensures different order/set per user per session
  const shuffled = [...questions].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, count)

  // Also shuffle the order of options within each question for extra randomization
  const withShuffledOptions = selected.map(q => {
    const options = [
      { key: 'a', text: q.option_a },
      { key: 'b', text: q.option_b },
      { key: 'c', text: q.option_c },
      { key: 'd', text: q.option_d },
    ]
    const shuffledOptions = [...options].sort(() => Math.random() - 0.5)
    return {
      id: q.id,
      exam: q.exam,
      subject: q.subject,
      year: q.year,
      question_text: q.question_text,
      options: shuffledOptions,
      is_premium: q.is_premium,
    }
  })

  return NextResponse.json({ questions: withShuffledOptions })
}