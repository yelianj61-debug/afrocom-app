importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyB_60iiusL6VBU0XCFrU73KIkKn690Sy_E",
  authDomain:        "afrotv-b57a1.firebaseapp.com",
  projectId:         "afrotv-b57a1",
  storageBucket:     "afrotv-b57a1.firebasestorage.app",
  messagingSenderId: "1070632769878",
  appId:             "1:1070632769878:web:b2c5f41896265e3a979ef7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || 'RIVO';
  const body  = payload.notification?.body  || '';
  const icon  = payload.notification?.icon  || '/icon-192.png';
  return self.registration.showNotification(title, {
    body,
    icon,
    badge:   '/icon-192.png',
    vibrate: [200, 100, 200],
    data:    payload.data || {},
  });
});
