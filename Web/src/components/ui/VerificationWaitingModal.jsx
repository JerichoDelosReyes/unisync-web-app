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
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 z-[99] backdrop-blur-md bg-black/20"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          
          {isProcessing ? (
            /* Processing State - Success */
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
                <svg className="w-10 h-10 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Email Verified!</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Creating your account...</p>
              <div className="flex justify-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : (
            /* Main Content - Horizontal Layout */
            <div className="flex flex-col md:flex-row bg-white dark:bg-gray-800">
              {/* Left Side - Icon & Email */}
              <div className="bg-[#166534] dark:bg-[#0d4028] p-8 md:w-2/5 flex flex-col items-center justify-center text-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 w-16 h-16 bg-white/20 rounded-2xl animate-ping opacity-75" />
                  <div className="relative bg-white/20 rounded-2xl p-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-white font-semibold text-lg mb-1">Check Your Email</h3>
                <p className="text-white/70 text-sm mb-3">We sent a verification link to</p>
                <div className="bg-white/10 rounded-xl px-4 py-2 backdrop-blur-sm">
                  <p className="text-white font-medium text-sm break-all">{email}</p>
                </div>
              </div>
              
              {/* Right Side - Actions */}
              <div className="p-8 md:w-3/5 bg-white dark:bg-gray-800">
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Steps */}
                <div className="space-y-4 mb-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Quick Steps:</h4>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#1a5f3a] text-white rounded-lg flex items-center justify-center text-xs font-bold">1</span>
                    <span className="text-gray-600 dark:text-gray-300">Open your email inbox (check spam too)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#1a5f3a] text-white rounded-lg flex items-center justify-center text-xs font-bold">2</span>
                    <span className="text-gray-600 dark:text-gray-300">Click the verification link</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#1a5f3a] text-white rounded-lg flex items-center justify-center text-xs font-bold">3</span>
                    <span className="text-gray-600 dark:text-gray-300">Come back and click the button below</span>
                  </div>
                </div>

                {/* Status Animation */}
                <div className="flex items-center gap-2 mb-6 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-amber-700 dark:text-amber-300 text-sm font-medium">Waiting for verification...</span>
                </div>

                {/* Message */}
                {message && (
                  <div className={`mb-4 text-center text-sm p-3 rounded-xl ${
                    message.includes('sent') || message.includes('success') || message.includes('verified')
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                      : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    {message}
                  </div>
                )}

                {/* Action Buttons - Horizontal */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleManualCheck}
                    disabled={isChecking}
                    className="flex-1 py-3 px-4 bg-[#1a5f3a] text-white rounded-xl font-medium hover:bg-[#0d4028] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#1a5f3a]/20"
                  >
                    {isChecking ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Checking...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>I've Verified</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleResend}
                    disabled={resendLoading || resendCooldown > 0}
                    className="flex-1 py-3 px-4 border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:border-[#1a5f3a] hover:text-[#1a5f3a] dark:hover:border-primary dark:hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? (
                      'Sending...'
                    ) : resendCooldown > 0 ? (
                      `Resend (${resendCooldown}s)`
                    ) : (
                      'Resend Email'
                    )}
                  </button>
                </div>

                {/* Cancel Link */}
                <p className="text-center mt-4">
                  <button
                    onClick={onClose}
                    className="text-gray-400 text-sm hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    Use a different email →
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
