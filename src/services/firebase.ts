import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: (import.meta?.env?.VITE_FIREBASE_API_KEY as string) || (process.env?.VITE_FIREBASE_API_KEY as string) || "",
  authDomain: (import.meta?.env?.VITE_FIREBASE_AUTH_DOMAIN as string) || (process.env?.VITE_FIREBASE_AUTH_DOMAIN as string) || "gen-lang-client-0103104761.firebaseapp.com",
  projectId: (import.meta?.env?.VITE_FIREBASE_PROJECT_ID as string) || (process.env?.VITE_FIREBASE_PROJECT_ID as string) || "gen-lang-client-0103104761",
  storageBucket: (import.meta?.env?.VITE_FIREBASE_STORAGE_BUCKET as string) || (process.env?.VITE_FIREBASE_STORAGE_BUCKET as string) || "gen-lang-client-0103104761.firebasestorage.app",
  messagingSenderId: (import.meta?.env?.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || (process.env?.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "785800912093",
  appId: (import.meta?.env?.VITE_FIREBASE_APP_ID as string) || (process.env?.VITE_FIREBASE_APP_ID as string) || "1:785800912093:web:5ff959fdbf6d7f20034f34",
  firestoreDatabaseId: (import.meta?.env?.VITE_FIREBASE_DATABASE_ID as string) || (process.env?.VITE_FIREBASE_DATABASE_ID as string) || "ai-studio-cardpionamesa-3eb2edfc-540d-4280-bd64-f82c4228f71b"
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
