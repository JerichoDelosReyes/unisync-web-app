import React, { createContext, useContext, useState, useEffect } from 'react';
import { signIn, signUp, logOut, onAuthChange, resendVerificationEmail, reloadUser } from '../services/authService';
import { getUserProfile, createUserProfile, subscribeToUserProfile } from '../services/firestoreService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    let unsubscribeProfile = null;
    
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      // Cleanup previous profile subscription
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      
      if (firebaseUser) {
        // Check if admin (admins bypass email verification)
        const isAdmin = firebaseUser.email.toLowerCase().includes('admin');
        const isVerified = firebaseUser.emailVerified || isAdmin;
        
        // Check email verification status
        setEmailVerified(isVerified);
        setUser(firebaseUser);
        
        // Only create/fetch profile if email is verified (or admin)
        if (isVerified) {
          try {
            // Check if profile exists
            let profile = await getUserProfile(firebaseUser.uid);
            
            if (!profile) {
              // Create profile only when email is verified (or admin)
              const role = detectRole(firebaseUser.email);
              profile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName || firebaseUser.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                role,
                department: 'DIT',
                avatar: firebaseUser.photoURL || null,
                emailVerified: isVerified,
                createdAt: new Date(),
              };
              await createUserProfile(firebaseUser.uid, profile);
            }
            
            // Subscribe to real-time profile updates
            unsubscribeProfile = subscribeToUserProfile(firebaseUser.uid, (updatedProfile) => {
              setUserProfile(updatedProfile);
            });
            
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        } else {
          // User not verified, don't create profile
          setUserProfile(null);
        }
      } else {
        // User is signed out
        setUser(null);
        setUserProfile(null);
        setEmailVerified(false);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => {
      unsubscribe();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  // Validate CvSU email
  const validateEmail = (email) => {
    return email.endsWith('@cvsu.edu.ph');
  };

  // Detect role from email
  const detectRole = (email) => {
    const emailLower = email.toLowerCase();
    if (emailLower.includes('admin')) return 'admin';
    if (emailLower.includes('faculty') || emailLower.includes('prof')) return 'faculty';
    if (emailLower.includes('guard') || emailLower.includes('security')) return 'guard';
    return 'student';
  };

  // Check if admin (admins bypass email verification)
  const isAdminEmail = (email) => {
    return email.toLowerCase().includes('admin');
  };

  // Login with Firebase
  const login = async (email, password) => {
    // Validate institutional email
    if (!validateEmail(email)) {
      throw new Error('Please use your @cvsu.edu.ph email address');
    }

    try {
      const firebaseUser = await signIn(email, password);
      return firebaseUser;
    } catch (error) {
      // Handle Firebase auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          throw new Error('No account found with this email');
        case 'auth/wrong-password':
          throw new Error('Incorrect password');
        case 'auth/invalid-email':
          throw new Error('Invalid email address');
        case 'auth/too-many-requests':
          throw new Error('Too many attempts. Please try again later');
        default:
          throw new Error(error.message || 'Login failed');
      }
    }
  };

  // Register new user with Firebase
  const register = async (email, password, name) => {
    if (!validateEmail(email)) {
      throw new Error('Please use your @cvsu.edu.ph email address');
    }

    try {
      // Only create Firebase Auth user and send verification email
      // Profile will be created in Firestore AFTER email verification
      const firebaseUser = await signUp(email, password, name);
      return firebaseUser;
    } catch (error) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          throw new Error('Email already registered');
        case 'auth/weak-password':
          throw new Error('Password should be at least 6 characters');
        default:
          throw new Error(error.message || 'Registration failed');
      }
    }
  };

  // Resend verification email
  const resendVerification = async () => {
    try {
      const sent = await resendVerificationEmail();
      if (sent) {
        return true;
      }
      throw new Error('No user to send verification to');
    } catch (error) {
      if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many requests. Please wait before trying again.');
      }
      throw new Error(error.message || 'Failed to resend verification email');
    }
  };

  // Check verification status
  const checkEmailVerification = async () => {
    try {
      const refreshedUser = await reloadUser();
      if (refreshedUser) {
        setEmailVerified(refreshedUser.emailVerified);
        setUser(refreshedUser);
        return refreshedUser.emailVerified;
      }
      return false;
    } catch (error) {
      console.error('Error checking verification:', error);
      return false;
    }
  };

  // Logout with Firebase
  const logout = async () => {
    try {
      await logOut();
      setUser(null);
      setUserProfile(null);
      setEmailVerified(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = (updates) => {
    const updatedProfile = { ...userProfile, ...updates };
    setUserProfile(updatedProfile);
  };

  const value = {
    user,
    userProfile,
    loading,
    emailVerified,
    login,
    logout,
    register,
    updateUser,
    resendVerification,
    checkEmailVerification,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
