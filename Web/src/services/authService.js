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
  browserLocalPersistence
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { notifyWelcome } from './notificationService';
import { createLog, LOG_CATEGORIES, LOG_ACTIONS } from './logService';

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
  STUDENT: 'student'
};

// Default role for new registrations
export const DEFAULT_ROLE = USER_ROLES.STUDENT;

// Login attempt tracking
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60000; // 1 minute lockout
const LOGIN_ATTEMPTS_KEY = 'unisync_login_attempts';

/**
 * Get login attempts data from localStorage
 */
const getLoginAttempts = (email) => {
  const key = `${LOGIN_ATTEMPTS_KEY}_${email.toLowerCase()}`;
  const data = localStorage.getItem(key);
  if (!data) return { attempts: 0, lockoutUntil: null };
  return JSON.parse(data);
};

/**
 * Save login attempts data to localStorage
 */
const saveLoginAttempts = (email, attempts, lockoutUntil = null) => {
  const key = `${LOGIN_ATTEMPTS_KEY}_${email.toLowerCase()}`;
  localStorage.setItem(key, JSON.stringify({ attempts, lockoutUntil }));
};

/**
 * Clear login attempts for an email (called on successful login)
 */
export const clearLoginAttempts = (email) => {
  const key = `${LOGIN_ATTEMPTS_KEY}_${email.toLowerCase()}`;
  localStorage.removeItem(key);
};

/**
 * Check if user is locked out from login attempts
 * @returns {{ isLocked: boolean, remainingTime: number, attemptsLeft: number }}
 */
export const checkLoginLockout = (email) => {
  const { attempts, lockoutUntil } = getLoginAttempts(email);
  
  if (lockoutUntil) {
    const now = Date.now();
    if (now < lockoutUntil) {
      return {
        isLocked: true,
        remainingTime: Math.ceil((lockoutUntil - now) / 1000),
        attemptsLeft: 0
      };
    } else {
      // Lockout expired, reset attempts
      clearLoginAttempts(email);
      return { isLocked: false, remainingTime: 0, attemptsLeft: MAX_LOGIN_ATTEMPTS };
    }
  }
  
  return {
    isLocked: false,
    remainingTime: 0,
    attemptsLeft: MAX_LOGIN_ATTEMPTS - attempts
  };
};

/**
 * Record a failed login attempt
 * @returns {{ isLocked: boolean, remainingTime: number, attemptsLeft: number }}
 */
export const recordFailedLoginAttempt = (email) => {
  const { attempts } = getLoginAttempts(email);
  const newAttempts = attempts + 1;
  
  if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
    saveLoginAttempts(email, newAttempts, lockoutUntil);
    return {
      isLocked: true,
      remainingTime: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      attemptsLeft: 0
    };
  }
  
  saveLoginAttempts(email, newAttempts);
  return {
    isLocked: false,
    remainingTime: 0,
    attemptsLeft: MAX_LOGIN_ATTEMPTS - newAttempts
  };
};

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
    const { email, password, givenName, middleName, lastName, suffix } = userData;

    // Create user in Firebase Auth (password is automatically encrypted)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Build display name with middle initial
    const middleInitial = middleName ? `${middleName.charAt(0).toUpperCase()}.` : '';
    let displayName = givenName;
    if (middleInitial) displayName += ` ${middleInitial}`;
    displayName += ` ${lastName}`;
    if (suffix) displayName += `, ${suffix}`;

    // Store full name data as JSON in photoURL temporarily (Firebase Auth has limited custom fields)
    // This will be parsed when creating the Firestore profile on first login
    const nameData = JSON.stringify({ givenName, middleName: middleName || '', lastName, suffix: suffix || '' });

    // Update display name and store name data
    await updateProfile(user, {
      displayName,
      photoURL: `namedata:${nameData}` // Prefix to identify this is name data, not a real photo URL
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

    // Log user registration (user is authenticated at this point)
    try {
      await createLog({
        category: LOG_CATEGORIES.AUTH,
        action: LOG_ACTIONS.REGISTER,
        performedBy: {
          uid: user.uid,
          email: email,
          name: displayName
        },
        details: { email, givenName, lastName },
        description: `User registered: ${displayName} (${email})`
      });
      console.log('✅ Registration log created');
    } catch (logError) {
      console.error('Failed to create registration log:', logError);
      // Don't fail registration just because logging failed
    }

    // Keep user signed in so the verification modal can poll for email verification status
    // User will be signed out after verification is complete or modal is closed

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

    // Force refresh the ID token to get updated email_verified claim
    // This is required for Firestore security rules to see the verified status
    console.log('Refreshing ID token...');
    await user.getIdToken(true);
    
    // Small delay to ensure token propagation to Firestore
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Refresh token again to ensure it's fully propagated
    await user.getIdToken(true);
    console.log('ID token refreshed successfully');

    const { givenName, middleName, lastName, suffix, email } = userData;

    // Check if user document already exists
    console.log('Checking if user document exists...');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      console.log('User document already exists');
      return { success: true, message: 'Account already exists.' };
    }

    // Store user data in Firestore with default Student role
    // Retry mechanism for token propagation issues
    console.log('Creating user document in Firestore...');
    
    // Get middle initial (e.g., "Gabales" -> "G.")
    const middleInitial = middleName ? `${middleName.charAt(0).toUpperCase()}.` : '';
    
    // Build display name: "Juan G. Dela Cruz, Jr." format
    let displayName = givenName;
    if (middleInitial) displayName += ` ${middleInitial}`;
    displayName += ` ${lastName}`;
    if (suffix) displayName += `, ${suffix}`;
    
    const userDocData = {
      uid: user.uid,
      email: email.toLowerCase(),
      givenName,
      middleName: middleName || '', // Store full middle name
      lastName,
      suffix: suffix || '', // Store suffix (empty string if none)
      displayName,
      role: DEFAULT_ROLE, // Default: student (per ruleset)
      tags: [], // Empty tags array (tags are labels, not permissions)
      isVerified: true,
      emailVerified: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Retry up to 3 times with increasing delays
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await setDoc(doc(db, 'users', user.uid), userDocData);
        console.log('✅ User document created in Firestore');
        
        // Send welcome notification
        try {
          await notifyWelcome(user.uid, givenName);
        } catch (notifyError) {
          console.error('Error sending welcome notification:', notifyError);
          // Don't fail registration if notification fails
        }
        
        return {
          success: true,
          message: 'Account created successfully!'
        };
      } catch (writeError) {
        lastError = writeError;
        console.warn(`Attempt ${attempt} failed:`, writeError.message);
        
        if (attempt < 3 && writeError.code === 'permission-denied') {
          // Wait and refresh token before retry
          console.log(`Waiting and refreshing token before retry ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          await user.getIdToken(true);
        } else {
          throw writeError;
        }
      }
    }
    
    throw lastError;
  } catch (error) {
    console.error('Complete registration error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Check for permission error
    if (error.code === 'permission-denied') {
      return { 
        success: false, 
        error: 'Database setup in progress. Please try signing in - your account will be created automatically.' 
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
 * - Always uses LOCAL persistence to keep user signed in across browser sessions
 * - User must explicitly sign out to log out
 * - Tracks failed login attempts and enforces cooldown
 * @param {string} email - User email
 * @param {string} password - User password
 */
export const loginUser = async (email, password) => {
  try {
    // Check if user is locked out
    const lockoutStatus = checkLoginLockout(email);
    if (lockoutStatus.isLocked) {
      return {
        success: false,
        error: `Too many failed attempts. Please try again in ${lockoutStatus.remainingTime} seconds.`,
        isLocked: true,
        remainingTime: lockoutStatus.remainingTime
      };
    }

    // Always use LOCAL persistence - user stays signed in even after browser close/refresh
    // User must explicitly sign out to log out
    await setPersistence(auth, browserLocalPersistence);

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
    let userDoc = await getDoc(doc(db, 'users', user.uid));

    // If user profile doesn't exist but email is verified, create it automatically
    // This handles cases where user verified email but didn't complete registration flow
    if (!userDoc.exists()) {
      console.log('📝 User profile not found, creating automatically...');
      
      // Force refresh token to ensure Firestore sees verified status
      await user.getIdToken(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await user.getIdToken(true);
      
      // Try to extract full name data from photoURL (stored during registration)
      let givenName = 'User';
      let middleName = '';
      let lastName = '';
      let suffix = '';
      let displayName = user.displayName || '';
      
      if (user.photoURL && user.photoURL.startsWith('namedata:')) {
        try {
          const nameDataJson = user.photoURL.replace('namedata:', '');
          const nameData = JSON.parse(nameDataJson);
          givenName = nameData.givenName || 'User';
          middleName = nameData.middleName || '';
          lastName = nameData.lastName || '';
          suffix = nameData.suffix || '';
          
          // Build proper display name
          const middleInitial = middleName ? `${middleName.charAt(0).toUpperCase()}.` : '';
          displayName = givenName;
          if (middleInitial) displayName += ` ${middleInitial}`;
          displayName += ` ${lastName}`;
          if (suffix) displayName += `, ${suffix}`;
        } catch (parseError) {
          console.warn('Failed to parse name data, falling back to displayName:', parseError);
          // Fallback to parsing displayName
          const nameParts = displayName.trim().split(' ');
          givenName = nameParts[0] || 'User';
          lastName = nameParts.slice(1).join(' ') || '';
        }
      } else {
        // Fallback to parsing displayName
        const nameParts = displayName.trim().split(' ');
        givenName = nameParts[0] || 'User';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      // Retry mechanism for token propagation
      let profileCreated = false;
      for (let attempt = 1; attempt <= 3 && !profileCreated; attempt++) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email.toLowerCase(),
            givenName,
            middleName,
            lastName,
            suffix,
            displayName: displayName || givenName,
            role: DEFAULT_ROLE,
            tags: [],
            isVerified: true,
            emailVerified: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          // Clear the temporary photoURL after profile is created
          try {
            await updateProfile(user, { photoURL: null });
          } catch (clearError) {
            console.warn('Failed to clear temporary photoURL:', clearError);
          }
          
          console.log('✅ User profile created automatically');
          profileCreated = true;
          
          // Re-fetch the user document
          userDoc = await getDoc(doc(db, 'users', user.uid));
        } catch (createError) {
          console.warn(`Attempt ${attempt} to create profile failed:`, createError.message);
          
          if (attempt < 3 && createError.code === 'permission-denied') {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            await user.getIdToken(true);
          } else {
            console.error('❌ Failed to create user profile:', createError);
            await signOut(auth);
            return { success: false, error: 'Failed to create user profile. Please try again in a moment.' };
          }
        }
      }
    }

    const userData = userDoc.data();

    // Update Firestore to mark email as verified and record login
    await updateDoc(doc(db, 'users', user.uid), {
      emailVerified: true,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Log successful login
    try {
      await createLog({
        category: LOG_CATEGORIES.AUTH,
        action: LOG_ACTIONS.LOGIN,
        performedBy: {
          uid: user.uid,
          email: user.email,
          name: userData.displayName || `${userData.givenName} ${userData.lastName}`
        },
        details: {
          role: userData.role
        },
        description: 'User logged in successfully'
      });
    } catch (logError) {
      console.error('Failed to create login log:', logError);
      // Don't fail login if logging fails
    }

    // Store current user in localStorage for quick access
    localStorage.setItem('unisync_current_user', JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: userData.role,
      emailVerified: user.emailVerified
    }));

    // Clear failed login attempts on successful login
    clearLoginAttempts(email);

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

    // Note: We cannot log failed login attempts to Firestore since the user is not authenticated
    // Failed login attempts could be logged to a separate analytics service or server-side function
    // For security, we don't expose detailed logging for unauthenticated requests

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

    // Track failed login attempts for invalid credentials
    if (error.code === 'auth/invalid-credential' || 
        error.code === 'auth/wrong-password' || 
        error.code === 'auth/user-not-found') {
      const attemptStatus = recordFailedLoginAttempt(email);
      if (attemptStatus.isLocked) {
        return {
          success: false,
          error: `Too many failed attempts. Please try again in ${attemptStatus.remainingTime} seconds.`,
          isLocked: true,
          remainingTime: attemptStatus.remainingTime
        };
      } else if (attemptStatus.attemptsLeft <= 2) {
        errorMessage += ` (${attemptStatus.attemptsLeft} attempts remaining)`;
      }
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Sign out user
 */
export const logoutUser = async () => {
  try {
    // Get current user info before signing out
    const currentUser = auth.currentUser;
    const storedUser = localStorage.getItem('unisync_current_user');
    const userData = storedUser ? JSON.parse(storedUser) : null;
    
    // Log the logout before signing out
    if (currentUser) {
      await createLog({
        category: LOG_CATEGORIES.AUTH,
        action: LOG_ACTIONS.LOGOUT,
        performedBy: {
          uid: currentUser.uid,
          email: currentUser.email,
          name: userData?.displayName || currentUser.displayName || 'Unknown'
        },
        details: {
          role: userData?.role || 'unknown'
        },
        description: 'User logged out'
      });
    }
    
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
