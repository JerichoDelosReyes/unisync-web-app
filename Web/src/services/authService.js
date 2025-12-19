import { auth, db } from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
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

/**
 * Register new user with Firebase (Step 1)
 * - Creates Firebase Auth account
 * - Sends verification link to email
 * - Does NOT create Firestore document yet (waits for verification)
 */
export const registerUser = async (userData) => {
  try {
    const { email, password, givenName, lastName } = userData;

    // Create user in Firebase Auth (password is automatically encrypted)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: `${givenName} ${lastName}`
    });

    // Send email verification link
    try {
      await sendEmailVerification(user);
      console.log('✅ Verification email sent to:', email);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      // If email fails, delete the auth account
      await user.delete();
      return { 
        success: false, 
        error: 'Failed to send verification email. Please try again.' 
      };
    }

    // Return user data to be saved later after verification
    return {
      success: true,
      user,
      userData: { givenName, lastName, email },
      message: 'Verification email sent! Please verify your email.'
    };
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    let errorMessage = 'Registration failed. Please try again.';

    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'An account with this email already exists.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password is too weak.';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Email/password accounts are not enabled. Please enable it in Firebase Console.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your internet connection.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many attempts. Please try again later.';
        break;
      case 'auth/invalid-api-key':
        errorMessage = 'Invalid API key. Please check Firebase configuration.';
        break;
      default:
        errorMessage = error.message || 'Registration failed. Please try again.';
    }

    return { success: false, error: errorMessage };
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
 * - Checks email is verified
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

    // Check if email is verified FIRST
    if (!user.emailVerified) {
      // Don't sign out - keep user signed in so we can resend verification
      return { 
        success: false, 
        error: 'Please verify your email first. Check your inbox for the verification link.',
        needsVerification: true,
        user: user
      };
    }

    // Get user data from Firestore to check role
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (!userDoc.exists()) {
      await signOut(auth);
      return { success: false, error: 'User profile not found. Please contact support.' };
    }

    const userData = userDoc.data();

    // Update Firestore to mark email as verified
    await updateDoc(doc(db, 'users', user.uid), {
      emailVerified: true,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Store current user in localStorage for quick access
    localStorage.setItem('unisync_current_user', JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: userData.role,
      emailVerified: user.emailVerified
    }));

    return {
      success: true,
      user: {
        ...userData,
        uid: user.uid,
        emailVerified: user.emailVerified
      }
    };
  } catch (error) {
    console.error('Login error:', error);

    let errorMessage = 'Login failed. Please try again.';

    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email.';
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
