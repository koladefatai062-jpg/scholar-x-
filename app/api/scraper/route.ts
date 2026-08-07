import { NextRequest, NextResponse } from 'next/server'
import { runScraper } from '@/lib/scraper'

// This route scrapes education news from Nigerian sites.
// Call it via cron job or manually with `Authorization: Bearer <CRON_SECRET>`.
// GET /api/scraper

// Allow the function to run longer than Vercel's default so slow sites don't kill it.
export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Verify this is called by cron or admin — check secret key
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runScraper()
  return NextResponse.json(result)
}
