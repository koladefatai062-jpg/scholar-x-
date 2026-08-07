import webPush from 'web-push'
import { createAdminClient } from '@/lib/supabase-server'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@scholarx.com'

let vapidReady = false
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    vapidReady = true
  } catch {}
}

/**
 * Send a push notification to all group members except the sender.
 * Uses Web Push (VAPID) — no Firebase needed. Skips silently when the
 * VAPID keys are not configured so the app keeps working without it.
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

  if (!vapidReady) return

  const supabase = createAdminClient()

  // Only notify members of this group (service role bypasses RLS)
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)

  const memberIds = (members || [])
    .map(m => m.user_id)
    .filter((id: string) => id !== senderId)

  if (memberIds.length === 0) return

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', memberIds)

  if (!tokens?.length) return

  const message =
    content || (fileType === 'image' ? 'sent an image' : fileType === 'pdf' ? 'sent a file' : 'sent a message')

  const payload = JSON.stringify({
    title: `${senderName} · ${groupName}`,
    body: message,
    data: { type: 'group', group_id: groupId, url: `/community/group/${groupId}` },
  })

  await Promise.all(
    tokens.map(({ token }) => {
      try {
        const subscription = JSON.parse(token)
        if (!subscription?.endpoint || !subscription?.keys) return
        return webPush.sendNotification(subscription, payload).catch((err: { statusCode?: number }) => {
          // 404/410 = subscription expired, clean it up
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            supabase.from('push_tokens').delete().eq('token', token).then(() => {})
          }
        })
      } catch {}
    })
  )
}
