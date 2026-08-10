import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { xpForScore } from '@/lib/gamification'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { exam, subject, score, total, time_spent, answers } = body
  // answers: array of { question_id, selected_option, is_correct }

  if (!exam || !subject || score === undefined || !total) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Save the attempt
  const { data: attempt, error: attemptError } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: user.id,
      exam,
      subject,
      score,
      total,
      time_spent: time_spent || 0,
    })
    .select()
    .single()

  if (attemptError) {
    return NextResponse.json({ error: attemptError.message }, { status: 500 })
  }

  // Save individual answers if provided
  if (answers && Array.isArray(answers) && answers.length > 0) {
    const answersToInsert = answers.map((a: any) => ({
      attempt_id: attempt.id,
      question_id: a.question_id,
      selected_option: a.selected_option,
      is_correct: a.is_correct,
    }))

    const { error: answersError } = await supabase
      .from('quiz_answers')
      .insert(answersToInsert)

    if (answersError) {
      console.error('Failed to save answers:', answersError.message)
      // Don't fail the whole request — attempt is already saved
    }
  }

  // Award XP / streaks / badges
  const xp = xpForScore(score)
  const { data: gamification } = await supabase.rpc('award_quiz_xp', {
    p_xp: xp,
    p_perfect: score >= total,
  })

  return NextResponse.json({ attempt, gamification })
}