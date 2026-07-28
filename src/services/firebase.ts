import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const getClientEnv = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[key]) {
      return (import.meta as any).env[key];
    }
  } catch (_e) {
    // ignore
  }
  try {
    if (typeof process !== 'undefined' && (process as any)?.env?.[key]) {
      return (process as any).env[key];
    }
  } catch (_e) {
    // ignore
  }
  return '';
};

export const firebaseConfig = {
  apiKey: getClientEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getClientEnv('VITE_FIREBASE_AUTH_DOMAIN') || "gen-lang-client-0103104761.firebaseapp.com",
  projectId: getClientEnv('VITE_FIREBASE_PROJECT_ID') || "gen-lang-client-0103104761",
  storageBucket: getClientEnv('VITE_FIREBASE_STORAGE_BUCKET') || "gen-lang-client-0103104761.firebasestorage.app",
  messagingSenderId: getClientEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || "785800912093",
  appId: getClientEnv('VITE_FIREBASE_APP_ID') || "1:785800912093:web:5ff959fdbf6d7f20034f34",
  firestoreDatabaseId: getClientEnv('VITE_FIREBASE_DATABASE_ID') || "ai-studio-cardpionamesa-3eb2edfc-540d-4280-bd64-f82c4228f71b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with Custom Database ID as third argument
export const db = initializeFirestore(
  app, 
  {}, 
  firebaseConfig.firestoreDatabaseId || '(default)'
);

// Initialize Storage
export const storage = getStorage(app);

export default app;
