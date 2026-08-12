import { Resend } from 'resend'
import nodemailer, { type Transporter } from 'nodemailer'

// All ScholarX emails come from one branded sender. Set APP_FROM in env once
// you have a verified domain (e.g. "ScholarX <no-reply@scholarx.com>").
export const APP_FROM = process.env.APP_FROM || 'ScholarX <onboarding@resend.dev>'

// Gmail/SMTP stopgap: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS to send
// when the Resend free test sender can't deliver (its onboarding@resend.dev
// sender only delivers to the account owner's own email).
// SMTP_HOST defaults to smtp.gmail.com once SMTP_USER is provided.
const SMTP_HOST = process.env.SMTP_HOST || (process.env.SMTP_USER ? 'smtp.gmail.com' : '')
const SMTP_PORT = Number(process.env.SMTP_PORT || 465)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_ENABLED = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)

export function smtpConfigured() {
  return SMTP_ENABLED
}

export function smtpStatus() {
  return {
    host: SMTP_HOST || null,
    user: SMTP_USER || null,
    pass: SMTP_PASS ? true : false,
    ready: SMTP_ENABLED,
  }
}

let transporter: Transporter | null = null
function smtp() {
  if (!SMTP_ENABLED) throw new Error('SMTP not configured')
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER!, pass: SMTP_PASS! },
    })
  }
  return transporter
}

const SMTP_FROM = SMTP_USER ? `ScholarX <${SMTP_USER}>` : APP_FROM

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

  if (key) {
    try {
      await new Resend(key).emails.send({ from: APP_FROM, to, subject, html })
      return true
    } catch (err) {
      console.error('[mail] resend send failed, trying SMTP:', err)
    }
  }

  if (SMTP_ENABLED) {
    try {
      await smtp().sendMail({ from: SMTP_FROM, to, subject, html })
      return true
    } catch (err) {
      console.error('[mail] smtp send failed:', err)
    }
  } else {
    console.warn('[mail] no RESEND_API_KEY and no SMTP config; email skipped')
  }

  return false
}

export type MailItem = { to: string; subject: string; html: string }

export type BatchResult = { sent: number; failed: number; mode: 'resend' | 'smtp' | 'none' }

// Sends a list of emails, preferring Resend batch and falling back to SMTP
// (paced, 1/sec) when Resend is unavailable or rejects the recipients.
export async function sendBatchEmails(items: MailItem[]): Promise<BatchResult> {
  const key = process.env.RESEND_API_KEY

  if (key) {
    try {
      const { data } = await new Resend(key).batch.send(items.map(it => ({ from: APP_FROM, ...it })))
      const count = (Array.isArray(data) ? data : (data as any)?.data)?.length ?? 0
      if (count > 0 || items.length === 0) {
        return { sent: count, failed: items.length - count, mode: 'resend' }
      }
      if (data) {
        return { sent: count, failed: items.length - count, mode: 'resend' }
      }
      console.warn('[mail] resend batch returned no ids, trying SMTP')
    } catch (err) {
      console.error('[mail] resend batch failed, trying SMTP:', err)
    }
  }

  if (SMTP_ENABLED) {
    let sent = 0
    const failed: string[] = []
    const mailer = smtp()
    for (let i = 0; i < items.length; i++) {
      try {
        await mailer.sendMail({ from: SMTP_FROM, to: items[i].to, subject: items[i].subject, html: items[i].html })
        sent++
      } catch (e) {
        if (failed.length < 5) failed.push(items[i].to)
      }
      if (i < items.length - 1) await new Promise(r => setTimeout(r, 150))
    }
    if (failed.length) console.error('[mail] smtp batch failures:', failed.join(', '))
    return { sent, failed: items.length - sent, mode: 'smtp' }
  }

  return { sent: 0, failed: items.length, mode: 'none' }
}
