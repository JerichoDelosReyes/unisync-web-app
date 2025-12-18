import { useState } from 'react'
import Button from './Button.jsx'
import Toast from './Toast.jsx'
import TextInput from '../forms/TextInput.jsx'
import { 
  validateCvsuEmail, 
  sendPasswordReset,
  ALLOWED_DOMAIN 
} from '../../services/authService.js'

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('')
  const [toast, setToast] = useState({ show: false, message: '', kind: 'info' })
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  // Reset state when modal opens
  const resetState = () => {
    setEmail('')
    setEmailError('')
    setEmailSent(false)
    setToast({ show: false, message: '', kind: 'info' })
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const showToast = (message, kind = 'info') => {
    setToast({ show: true, message, kind })
    setTimeout(() => setToast({ show: false, message: '', kind: 'info' }), 4000)
  }

  // Handle email submission
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setEmailError('')

    // Validate email
    const emailValidation = validateCvsuEmail(email)
    if (!emailValidation.valid) {
      setEmailError(emailValidation.error)
      setIsLoading(false)
      return
    }

    try {
      // Send Firebase password reset email
      const result = await sendPasswordReset(email)
      
      if (result.success) {
        setEmailSent(true)
      } else {
        showToast(result.error, 'warning')
      }
    } catch (error) {
      showToast('Failed to send reset email. Please try again.', 'warning')
    }

    setIsLoading(false)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 backdrop-blur-sm bg-black/30"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md pointer-events-auto">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Toast */}
          {toast.show && (
            <div className="mb-4">
              <Toast kind={toast.kind} message={toast.message} />
            </div>
          )}

          {!emailSent ? (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password?</h2>
                <p className="text-gray-600">
                  Enter your CvSU email address and we'll send you a link to reset your password.
                </p>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailSubmit}>
                <div className="mb-6">
                  <TextInput
                    id="reset-email"
                    label="Email Address"
                    type="email"
                    placeholder={`you@${ALLOWED_DOMAIN}`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setEmailError('')
                    }}
                    error={emailError}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !email}
                    className="flex-1"
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
                <p className="text-gray-600 mb-6">
                  We've sent a password reset link to<br />
                  <span className="font-medium text-primary">{email}</span>
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEmailSent(false)}
                    className="flex-1"
                  >
                    Try Again
                  </Button>
                  <Button
                    type="button"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
