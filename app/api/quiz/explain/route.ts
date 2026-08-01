import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
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
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('is_premium, role, level')
    .eq('id', user.id)
    .single()

  const isPremium = profile?.is_premium || false

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'AI service is not configured.' }, { status: 503 })
  }

  const body = await request.json()
  const { questions } = body

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: 'questions array is required' }, { status: 400 })
  }

  const depthInstruction = isPremium
    ? `Give a THOROUGH, in-depth explanation (4-8 sentences): why the correct option is right, why each wrong option is wrong, any formula or step-by-step working, the most common mistake students make, and a quick exam tip.`
    : `Give a BRIEF explanation in 1-2 short sentences. Keep it simple and direct.`

  const questionList = questions.map((q: any, i: number) => {
    const opts = (q.options || []).map((o: any) => `${o.key.toUpperCase()}: ${o.text}`).join(' | ')
    return `Q${i + 1}. ${q.question_text}\nOptions: ${opts}\nSelected: ${q.selected ? q.selected.toUpperCase() : 'skipped'}\nCorrect: ${q.correct ? q.correct.toUpperCase() : 'unknown'}`
  }).join('\n\n')

  const prompt = `You are a Nigerian exam tutor explaining a ${profile?.role === 'secondary' ? 'secondary school (JAMB/WAEC/NECO/BECE)' : 'university'} quiz to a student at level ${profile?.level || 'SS3'}.

${depthInstruction}

Answer as a JSON array where each element is { "i": <question index starting at 1>, "explanation": "<the explanation text>" }. Include one element for every question.

Questions:
${questionList}

Return ONLY the JSON array. No markdown, no commentary.`

  try {
    const result = await geminiRequest({
      system_instruction: { parts: [{ text: 'You are ScholarX AI Tutor.' }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })

    if (result.error) {
      console.error('Explain: Gemini error:', result.error)
      return NextResponse.json({ error: result.error.message || 'Explanation service failed' }, { status: 500 })
    }

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const parsed = extractJson(text)

    if (!parsed || !Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Could not generate explanations. Please try again.' }, { status: 422 })
    }

    const explanations = questions.map((_: any, i: number) => {
      const match = parsed.find((p: any) => Number(p.i) === i + 1)
      return match?.explanation || ''
    })

    return NextResponse.json({ explanations, is_premium: isPremium })
  } catch (err: any) {
    console.error('Explain request failed:', err)
    return NextResponse.json({ error: 'Failed to generate explanations. Please try again.' }, { status: 500 })
  }
}
