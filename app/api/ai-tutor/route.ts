import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import https from 'https'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const DEFAULT_GEMINI_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
]
const IMAGE_GEN_MODELS = [
  'gemini-3.1-flash-image-preview',
  'gemini-2.5-flash-image',
  'nano-banana-pro-preview',
  'gemini-3-pro-image-preview',
]
const FREE_DAILY_LIMIT = 10
const MAX_ATTACHMENTS = 2
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024
const ALLOWED_MIME = /^(image\/(png|jpeg|jpg|webp|gif)|application\/pdf)$/

interface Attachment {
  name?: string
  mimeType: string
  data: string
}

const IMAGE_GEN_HINTS = [
  'draw a', 'draw an', 'draw the', 'drawing of', 'draw me',
  'sketch', 'paint', 'illustrate', 'illustration of', 'design a', 'design an', 'design the',
  'generate an image', 'generate a picture', 'generate a photo', 'generate a logo', 'generate a meme', 'generate a diagram', 'generate a chart',
  'create an image', 'create a picture', 'create a photo', 'create a logo', 'create a meme', 'create a diagram',
  'make an image', 'make a picture', 'make a photo', 'make a logo', 'make a meme', 'make a diagram',
  'image of', 'picture of', 'photo of', 'logo of', 'poster of', 'art of', 'meme of', 'icon of', 'diagram of', 'chart of',
  'draw me a', 'draw me an', 'make me an image', 'generate me an image',
]

const IMAGE_GEN_EXCLUDES = [
  'draw a conclusion', 'draw conclusions', 'draw an inference', 'draw inferences',
]

function wantsImageGeneration(text: string) {
  const lower = (text || '').toLowerCase()
  if (IMAGE_GEN_EXCLUDES.some(ex => lower.includes(ex))) return false
  return IMAGE_GEN_HINTS.some(hint => lower.includes(hint))
}

function geminiRequest(model: string, body: object, timeoutMs = 90000): Promise<any> {
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
      timeout: timeoutMs,
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

function buildParts(content: string, attachments?: Attachment[], image?: { mimeType: string; data: string } | null) {
  const parts: any[] = []
  if (content) parts.push({ text: content })
  for (const a of attachments || []) {
    if (a.data) parts.push({ inlineData: { mimeType: a.mimeType, data: a.data } })
  }
  if (image?.data) parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } })
  return parts
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
- Keep responses concise but complete
- When the student sends an image, read it carefully and explain/answer based on what you see
- When asked to generate an image, you are the image-generation mode and must create the picture`
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

  const saveAssistantMessage = async (content: string, image?: { mimeType: string; data: string } | null) => {
    if (!conversation_id) return
    try {
      const updatedMessages = [
        ...messages,
        { role: 'assistant', content, image: image || null, timestamp: new Date().toISOString() },
      ]
      await supabase
        .from('ai_conversations')
        .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
        .eq('id', conversation_id)
        .eq('user_id', user.id)
    } catch {}
  }

  const computeRemaining = async () => {
    if (profile.is_premium) return null
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: usage } = await supabase
        .from('ai_usage')
        .select('count')
        .eq('user_id', user.id)
        .eq('date', today)
        .single()
      return FREE_DAILY_LIMIT - (usage?.count || 0)
    } catch { return null }
  }

  const lastMessage = messages[messages.length - 1]

  // Validate attachments
  const attachments: Attachment[] = Array.isArray(lastMessage?.attachments) ? lastMessage.attachments : []
  if (attachments.length > MAX_ATTACHMENTS) {
    return NextResponse.json({ error: `You can attach up to ${MAX_ATTACHMENTS} files per message` }, { status: 400 })
  }
  for (const a of attachments) {
    if (!ALLOWED_MIME.test(a.mimeType)) {
      return NextResponse.json({ error: 'Only images and PDFs can be uploaded' }, { status: 400 })
    }
    if (Buffer.byteLength(a.data, 'base64') > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: 'Each file must be under 4MB' }, { status: 400 })
    }
  }

  const text = lastMessage?.content || ''

  try {
    // ---- IMAGE GENERATION path ----
    if (wantsImageGeneration(text)) {
      let lastError: any = null
      for (const modelName of IMAGE_GEN_MODELS) {
        try {
          const geminiBody = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [
              ...messages.slice(0, -1).map((m: any) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: buildParts(m.content, m.attachments, m.image),
              })),
              { role: 'user', parts: buildParts(text, attachments) },
            ],
          }

          const result = await geminiRequest(modelName, geminiBody, 120000)
          if (result.error) {
            lastError = new Error(result.error.message || JSON.stringify(result.error))
            continue
          }

          const parts = result.candidates?.[0]?.content?.parts || []
          const inlinePart = parts.find((p: any) => p.inlineData?.data)
          const image = inlinePart?.inlineData
            ? { mimeType: inlinePart.inlineData.mimeType || 'image/png', data: inlinePart.inlineData.data }
            : null
          const replyText = parts.map((p: any) => p.text || '').join('').trim()

          if (image) {
            await saveAssistantMessage(replyText, image)
            return NextResponse.json({ reply: replyText, image, remaining: await computeRemaining() })
          }
          if (replyText) {
            await saveAssistantMessage(replyText)
            return NextResponse.json({ reply: replyText, remaining: await computeRemaining() })
          }
          lastError = new Error('No image returned from model')
        } catch (error) {
          lastError = error
        }
      }

      console.error('AI tutor: image generation failed.', lastError)
      const replyText = `I'm sorry — I couldn't generate that image right now. My image-generation service is currently unavailable (quota/limit). You can still ask me to explain concepts, solve questions, or read a photo you upload.`
      await saveAssistantMessage(replyText)
      return NextResponse.json({ reply: replyText, image: null, remaining: await computeRemaining() })
    }

    // ---- TEXT + VISION path ----
    let reply = ''
    let lastError: any = null

    for (const modelName of DEFAULT_GEMINI_MODELS) {
      try {
        const geminiBody = {
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [
            ...messages.slice(0, -1).map((m: any) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: buildParts(m.content, m.attachments, m.image),
            })),
            { role: 'user', parts: buildParts(text, attachments) },
          ],
        }

        const result = await geminiRequest(modelName, geminiBody)

        if (result.error) {
          lastError = new Error(result.error.message || JSON.stringify(result.error))
          continue
        }

        reply = result.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || ''
        if (reply) break
      } catch (error) {
        lastError = error
      }
    }

    if (!reply) {
      console.error('AI tutor: all Gemini models failed.', lastError)
      throw lastError || new Error('No Gemini response received')
    }

    await saveAssistantMessage(reply)

    return NextResponse.json({ reply, remaining: await computeRemaining() })

  } catch (err: any) {
    console.error('Gemini error:', err)
    const fallbackReply = getFallbackReply(
      messages[messages.length - 1]?.content || '',
      role,
      level
    )
    await saveAssistantMessage(fallbackReply)
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
