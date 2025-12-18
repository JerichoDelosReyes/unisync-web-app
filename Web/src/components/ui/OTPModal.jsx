import { useState, useRef, useEffect } from 'react'
import Button from './Button.jsx'
import Toast from './Toast.jsx'

export default function OTPModal({ 
  isOpen, 
  onClose, 
  email, 
  onVerify, 
  onResend,
  verificationType = 'signup' 
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [toast, setToast] = useState({ show: false, message: '', kind: 'info' })
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes
  const [isVerifying, setIsVerifying] = useState(false)
  const inputRefs = useRef([])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setOtp(['', '', '', '', '', ''])
      setTimeLeft(600)
      setToast({ show: false, message: '', kind: 'info' })
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }, [isOpen])

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, timeLeft])

  const showToast = (message, kind = 'info') => {
    setToast({ show: true, message, kind })
    setTimeout(() => setToast({ show: false, message: '', kind: 'info' }), 4000)
  }

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)

    if (!/^\d+$/.test(pastedData)) return

    const newOtp = pastedData.split('')
    while (newOtp.length < 6) newOtp.push('')
    setOtp(newOtp)

    const nextIndex = Math.min(pastedData.length, 5)
    inputRefs.current[nextIndex]?.focus()
  }

  const handleVerify = async () => {
    const enteredOtp = otp.join('')

    if (enteredOtp.length !== 6) {
      showToast('Please enter the complete 6-digit OTP', 'warning')
      return
    }

    if (timeLeft <= 0) {
      showToast('OTP expired. Please request a new one.', 'warning')
      return
    }

    setIsVerifying(true)
    
    try {
      const result = await onVerify(enteredOtp)
      if (!result.success) {
        showToast(result.error || 'Invalid OTP', 'warning')
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (error) {
      showToast('Verification failed. Please try again.', 'warning')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    try {
      await onResend()
      setTimeLeft(600)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      showToast('New OTP sent! Check console.', 'success')
    } catch (error) {
      showToast('Failed to resend OTP', 'warning')
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop - blur effect to show background */}
      <div 
        className="fixed inset-0 z-40 backdrop-blur-sm bg-white/10"
        onClick={onClose}
      />
      
      {/* Modal - centered overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md pointer-events-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Verify Your Email</h2>
          <p className="text-sm text-gray-600">
            We've sent a 6-digit code to<br />
            <span className="font-medium text-primary">{email}</span>
          </p>
        </div>

        {/* Toast */}
        {toast.show && (
          <div className="mb-4">
            <Toast kind={toast.kind} message={toast.message} />
          </div>
        )}

        {/* OTP Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
            Enter OTP Code
          </label>
          <div className="flex gap-2 justify-center">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                autoComplete="off"
                className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-primary focus:ring-primary focus:outline-none transition-colors"
              />
            ))}
          </div>
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600">
            Time remaining: <span className={`font-semibold ${timeLeft <= 60 ? 'text-red-500' : 'text-primary'}`}>{formatTime(timeLeft)}</span>
          </p>
        </div>

        {/* Verify Button */}
        <Button 
          type="button" 
          onClick={handleVerify}
          disabled={isVerifying || timeLeft <= 0}
          className="w-full"
        >
          {isVerifying ? 'Verifying...' : verificationType === 'login' ? 'Verify & Sign In' : 'Verify & Create Account'}
        </Button>

        {/* Resend OTP */}
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Didn't receive the code?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={timeLeft > 540} // Can resend after 1 minute
              className="text-primary font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resend OTP
            </button>
          </p>
        </div>
        </div>
      </div>
    </>
  )
}
