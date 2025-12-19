import { auth, db } from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

// ============================================
// CONSTANTS
// ============================================

// CvSU-Imus domain restriction
export const ALLOWED_DOMAIN = 'cvsu.edu.ph';

// User roles (matches AuthContext ROLES)
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  FACULTY: 'faculty',
  YEAR_REP: 'year_rep',
  CLASS_REP: 'class_rep',
  STUDENT: 'student'
};

// Default role for new registrations
export const DEFAULT_ROLE = USER_ROLES.STUDENT;

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate CvSU email domain
 * Only allows @cvsu.edu.ph emails
 */
export const validateCvsuEmail = (email) => {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  const domain = email.split('@')[1]?.toLowerCase();
  if (domain !== ALLOWED_DOMAIN) {
    return { valid: false, error: `Only @${ALLOWED_DOMAIN} email addresses are allowed` };
  }

  return { valid: true, error: null };
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  return { valid: true, error: null };
};

// ============================================
// FIREBASE AUTHENTICATION FUNCTIONS
// ============================================

// Storage key for pending registration
const PENDING_REGISTRATION_KEY = 'unisync_pending_registration';

/**
 * Store pending registration data in localStorage
 * This is used to save user data before email verification
 */
const storePendingRegistration = (userData) => {
  localStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify({
    ...userData,
    timestamp: Date.now()
  }));
};

/**
 * Get pending registration data from localStorage
 */
export const getPendingRegistration = () => {
  const data = localStorage.getItem(PENDING_REGISTRATION_KEY);
  if (!data) return null;
  
  const parsed = JSON.parse(data);
  // Expire after 1 hour
  if (Date.now() - parsed.timestamp > 3600000) {
    clearPendingRegistration();
    return null;
  }
  return parsed;
};

/**
 * Clear pending registration data
 */
export const clearPendingRegistration = () => {
  localStorage.removeItem(PENDING_REGISTRATION_KEY);
};

/**
 * Register new user - Step 1: Send verification email link
 * Does NOT create any account yet - just sends verification link
 */
export const registerUser = async (userData) => {
  try {
    const { email, password, givenName, lastName } = userData;

    // Action code settings for email link
    const actionCodeSettings = {
      // URL to redirect to after email verification
      url: `${window.location.origin}/auth/verify-email`,
      handleCodeInApp: true,
    };

    // Send sign-in link to email (this is used for verification)
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    console.log('✅ Verification email link sent to:', email);

    // Store registration data locally (will be used after verification)
    storePendingRegistration({
      email,
      password, // Will be used to set password after email link sign-in
      givenName,
      lastName
    });

    return {
      success: true,
      message: 'Verification email sent! Please check your inbox and click the link to complete registration.'
    };
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    let errorMessage = 'Failed to send verification email. Please try again.';

    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your internet connection.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many attempts. Please try again later.';
        break;
      default:
        errorMessage = error.message || 'Failed to send verification email.';
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Check if the current URL is an email sign-in link
 */
export const isEmailSignInLink = (url) => {
  return isSignInWithEmailLink(auth, url);
};

/**
 * Complete registration - Step 2: After user clicks email link
 * Creates the account in Firebase Auth AND Firestore
 */
export const completeEmailVerification = async (url) => {
  try {
    // Get pending registration data
    const pendingData = getPendingRegistration();
    if (!pendingData) {
      return { 
        success: false, 
        error: 'Registration data expired. Please sign up again.' 
      };
    }

    const { email, password, givenName, lastName } = pendingData;

    // Sign in with email link (this verifies the email)
    const userCredential = await signInWithEmailLink(auth, email, url);
    const user = userCredential.user;
    console.log('✅ Email verified via link for:', email);

    // Set password for the account
    await updatePassword(user, password);
    console.log('✅ Password set for user');

    // Update display name
    await updateProfile(user, {
      displayName: `${givenName} ${lastName}`
    });

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: email,
      givenName: givenName,
      lastName: lastName,
      displayName: `${givenName} ${lastName}`,
      role: DEFAULT_ROLE,
      emailVerified: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('✅ User document created in Firestore');

    // Clear pending registration data
    clearPendingRegistration();

    // Store current user in localStorage
    localStorage.setItem('unisync_current_user', JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: DEFAULT_ROLE,
      emailVerified: true
    }));

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        givenName,
        lastName,
        role: DEFAULT_ROLE,
        emailVerified: true
      },
      message: 'Account created successfully!'
    };
  } catch (error) {
    console.error('Email verification error:', error);
    
    let errorMessage = 'Failed to complete verification. Please try again.';
    
    switch (error.code) {
      case 'auth/invalid-action-code':
        errorMessage = 'This verification link is invalid or has expired. Please sign up again.';
        break;
      case 'auth/expired-action-code':
        errorMessage = 'This verification link has expired. Please sign up again.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password is too weak. Please sign up again with a stronger password.';
        break;
      default:
        errorMessage = error.message || 'Verification failed. Please try again.';
    }
    
    return { success: false, error: errorMessage };
  }
};

/**
 * Delete an unverified user account
 * Used to clean up accounts that were created but never verified
 */
export const deleteUnverifiedUser = async () => {
  try {
    const user = auth.currentUser;
    if (user && !user.emailVerified) {
      await user.delete();
      console.log('🗑️ Deleted unverified user account');
      return { success: true };
    }
    return { success: false, error: 'No unverified user to delete' };
  } catch (error) {
    console.error('Error deleting unverified user:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Complete registration after email verification (Step 2)
 * - Creates user document in Firestore
 * - Called only after email is verified
 */
export const completeRegistration = async (userData) => {
  try {
    console.log('completeRegistration started with:', userData);
    
    const user = auth.currentUser;
    
    if (!user) {
      console.error('No current user found');
      return { success: false, error: 'No user found. Please try again.' };
    }

    console.log('Current user UID:', user.uid);

    // Reload user to get latest verification status
    await user.reload();
    
    if (!user.emailVerified) {
      console.error('Email not verified');
      return { success: false, error: 'Email not verified yet.' };
    }

    const { givenName, lastName, email } = userData;

    // Check if user document already exists
    console.log('Checking if user document exists...');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      console.log('User document already exists');
      return { success: true, message: 'Account already exists.' };
    }

    // Store user data in Firestore with default Student role
    console.log('Creating user document in Firestore...');
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email.toLowerCase(),
      givenName,
      lastName,
      displayName: `${givenName} ${lastName}`,
      role: DEFAULT_ROLE, // Default: student (per ruleset)
      tags: [], // Empty tags array (tags are labels, not permissions)
      isVerified: true,
      emailVerified: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('✅ User document created in Firestore');

    return {
      success: true,
      message: 'Account created successfully!'
    };
  } catch (error) {
    console.error('Complete registration error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Check for permission error
    if (error.code === 'permission-denied') {
      return { 
        success: false, 
        error: 'Database permission denied. Please contact support.' 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to complete registration. Please try signing in.' 
    };
  }
};

/**
 * Sign in user with Firebase
 * - Validates credentials
 * - Sets persistence based on "Remember Me" option
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {boolean} rememberMe - If true, persist session across browser closes
 */
export const loginUser = async (email, password, rememberMe = false) => {
  try {
    // Set persistence based on Remember Me option
    // LOCAL = persists even after browser is closed
    // SESSION = cleared when browser tab is closed
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (!userDoc.exists()) {
      await signOut(auth);
      return { success: false, error: 'User profile not found. Please contact support.' };
    }

    const userData = userDoc.data();

    // Update last login time
    await updateDoc(doc(db, 'users', user.uid), {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Store current user in localStorage for quick access
    localStorage.setItem('unisync_current_user', JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: userData.role,
      emailVerified: true
    }));

    return {
      success: true,
      user: {
        ...userData,
        uid: user.uid,
        emailVerified: true
      }
    };
  } catch (error) {
    console.error('Login error:', error);

    let errorMessage = 'Login failed. Please try again.';

    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email. Please sign up first.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'Invalid email or password.';
        break;
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Sign out user
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    localStorage.removeItem('unisync_current_user');
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: 'Logout failed. Please try again.' };
  }
};

/**
 * Send password reset email via Firebase
 */
export const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: 'Password reset email sent! Check your inbox.'
    };
  } catch (error) {
    console.error('Password reset error:', error);

    let errorMessage = 'Failed to send reset email. Please try again.';

    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many requests. Please try again later.';
        break;
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Resend email verification link
 */
export const resendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      await sendEmailVerification(user);
      console.log('✅ Verification email resent to:', user.email);
      return { success: true, message: 'Verification email sent!' };
    }
    return { success: false, error: 'No user signed in.' };
  } catch (error) {
    console.error('Verification email error:', error);
    return { success: false, error: 'Failed to send verification email.' };
  }
};

/**
 * Get current user from Firebase
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Get current user data from Firestore
 */
export const getCurrentUserData = async () => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return { uid: user.uid, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

/**
 * Subscribe to auth state changes
 */
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};
