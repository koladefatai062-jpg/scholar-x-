import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import https from 'https'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const DEFAULT_GEMINI_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
]
const FREE_DAILY_LIMIT = 10

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
      timeout: 60000,
    }, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch {
          reject(new Error(`Invalid response: ${body.slice(0, 200)}`))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')) })
    req.write(data)
    req.end()
  })
}

function getSystemPrompt(role: string, level: string) {
  return `You are ScholarX AI Tutor — a smart, friendly tutor for Nigerian students.

Student profile:
- Track: ${role === 'secondary' ? 'Secondary School' : 'University'}
- Level: ${level}

Your job:
- Explain concepts clearly and step by step
- Use simple English a Nigerian student will understand
- Know JAMB, WAEC, NECO, BECE syllabuses inside out
- For university students, cover 100L-600L course content
- Give examples using Nigerian context where helpful
- Never just give an answer — always explain the reasoning
- Keep responses concise but complete`
}

function getFallbackReply(message: string, role: string, level: string) {
  const normalized = message.toLowerCase()
  const learnerLabel = role === 'secondary' ? 'secondary school' : 'university'

  if (normalized.includes('equation') || normalized.includes('solve') || normalized.includes('algebra')) {
    return `The AI tutor service is temporarily unavailable, but here's a reliable study approach for ${learnerLabel} work: break the problem into small steps, identify the formula or concept involved, substitute the known values, and solve one step at a time. If you share the exact question, I can still guide you through it.`
  }

  if (normalized.includes('essay') || normalized.includes('write')) {
    return `The AI tutor service is temporarily unavailable right now. For an essay, start with a clear introduction, then give 2–3 main points with examples, and finish with a short conclusion. Keep each paragraph focused on one idea.`
  }

  return `The AI tutor service is temporarily unavailable right now, so I can't generate a live answer yet. For ${level}, the best approach is to write down the key definition or formula, break the question into smaller parts, and solve it step by step. If you send the exact topic, I can guide you through it.`
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('is_premium, role, level')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
  }

  // Check daily limit for free users
  let currentCount = 0
  if (!profile.is_premium) {
    const today = new Date().toISOString().split('T')[0]
    try {
      const { data: usage } = await supabase
        .from('ai_usage')
        .select('count')
        .eq('user_id', user.id)
        .eq('date', today)
        .single()
      currentCount = usage?.count || 0
    } catch {}

    if (currentCount >= FREE_DAILY_LIMIT) {
      return NextResponse.json({
        error: 'daily_limit_reached',
        message: `You've used all ${FREE_DAILY_LIMIT} free AI messages for today. Upgrade to Premium for unlimited access.`,
        count: currentCount,
        limit: FREE_DAILY_LIMIT,
      }, { status: 429 })
    }

    try {
      await supabase
        .from('ai_usage')
        .upsert({ user_id: user.id, date: today, count: currentCount + 1 }, { onConflict: 'user_id,date' })
    } catch {}
  }

  const body = await request.json()
  const { messages, conversation_id } = body

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'AI service is not configured right now.' }, { status: 503 })
  }

  const role = profile.role || 'secondary'
  const level = profile.level || 'SS3'
  const systemPrompt = getSystemPrompt(role, level)

  try {
    const history = messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const lastMessage = messages[messages.length - 1]
    let reply = ''
    let lastError: any = null

    for (const modelName of DEFAULT_GEMINI_MODELS) {
      try {
        const geminiBody = {
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [
            ...history,
            { role: 'user', parts: [{ text: lastMessage.content }] },
          ],
        }

        const result = await geminiRequest(modelName, geminiBody)

        if (result.error) {
          lastError = new Error(result.error.message || JSON.stringify(result.error))
          continue
        }

        reply = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (reply) break
      } catch (error) {
        lastError = error
      }
    }

    if (!reply) {
      console.error('AI tutor: all Gemini models failed.', lastError)
      throw lastError || new Error('No Gemini response received')
    }

    if (conversation_id) {
      try {
        const updatedMessages = [
          ...messages,
          { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
        ]
        await supabase
          .from('ai_conversations')
          .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
          .eq('id', conversation_id)
          .eq('user_id', user.id)
      } catch {}
    }

    let remaining = null
    if (!profile.is_premium) {
      try {
        const today = new Date().toISOString().split('T')[0]
        const { data: usage } = await supabase
          .from('ai_usage')
          .select('count')
          .eq('user_id', user.id)
          .eq('date', today)
          .single()
        remaining = FREE_DAILY_LIMIT - (usage?.count || 0)
      } catch {}
    }

    return NextResponse.json({ reply, remaining })

  } catch (err: any) {
    console.error('Gemini error:', err)
    const fallbackReply = getFallbackReply(
      messages[messages.length - 1]?.content || '',
      role,
      level
    )

    if (conversation_id) {
      try {
        const updatedMessages = [
          ...messages,
          { role: 'assistant', content: fallbackReply, timestamp: new Date().toISOString() },
        ]
        await supabase
          .from('ai_conversations')
          .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
          .eq('id', conversation_id)
          .eq('user_id', user.id)
      } catch {}
    }

    return NextResponse.json({ reply: fallbackReply, fallback: true, remaining: null }, { status: 200 })
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('is_premium')
    .eq('id', user.id)
    .single()

  const today = new Date().toISOString().split('T')[0]

  let conversation: any = null
  try {
    let result = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    conversation = result.data
  } catch {}

  if (!conversation) {
    try {
      const { data: newConv } = await supabase
        .from('ai_conversations')
        .insert({ user_id: user.id, messages: [] })
        .select()
        .single()
      conversation = newConv
    } catch {}
  }

  let remaining = null
  if (!profile?.is_premium) {
    try {
      const { data: usage } = await supabase
        .from('ai_usage')
        .select('count')
        .eq('user_id', user.id)
        .eq('date', today)
        .single()
      remaining = FREE_DAILY_LIMIT - (usage?.count || 0)
    } catch {}
  }

  return NextResponse.json({ conversation: conversation || { id: null, messages: [] }, remaining, is_premium: profile?.is_premium })
}
