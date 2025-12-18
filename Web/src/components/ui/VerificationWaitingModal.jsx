import { useState, useEffect, useRef } from 'react'
import { auth } from '../../config/firebase'
import { resendVerificationEmail } from '../../services/authService'

export default function VerificationWaitingModal({ 
  email, 
  onVerified, 
  onClose 
}) {
  const [isChecking, setIsChecking] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const hasVerified = useRef(false)

  // Poll for email verification status
  useEffect(() => {
    let interval = null
    
    const checkVerification = async () => {
      if (!auth.currentUser || hasVerified.current || isProcessing) return
      
      try {
        await auth.currentUser.reload()
        
        if (auth.currentUser.emailVerified && !hasVerified.current) {
          hasVerified.current = true
          setIsProcessing(true)
          setMessage('Email verified! Creating your account...')
          
          // Clear interval immediately
          if (interval) clearInterval(interval)
          
          // Call onVerified after a short delay
          setTimeout(async () => {
            await onVerified()
          }, 1000)
        }
      } catch (error) {
        console.error('Error checking verification:', error)
      }
    }

    // Check every 3 seconds
    interval = setInterval(checkVerification, 3000)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [onVerified, isProcessing])

  // Handle cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Manual check button
  const handleManualCheck = async () => {
    if (!auth.currentUser) {
      setMessage('Session expired. Please close and try signing in.')
      return
    }
    
    if (hasVerified.current || isProcessing) return
    
    setIsChecking(true)
    setMessage('')
    
    try {
      await auth.currentUser.reload()
      
      console.log('Email verified status:', auth.currentUser.emailVerified)
      
      if (auth.currentUser.emailVerified) {
        hasVerified.current = true
        setIsProcessing(true)
        setMessage('Email verified! Creating your account...')
        setIsChecking(false)
        
        // Call onVerified after showing the message
        setTimeout(async () => {
          await onVerified()
        }, 1000)
      } else {
        setMessage('Email not verified yet. Please click the link in your email and try again.')
        setIsChecking(false)
      }
    } catch (error) {
      console.error('Error checking verification:', error)
      setMessage('Error checking verification. Please try again.')
      setIsChecking(false)
    }
  }

  // Resend verification email
  const handleResend = async () => {
    setResendLoading(true)
    setMessage('')
    
    const result = await resendVerificationEmail()
    
    setResendLoading(false)
    
    if (result.success) {
      setMessage('Verification email sent! Check your inbox.')
      setResendCooldown(60) // 60 second cooldown
    } else {
      setMessage(result.error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a5f3a] to-[#0d4028] px-6 py-8 text-center">
          {/* Email Icon with Animation */}
          <div className="relative inline-flex items-center justify-center">
            {!isProcessing && (
              <div className="absolute w-20 h-20 bg-white/20 rounded-full animate-ping" />
            )}
            <div className={`relative rounded-full p-4 ${isProcessing ? 'bg-green-500' : 'bg-white/20'}`}>
              {isProcessing ? (
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mt-4">
            {isProcessing ? 'Email Verified!' : 'Verify Your Email'}
          </h2>
          <p className="text-white/80 text-sm mt-2">
            {isProcessing ? 'Creating your account...' : "We've sent a verification link to"}
          </p>
          {!isProcessing && <p className="text-white font-medium mt-1">{email}</p>}
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {isProcessing ? (
            /* Processing state - show loading */
            <div className="flex flex-col items-center justify-center py-8">
              <div className="flex gap-1 mb-4">
                <div className="w-3 h-3 bg-[#1a5f3a] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 bg-[#1a5f3a] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 bg-[#1a5f3a] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-gray-600 font-medium">Setting up your account...</p>
              <p className="text-gray-400 text-sm mt-2">Please wait, this may take a moment.</p>
            </div>
          ) : (
            <>
              {/* Important Note */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-amber-800 text-sm font-medium text-center">
                  ⚠️ Your account will only be created after email verification
                </p>
              </div>
          
          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-[#1a5f3a]/10 rounded-full p-1.5 mt-0.5">
                <span className="text-[#1a5f3a] text-sm font-bold">1</span>
              </div>
              <p className="text-gray-600 text-sm">Check your email inbox (and spam folder)</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-[#1a5f3a]/10 rounded-full p-1.5 mt-0.5">
                <span className="text-[#1a5f3a] text-sm font-bold">2</span>
              </div>
              <p className="text-gray-600 text-sm">Click the verification link in the email</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-[#1a5f3a]/10 rounded-full p-1.5 mt-0.5">
                <span className="text-[#1a5f3a] text-sm font-bold">3</span>
              </div>
              <p className="text-gray-600 text-sm">Your account will be created automatically</p>
            </div>
          </div>

          {/* Waiting Animation */}
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-[#1a5f3a] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-[#1a5f3a] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-[#1a5f3a] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-gray-500 text-sm">Waiting for verification...</span>
          </div>

          {/* Message */}
          {message && (
            <div className={`text-center text-sm p-3 rounded-lg ${
              message.includes('sent') || message.includes('success') 
                ? 'bg-green-50 text-green-700' 
                : 'bg-amber-50 text-amber-700'
            }`}>
              {message}
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-3">
            {/* Check Now Button */}
            <button
              onClick={handleManualCheck}
              disabled={isChecking}
              className="w-full py-3 px-4 bg-[#1a5f3a] text-white rounded-lg font-medium hover:bg-[#0d4028] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isChecking ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Checking...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  I've Verified My Email
                </>
              )}
            </button>

            {/* Resend Button */}
            <button
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0}
              className="w-full py-3 px-4 border-2 border-gray-200 text-gray-600 rounded-lg font-medium hover:border-[#1a5f3a] hover:text-[#1a5f3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendLoading ? (
                'Sending...'
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                'Resend Verification Email'
              )}
            </button>
          </div>

          {/* Cancel Link */}
          <div className="text-center pt-2">
            <button
              onClick={onClose}
              className="text-gray-500 text-sm hover:text-gray-700 hover:underline"
            >
              Cancel and try a different email
            </button>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
