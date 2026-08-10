import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { levelForXp } from '@/lib/gamification'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: top, error } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, xp, streak, badges, is_premium, level')
    .not('xp', 'is', null)
    .order('xp', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const entries = (top || []).map(u => ({
    ...u,
    game_level: levelForXp(u.xp || 0),
  }))

  const myIndex = entries.findIndex(u => u.id === user.id)
  let my_rank: number | null = null
  if (myIndex === -1) {
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .not('xp', 'is', null)
      .gt('xp', 0)
    const { data: me } = await supabase.from('users').select('xp').eq('id', user.id).single()
    if (me?.xp) my_rank = (count || 0) + 1
  } else {
    my_rank = myIndex + 1
  }

  return NextResponse.json({ entries, my_rank })
}
