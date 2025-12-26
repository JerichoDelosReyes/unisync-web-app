import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

/**
 * Offline Indicator Component
 * 
 * Shows a banner when the user is offline or when there's an auth error.
 * Handles session expiry gracefully by redirecting to login.
 */
export default function OfflineIndicator() {
  const { isOnline, authError, clearAuthError } = useAuth()
  const navigate = useNavigate()

  // If there's an auth error, redirect to login after a short delay
  useEffect(() => {
    if (authError) {
      const timer = setTimeout(() => {
        clearAuthError()
        navigate('/auth', { 
          state: { message: authError },
          replace: true 
        })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [authError, clearAuthError, navigate])

  // Show auth error banner (session expired)
  if (authError) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">{authError}</span>
            <span className="text-amber-100 text-sm">Redirecting to login...</span>
          </div>
          <button
            onClick={() => {
              clearAuthError()
              navigate('/auth', { replace: true })
            }}
            className="text-white hover:text-amber-100 font-medium text-sm underline"
          >
            Sign In Now
          </button>
        </div>
      </div>
    )
  }

  // Show offline banner only when truly offline
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-gray-700 text-white px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          <span className="font-medium">You're offline. Some features may be unavailable.</span>
        </div>
      </div>
    )
  }

  return null
}
