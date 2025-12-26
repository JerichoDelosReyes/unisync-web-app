import React from 'react'

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 * 
 * Specifically handles:
 * - Firebase Auth errors that occur during rendering
 * - Session expiry errors
 * - Network errors during app bootstrap
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      errorType: 'unknown' // 'auth', 'network', 'unknown'
    }
  }

  static getDerivedStateFromError(error) {
    // Determine error type
    let errorType = 'unknown'
    
    if (error?.code?.startsWith('auth/')) {
      errorType = 'auth'
    } else if (
      error?.code === 'auth/network-request-failed' ||
      error?.message?.includes('network') ||
      error?.message?.includes('fetch')
    ) {
      errorType = navigator.onLine ? 'auth' : 'network'
    }

    return { 
      hasError: true, 
      error,
      errorType
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' })
  }

  handleLogin = () => {
    // Clear any stored auth state and redirect to login
    localStorage.removeItem('unisync_current_user')
    window.location.href = '/auth'
  }

  render() {
    if (this.state.hasError) {
      const { errorType } = this.state
      
      // Session expired or auth error
      if (errorType === 'auth') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Session Expired</h1>
              <p className="text-gray-600 mb-6">
                Your session has expired due to inactivity. Please sign in again to continue.
              </p>
              <button
                onClick={this.handleLogin}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Sign In Again
              </button>
            </div>
          </div>
        )
      }
      
      // Network error (actually offline)
      if (errorType === 'network' && !navigator.onLine) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">You're Offline</h1>
              <p className="text-gray-600 mb-6">
                Please check your internet connection and try again.
              </p>
              <button
                onClick={this.handleRetry}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )
      }
      
      // Unknown error
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Something Went Wrong</h1>
            <p className="text-gray-600 mb-6">
              An unexpected error occurred. Please try again or sign in again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Retry
              </button>
              <button
                onClick={this.handleLogin}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
