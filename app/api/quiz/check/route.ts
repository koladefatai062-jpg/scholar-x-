import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Check a single answer — returns correct option + explanation (premium only)
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { question_id, selected_option } = body

  if (!question_id) {
    return NextResponse.json({ error: 'question_id is required' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('is_premium')
    .eq('id', user.id)
    .single()

  const isPremium = profile?.is_premium || false

  const { data: question, error } = await supabase
    .from('questions')
    .select('id, correct_option, explanation')
    .eq('id', question_id)
    .single()

  if (error || !question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  const isCorrect = selected_option === question.correct_option

  return NextResponse.json({
    correct_option: question.correct_option,
    is_correct: isCorrect,
    explanation: isPremium ? question.explanation : null,
  })
}