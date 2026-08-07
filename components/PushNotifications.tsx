'use client'

import { useEffect, useRef } from 'react'
import { isPushSupported, getCurrentPushSubscription, enablePush } from '@/lib/webpush-client'

/**
 * Auto-manages the web-push subscription for returning users.
 * Only re-subscribes when permission is already granted (never pops the
 * browser prompt on its own) — the header bell handles the opt-in flow.
 */
export default function PushNotifications() {
  const startedRef = useRef(false)

  useEffect(() => {
    if (!isPushSupported()) return
    if (startedRef.current) return
    startedRef.current = true

    let disposed = false

    const run = async () => {
      try {
        if (Notification.permission !== 'granted') return
        const existing = await getCurrentPushSubscription()
        if (disposed) return
        if (!existing) await enablePush()
      } catch {}
    }

    run()
    return () => {
      disposed = true
    }
  }, [])

  return null
}
