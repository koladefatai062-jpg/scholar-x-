'use client'

import { useEffect, useRef } from 'react'

const CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export default function PushNotifications() {
  const startedRef = useRef(false)

  useEffect(() => {
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    const hasConfig = Boolean(vapidKey) && Object.values(CONFIG).every(Boolean)
    if (!hasConfig) return
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) return
    if (startedRef.current) return
    startedRef.current = true

    let disposed = false

    const run = async () => {
      try {
        if (Notification.permission === 'denied') return
        if (Notification.permission !== 'granted') {
          const perm = await Notification.requestPermission()
          if (perm !== 'granted') return
        }

        const { initializeApp } = await import('firebase/app')
        const { getMessaging, getToken, onMessage } = await import('firebase/messaging')

        const app = initializeApp({
          apiKey: CONFIG.apiKey as string,
          authDomain: CONFIG.authDomain as string,
          projectId: CONFIG.projectId as string,
          messagingSenderId: CONFIG.messagingSenderId as string,
          appId: CONFIG.appId as string,
        })
        const messaging = getMessaging(app)

        const reg = await navigator.serviceWorker.register('/firebase-messaging-sw')
        await navigator.serviceWorker.ready
        if (disposed) return

        const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg })
        if (token) {
          await fetch('/api/push/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, platform: 'web' }),
          })
        }

        onMessage(messaging, (payload) => {
          const title = payload.notification?.title || 'ScholarX'
          const body = payload.notification?.body || ''
          if ('Notification' in window) {
            new Notification(title, { body, icon: '/logo.png' })
          }
        })
      } catch {}
    }

    run()
    return () => { disposed = true }
  }, [])

  return null
}
