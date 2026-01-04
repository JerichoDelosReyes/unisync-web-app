import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { auth, db } from '../config/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'

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
  const profileUnsubscribeRef = useRef(null)

  // Fetch user profile from Firestore (one-time)
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
      setError('Failed to load user profile')
      return null
    }
  }

  // Subscribe to real-time profile updates (for officer/adviser changes)
  const subscribeToProfile = (uid) => {
    // Unsubscribe from previous listener if exists
    if (profileUnsubscribeRef.current) {
      profileUnsubscribeRef.current()
    }

    const userDocRef = doc(db, 'users', uid)
    profileUnsubscribeRef.current = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const profile = { id: docSnapshot.id, ...docSnapshot.data() }
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
    }, (err) => {
      console.error('Error in profile listener:', err)
    })
  }

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true)
      setError(null)

      if (firebaseUser) {
        setUser(firebaseUser)
        
        // Only fetch profile if email is verified
        if (firebaseUser.emailVerified) {
          // Initial fetch
          await fetchUserProfile(firebaseUser.uid)
          
          // Subscribe to real-time updates for officer/adviser changes
          subscribeToProfile(firebaseUser.uid)
        }
      } else {
        setUser(null)
        setUserProfile(null)
        // Cleanup profile listener
        if (profileUnsubscribeRef.current) {
          profileUnsubscribeRef.current()
          profileUnsubscribeRef.current = null
        }
      }

      setLoading(false)
    })

    return () => {
      unsubscribe()
      // Cleanup profile listener on unmount
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current()
      }
    }
  }, [])

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
    
    // Computed
    isAuthenticated: !!user && !!userProfile,
    isEmailVerified: user?.emailVerified || false,
    
    // Role checks
    hasMinRole,
    hasRole,
    canAssignRole,
    getAssignableRoles,
    
    // Actions
    refreshProfile
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
