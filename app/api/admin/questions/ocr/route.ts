import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import https from 'https'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

function geminiRequest(body: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 90000,
    }, (res) => {
      let b = ''
      res.on('data', (chunk) => { b += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(b))
        } catch {
          reject(new Error(`Invalid response: ${b.slice(0, 200)}`))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')) })
    req.write(data)
    req.end()
  })
}

function extractJson(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
}

async function checkAdmin(supabase: any, adminClient: any, userId: string) {
  const { data: profile } = await adminClient.from('users').select('role').eq('id', userId).single()
  return profile?.role === 'admin'
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  if (!await checkAdmin(supabase, admin, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'AI service is not configured.' }, { status: 503 })
  }

  const body = await request.json()
  const { image } = body

  if (!image || typeof image !== 'string') {
    return NextResponse.json({ error: 'image is required' }, { status: 400 })
  }

  // Accept either a full data URL (data:image/...;base64,...) or raw base64
  let mime = 'image/jpeg'
  let data = image
  const dataUrlMatch = image.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/)
  if (dataUrlMatch) {
    mime = dataUrlMatch[1]
    data = dataUrlMatch[2]
  }

  const prompt = `You are an exam question digitizer for a Nigerian study platform.

Look at the attached image of an exam question and extract its details as JSON with EXACTLY these fields:
- "exam": one of JAMB, WAEC, NECO, BECE, POST-UTME (best guess if not written)
- "subject": the subject name (e.g. Mathematics, English Language, Physics, Chemistry, Biology, Economics)
- "year": the exam year if visible, otherwise empty string
- "question_text": the full question text exactly as written
- "option_a": option A text
- "option_b": option B text
- "option_c": option C text
- "option_d": option D text
- "correct_option": the correct answer letter ("a", "b", "c", "d") if you can determine it, otherwise null
- "explanation": a short 1-2 sentence explanation if you can work one out, otherwise empty string

Return ONLY the JSON object. No markdown, no commentary.`

  try {
    const result = await geminiRequest({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mime, data } },
        ],
      }],
    })

    if (result.error) {
      console.error('OCR: Gemini error:', result.error)
      return NextResponse.json({ error: result.error.message || 'OCR failed' }, { status: 500 })
    }

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const parsed = extractJson(text)

    if (!parsed || !parsed.question_text) {
      return NextResponse.json({ error: 'Could not read the question from that image. Try a clearer photo.' }, { status: 422 })
    }

    return NextResponse.json({
      question: {
        exam: parsed.exam || 'JAMB',
        subject: parsed.subject || '',
        year: parsed.year || '',
        question_text: parsed.question_text,
        option_a: parsed.option_a || '',
        option_b: parsed.option_b || '',
        option_c: parsed.option_c || '',
        option_d: parsed.option_d || '',
        correct_option: parsed.correct_option || 'a',
        explanation: parsed.explanation || '',
        is_premium: false,
      },
    })
  } catch (err: any) {
    console.error('OCR request failed:', err)
    return NextResponse.json({ error: 'Failed to process image. Please try again.' }, { status: 500 })
  }
}
