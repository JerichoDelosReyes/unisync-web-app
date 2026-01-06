// ============================================
// FIREBASE CONFIGURATION - SECURE SETUP
// ============================================
// 
// SECURITY NOTES:
// 1. API keys in Firebase web apps are NOT secret - they are meant to be public
// 2. Security is enforced through Firebase Security Rules, NOT API key hiding
// 3. The API key only identifies your project to Firebase servers
// 4. All data access is controlled by Firestore/Storage Security Rules
// 5. Authentication is handled by Firebase Auth with proper session management
//
// For production, ensure:
// - Firestore Security Rules are properly configured
// - Storage Security Rules are properly configured  
// - App Check is enabled for additional protection
// - Authorized domains are configured in Firebase Console
// ============================================

import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { 
  getAuth, 
  setPersistence,
  browserLocalPersistence 
} from "firebase/auth";
import { 
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Firebase configuration using environment variables (recommended)
// Falls back to hardcoded values for development
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBtB3kb_mN3ZdUAyf4xsp1wCK8spQnNtkc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "unisync-web-app-ac1fd.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "unisync-web-app-ac1fd",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "unisync-web-app-ac1fd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "25644861146",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:25644861146:web:8fbc17eb8aa666bf60c7e3",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5SQJ2F6E5V"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// ============================================
// APP CHECK - Protection against abuse
// ============================================
// App Check helps protect your backend resources from abuse
// Enable this in production with a valid reCAPTCHA site key
// Get your site key from: https://www.google.com/recaptcha/admin
if (import.meta.env.PROD && import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
    console.log('✅ App Check initialized');
  } catch (error) {
    console.warn('⚠️ App Check initialization failed:', error);
  }
}

// ============================================
// FIREBASE AUTH - Secure Authentication
// ============================================
const auth = getAuth(app);

// Set persistence to local (survives browser restart)
// This is secure because Firebase handles token refresh automatically
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Auth persistence error:', error);
});

// ============================================
// FIRESTORE - Database with offline support
// ============================================
let db;
try {
  // Use new persistence API (replaces deprecated enableIndexedDbPersistence)
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (err) {
  // Firestore already initialized (e.g., hot reload)
  db = getFirestore(app);
  console.warn('Firestore already initialized');
}

// ============================================
// FIREBASE STORAGE - File uploads
// ============================================
const storage = getStorage(app);

// ============================================
// ANALYTICS - Only in production
// ============================================
let analytics = null;
if (import.meta.env.PROD) {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    console.warn('Analytics not supported');
  });
} else {
  // Development - initialize analytics anyway for testing
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

// ============================================
// SECURITY UTILITIES
// ============================================

/**
 * Sanitize user input to prevent XSS attacks
 * Use this before storing any user-generated content
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if user session is valid
 */
export const isSessionValid = async () => {
  const user = auth.currentUser;
  if (!user) return false;
  
  try {
    // Force token refresh to check if session is still valid
    await user.getIdToken(true);
    return true;
  } catch (error) {
    console.error('Session validation failed:', error);
    return false;
  }
};

/**
 * Get current user's ID token for API calls
 * Always get a fresh token before making authenticated requests
 */
export const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    return await user.getIdToken(true);
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
};

// Initialize Firebase Cloud Messaging
let messaging = null;
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch (error) {
  console.log('Firebase Messaging not supported:', error);
}

export { app, analytics, auth, db, storage, messaging };
