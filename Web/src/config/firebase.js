// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);
const auth = getAuth(app);

export { app, analytics, auth };
