import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';

// Silence background Firestore network retry logs if API is unprovisioned
setLogLevel('silent');

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyB2uHD8W6ocMWNI1KVUU_w7AWQSt0SFn8M",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "inventory-new-e4b8c.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "inventory-new-e4b8c",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "inventory-new-e4b8c.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "1040875350784",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:1040875350784:web:71f9f9bec1e93d8a96a1e5",
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || "G-4C0C771QV8"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firestore & Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

// Analytics is only supported in browser environments
export const analytics = typeof window !== 'undefined'
  ? isSupported().then(yes => yes ? getAnalytics(app) : null).catch(() => null)
  : null;
