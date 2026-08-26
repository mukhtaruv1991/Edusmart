/* EduSmart background notifications. Firebase web configuration is public by design. */
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBsKoDZ78i8fWim0uiNmw-qCTROm0Sm2s4',
  authDomain: 'mukhtaruv.firebaseapp.com',
  projectId: 'mukhtaruv',
  storageBucket: 'mukhtaruv.firebasestorage.app',
  messagingSenderId: '832993571051',
  appId: '1:832993571051:web:365e16206feb3a09b8ceae',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const title = notification.title || 'EduSmart AI Connect';
  const options = {
    body: notification.body || 'لديك إشعار جديد من EduSmart.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    dir: 'rtl',
    lang: 'ar',
    data: { url: payload.data?.url || '/' },
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.location.origin));
      if (existing && 'focus' in existing) {
        existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
