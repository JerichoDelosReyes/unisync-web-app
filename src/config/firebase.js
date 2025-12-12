import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBPMh3HbqLC5eFf0IKt32tBkZd6uRknwP4",
  authDomain: "unisync-d0a79.firebaseapp.com",
  projectId: "unisync-d0a79",
  storageBucket: "unisync-d0a79.firebasestorage.app",
  messagingSenderId: "603025242218",
  appId: "1:603025242218:web:7b5da7bd8722824ba0b213",
  measurementId: "G-79WT624TDH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export default app;
