importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyB_60iiusL6VBU0XCFrU73KIkKn690Sy_E',
  authDomain: 'afrotv-b57a1.firebaseapp.com',
  projectId: 'afrotv-b57a1',
  storageBucket: 'afrotv-b57a1.firebasestorage.app',
  messagingSenderId: '1070632769878',
  appId: '1:1070632769878:web:b2c5f41896265e3a979ef7'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  if (!payload.notification) return;
  const { title, body, icon } = payload.notification;
  self.registration.showNotification(title || 'AfroTV', {
    body: body || '',
    icon: icon || '/icon.png',
    badge: '/badge.png',
    vibrate: [200, 100, 200],
    tag: 'afrotv-notification',
    renotify: true,
    data: payload.data || {}
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('afrocom.lovestoblog.com') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
