import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyASjhM0VRbMh05wleRW4PlbmETnrZV4F80",
  authDomain: "gen-lang-client-0103104761.firebaseapp.com",
  projectId: "gen-lang-client-0103104761",
  storageBucket: "gen-lang-client-0103104761.firebasestorage.app",
  messagingSenderId: "785800912093",
  appId: "1:785800912093:web:5ff959fdbf6d7f20034f34",
  firestoreDatabaseId: "ai-studio-cardpionamesa-3eb2edfc-540d-4280-bd64-f82c4228f71b"
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
