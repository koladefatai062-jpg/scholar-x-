import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type RpcResult = { data: unknown | null }

async function rpcSafe(p: PromiseLike<any>): Promise<RpcResult> {
  try {
    return await p
  } catch {
    return { data: null }
  }
}

// GET — public waitlist count + recent joiners for the landing page
export async function GET() {
  const supabase = createAdminClient()

  const [countRes, recentRes] = await Promise.all([
    rpcSafe(supabase.rpc('get_waitlist_count')),
    rpcSafe(supabase.rpc('get_waitlist_recent', { limit_n: 5 })),
  ])

  return NextResponse.json({
    count: typeof countRes.data === 'number' ? countRes.data : 0,
    recent: ((recentRes.data as { first_name: string; initials: string; color_index: number }[]) || []).map(r => ({
      first_name: r.first_name || '',
      initials: r.initials || '',
      color_index: r.color_index ?? 0,
    })),
  })
}
