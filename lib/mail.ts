import { Resend } from 'resend'

// All ScholarX emails come from one branded sender. Set APP_FROM in env once
// you have a verified domain (e.g. "ScholarX <no-reply@scholarx.com>").
export const APP_FROM = process.env.APP_FROM || 'ScholarX <onboarding@resend.dev>'

export function mailTemplate(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0A0628;font-family:Inter,Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;padding:28px;background:#110836;border:1px solid #1E1450;border-radius:14px;color:#E2D9F3">
      <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:6px">ScholarX</div>
      <h1 style="font-size:20px;color:#fff;margin:16px 0 10px">${title}</h1>
      <div style="font-size:14px;line-height:1.6;color:#C9BCE8">${bodyHtml}</div>
      ${cta ? `<a href="${cta.href}" style="display:inline-block;margin-top:20px;background:linear-gradient(135deg,#7C3AED,#5B21B6);color:#fff;padding:12px 22px;border-radius:9px;font-weight:700;text-decoration:none;font-size:14px">${cta.label}</a>` : ''}
      <p style="font-size:12px;color:#7B6FA0;margin-top:24px">If you didn't ask for this, you can safely ignore this email.</p>
    </div>
  </body>
</html>`
}

export function otpEmailHtml({ email, code, purpose }: { email: string; code: string; purpose: 'signup' | 'reset' }) {
  const title = purpose === 'reset' ? 'Reset your password' : 'Verify your email'
  const msg =
    purpose === 'reset'
      ? `We received a request to reset the password for <b>${email}</b>. Use the code below to set a new password. It expires in <b>15 minutes</b>.`
      : `Thanks for joining ScholarX! Use the code below to confirm your email address. It expires in <b>15 minutes</b>.`
  const codeBlock = `<div style="background:#150D40;border:1px solid #1E1450;border-radius:10px;padding:18px;font-size:30px;font-weight:800;letter-spacing:10px;color:#06B6D4;text-align:center;margin:16px 0">${code}</div>`
  return { subject: title, html: mailTemplate(title, `${msg}${codeBlock}`) }
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[mail] RESEND_API_KEY is not set; email skipped')
    return false
  }
  try {
    await new Resend(key).emails.send({ from: APP_FROM, to, subject, html })
    return true
  } catch (err) {
    console.error('[mail] send failed:', err)
    return false
  }
}
