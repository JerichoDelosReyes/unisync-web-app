import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebase'
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
  checkLoginLockout
} from '../services/authService.js'

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('signin')
  const navigate = useNavigate()
  
  // Sign In State
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [signInLoading, setSignInLoading] = useState(false)
  const [lockoutTime, setLockoutTime] = useState(0) // Countdown timer for lockout
  
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
  
  // Handle verification complete - user can now sign in
  const handleVerificationComplete = async () => {
    console.log('handleVerificationComplete called')
    
    // Sign out the user so they can login fresh
    try {
      await signOut(auth)
    } catch (err) {
      console.warn('Error signing out after verification:', err)
    }
    
    // Always close the modal
    setShowVerificationModal(false)
    
    // Profile will be created automatically on first login
    showToast('Email verified! You can now sign in.', 'success')
    
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
  const handleVerificationModalClose = async () => {
    // Sign out the user since they're not completing verification now
    try {
      await signOut(auth)
    } catch (err) {
      console.warn('Error signing out on modal close:', err)
    }
    
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Panel - Minimalist Hero (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-600/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-emerald-500/10 to-transparent rounded-full"></div>
        </div>
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
        
        {/* Top - Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <span className="text-xl font-black">U</span>
            </div>
            <span className="text-lg font-bold tracking-wide">UNISYNC</span>
          </div>
        </div>
        
        {/* Center - Main Message */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl xl:text-7xl font-black leading-[0.9] tracking-tight">
              Campus Life,
              <br />
              <span className="text-emerald-300">Simplified.</span>
            </h1>
            <p className="text-lg xl:text-xl text-emerald-100/80 max-w-md leading-relaxed font-light">
              Everything you need in one place. Schedules, announcements, rooms, and more.
            </p>
          </div>
          
          {/* Minimal Feature Pills */}
          <div className="flex flex-wrap gap-3">
            {['Smart Scheduling', 'Real-time Updates', 'Room Finder', 'Org Hub'].map((feature, i) => (
              <div 
                key={feature}
                className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium border border-white/10 hover:bg-white/20 transition-all duration-300 cursor-default"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {feature}
              </div>
            ))}
          </div>
        </div>
        
        {/* Bottom - School Badge */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
            <img src={logo} alt="CvSU" className="w-8 h-8 object-contain opacity-80" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90">Cavite State University</p>
            <p className="text-xs text-emerald-200/70">Imus Campus</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 min-h-screen lg:min-h-0">
        <div className="w-full max-w-sm">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-emerald-700 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-black">U</span>
              </div>
              <span className="text-xl font-bold text-gray-900">UNISYNC</span>
            </div>
            <p className="text-sm text-gray-500">CvSU Imus Campus</p>
          </div>
          
          {/* Toast Notification */}
          {toast.show && (
            <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
              <Toast kind={toast.kind} message={toast.message} />
            </div>
          )}

          {/* Tab Switcher - Modern Pills */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-8">
            <button
              onClick={() => setActiveTab('signin')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                activeTab === 'signin'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                activeTab === 'signup'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Sign In Form */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
                <p className="text-sm text-gray-500">Enter your credentials to continue</p>
              </div>

              {showResendVerification && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-sm text-amber-800">
                    Didn't receive email?{' '}
                    <button type="button" onClick={handleResendVerification} className="font-semibold underline underline-offset-2 hover:no-underline">
                      Resend
                    </button>
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    placeholder="yourname@cvsu.edu.ph"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <PasswordInput 
                    id="signin-password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className="bg-gray-50 border-gray-200 rounded-xl focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-emerald-700 font-medium hover:text-emerald-800 transition-colors">
                    Forgot password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={signInLoading || lockoutTime > 0}
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-700/25 hover:shadow-xl hover:shadow-emerald-700/30 disabled:shadow-none"
              >
                {lockoutTime > 0 ? `Wait ${lockoutTime}s` : signInLoading ? 'Signing in...' : 'Sign In'}
              </button>
              
              {lockoutTime > 0 && (
                <p className="text-center text-xs text-red-500">Too many attempts. Please wait.</p>
              )}

              <p className="text-center text-xs text-gray-400 pt-2">
                CvSU Imus Campus exclusive • <a href="mailto:jericho.delosreyes@cvsu.edu.ph" className="text-emerald-600 hover:underline">Need help?</a>
              </p>
            </form>
          )}

          {/* Sign Up Form */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-5 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-gray-900">Create account</h2>
                <p className="text-sm text-gray-500">Join the CvSU community</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Given Name</label>
                    <input
                      type="text"
                      placeholder="Juan Miguel"
                      value={givenName}
                      onChange={(e) => setGivenName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Middle Name</label>
                    <input
                      type="text"
                      placeholder="Santos"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Last Name</label>
                    <input
                      type="text"
                      placeholder="Dela Cruz"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Suffix <span className="text-gray-400">(opt)</span></label>
                    <input
                      type="text"
                      placeholder="Jr., Sr."
                      value={suffix}
                      onChange={(e) => setSuffix(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">CvSU Email</label>
                  <input
                    type="email"
                    placeholder="yourname@cvsu.edu.ph"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Password</label>
                  <PasswordInput 
                    id="signup-password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                  />
                  <p className="text-[10px] text-gray-400">8+ chars with upper, lower & number</p>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Confirm Password</label>
                  <PasswordInput 
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={signUpLoading}
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-700/25 hover:shadow-xl hover:shadow-emerald-700/30 disabled:shadow-none"
              >
                {signUpLoading ? 'Creating...' : 'Create Account'}
              </button>

              <p className="text-center text-xs text-gray-400">
                CvSU Imus Campus exclusive • <a href="mailto:jericho.delosreyes@cvsu.edu.ph" className="text-emerald-600 hover:underline">Need help?</a>
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
