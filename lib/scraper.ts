import { createAdminClient } from '@/lib/supabase-server'

export interface ScrapeResult {
  success: boolean
  scraped: number
  inserted: number
  skipped: number
  errors: string[]
}

const TIMEOUT = 20000
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const HEADERS = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
}

interface Source {
  name: string
  url: string
  base: string
  max: number
  require?: string[]
}

// Sources verified to server-render real education article links.
const SOURCES: Source[] = [
  {
    name: 'Punch',
    url: 'https://punchng.com/topics/education/',
    base: 'https://punchng.com',
    max: 8,
  },
  {
    name: 'Premium Times',
    url: 'https://www.premiumtimesng.com/category/education',
    base: 'https://www.premiumtimesng.com',
    max: 8,
  },
  {
    name: 'Tribune',
    url: 'https://www.tribuneonlineng.com/category/education/',
    base: 'https://www.tribuneonlineng.com',
    max: 8,
  },
  {
    name: 'JAMB',
    url: 'https://www.jamb.gov.ng/news.aspx',
    base: 'https://www.jamb.gov.ng',
    max: 6,
    require: ['jamb', 'utme'],
  },
]

const KEYWORDS = [
  'jamb', 'waec', 'neco', 'bece', 'utme', 'admission', 'scholarship', 'university',
  'exam', 'result', 'registration', 'student', 'polytechnic', 'nysc', 'campus',
  'tuition', 'asuu', 'strike', 'school', 'education', 'academic', 'postgraduate',
  'post-utme', 'lecturer', 'course', 'matriculation', 'graduation',
]

const BAD = [
  'privacy', 'terms', 'cookie', 'about us', 'contact us', 'advertise', 'subscribe',
  'sign in', 'sign up', 'login', 'log in', 'register', 'download', 'app', 'software',
  'price', 'menu', 'follow', 'facebook', 'twitter', 'whatsapp', 'instagram',
  'youtube', 'category', 'tag', 'search', 'home', 'newsletter', 'advert', 'job',
  'career', 'team', 'policy', 'archives', 'more', 'click here', 'read more',
]

export async function runScraper(): Promise<ScrapeResult> {
  const supabase = createAdminClient()
  const errors: string[] = []

  // Fetch all sources in parallel so a slow site can't stack timeouts.
  const results = await Promise.allSettled(
    SOURCES.map(async (src) => {
      const res = await fetch(src.url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT) })
      if (!res.ok) throw new Error(`${src.name}: HTTP ${res.status}`)
      const html = await res.text()
      return extractFromSource(src, html)
    })
  )

  const scraped: any[] = []
  results.forEach((r, i) => {
    const src = SOURCES[i]
    if (r.status === 'fulfilled') {
      scraped.push(...r.value)
    } else {
      errors.push(`${src.name}: ${r.reason?.message || r.reason}`)
    }
  })

  // Load existing titles once instead of querying per article.
  const existingTitles = new Set<string>()
  try {
    let from = 0
    const pageSize = 1000
    while (true) {
      const { data } = await supabase.from('news').select('title').range(from, from + pageSize - 1)
      if (!data || data.length === 0) break
      data.forEach((r) => existingTitles.add(String(r.title || '').toLowerCase().trim()))
      if (data.length < pageSize) break
      from += pageSize
    }
  } catch (e: any) {
    errors.push(`Dedup load: ${e.message}`)
  }

  const fresh: any[] = []
  for (const a of scraped) {
    const key = a.title.toLowerCase().trim()
    if (existingTitles.has(key)) continue
    existingTitles.add(key)
    fresh.push({
      title: a.title,
      summary: a.summary,
      source_url: a.source_url,
      source_name: a.source_name,
      category: a.category,
      published_at: a.published_at || new Date().toISOString(),
    })
  }

  let inserted = 0
  if (fresh.length > 0) {
    const { error } = await supabase.from('news').insert(fresh.slice(0, 40))
    if (error) {
      errors.push(`Insert: ${error.message}`)
    } else {
      inserted = fresh.slice(0, 40).length
    }
  }

  return { success: true, scraped: scraped.length, inserted, skipped: scraped.length - inserted, errors }
}

// ── EXTRACTION ────────────────────────────────────────────────────────────

function extractFromSource(src: Source, html: string) {
  const articles: any[] = []
  const seen = new Set<string>()
  const re = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi

  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim()
    if (!href || /^(#|javascript:|mailto:|tel:)/i.test(href)) continue
    if (/\.(css|js|png|jpe?g|gif|webp|svg|pdf|xml)$/i.test(href)) continue
    if (/get_the_permalink|<\?php|\$\w+\(/i.test(href)) continue
    if (href.length < 8) continue

    const title = clean(m[2])
    if (title.length < 15 || title.length > 250) continue
    const lower = title.toLowerCase()

    // Source-specific keyword requirement (e.g. JAMB official only)
    if (src.require && !src.require.some((k) => lower.includes(k))) continue
    if (!KEYWORDS.some((k) => lower.includes(k))) continue
    if (BAD.some((b) => lower.includes(b))) continue

    // Skip category/tag listing pages and generic hub links.
    if (/\/\b(category|topics|tag|archives)\b\//i.test(href)) continue
    if (seen.has(title)) continue
    seen.add(title)

    const url = href.startsWith('http') ? href : `${src.base}${href.startsWith('/') ? '' : '/'}${href}`
    articles.push({
      title,
      summary: null,
      source_url: url,
      source_name: src.name,
      category: detectCategory(title),
      published_at: new Date().toISOString(),
    })
  }

  return articles.slice(0, src.max)
}

function clean(inner: string) {
  let t = inner
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
  return t.replace(/\s+/g, ' ').trim()
}

function detectCategory(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('jamb') || t.includes('utme') || t.includes('caps')) return 'JAMB'
  if (t.includes('waec') || t.includes('wassce') || t.includes('may/june')) return 'WAEC'
  if (t.includes('neco') || t.includes('ssce')) return 'NECO'
  if (t.includes('bece') || t.includes('junior waec') || t.includes('jss')) return 'BECE'
  if (t.includes('post-utme') || t.includes('post utme')) return 'POST-UTME'
  if (t.includes('admission') || t.includes('university') || t.includes('polytechnic') || t.includes('college')) return 'Admission'
  if (t.includes('scholarship') || t.includes('grant') || t.includes('bursary')) return 'Scholarship'
  return 'general'
}
