import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { full_name, level, avatar_url } = body

  const updates: Record<string, any> = {}
  if (full_name !== undefined) updates.full_name = full_name
  if (level !== undefined) updates.level = level
  if (avatar_url !== undefined) updates.avatar_url = avatar_url

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Delete user data
  await supabase.from('users').delete().eq('id', user.id)
  await supabase.auth.admin.deleteUser(user.id)

  return NextResponse.json({ success: true })
}