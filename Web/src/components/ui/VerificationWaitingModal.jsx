import { useState, useEffect } from 'react'

export default function VerificationWaitingModal({ 
  email, 
  onVerified, 
  onClose 
}) {
  const [message, setMessage] = useState('')

  // Handle "I've Verified" button click
  const handleVerifiedClick = () => {
    setMessage('Great! You can now sign in with your email and password.')
    // Call onVerified to close modal and switch to sign in tab
    setTimeout(() => {
      onVerified()
    }, 1500)
  }

  return (
    <>
      {/* Backdrop with blur */}
      <div className="fixed inset-0 z-[99] backdrop-blur-md bg-black/20" />
      
      {/* Modal Container */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all">
          
          {/* Main Content - Horizontal Layout */}
          <div className="flex flex-col md:flex-row">
            {/* Left Side - Icon & Email */}
            <div className="bg-[#166534] p-8 md:w-2/5 flex flex-col items-center justify-center text-center">
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
            <div className="p-8 md:w-3/5">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Steps */}
              <div className="space-y-4 mb-6">
                <h4 className="font-semibold text-gray-900">Quick Steps:</h4>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#1a5f3a] text-white rounded-lg flex items-center justify-center text-xs font-bold">1</span>
                  <span className="text-gray-600">Open your email inbox (check spam too)</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#1a5f3a] text-white rounded-lg flex items-center justify-center text-xs font-bold">2</span>
                  <span className="text-gray-600">Click the verification link</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#1a5f3a] text-white rounded-lg flex items-center justify-center text-xs font-bold">3</span>
                  <span className="text-gray-600">Come back here and sign in</span>
                </div>
              </div>

              {/* Status Animation */}
              <div className="flex items-center gap-2 mb-6 p-3 bg-amber-50 rounded-xl">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-amber-700 text-sm font-medium">Waiting for verification...</span>
              </div>

              {/* Message */}
              {message && (
                <div className="mb-4 text-center text-sm p-3 rounded-xl bg-green-50 text-green-700">
                  {message}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleVerifiedClick}
                  className="flex-1 py-3 px-4 bg-[#1a5f3a] text-white rounded-xl font-medium hover:bg-[#0d4028] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1a5f3a]/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>I've Verified My Email</span>
                </button>
              </div>

              {/* Info text */}
              <p className="text-center mt-4 text-gray-500 text-sm">
                After verifying, you'll be able to sign in with your account.
              </p>

              {/* Cancel Link */}
              <p className="text-center mt-2">
                <button
                  onClick={onClose}
                  className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
                >
                  Use a different email →
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
