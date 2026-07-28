import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [
    { count: totalUsers },
    { count: premiumUsers },
    { count: totalQuestions },
    { count: libraryItems },
    { count: activeGroups },
    { data: payments },
  ] = await Promise.all([
    admin.from('users').select('*', { count: 'exact', head: true }),
    admin.from('users').select('*', { count: 'exact', head: true }).eq('is_premium', true),
    admin.from('questions').select('*', { count: 'exact', head: true }),
    admin.from('library_items').select('*', { count: 'exact', head: true }),
    admin.from('groups').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('payments').select('amount').eq('status', 'success'),
  ])

  const totalRevenue = payments?.reduce((acc, p) => acc + p.amount, 0) || 0

  return NextResponse.json({ totalUsers, premiumUsers, totalQuestions, libraryItems, activeGroups, totalRevenue })
}