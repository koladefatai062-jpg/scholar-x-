import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('users')
    .select('is_premium')
    .eq('id', user.id)
    .single()

  const isPremium = profile?.is_premium || false

  const searchParams = request.nextUrl.searchParams
  const subject = searchParams.get('subject')
  const level = searchParams.get('level')
  const search = searchParams.get('search')

  let query = admin
    .from('library_items')
    .select('*')
    .order('created_at', { ascending: false })

  if (!isPremium) query = query.eq('is_premium', false)
  if (subject && subject !== 'All') query = query.eq('subject', subject)
  if (level && level !== 'All') query = query.eq('level', level)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data: items, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ items, is_premium: isPremium })
}