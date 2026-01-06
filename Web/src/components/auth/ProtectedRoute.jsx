import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, ROLES } from '../../contexts/AuthContext'

/**
 * ProtectedRoute Component
 * 
 * Guards routes based on authentication and role requirements.
 * Redirects to login if not authenticated.
 * Redirects to unauthorized page if role requirement not met.
 * 
 * @param {React.ReactNode} children - The component to render if authorized
 * @param {string} requiredRole - Minimum role required (optional)
 * @param {string[]} allowedRoles - Specific roles allowed (optional)
 */
export default function ProtectedRoute({ 
  children, 
  requiredRole = null,
  allowedRoles = null 
}) {
  const { user, userProfile, loading, isEmailVerified, hasMinRole, hasRole } = useAuth()
  const location = useLocation()

  // Show simple loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  // Email not verified - redirect to auth page
  if (!isEmailVerified) {
    return <Navigate to="/auth" state={{ from: location, message: 'Please verify your email first.' }} replace />
  }

  // No user profile yet - show simple loading
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Check if specific roles are allowed
  if (allowedRoles && allowedRoles.length > 0) {
    console.log('🔐 Checking allowedRoles:', allowedRoles)
    console.log('👤 User role:', userProfile?.role)
    const hasAllowedRole = allowedRoles.some(role => {
      const result = hasRole(role)
      console.log(`  Checking if user has role "${role}":`, result)
      return result
    })
    console.log('✅ Has allowed role:', hasAllowedRole)
    if (!hasAllowedRole) {
      console.log('❌ ACCESS DENIED - User role not in allowedRoles')
      return <Navigate to="/unauthorized" replace />
    }
  }

  // Check minimum role requirement
  if (requiredRole && !hasMinRole(requiredRole)) {
    console.log('❌ ACCESS DENIED - Does not meet minimum role:', requiredRole)
    return <Navigate to="/unauthorized" replace />
  }

  // All checks passed - render the protected content
  return children
}

/**
 * Role-specific route guard components for convenience
 */

// Only Super Admin
export function SuperAdminRoute({ children }) {
  return (
    <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
      {children}
    </ProtectedRoute>
  )
}

// Admin and above (Super Admin, Admin)
export function AdminRoute({ children }) {
  return (
    <ProtectedRoute requiredRole={ROLES.ADMIN}>
      {children}
    </ProtectedRoute>
  )
}

// Faculty and above (Super Admin, Admin, Faculty)
export function FacultyRoute({ children }) {
  return (
    <ProtectedRoute requiredRole={ROLES.FACULTY}>
      {children}
    </ProtectedRoute>
  )
}

// Any authenticated user
export function AuthenticatedRoute({ children }) {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  )
}
