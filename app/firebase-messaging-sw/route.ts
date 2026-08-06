const FCM_SW_VERSION = '10.12.5'

export function GET() {
  const firebaseConfig = JSON.stringify({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  })

  const js = `
importScripts('https://www.gstatic.com/firebasejs/${FCM_SW_VERSION}/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/${FCM_SW_VERSION}/firebase-messaging-compat.js');

firebase.initializeApp(${firebaseConfig});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = (payload && payload.notification) || {};
  const title = notification.title || 'New message';
  const options = {
    body: notification.body || '',
    icon: '/logo.png',
    badge: '/logo.png',
    data: (payload && payload.data) || {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.group_id ? '/community/group/' + data.group_id : '/community';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) { client.navigate(url); return client.focus(); }
      }
      return clients.openWindow(url);
    })
  );
});
`

  return new Response(js, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=0, no-cache',
      'Service-Worker-Allowed': '/',
    },
  })
}
