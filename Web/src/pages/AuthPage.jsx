import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  completeRegistration
} from '../services/authService.js'

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('signup')
  const navigate = useNavigate()
  
  // Sign In State
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [signInLoading, setSignInLoading] = useState(false)
  
  // Sign Up State
  const [givenName, setGivenName] = useState('')
  const [lastName, setLastName] = useState('')
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
  
  // Helper function to show toast
  const showToast = (message, kind = 'info') => {
    setToast({ show: true, message, kind })
    setTimeout(() => setToast({ show: false, message: '', kind: 'info' }), 5000)
  }
  
  // Handle Sign In
  const handleSignIn = async (e) => {
    e.preventDefault()
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
    if (!givenName || !lastName || !signUpEmail || !signUpPassword || !confirmPassword) {
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
      lastName
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
      lastName,
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
    setLastName('')
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
    setLastName('')
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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left Panel - Brand & Features */}
      <div className="bg-gradient-to-br from-[#1a5f3a] to-[#0d4028] text-white p-8 lg:p-12 flex flex-col justify-between">
        <div className="space-y-8">
          <BrandLogo />
          
          <div className="space-y-2">
            <h1 className="text-5xl font-bold">UNISYNC</h1>
            <p className="text-white/90 text-sm tracking-wider">YOUR GATEWAY TO CAMPUS EXCELLENCE</p>
          </div>

          <div className="pt-8">
            <h2 className="text-2xl font-semibold mb-6">Welcome to the Future of Campus Management</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Feature Cards */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 rounded-md p-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-semibold">Real-time Announcements</h3>
                <p className="text-sm text-white/80">Stay updated instantly</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 rounded-md p-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-semibold">Smart Scheduling</h3>
                <p className="text-sm text-white/80">Never miss a class</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 rounded-md p-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-semibold">Room Finder</h3>
                <p className="text-sm text-white/80">Locate any facility</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 rounded-md p-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-semibold">Organization Hub</h3>
                <p className="text-sm text-white/80">Connect with peers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/20">
          <div>
            <div className="text-3xl font-bold">2,500+</div>
            <div className="text-sm text-white/70">ACTIVE USERS</div>
          </div>
          <div>
            <div className="text-3xl font-bold">50+</div>
            <div className="text-sm text-white/70">FACILITIES</div>
          </div>
          <div>
            <div className="text-3xl font-bold">20+</div>
            <div className="text-sm text-white/70">ORGANIZATIONS</div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src={logo} alt="CVSU" className="h-6 w-auto" />
              <span className="text-sm font-medium text-primary">CvSU Imus Campus</span>
            </div>
          </div>
          
          {/* Toast Notification */}
          {toast.show && (
            <div className="mb-4">
              <Toast kind={toast.kind} message={toast.message} />
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
                <p className="mt-1 text-sm text-gray-600">Sign in to your CVSU account</p>
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
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" />
                    Remember me
                  </label>
                  <button 
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={signInLoading} className="w-full">
                {signInLoading ? 'Signing in...' : 'Sign in'}
              </Button>

              <p className="text-center text-xs text-gray-500">
                This system is exclusively for CvSU Imus Campus community.<br />
                Need help? <a href="#" className="text-primary hover:underline">Contact Support</a>
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
                {/* Two-column name fields */}
                <div className="grid grid-cols-2 gap-4">
                  <TextInput 
                    id="given-name" 
                    label="Given Name" 
                    placeholder="Juan Miguel"
                    value={givenName}
                    onChange={(e) => setGivenName(e.target.value)}
                  />
                  <TextInput 
                    id="last-name" 
                    label="Last Name" 
                    placeholder="Dela Cruz"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
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
                Need help? <a href="#" className="text-primary hover:underline">Contact Support</a>
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
