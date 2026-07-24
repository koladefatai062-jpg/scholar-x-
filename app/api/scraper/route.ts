import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// This route scrapes news from multiple Nigerian education sites
// Call it via cron job or manually from admin panel
// GET /api/scraper

const TIMEOUT = 30000
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
}

export async function GET(request: NextRequest) {
  // Verify this is called by cron or admin — check secret key
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || 'scholarx-cron-secret'

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results: any[] = []
  const errors: string[] = []

  // ── SCRAPE MYSCHOOL.NG ─────────────────────────────────────────────────
  try {
    const res = await fetch('https://myschool.ng/classroom/news', {
      headers: HEADERS,
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const articles = parseMyschool(html)
    results.push(...articles)
  } catch (err: any) {
    errors.push(`Myschool.ng: ${err.message}`)
  }

  // ── SCRAPE JAMB.GOV.NG ─────────────────────────────────────────────────
  try {
    const res = await fetch('https://www.jamb.gov.ng/ExamsDB/UTMENEWS.aspx', {
      headers: HEADERS,
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const articles = parseJAMB(html)
    results.push(...articles)
  } catch (err: any) {
    errors.push(`JAMB: ${err.message}`)
  }

  // ── NIGERIANSCHOLARS.COM ───────────────────────────────────────────────
  try {
    const res = await fetch('https://nigerianscholars.com/tutorials/jamb/', {
      headers: HEADERS,
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const articles = parseNigerianScholars(html)
    results.push(...articles)
  } catch (err: any) {
    errors.push(`NigerianScholars: ${err.message}`)
  }

  // ── SCRAPE VANGUARD EDUCATION ──────────────────────────────────────────
  try {
    const res = await fetch('https://www.vanguardngr.com/education/', {
      headers: HEADERS,
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const articles = parseVanguard(html)
    results.push(...articles)
  } catch (err: any) {
    errors.push(`Vanguard: ${err.message}`)
  }

  // ── SCRAPE PUNCH EDUCATION ─────────────────────────────────────────────
  try {
    const res = await fetch('https://punchng.com/topics/education/', {
      headers: HEADERS,
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const articles = parsePunch(html)
    results.push(...articles)
  } catch (err: any) {
    errors.push(`Punch: ${err.message}`)
  }

  if (results.length === 0) {
    return NextResponse.json({
      message: 'No articles scraped',
      errors,
    })
  }

  // ── DEDUPLICATE + INSERT ───────────────────────────────────────────────
  let inserted = 0
  let skipped = 0

  for (const article of results) {
    // Check if article with same title already exists
    const { data: existing } = await supabase
      .from('news')
      .select('id')
      .ilike('title', article.title)
      .limit(1)
      .single()

    if (existing) {
      skipped++
      continue
    }

    const { error } = await supabase.from('news').insert({
      title: article.title,
      summary: article.summary,
      source_url: article.source_url,
      source_name: article.source_name,
      category: article.category,
      published_at: article.published_at || new Date().toISOString(),
    })

    if (!error) inserted++
  }

  return NextResponse.json({
    success: true,
    scraped: results.length,
    inserted,
    skipped,
    errors,
  })
}

// ── PARSERS ────────────────────────────────────────────────────────────────

function parseMyschool(html: string) {
  const articles: any[] = []

  // Extract article titles and links using regex
  // Myschool uses standard HTML article tags
  const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/gi
  const titleRegex = /<h[23][^>]*><a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/i
  const summaryRegex = /<p[^>]*class="[^"]*excerpt[^"]*"[^>]*>([^<]+)<\/p>/i

  let match
  while ((match = articleRegex.exec(html)) !== null) {
    const block = match[1]
    const titleMatch = titleRegex.exec(block)
    const summaryMatch = summaryRegex.exec(block)

    if (titleMatch) {
      const title = titleMatch[2].trim()
      const url = titleMatch[1].startsWith('http')
        ? titleMatch[1]
        : `https://myschool.ng${titleMatch[1]}`

      articles.push({
        title,
        summary: summaryMatch ? summaryMatch[1].trim() : null,
        source_url: url,
        source_name: 'Myschool.ng',
        category: detectCategory(title),
        published_at: new Date().toISOString(),
      })
    }
  }

  // Fallback: extract from heading tags directly
  if (articles.length === 0) {
    const headingRegex = /<h[23][^>]*><a[^>]*href="([^"]*)"[^>]*>([^<]{20,200})<\/a>/gi
    while ((match = headingRegex.exec(html)) !== null) {
      const title = match[2].trim()
      const url = match[1].startsWith('http') ? match[1] : `https://myschool.ng${match[1]}`
      if (isEducationNews(title)) {
        articles.push({
          title,
          summary: null,
          source_url: url,
          source_name: 'Myschool.ng',
          category: detectCategory(title),
          published_at: new Date().toISOString(),
        })
      }
    }
  }

  return articles.slice(0, 10) // max 10 per source
}

function parseJAMB(html: string) {
  const articles: any[] = []
  const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]{20,200})<\/a>/gi

  let match
  while ((match = linkRegex.exec(html)) !== null) {
    const title = match[2].trim()
    const url = match[1]

    if (isEducationNews(title) && title.toLowerCase().includes('jamb')) {
      articles.push({
        title,
        summary: null,
        source_url: url.startsWith('http') ? url : `https://www.jamb.gov.ng${url}`,
        source_name: 'JAMB',
        category: 'JAMB',
        published_at: new Date().toISOString(),
      })
    }
  }

  return articles.slice(0, 8)
}

function parseNigerianScholars(html: string) {
  const articles: any[] = []
  const headingRegex = /<h[23][^>]*><a[^>]*href="([^"]*)"[^>]*>([^<]{20,200})<\/a>/gi

  let match
  while ((match = headingRegex.exec(html)) !== null) {
    const title = match[2].trim()
    const url = match[1]

    if (isEducationNews(title)) {
      articles.push({
        title,
        summary: null,
        source_url: url.startsWith('http') ? url : `https://nigerianscholars.com${url}`,
        source_name: 'NigerianScholars',
        category: detectCategory(title),
        published_at: new Date().toISOString(),
      })
    }
  }

  return articles.slice(0, 8)
}

function parseVanguard(html: string) {
  const articles: any[] = []
  const headingRegex = /<h[23][^>]*><a[^>]*href="([^"]*)"[^>]*>([^<]{15,200})<\/a>/gi

  let match
  while ((match = headingRegex.exec(html)) !== null) {
    const title = match[2].trim()
    const url = match[1]

    if (isEducationNews(title)) {
      articles.push({
        title,
        summary: null,
        source_url: url.startsWith('http') ? url : `https://www.vanguardngr.com${url}`,
        source_name: 'Vanguard',
        category: detectCategory(title),
        published_at: new Date().toISOString(),
      })
    }
  }

  return articles.slice(0, 8)
}

function parsePunch(html: string) {
  const articles: any[] = []
  const headingRegex = /<h[23][^>]*><a[^>]*href="([^"]*)"[^>]*>([^<]{15,200})<\/a>/gi

  let match
  while ((match = headingRegex.exec(html)) !== null) {
    const title = match[2].trim()
    const url = match[1]

    if (isEducationNews(title)) {
      articles.push({
        title,
        summary: null,
        source_url: url.startsWith('http') ? url : `https://punchng.com${url}`,
        source_name: 'Punch',
        category: detectCategory(title),
        published_at: new Date().toISOString(),
      })
    }
  }

  return articles.slice(0, 8)
}

// ── HELPERS ────────────────────────────────────────────────────────────────

function detectCategory(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('jamb') || t.includes('utme') || t.includes('caps') || t.includes('jamb')) return 'JAMB'
  if (t.includes('waec') || t.includes('wassce') || t.includes('may/june')) return 'WAEC'
  if (t.includes('neco') || t.includes('ssce')) return 'NECO'
  if (t.includes('bece') || t.includes('junior waec') || t.includes('jss')) return 'BECE'
  if (t.includes('post-utme') || t.includes('post utme')) return 'POST-UTME'
  if (t.includes('admission') || t.includes('university') || t.includes('polytechnic') || t.includes('college')) return 'Admission'
  if (t.includes('scholarship') || t.includes('grant') || t.includes('bursary')) return 'Scholarship'
  return 'general'
}

function isEducationNews(title: string): boolean {
  const t = title.toLowerCase()
  const keywords = [
    'jamb', 'waec', 'neco', 'bece', 'utme', 'admission',
    'exam', 'result', 'registration', 'student', 'university',
    'scholarship', 'school', 'education', 'academic', 'post-utme',
    'polytechnic', 'college', 'lecture', 'campus', 'matriculation',
    'graduation', 'nysc', 'corper', 'asuu', 'strike', 'tuition',
    'course', 'faculty', 'department', 'gpa', 'cgpa', 'transcript',
  ]
  return keywords.some(k => t.includes(k))
}
