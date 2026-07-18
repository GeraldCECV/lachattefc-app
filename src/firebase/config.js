import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyD0jdLm0-pg6aI73nIyRw9Wz_6mNaKWtW4',
  authDomain: 'lachattefc-7129a.firebaseapp.com',
  projectId: 'lachattefc-7129a',
  storageBucket: 'lachattefc-7129a.firebasestorage.app',
  messagingSenderId: '4702396559',
  appId: '1:4702396559:web:84b28a8ea357a4533450fa',
  measurementId: 'G-Q2GQLCJVBZ',
};

const app = initializeApp(firebaseConfig);
// experimentalAutoDetectLongPolling : évite la longue négociation
// WebSocket-d'abord-puis-repli (jusqu'à ~1 min sur certains réseaux/PWA
// iOS) en testant directement quelle méthode de connexion fonctionne.
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
});
export const auth = getAuth(app);

export default app;
