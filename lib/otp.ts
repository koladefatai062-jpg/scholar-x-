import { createHash, randomInt } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase-server'

const OTP_TTL_MS = 15 * 60 * 1000
const RESEND_DELAY_MS = 60 * 1000
const MAX_ATTEMPTS = 5

export type OtpPurpose = 'signup' | 'reset'

function normEmail(email: string) {
  return String(email).toLowerCase().trim()
}

export function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashOtp(code: string) {
  return createHash('sha256').update(code + (process.env.OTP_SALT || 'scholarx-otp')).digest('hex')
}

type OtpResult = { ok: true; code: string } | { ok: false; error: string }

export async function createOtp(email: string, purpose: OtpPurpose): Promise<OtpResult> {
  const emailNorm = normEmail(email)
  const admin = createAdminClient()

  const { data: recent } = await admin
    .from('verification_codes')
    .select('created_at')
    .eq('email', emailNorm)
    .eq('purpose', purpose)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recent) {
    const elapsed = Date.now() - new Date(recent.created_at).getTime()
    if (elapsed < RESEND_DELAY_MS) {
      return { ok: false, error: 'Please wait a moment before requesting another code.' }
    }
  }

  await admin.from('verification_codes').delete().eq('email', emailNorm).eq('purpose', purpose)

  const code = generateOtp()
  const { error } = await admin.from('verification_codes').insert({
    email: emailNorm,
    purpose,
    code_hash: hashOtp(code),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, code }
}

type VerifyResult = { ok: true } | { ok: false; error: string }

export async function consumeOtp(email: string, purpose: OtpPurpose, code: string): Promise<VerifyResult> {
  const emailNorm = normEmail(email)
  const admin = createAdminClient()

  const { data: row, error } = await admin
    .from('verification_codes')
    .select('*')
    .eq('email', emailNorm)
    .eq('purpose', purpose)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return { ok: false, error: 'Could not verify code.' }
  if (!row) return { ok: false, error: 'No code found. Request a new one.' }

  const now = Date.now()
  if (now > new Date(row.expires_at).getTime()) {
    await admin.from('verification_codes').delete().eq('id', row.id)
    return { ok: false, error: 'This code has expired. Request a new one.' }
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await admin.from('verification_codes').delete().eq('id', row.id)
    return { ok: false, error: 'Too many incorrect attempts. Request a new code.' }
  }

  if (hashOtp(code) !== row.code_hash) {
    await admin.from('verification_codes').update({ attempts: (row.attempts || 0) + 1 }).eq('id', row.id)
    return { ok: false, error: 'Incorrect code. Try again.' }
  }

  await admin.from('verification_codes').delete().eq('id', row.id)
  return { ok: true }
}
