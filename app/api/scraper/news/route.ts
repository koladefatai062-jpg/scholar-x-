import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') || '10')

  let query = supabase
    .from('news')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limit)

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data: news, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ news: news || [] })
}