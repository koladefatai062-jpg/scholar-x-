import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { item_id } = await request.json()

  // Check if already saved
  const { data: existing } = await supabase
    .from('saved_items')
    .select('id')
    .eq('user_id', user.id)
    .eq('item_id', item_id)
    .single()

  if (existing) {
    // Unsave
    await supabase.from('saved_items').delete().eq('id', existing.id)
    return NextResponse.json({ saved: false })
  } else {
    // Save
    await supabase.from('saved_items').insert({ user_id: user.id, item_id })
    return NextResponse.json({ saved: true })
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: saved } = await supabase
    .from('saved_items')
    .select('item_id')
    .eq('user_id', user.id)

  const savedIds = saved?.map(s => s.item_id) || []
  return NextResponse.json({ savedIds })
}