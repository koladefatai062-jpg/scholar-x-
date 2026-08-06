import { createAdminClient } from '@/lib/supabase-server'

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY

/**
 * Send a push notification to all group members except the sender.
 * Uses FCM HTTP v1 if a service account is configured, otherwise the
 * legacy HTTP API if FCM_SERVER_KEY is set. Skips silently when no
 * credentials are configured so the app keeps working without Firebase.
 */
export async function notifyGroupMessage(opts: {
  groupId: string
  senderId: string
  groupName: string
  senderName: string
  content: string | null
  fileType: string | null
}) {
  const { groupId, senderId, groupName, senderName, content, fileType } = opts

  const supabase = createAdminClient()

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .neq('user_id', senderId)

  if (!tokens?.length) return

  const message =
    content || (fileType === 'image' ? 'sent an image' : fileType === 'pdf' ? 'sent a file' : 'sent a message')

  if (process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY) {
    await sendFcmV1({ groupId, tokens: tokens.map(t => t.token), title: `${senderName} · ${groupName}`, body: message })
  } else if (FCM_SERVER_KEY) {
    await sendFcmLegacy({ tokens: tokens.map(t => t.token), title: `${senderName} · ${groupName}`, body: message })
  }
}

async function getAccessToken() {
  const clientEmail = process.env.FCM_CLIENT_EMAIL!
  const privateKey = process.env.FCM_PRIVATE_KEY!.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = { iss: clientEmail, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
  const encode = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const data = `${encode(header)}.${encode(claim)}`
  const key = await crypto.subtle.importKey('pkcs8', pemToBinary(privateKey), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(data))
  const signature = btoa(String.fromCharCode(...Array.from(new Uint8Array(sig)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const jwt = `${data}.${signature}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const json = await res.json()
  return json.access_token as string
}

async function sendFcmV1(opts: { groupId: string; tokens: string[]; title: string; body: string }) {
  const projectId = process.env.FCM_PROJECT_ID!
  const token = await getAccessToken()
  await Promise.all(opts.tokens.map(t =>
    fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: { token: t, notification: { title: opts.title, body: opts.body }, data: { type: 'group', group_id: opts.groupId } },
      }),
    }).catch(() => {})
  ))
}

async function sendFcmLegacy(opts: { tokens: string[]; title: string; body: string }) {
  await Promise.all(opts.tokens.map(t =>
    fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: { Authorization: `key=${FCM_SERVER_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: t,
        notification: { title: opts.title, body: opts.body },
        data: { type: 'group' },
      }),
    }).catch(() => {})
  ))
}

function pemToBinary(pem: string) {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s/g, '')
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  return bytes
}
