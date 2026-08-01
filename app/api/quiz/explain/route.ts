import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import https from 'https'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
]
const BATCH_SIZE = 5

function geminiRequest(model: string, body: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
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

// Fallback parser: explanations formatted as "1. text", "2. text" on separate
// lines. Handles multi-line explanations by accumulating until the next number.
function extractNumbered(text: string, startIndex: number, count: number): (string | null)[] {
  const out: (string | null)[] = new Array(count).fill(null)
  const lines = text.split(/\r?\n/)
  let current = -1
  const acc: string[] = []
  for (const line of lines) {
    const m = line.trim().match(/^(\d+)[.)]\s+(.*)$/)
    if (m) {
      const idx = Number(m[1]) - startIndex - 1
      if (current !== -1 && acc.length) out[current] = acc.join('\n').trim()
      if (idx >= 0 && idx < count) {
        current = idx
        acc.length = 0
        acc.push(m[2])
      } else {
        current = -1
      }
    } else if (current !== -1 && line.trim()) {
      acc.push(line.trim())
    }
  }
  if (current !== -1 && acc.length) out[current] = acc.join('\n').trim()
  return out
}

async function explainBatch(batch: any[], startIndex: number, isPremium: boolean, level: string, role: string): Promise<(string | null)[]> {
  const depthInstruction = isPremium
    ? `Give a THOROUGH, in-depth explanation (4-8 sentences): why the correct option is right, why each wrong option is wrong, any formula or step-by-step working, the most common mistake students make, and a quick exam tip.`
    : `Give a BRIEF explanation in 1-2 short sentences. Keep it simple and direct.`

  const questionList = batch.map((q: any, i: number) => {
    const opts = (q.options || []).map((o: any) => `${o.key.toUpperCase()}: ${o.text}`).join(' | ')
    return `Q${startIndex + i + 1}. ${q.question_text}\nOptions: ${opts}\nSelected: ${q.selected ? q.selected.toUpperCase() : 'skipped'}\nCorrect: ${q.correct ? q.correct.toUpperCase() : 'unknown'}`
  }).join('\n\n')

  const prompt = `You are a Nigerian exam tutor explaining a ${role === 'secondary' ? 'secondary school (JAMB/WAEC/NECO/BECE)' : 'university'} quiz to a student at level ${level || 'SS3'}.

${depthInstruction}

For EACH question below, write its explanation on its own line, formatted exactly as:
{question number}. {explanation}

Example:
1. The correct option is B because ...
2. Option A is wrong because ...

Questions:
${questionList}

Write all ${batch.length} explanations, numbered ${startIndex + 1} through ${startIndex + batch.length}. Return ONLY the numbered lines. No markdown, no headings, no extra text.`

  const body = {
    system_instruction: { parts: [{ text: 'You are ScholarX AI Tutor.' }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    for (const model of GEMINI_MODELS) {
      try {
        const result = await geminiRequest(model, body)
        if (result.error) continue
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (!text.trim()) continue

        const jsonParsed = extractJson(text)
        if (Array.isArray(jsonParsed) && jsonParsed.length > 0) {
          const mapped = batch.map((_, i) => {
            const match = jsonParsed.find((p: any) => Number(p.i) === startIndex + i + 1)
            return match?.explanation || ''
          })
          if (mapped.some(e => e)) return mapped
        }

        const numbered = extractNumbered(text, startIndex, batch.length)
        if (numbered.some(e => e)) return numbered
      } catch {
        // try next model
      }
    }
  }

  return batch.map(() => null)
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

  try {
    const explanations: (string | null)[] = new Array(questions.length).fill(null)
    const role = profile?.role || 'secondary'
    const level = profile?.level || 'SS3'

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const batch = questions.slice(i, i + BATCH_SIZE)
      const result = await explainBatch(batch, i, isPremium, level, role)
      result.forEach((exp, j) => {
        if (exp) explanations[i + j] = exp
      })
    }

    const anyFailed = explanations.some(e => !e)
    return NextResponse.json({ explanations, is_premium: isPremium, partial: anyFailed })
  } catch (err: any) {
    console.error('Explain request failed:', err)
    return NextResponse.json({ error: 'Failed to generate explanations. Please try again.' }, { status: 500 })
  }
}
