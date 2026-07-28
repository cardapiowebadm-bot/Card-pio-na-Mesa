import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseAppletConfig from '../../firebase-applet-config.json';

const rawApiKey = (import.meta.env.VITE_FIREBASE_API_KEY as string) || firebaseAppletConfig.apiKey || '';

// Ensure apiKey is valid format so Firebase Auth doesn't throw auth/invalid-api-key at startup
const validApiKey = (rawApiKey && rawApiKey !== 'YOUR_FIREBASE_API_KEY' && rawApiKey.trim() !== '') 
  ? rawApiKey 
  : 'AIzaSyB_AIStudioPlaceholderKey_CardapioNaMesa';

export const firebaseConfig = {
  apiKey: validApiKey,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || firebaseAppletConfig.authDomain || "gen-lang-client-0103104761.firebaseapp.com",
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || firebaseAppletConfig.projectId || "gen-lang-client-0103104761",
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || firebaseAppletConfig.storageBucket || "gen-lang-client-0103104761.firebasestorage.app",
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || firebaseAppletConfig.messagingSenderId || "785800912093",
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || firebaseAppletConfig.appId || "1:785800912093:web:5ff959fdbf6d7f20034f34",
  firestoreDatabaseId: (import.meta.env.VITE_FIREBASE_DATABASE_ID as string) || firebaseAppletConfig.firestoreDatabaseId || "ai-studio-cardpionamesa-3eb2edfc-540d-4280-bd64-f82c4228f71b"
};

// Initialize Firebase App safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = initializeFirestore(
  app, 
  {}, 
  firebaseConfig.firestoreDatabaseId || '(default)'
);

// Initialize Storage
export const storage = getStorage(app);

export default app;

