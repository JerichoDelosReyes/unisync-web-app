import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import BrandLogo from '../components/BrandLogo.jsx'
import TextInput from '../components/forms/TextInput.jsx'
import PasswordInput from '../components/forms/PasswordInput.jsx'
import Button from '../components/ui/Button.jsx'
import Toast from '../components/ui/Toast.jsx'
import ForgotPasswordModal from '../components/ui/ForgotPasswordModal.jsx'
import VerificationWaitingModal from '../components/ui/VerificationWaitingModal.jsx'
import logo from '../assets/cvsu-logo.png'
import {
  validateCvsuEmail,
  validatePassword,
  registerUser,
  loginUser,
  resendVerificationEmail,
  completeRegistration,
  checkLoginLockout
} from '../services/authService.js'

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('signin')
  const navigate = useNavigate()
  const { sessionInvalidated, clearSessionInvalidation } = useAuth()
  
  // Sign In State
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [signInLoading, setSignInLoading] = useState(false)
  const [lockoutTime, setLockoutTime] = useState(0) // Countdown timer for lockout
  const [sessionKickedMessage, setSessionKickedMessage] = useState(false)
  
  // Sign Up State
  const [givenName, setGivenName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [suffix, setSuffix] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [signUpLoading, setSignUpLoading] = useState(false)
  
  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', kind: 'info' })
  
  // Modal State
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')
  const [pendingUserData, setPendingUserData] = useState(null)
  
  // Helper function to normalize suffix (blank, n/a, N/A, none, NONE = empty)
  const normalizeSuffix = (value) => {
    if (!value) return ''
    const trimmed = value.trim().toLowerCase()
    if (trimmed === '' || trimmed === 'n/a' || trimmed === 'none') return ''
    return value.trim()
  }
  
  // Helper function to show toast
  const showToast = (message, kind = 'info') => {
    setToast({ show: true, message, kind })
    setTimeout(() => setToast({ show: false, message: '', kind: 'info' }), 5000)
  }
  
  // Handle session invalidation message
  useEffect(() => {
    if (sessionInvalidated) {
      setSessionKickedMessage(true)
      clearSessionInvalidation()
    }
  }, [sessionInvalidated, clearSessionInvalidation])
  
  // Countdown timer effect for lockout
  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [lockoutTime])
  
  // Check lockout status when email changes
  useEffect(() => {
    if (signInEmail && signInEmail.includes('@')) {
      const status = checkLoginLockout(signInEmail)
      if (status.isLocked) {
        setLockoutTime(status.remainingTime)
      }
    }
  }, [signInEmail])
  
  // Handle Sign In
  const handleSignIn = async (e) => {
    e.preventDefault()
    
    // Check if locked out
    if (lockoutTime > 0) {
      showToast(`Please wait ${lockoutTime} seconds before trying again`, 'warning')
      return
    }
    
    setSignInLoading(true)
    setShowResendVerification(false)
    
    // Validation
    if (!signInEmail || !signInPassword) {
      showToast('Please fill in all fields', 'warning')
      setSignInLoading(false)
      return
    }
    
    // Validate CvSU email
    const emailValidation = validateCvsuEmail(signInEmail)
    if (!emailValidation.valid) {
      showToast(emailValidation.error, 'warning')
      setSignInLoading(false)
      return
    }

    // Validate password
    const passwordValidation = validatePassword(signInPassword)
    if (!passwordValidation.valid) {
      showToast(passwordValidation.error, 'warning')
      setSignInLoading(false)
      return
    }
    
    // Login with Firebase
    const result = await loginUser(signInEmail, signInPassword)
    setSignInLoading(false)
    
    // Handle lockout
    if (result.isLocked) {
      setLockoutTime(result.remainingTime)
      showToast(result.error, 'warning')
      return
    }
    
    // Check if email needs verification
    if (result.needsVerification) {
      showToast(result.error, 'warning')
      setShowResendVerification(true)
      return
    }
    
    if (!result.success) {
      showToast(result.error, 'warning')
      return
    }
    
    // Login successful
    showToast('Sign in successful!', 'success')
    setTimeout(() => {
      navigate('/dashboard')
    }, 1000)
  }
  
  // Handle Sign Up
  const handleSignUp = async (e) => {
    e.preventDefault()
    setSignUpLoading(true)
    
    // Validation
    if (!givenName || !middleName || !lastName || !signUpEmail || !signUpPassword || !confirmPassword) {
      showToast('Please fill in all fields', 'warning')
      setSignUpLoading(false)
      return
    }
    
    // Validate CvSU email
    const emailValidation = validateCvsuEmail(signUpEmail)
    if (!emailValidation.valid) {
      showToast(emailValidation.error, 'warning')
      setSignUpLoading(false)
      return
    }

    // Validate password
    const passwordValidation = validatePassword(signUpPassword)
    if (!passwordValidation.valid) {
      showToast(passwordValidation.error, 'warning')
      setSignUpLoading(false)
      return
    }
    
    if (signUpPassword !== confirmPassword) {
      showToast('Passwords do not match', 'warning')
      setSignUpLoading(false)
      return
    }
    
    // Register with Firebase (sends verification email automatically)
    const result = await registerUser({
      email: signUpEmail,
      password: signUpPassword,
      givenName,
      middleName,
      lastName,
      suffix: normalizeSuffix(suffix)
    })
    
    setSignUpLoading(false)
    
    if (!result.success) {
      showToast(result.error, 'warning')
      return
    }
    
    // Success - Show verification waiting modal
    // Store user data to create Firestore document after verification
    setPendingUserData({
      givenName,
      middleName,
      lastName,
      suffix: normalizeSuffix(suffix),
      email: signUpEmail
    })
    setPendingVerificationEmail(signUpEmail)
    setShowVerificationModal(true)
  }
  
  // Handle verification complete - create Firestore document
  const handleVerificationComplete = async () => {
    console.log('handleVerificationComplete called')
    console.log('pendingUserData:', pendingUserData)
    
    let success = false
    
    if (pendingUserData) {
      try {
        // Now create the Firestore document since email is verified
        const result = await completeRegistration(pendingUserData)
        
        console.log('completeRegistration result:', result)
        
        if (result.success) {
          success = true
        } else {
          console.error('completeRegistration failed:', result.error)
          // Still close modal but show error
          showToast(result.error || 'Account created but profile setup failed. Try signing in.', 'warning')
        }
      } catch (error) {
        console.error('Error in handleVerificationComplete:', error)
        showToast('Error creating profile. Your account is created - try signing in.', 'warning')
      }
    }
    
    // Always close the modal
    setShowVerificationModal(false)
    
    if (success) {
      showToast('Email verified & account created successfully! You can now sign in.', 'success')
    }
    
    // Reset form and switch to sign in
    setGivenName('')
    setMiddleName('')
    setLastName('')
    setSuffix('')
    setSignUpEmail('')
    setSignUpPassword('')
    setConfirmPassword('')
    setPendingVerificationEmail('')
    setPendingUserData(null)
    
    setActiveTab('signin')
  }
  
  // Handle verification modal close (cancel)
  const handleVerificationModalClose = () => {
    setShowVerificationModal(false)
    setPendingVerificationEmail('')
    setPendingUserData(null)
    showToast('You can verify your email later by signing in.', 'info')
    
    // Reset form
    setGivenName('')
    setMiddleName('')
    setLastName('')
    setSuffix('')
    setSignUpEmail('')
    setSignUpPassword('')
    setConfirmPassword('')
  }
  
  // Handle resend verification email
  const handleResendVerification = async () => {
    const result = await resendVerificationEmail()
    if (result.success) {
      showToast('Verification email sent! Check your inbox.', 'success')
    } else {
      showToast(result.error, 'warning')
    }
  }

  return (
    <div className="h-screen flex flex-col lg:grid lg:grid-cols-2 overflow-hidden">
      {/* Left Panel - Brand & Features (hidden on mobile, visible on lg+) */}
      <div className="hidden lg:flex bg-[#166534] text-white p-6 xl:p-10 flex-col justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>
        
        <div className="space-y-4 relative z-10">
          <BrandLogo size="massive" />
          
          <div className="space-y-2">
            <h1 className="text-5xl xl:text-6xl font-extrabold tracking-tight text-white drop-shadow-sm">UNISYNC</h1>
            <p className="text-green-100 text-xs xl:text-sm font-semibold tracking-[0.2em] uppercase">Your Gateway to Campus Excellence</p>
          </div>

          <div className="pt-2">
            <h2 className="text-xl xl:text-2xl font-bold mb-4 text-green-50">Welcome to the Future of Campus Management</h2>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Feature Cards */}
              <div className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-3 xl:p-4 space-y-1 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-default border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="bg-green-400 rounded-lg p-2 shadow-md">
                    <svg className="w-4 h-4 text-green-900" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-bold text-sm xl:text-base">Real-time Announcements</h3>
                <p className="text-xs text-green-100/80">Stay updated instantly</p>
              </div>

              <div className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-3 xl:p-4 space-y-1 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-default border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="bg-green-400 rounded-lg p-2 shadow-md">
                    <svg className="w-4 h-4 text-green-900" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-bold text-sm xl:text-base">Smart Scheduling</h3>
                <p className="text-xs text-green-100/80">Never miss a class</p>
              </div>

              <div className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-3 xl:p-4 space-y-1 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-default border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="bg-green-400 rounded-lg p-2 shadow-md">
                    <svg className="w-4 h-4 text-green-900" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-bold text-sm xl:text-base">Room Finder</h3>
                <p className="text-xs text-green-100/80">Locate any facility</p>
              </div>

              <div className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-3 xl:p-4 space-y-1 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-default border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="bg-green-400 rounded-lg p-2 shadow-md">
                    <svg className="w-4 h-4 text-green-900" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-bold text-sm xl:text-base">Organization Hub</h3>
                <p className="text-xs text-green-100/80">Connect with peers</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-start lg:items-center justify-center p-4 pt-8 sm:p-6 sm:pt-12 lg:p-8 bg-white h-screen lg:h-auto overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Header - Show UNISYNC branding on mobile */}
          <div className="lg:hidden text-center mb-6">
            <div className="flex flex-col items-center gap-2 mb-4">
              <h1 className="text-3xl font-extrabold text-primary tracking-tight">UNISYNC</h1>
              <p className="text-xs text-gray-500">CvSU Imus Campus</p>
            </div>
          </div>
          
          {/* Desktop Header */}
          <div className="hidden lg:flex flex-col items-center justify-center gap-1 mb-8">
            <span className="text-xl font-bold text-primary">UNISYNC</span>
            <span className="text-xs text-gray-500">CvSU Imus Campus</span>
          </div>
          
          {/* Toast Notification */}
          {toast.show && (
            <div className="mb-4">
              <Toast kind={toast.kind} message={toast.message} />
            </div>
          )}
          
          {/* Session Invalidation Banner */}
          {sessionKickedMessage && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-800">Session Ended</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    You were logged out because your account was accessed from another device. 
                    For security, only one active session is allowed at a time.
                  </p>
                </div>
                <button
                  onClick={() => setSessionKickedMessage(false)}
                  className="flex-shrink-0 text-amber-600 hover:text-amber-800"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('signin')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'signin'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'signup'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Sign In Form */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
                <p className="mt-1 text-sm text-gray-600">Sign in to your CvSU account</p>
              </div>

              {showResendVerification && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    Didn't receive the verification email?{' '}
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      className="font-medium text-yellow-900 underline hover:no-underline"
                    >
                      Resend verification email
                    </button>
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <TextInput 
                  id="signin-email" 
                  label="CvSU Email" 
                  placeholder="yourname@cvsu.edu.ph" 
                  type="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                />
                <PasswordInput 
                  id="signin-password" 
                  label="Password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                />
                <div className="flex items-center justify-end">
                  <button 
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={signInLoading || lockoutTime > 0} className="w-full">
                {lockoutTime > 0 
                  ? `Try again in ${lockoutTime}s` 
                  : signInLoading 
                    ? 'Signing in...' 
                    : 'Sign in'}
              </Button>
              
              {lockoutTime > 0 && (
                <p className="text-center text-sm text-red-600">
                  Too many failed attempts. Please wait before trying again.
                </p>
              )}

              <p className="text-center text-xs text-gray-500">
                This system is exclusively for CvSU Imus Campus community.<br />
                Need help? <a href="mailto:jericho.delosreyes@cvsu.edu.ph" className="text-primary hover:underline">Contact Support</a>
              </p>
            </form>
          )}

          {/* Sign Up Form */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
                <p className="mt-1 text-sm text-gray-600">Join the CvSU community portal</p>
              </div>

              <div className="space-y-4">
                {/* Name fields */}
                <div className="grid grid-cols-2 gap-4">
                  <TextInput 
                    id="given-name" 
                    label="Given Name" 
                    placeholder="Juan Miguel"
                    value={givenName}
                    onChange={(e) => setGivenName(e.target.value)}
                  />
                  <TextInput 
                    id="middle-name" 
                    label="Middle Name" 
                    placeholder="Gabales"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <TextInput 
                    id="last-name" 
                    label="Last Name" 
                    placeholder="Dela Cruz"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                  {/* Suffix field - optional */}
                  <TextInput 
                    id="suffix" 
                    label="Suffix (Optional)" 
                    placeholder="Jr., Sr., III, etc."
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                  />
                </div>

                <TextInput 
                  id="signup-email" 
                  label="CvSU Email" 
                  placeholder="yourname@cvsu.edu.ph" 
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                />
                <PasswordInput 
                  id="signup-password" 
                  label="Password"
                  hint="At least 8 characters with uppercase, lowercase, and number"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                />
                <PasswordInput 
                  id="confirm-password" 
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={signUpLoading} className="w-full">
                {signUpLoading ? 'Creating account...' : 'Create Account'}
              </Button>

              <p className="text-center text-xs text-gray-500">
                This system is exclusively for CvSU Imus Campus community.<br />
                Need help? <a href="mailto:jericho.delosreyes@cvsu.edu.ph" className="text-primary hover:underline">Contact Support</a>
              </p>
            </form>
          )}
        </div>
      </div>
      
      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
      
      {/* Verification Waiting Modal */}
      {showVerificationModal && (
        <VerificationWaitingModal
          email={pendingVerificationEmail}
          onVerified={handleVerificationComplete}
          onClose={handleVerificationModalClose}
        />
      )}
    </div>
  )
}
