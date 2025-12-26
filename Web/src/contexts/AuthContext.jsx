import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { auth, db } from '../config/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

// ============================================
// ROLE HIERARCHY (Per Ruleset - Strict Order)
// ============================================
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  FACULTY: 'faculty',
  CLASS_REP: 'class_rep',
  STUDENT: 'student'
}

// Role hierarchy level (higher number = more permissions)
export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 5,
  [ROLES.ADMIN]: 4,
  [ROLES.FACULTY]: 3,
  [ROLES.CLASS_REP]: 2,
  [ROLES.STUDENT]: 1
}

// Role display names
export const ROLE_DISPLAY_NAMES = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.FACULTY]: 'Faculty',
  [ROLES.CLASS_REP]: 'Class Representative',
  [ROLES.STUDENT]: 'Student'
}

// ============================================
// AUTH CONTEXT
// ============================================
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [authError, setAuthError] = useState(null)

  // Network status detection
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network: Online')
      setIsOnline(true)
    }
    const handleOffline = () => {
      console.log('Network: Offline')
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Handle auth errors - sign out and redirect
  const handleAuthError = useCallback(async (error) => {
    console.error('Auth error detected:', error.code, error.message)
    
    // Check if this is a token/session error vs network error
    const sessionErrors = [
      'auth/user-token-expired',
      'auth/id-token-expired', 
      'auth/invalid-user-token',
      'auth/user-disabled',
      'auth/requires-recent-login'
    ]
    
    if (sessionErrors.includes(error.code)) {
      setAuthError('Your session has expired. Please sign in again.')
      try {
        await signOut(auth)
      } catch (e) {
        console.error('Error signing out:', e)
      }
      setUser(null)
      setUserProfile(null)
      return
    }
    
    // For network errors, check if we're actually online
    if (error.code === 'auth/network-request-failed') {
      if (navigator.onLine) {
        // We're online but Firebase failed - likely a session issue
        setAuthError('Connection error. Please try signing in again.')
        try {
          await signOut(auth)
        } catch (e) {
          console.error('Error signing out:', e)
        }
        setUser(null)
        setUserProfile(null)
      } else {
        // Actually offline
        setIsOnline(false)
      }
    }
  }, [])

  // Clear auth error
  const clearAuthError = useCallback(() => {
    setAuthError(null)
  }, [])

  // Fetch user profile from Firestore
  const fetchUserProfile = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (userDoc.exists()) {
        const profile = { id: userDoc.id, ...userDoc.data() }
        setUserProfile(profile)
        return profile
      } else {
        console.warn('User profile not found in Firestore')
        setUserProfile(null)
        return null
      }
    } catch (err) {
      console.error('Error fetching user profile:', err)
      // Check if this is an auth-related error
      if (err.code && err.code.startsWith('auth/')) {
        handleAuthError(err)
      } else {
        setError('Failed to load user profile')
      }
      return null
    }
  }

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth, 
      async (firebaseUser) => {
        setLoading(true)
        setError(null)
        setAuthError(null)

        if (firebaseUser) {
          setUser(firebaseUser)
          
          // Only fetch profile if email is verified
          if (firebaseUser.emailVerified) {
            await fetchUserProfile(firebaseUser.uid)
          }
        } else {
          setUser(null)
          setUserProfile(null)
        }

        setLoading(false)
      },
      (error) => {
        // Handle auth state change errors
        console.error('Auth state change error:', error)
        handleAuthError(error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [handleAuthError])

  // Check if user has minimum required role
  const hasMinRole = (requiredRole) => {
    if (!userProfile?.role) return false
    const userLevel = ROLE_HIERARCHY[userProfile.role] || 0
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0
    return userLevel >= requiredLevel
  }

  // Check if user has exact role
  const hasRole = (role) => {
    return userProfile?.role === role
  }

  // Check if user can assign a specific role (based on hierarchy)
  const canAssignRole = (targetRole) => {
    if (!userProfile?.role) return false
    
    const currentRole = userProfile.role
    const currentLevel = ROLE_HIERARCHY[currentRole] || 0
    const targetLevel = ROLE_HIERARCHY[targetRole] || 0

    // Super Admin can assign Admin and below
    if (currentRole === ROLES.SUPER_ADMIN) {
      return targetLevel <= ROLE_HIERARCHY[ROLES.ADMIN]
    }
    
    // Admin can assign Faculty and below
    if (currentRole === ROLES.ADMIN) {
      return targetLevel <= ROLE_HIERARCHY[ROLES.FACULTY]
    }
    
    // Faculty can assign Class Rep and Student
    if (currentRole === ROLES.FACULTY) {
      return targetLevel <= ROLE_HIERARCHY[ROLES.CLASS_REP]
    }

    return false
  }

  // Get assignable roles for current user
  const getAssignableRoles = () => {
    if (!userProfile?.role) return []
    
    const currentRole = userProfile.role
    
    if (currentRole === ROLES.SUPER_ADMIN) {
      return [ROLES.ADMIN, ROLES.FACULTY, ROLES.CLASS_REP, ROLES.STUDENT]
    }
    
    if (currentRole === ROLES.ADMIN) {
      return [ROLES.FACULTY, ROLES.CLASS_REP, ROLES.STUDENT]
    }
    
    if (currentRole === ROLES.FACULTY) {
      return [ROLES.CLASS_REP, ROLES.STUDENT]
    }

    return []
  }

  // Refresh user profile
  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.uid)
    }
  }

  const value = {
    // State
    user,
    userProfile,
    loading,
    error,
    isOnline,
    authError,
    
    // Computed
    isAuthenticated: !!user && !!userProfile,
    isEmailVerified: user?.emailVerified || false,
    
    // Role checks
    hasMinRole,
    hasRole,
    canAssignRole,
    getAssignableRoles,
    
    // Actions
    refreshProfile,
    clearAuthError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
