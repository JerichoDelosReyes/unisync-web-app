import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import Toast from '../components/ui/Toast.jsx'
import logo from '../assets/cvsu-logo.png'

export default function OTPVerification() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''
  
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [toast, setToast] = useState({ show: false, message: '', kind: 'info' })
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes in seconds
  const inputRefs = useRef([])
  
  // Initialize refs
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6)
  }, [])
  
  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      showToast('OTP expired. Please request a new one.', 'warning')
      setTimeout(() => navigate('/auth'), 2000)
      return
    }
    
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)
    
    return () => clearInterval(timer)
  }, [timeLeft, navigate])
  
  // Redirect if no email
  useEffect(() => {
    if (!email) {
      navigate('/auth')
    }
  }, [email, navigate])
  
  // Helper function to show toast
  const showToast = (message, kind = 'info') => {
    setToast({ show: true, message, kind })
    setTimeout(() => setToast({ show: false, message: '', kind: 'info' }), 4000)
  }
  
  // Handle OTP input change
  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }
  
  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }
  
  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    
    if (!/^\d+$/.test(pastedData)) return
    
    const newOtp = pastedData.split('')
    while (newOtp.length < 6) newOtp.push('')
    setOtp(newOtp)
    
    // Focus last filled input or first empty
    const nextIndex = Math.min(pastedData.length, 5)
    inputRefs.current[nextIndex]?.focus()
  }
  
  // Verify OTP
  const handleVerifyOTP = (e) => {
    e.preventDefault()
    
    const enteredOtp = otp.join('')
    
    if (enteredOtp.length !== 6) {
      showToast('Please enter the complete 6-digit OTP', 'warning')
      return
    }
    
    // Get temp user data
    const tempUserData = localStorage.getItem('unisync_temp_user')
    if (!tempUserData) {
      showToast('Session expired. Please sign up again.', 'warning')
      setTimeout(() => navigate('/auth'), 2000)
      return
    }
    
    const tempUser = JSON.parse(tempUserData)
    
    // Check OTP expiry
    if (Date.now() > tempUser.otpExpiry) {
      showToast('OTP expired. Please sign up again.', 'warning')
      localStorage.removeItem('unisync_temp_user')
      setTimeout(() => navigate('/auth'), 2000)
      return
    }
    
    // Verify OTP
    if (enteredOtp !== tempUser.otp) {
      showToast('Invalid OTP. Please try again.', 'warning')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      return
    }
    
    // OTP verified - create user account
    const users = JSON.parse(localStorage.getItem('unisync_users') || '[]')
    const newUser = {
      name: `${tempUser.givenName} ${tempUser.lastName}`,
      givenName: tempUser.givenName,
      lastName: tempUser.lastName,
      email: tempUser.email,
      password: tempUser.password,
      isVerified: true,
      createdAt: new Date().toISOString()
    }
    
    users.push(newUser)
    localStorage.setItem('unisync_users', JSON.stringify(users))
    localStorage.removeItem('unisync_temp_user')
    
    showToast('Account verified successfully! Redirecting to sign in...', 'success')
    
    setTimeout(() => {
      navigate('/auth')
    }, 2000)
  }
  
  // Resend OTP
  const handleResendOTP = () => {
    const tempUserData = localStorage.getItem('unisync_temp_user')
    if (!tempUserData) {
      showToast('Session expired. Please sign up again.', 'warning')
      setTimeout(() => navigate('/auth'), 2000)
      return
    }
    
    const tempUser = JSON.parse(tempUserData)
    
    // Generate new OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString()
    tempUser.otp = newOtp
    tempUser.otpExpiry = Date.now() + 10 * 60 * 1000 // 10 minutes
    
    localStorage.setItem('unisync_temp_user', JSON.stringify(tempUser))
    
    console.log('🔐 New OTP Code:', newOtp)
    showToast(`New OTP sent! Check console: ${newOtp}`, 'success')
    
    // Reset timer and OTP inputs
    setTimeLeft(600)
    setOtp(['', '', '', '', '', ''])
    inputRefs.current[0]?.focus()
  }
  
  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a5f3a] to-[#0d4028] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={logo} alt="CVSU" className="h-8 w-auto" />
            <span className="text-sm font-medium text-primary">CvSU Imus Campus</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
          <p className="text-sm text-gray-600">
            We've sent a 6-digit code to<br />
            <span className="font-medium text-primary">{email}</span>
          </p>
        </div>
        
        {/* Toast Notification */}
        {toast.show && (
          <div className="mb-6">
            <Toast kind={toast.kind} message={toast.message} />
          </div>
        )}
        
        {/* OTP Form */}
        <form onSubmit={handleVerifyOTP} className="space-y-6">
          {/* OTP Input */}
          <div>
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
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Time remaining: <span className="font-semibold text-primary">{formatTime(timeLeft)}</span>
            </p>
          </div>
          
          {/* Verify Button */}
          <Button type="submit" className="w-full">
            Verify & Complete Registration
          </Button>
          
          {/* Resend OTP */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Didn't receive the code?{' '}
              <button
                type="button"
                onClick={handleResendOTP}
                className="text-primary font-medium hover:underline"
              >
                Resend OTP
              </button>
            </p>
          </div>
          
          {/* Back to Sign Up */}
          <div className="text-center pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
