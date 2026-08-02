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
  'show me a picture', 'show me an image', 'show me a photo', 'show me a logo', 'show me a poster',
  'make me a', 'make me an', 'give me a picture', 'give me an image', 'give me a photo',
  'i need a picture', 'i need an image', 'i need a photo', 'wallpaper of', 'map of', 'cartoon of', 'avatar of',
]

const IMAGE_GEN_EXCLUDES = [
  'draw a conclusion', 'draw conclusions', 'draw an inference', 'draw inferences',
]

const MATH_HINTS = [
  'solve', 'equation', 'algebra', 'calculus', 'differentiat', 'integrat',
  'find the value', 'simplif', 'factor', 'quadratic', 'derivative', 'integral',
  'probability', 'matric', 'trigonom', 'logarithm', 'fraction', 'percentage',
  'arithmetic', 'geometry', 'pythagor', 'simultaneous', 'indices', 'roots of',
  'sum of', 'prove that', 'evaluate', 'expand', 'bracket', 'inequalit', 'graph',
]

const MATH_INSTRUCTION = `MATHEMATICS MODE — the student asked a maths question, so follow these rules STRICTLY:
0. NEVER use LaTeX or markdown. No $ or $$, no backslash commands, no **, no #, no ---.
1. Work through EVERY step in full. Never skip a step or say "then simplify".
2. Put each step on its own line, with a short explanation of what you did and why.
3. Write numbers in plain text: x^2 for squared, sqrt(9) for square root, a/b for fractions, x for multiply, / for divide, approx for approximately.
4. State the rule or formula BEFORE applying it, in plain text.
5. Show the substitution, the working, and then the final answer clearly on its own line, e.g.: ANSWER: x = 2 or x = 5
6. Verify the answer by plugging it back in and mention the check.
7. If the answer is wrong-answer-friendly (MCQ-style), show how to pick the correct option.
8. End with one quick practice question at the same level: "Try this: ..."`

function isMathQuestion(text: string) {
  const lower = (text || '').toLowerCase()
  return MATH_HINTS.some(h => lower.includes(h))
}

function plainify(text: string): string {
  return (text || '')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$\n]*)\$/g, '$1')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]*)\}/g, 'sqrt($1)')
    .replace(/\\times/g, 'x')
    .replace(/\\div/g, '/')
    .replace(/\\neq/g, 'not equal to')
    .replace(/\\approx/g, 'approx')
    .replace(/\\le/g, '<=').replace(/\\ge/g, '>=')
    .replace(/\\cdot/g, 'x')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/^\s*-{3,}\s*$/gm, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function wantsImageGeneration(text: string) {
  const lower = (text || '').toLowerCase()
  if (IMAGE_GEN_EXCLUDES.some(ex => lower.includes(ex))) return false
  return IMAGE_GEN_HINTS.some(hint => lower.includes(hint))
}

async function generateViaPollinations(prompt: string): Promise<string | null> {
  try {
    const cleaned = prompt
      .replace(/^(please\s+)?(can you|could you|would you|please)\s+/i, '')
      .replace(/^(draw|draw me|generate|create|make|make me|paint|show me|design|sketch|imagine|illustrate|produce)\s+(an?\s+|the\s+|me\s+)?(image|picture|photo|logo|poster|meme|art|icon|diagram|chart|wallpaper|drawing|illustration|design|car)?\s*(of\s+)?/i, '')
      .replace(/["'#<>{}]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 200)
    const q = encodeURIComponent(cleaned || 'beautiful scene')
    const url = `https://image.pollinations.ai/prompt/${q}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 10000)}`

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 90000)
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    if (res.ok) return url
    return null
  } catch {
    return null
  }
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
  return `You are Scholar — the ScholarX AI Tutor. You are a smart, warm, friendly Nigerian tutor who genuinely cares about your students doing well.

Personality:
- Call yourself "Scholar" sometimes ("Here's how I'd break this down…")
- Warm, encouraging and patient. Celebrate small wins ("Nice — you've got this", "Great progress!")
- Sound like a real human tutor talking to a Nigerian student, not a robot
- Use simple, relatable English and Nigerian examples (NEPA/NEPA bills, market prices, afrobeat, football, school life) where it helps
- Keep responses concise but complete — a paragraph or a few bullet points, never walls of text
- Ask a short check-in at the end when it fits ("Want me to give you a quick practice question on this?")

FORMATTING (STRICT — follow this ALWAYS):
- Reply in PLAIN TEXT ONLY. Never use markdown or LaTeX.
- Never use $ or $$, backslash commands like \frac, \sqrt, \times, \neq. Write maths in plain text: x = 2, x^2, sqrt(9), 8 x 3 = 24, 10 / 2 = 5.
- Never use markdown symbols: ** **, * *, # ##, >, backticks, ---, | table pipes.
- For structure, use CAPITAL LETTERS on their own line (e.g. "ANSWER: 11" or "STEP 1:"), never # or **.
- Keep it short and readable on a phone: short lines, no clutter.

Student profile:
- Track: ${role === 'secondary' ? 'Secondary School' : 'University'}
- Level: ${level}

Your job:
- Explain concepts clearly, step by step
- Know JAMB, WAEC, NECO, BECE syllabuses inside out
- For university students, cover 100L-600L course content
- Never just give an answer — always explain the reasoning
- MATHEMATICS: always give full step-by-step working, write the formula/rule first, use clear plain-text notation (x^2, sqrt(), a/b, ×, ÷, ≈, π, ≤, ≥), and always finish with the final answer on its own line like "Answer: ...". Verify by substituting back when possible.
- When the student sends an image, read it carefully and explain/answer based on what you see
- IMAGE GENERATION: when asked to generate an image, you are in image-generation mode — you must output the actual generated image, with at most a short one-line caption. NEVER reply with links or stock-photo URLs, and never say you are "text-based". If you cannot output an image, say so briefly and offer to explain the topic instead.`
}

function getFallbackReply(message: string, role: string, level: string) {
  const normalized = message.toLowerCase()
  const learnerLabel = role === 'secondary' ? 'secondary school' : 'university'

  if (normalized.includes('equation') || normalized.includes('solve') || normalized.includes('algebra')) {
    return `Sorry, I hit a little network hiccup and couldn't reach the live AI right now — no wahala! Here's a solid study approach for ${learnerLabel} work meanwhile: break the problem into small steps, identify the formula or concept involved, substitute the known values, and solve one step at a time. Send me the exact question and I'll guide you through it properly.`
  }

  if (normalized.includes('essay') || normalized.includes('write')) {
    return `Sorry, I hit a small hiccup and couldn't reach the live AI right now — I'm still here though! For an essay, start with a clear introduction, then give 2–3 main points with examples, and finish with a short conclusion. Keep each paragraph focused on one idea. Send me the topic and I'll help you build it.`
  }

  return `Sorry, I hit a little hiccup and couldn't reach the live AI right now — I'm still here though! For ${level}, the best approach is to write down the key definition or formula, break the question into smaller parts, and solve it step by step. Send me the exact topic and I'll guide you through it.`
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

  let convId: string | null = conversation_id || null
  if (!convId) {
    const firstText = String(messages[0]?.content || '').trim().slice(0, 50)
    try {
      const { data: newConv } = await supabase
        .from('ai_conversations')
        .insert({ user_id: user.id, messages: [], title: firstText || 'New chat' })
        .select('id')
        .single()
      convId = newConv?.id || null
    } catch {}
  }

  const saveAssistantMessage = async (content: string, image?: { mimeType: string; data: string } | null, images?: string[]) => {
    if (!convId) return
    try {
      const updatedMessages = [
        ...messages,
        { role: 'assistant', content, image: image || null, images: images || [], timestamp: new Date().toISOString() },
      ]
      const firstText = String(messages[0]?.content || '').trim().slice(0, 50)
      await supabase
        .from('ai_conversations')
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
          ...(firstText ? { title: firstText } : {}),
        })
        .eq('id', convId)
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
  const mathRequested = isMathQuestion(text)
  const systemText = mathRequested ? `${systemPrompt}\n\n${MATH_INSTRUCTION}` : systemPrompt

  try {
    // ---- IMAGE GENERATION path ----
    if (wantsImageGeneration(text)) {
      let lastError: any = null
      for (const modelName of IMAGE_GEN_MODELS) {
        try {
          const geminiBody = {
            system_instruction: { parts: [{ text: systemText }] },
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
            return NextResponse.json({ reply: replyText, image, conversation_id: convId, remaining: await computeRemaining() })
          }

          const markdownImageUrls = [...replyText.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)].map(m => m[1])
          if (markdownImageUrls.length > 0) {
            const cleaned = replyText
              .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
              .replace(/\n{3,}/g, '\n\n')
              .trim()
            const finalText = cleaned || 'Here you go!'
            await saveAssistantMessage(finalText, null, markdownImageUrls)
            return NextResponse.json({ reply: finalText, image: null, images: markdownImageUrls, conversation_id: convId, remaining: await computeRemaining() })
          }

          if (replyText) {
            await saveAssistantMessage(replyText)
            return NextResponse.json({ reply: replyText, conversation_id: convId, remaining: await computeRemaining() })
          }
          lastError = new Error('No image returned from model')
        } catch (error) {
          lastError = error
        }
      }

      console.error('AI tutor: image generation failed.', lastError)

      const pollUrl = await generateViaPollinations(text)
      if (pollUrl) {
        const caption = 'Here you go! 🎨 Tell me what to change and I\'ll redraw it.'
        await saveAssistantMessage(caption, null, [pollUrl])
        return NextResponse.json({ reply: caption, image: null, images: [pollUrl], conversation_id: convId, remaining: await computeRemaining() })
      }

      const replyText = `Hmm, I couldn't generate that image right now — my image service is having a moment (quota/limit). No wahala! I can still explain concepts, solve questions, or read a photo you upload. Try again in a bit, or ask me to explain the thing instead.`
      await saveAssistantMessage(replyText)
      return NextResponse.json({ reply: replyText, image: null, conversation_id: convId, remaining: await computeRemaining() })
    }

    // ---- TEXT + VISION path ----
    let reply = ''
    let lastError: any = null

    for (const modelName of DEFAULT_GEMINI_MODELS) {
      try {
        const geminiBody = {
          system_instruction: { parts: [{ text: systemText }] },
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

    reply = plainify(reply)

    if (/(can'?t|cannot|don'?t)\s+(generate|create|make|produce)\s+(images|pictures|photos)|i'?m\s+text[- ]?based|i\s+can'?t\s+(send|create|generate|output)\s+(images|pictures|photos)/i.test(reply)) {
      const pollUrl = await generateViaPollinations(text)
      if (pollUrl) {
        const caption = 'Here you go! 🎨 Tell me what to change and I\'ll redraw it.'
        await saveAssistantMessage(caption, null, [pollUrl])
        return NextResponse.json({ reply: caption, image: null, images: [pollUrl], conversation_id: convId, remaining: await computeRemaining() })
      }
    }

    await saveAssistantMessage(reply)

    return NextResponse.json({ reply, conversation_id: convId, remaining: await computeRemaining() })

  } catch (err: any) {
    console.error('Gemini error:', err)
    const fallbackReply = getFallbackReply(
      messages[messages.length - 1]?.content || '',
      role,
      level
    )
    await saveAssistantMessage(fallbackReply)
    return NextResponse.json({ reply: fallbackReply, fallback: true, conversation_id: convId, remaining: null }, { status: 200 })
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

  const url = new URL(request.url)
  const id = url.searchParams.get('id')

  let conversation: any = null
  try {
    if (id) {
      const result = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      conversation = result.data || null
    } else {
      const today = new Date().toISOString().split('T')[0]
      const result = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      conversation = result.data || null
    }
  } catch {}

  let remaining = null
  if (!profile?.is_premium) {
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

  return NextResponse.json({ conversation, remaining, is_premium: profile?.is_premium })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
