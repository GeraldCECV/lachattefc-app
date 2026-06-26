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

// Firebase gère automatiquement l'affichage en background
// via le champ notification du message

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || 'https://lachattefc-app.vercel.app';
  event.waitUntil(clients.openWindow(url));
});
