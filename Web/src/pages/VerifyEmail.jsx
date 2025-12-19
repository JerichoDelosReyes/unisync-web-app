import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  isEmailSignInLink, 
  completeEmailVerification,
  getPendingRegistration,
  clearPendingRegistration 
} from '../services/authService.js'

/**
 * Email Verification Page
 * 
 * This page handles the email verification link callback.
 * When user clicks the verification link in their email, they're redirected here.
 * The page then completes the registration process (creates Auth account + Firestore doc).
 */
export default function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const [status, setStatus] = useState('verifying') // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('Verifying your email...')
  const [errorDetails, setErrorDetails] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const fullUrl = window.location.href
        console.log('🔍 Checking email verification link:', fullUrl)

        // Check if this is a valid email sign-in link
        if (!isEmailSignInLink(fullUrl)) {
          console.log('❌ Not a valid email sign-in link')
          setStatus('error')
          setMessage('Invalid verification link')
          setErrorDetails('This link is not valid. Please try signing up again.')
          return
        }

        // Check for pending registration data
        const pendingData = getPendingRegistration()
        if (!pendingData) {
          console.log('❌ No pending registration data found')
          setStatus('error')
          setMessage('Registration data not found')
          setErrorDetails('Your registration session has expired. Please sign up again.')
          return
        }

        console.log('✅ Valid verification link, completing registration...')
        setMessage('Creating your account...')

        // Complete the registration (creates Auth account + Firestore doc)
        const result = await completeEmailVerification(fullUrl)

        if (result.success) {
          console.log('✅ Registration completed successfully')
          setStatus('success')
          setMessage('Account created successfully!')
          
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/dashboard')
          }, 2000)
        } else {
          console.log('❌ Registration failed:', result.error)
          setStatus('error')
          setMessage('Verification failed')
          setErrorDetails(result.error)
        }
      } catch (error) {
        console.error('❌ Verification error:', error)
        setStatus('error')
        setMessage('Something went wrong')
        setErrorDetails(error.message || 'Please try signing up again.')
      }
    }

    verifyEmail()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Status Icon */}
          {status === 'verifying' && (
            <div className="w-16 h-16 mx-auto mb-6">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          
          {status === 'error' && (
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}

          {/* Message */}
          <h1 className={`text-2xl font-bold mb-2 ${
            status === 'success' ? 'text-green-700' : 
            status === 'error' ? 'text-red-700' : 
            'text-gray-900'
          }`}>
            {message}
          </h1>

          {/* Error Details */}
          {status === 'error' && errorDetails && (
            <p className="text-gray-600 mb-6">{errorDetails}</p>
          )}

          {/* Success Details */}
          {status === 'success' && (
            <p className="text-gray-600 mb-6">Redirecting you to the dashboard...</p>
          )}

          {/* Verifying Details */}
          {status === 'verifying' && (
            <p className="text-gray-600">Please wait while we verify your email and create your account.</p>
          )}

          {/* Action Buttons */}
          {status === 'error' && (
            <div className="space-y-3 mt-6">
              <button
                onClick={() => navigate('/auth/signup')}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Sign Up Again
              </button>
              <button
                onClick={() => navigate('/auth/login')}
                className="w-full px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
