import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  reload
} from 'firebase/auth';
import { auth } from '../config/firebase';

// Action code settings for email verification
const actionCodeSettings = {
  url: window.location.origin + '/login',
  handleCodeInApp: false,
};

// Sign up new user and send verification email
export const signUp = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update user profile with display name
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    // Send email verification with action code settings
    await sendEmailVerification(userCredential.user, actionCodeSettings);
    
    return userCredential.user;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
};

// Resend verification email
export const resendVerificationEmail = async () => {
  if (auth.currentUser && !auth.currentUser.emailVerified) {
    try {
      await sendEmailVerification(auth.currentUser, actionCodeSettings);
      return true;
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  }
  return false;
};

// Reload user to check verification status
export const reloadUser = async () => {
  if (auth.currentUser) {
    try {
      await reload(auth.currentUser);
      return auth.currentUser;
    } catch (error) {
      console.error('Reload user error:', error);
      throw error;
    }
  }
  return null;
};

// Sign in existing user
export const signIn = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

// Sign out user
export const logOut = async () => {
  await signOut(auth);
};

// Auth state observer
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export default auth;
