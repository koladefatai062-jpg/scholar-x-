self.addEventListener('push', (event) => {
  let data = { title: 'ScholarX', body: '', icon: '/logo.png', badge: '/logo.png', data: {} }
  try {
    const parsed = event.data.json()
    data = { ...data, ...parsed }
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'ScholarX', {
      body: data.body || '',
      icon: data.icon || '/logo.png',
      badge: data.badge || '/logo.png',
      data: data.data || {},
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const notificationData = event.notification.data || {}
  const url = notificationData.url || (notificationData.group_id ? '/community/group/' + notificationData.group_id : '/community')
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          try {
            client.navigate(url)
          } catch {}
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((list) => {
      for (const client of list) {
        try {
          client.navigate(client.url)
        } catch {}
      }
    })
  )
})
