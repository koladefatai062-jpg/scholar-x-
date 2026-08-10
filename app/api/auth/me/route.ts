import { NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ user: null })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('full_name, email, email_verified, role')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name || '',
      email_verified: profile?.email_verified ?? false,
      role: profile?.role || 'secondary',
    },
  })
}
