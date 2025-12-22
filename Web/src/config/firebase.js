// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// Note: Firebase API keys are safe to expose in client-side code
// Security is enforced through Firebase Security Rules
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBtB3kb_mN3ZdUAyf4xsp1wCK8spQnNtkc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "unisync-web-app-ac1fd.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "unisync-web-app-ac1fd",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "unisync-web-app-ac1fd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "25644861146",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:25644861146:web:8fbc17eb8aa666bf60c7e3",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5SQJ2F6E5V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
