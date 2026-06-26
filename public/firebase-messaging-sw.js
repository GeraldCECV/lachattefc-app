importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD0jdLm0-pg6aI73nIyRw9Wz_6mNaKWtW4",
  authDomain: "lachattefc-7129a.firebaseapp.com",
  projectId: "lachattefc-7129a",
  storageBucket: "lachattefc-7129a.firebasestorage.app",
  messagingSenderId: "4702396559",
  appId: "1:4702396559:web:84b28a8ea357a4533450fa",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // Intercepter et ne montrer qu'une seule notification
  // Supprimer la notification automatique FCM et la remplacer par la nôtre
  self.registration.getNotifications().then(notifications => {
    notifications.forEach(n => n.close());
  });
  const title = payload.notification?.title || payload.data?.title || 'La Chatte FC';
  const body = payload.notification?.body || payload.data?.body || '';
  return self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'lachattefc-notif', // tag unique pour éviter le doublon
    renotify: false,
    data: { url: payload.data?.url || 'https://lachattefc-app.vercel.app' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || 'https://lachattefc-app.vercel.app';
  event.waitUntil(clients.openWindow(url));
});
