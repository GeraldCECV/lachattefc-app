import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD0jdLm0-pg6aI73nIyRw9Wz_6mNaKWtW4",
  authDomain: "lachattefc-7129a.firebaseapp.com",
  projectId: "lachattefc-7129a",
  storageBucket: "lachattefc-7129a.firebasestorage.app",
  messagingSenderId: "4702396559",
  appId: "1:4702396559:web:84b28a8ea357a4533450fa",
  measurementId: "G-Q2GQLCJVBZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
