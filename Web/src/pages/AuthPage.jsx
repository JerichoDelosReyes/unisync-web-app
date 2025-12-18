import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo.jsx'
import TextInput from '../components/forms/TextInput.jsx'
import PasswordInput from '../components/forms/PasswordInput.jsx'
import Button from '../components/ui/Button.jsx'
import Toast from '../components/ui/Toast.jsx'
import OTPModal from '../components/ui/OTPModal.jsx'
import logo from '../assets/cvsu-logo.png'

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('signup')
  const navigate = useNavigate()
  
  // Sign In State
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  
  // Sign Up State
  const [givenName, setGivenName] = useState('')
  const [lastName, setLastName] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', kind: 'info' })
  
  // OTP Modal State
  const [showOTPModal, setShowOTPModal] = useState(false)
  const [otpEmail, setOtpEmail] = useState('')
  const [otpType, setOtpType] = useState('signup') // 'signup' or 'login'
  
  // Helper function to show toast
  const showToast = (message, kind = 'info') => {
    setToast({ show: true, message, kind })
    setTimeout(() => setToast({ show: false, message: '', kind: 'info' }), 4000)
  }
  
  // Validate CvSU email
  const isValidCvsuEmail = (email) => {
    return email.toLowerCase().endsWith('@cvsu.edu.ph')
  }
  
  // Handle Sign In
  const handleSignIn = (e) => {
    e.preventDefault()
    
    // Validation
    if (!signInEmail || !signInPassword) {
      showToast('Please fill in all fields', 'warning')
      return
    }
    
    if (!isValidCvsuEmail(signInEmail)) {
      showToast('Please use your CvSU email (@cvsu.edu.ph)', 'warning')
      return
    }
    
    // Check if user exists in localStorage
    const users = JSON.parse(localStorage.getItem('unisync_users') || '[]')
      const user = users.find(u => u.email === signInEmail && u.password === signInPassword)
    
    if (!user) {
      showToast('Invalid email or password', 'warning')
      return
    }
    
    if (!user.isVerified) {
      showToast('Please verify your email first', 'warning')
      return
    }
    
    // Store current user session
    localStorage.setItem('unisync_current_user', JSON.stringify({ email: signInEmail, name: user.name }))
    showToast('Sign in successful!', 'success')
    
    // TODO: Navigate to dashboard
    setTimeout(() => {
      showToast('Dashboard coming soon...', 'info')
    }, 1500)
  }
  
  // Handle Sign Up
  const handleSignUp = (e) => {
    e.preventDefault()
    
    // Validation
    if (!givenName || !lastName || !signUpEmail || !signUpPassword || !confirmPassword) {
      showToast('Please fill in all fields', 'warning')
      return
    }
    
    if (!isValidCvsuEmail(signUpEmail)) {
      showToast('Please use your CvSU email (@cvsu.edu.ph)', 'warning')
      return
    }
    
    if (signUpPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'warning')
      return
    }
    
    if (signUpPassword !== confirmPassword) {
      showToast('Passwords do not match', 'warning')
      return
    }
    
    // Check if email already exists
    const users = JSON.parse(localStorage.getItem('unisync_users') || '[]')
    if (users.some(u => u.email === signUpEmail)) {
      showToast('Email already registered', 'warning')
      return
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store temporary user data for OTP verification
    const tempUser = {
      givenName,
      lastName,
      email: signUpEmail,
      password: signUpPassword,
      otp,
      otpExpiry: Date.now() + 10 * 60 * 1000 // 10 minutes
    }
    
    localStorage.setItem('unisync_temp_user', JSON.stringify(tempUser))
    
    // Show OTP in console for demo
    console.log('🔐 OTP Code:', otp)
    
    // Show OTP modal overlay
    setOtpEmail(signUpEmail)
    setOtpType('signup')
    setShowOTPModal(true)
  }
  
  // Handle OTP verification
  const handleVerifyOTP = async (enteredOtp) => {
    if (otpType === 'signup') {
      const tempUserData = localStorage.getItem('unisync_temp_user')
      
      if (!tempUserData) {
        return { success: false, error: 'Session expired. Please try again.' }
      }

      const tempUser = JSON.parse(tempUserData)

      if (Date.now() > tempUser.otpExpiry) {
        localStorage.removeItem('unisync_temp_user')
        return { success: false, error: 'OTP expired. Please try again.' }
      }

      if (enteredOtp !== tempUser.otp) {
        return { success: false, error: 'Invalid OTP. Please try again.' }
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

      setShowOTPModal(false)
      showToast('Account created successfully! Please sign in.', 'success')
      
      // Switch to sign in tab
      setActiveTab('signin')
      
      // Reset form
      setGivenName('')
      setLastName('')
      setSignUpEmail('')
      setSignUpPassword('')
      setConfirmPassword('')
      
      return { success: true }
    } else {
      // Login OTP verification
      const loginData = localStorage.getItem('unisync_login_otp')
      
      if (!loginData) {
        return { success: false, error: 'Session expired. Please try again.' }
      }

      const data = JSON.parse(loginData)

      if (Date.now() > data.otpExpiry) {
        localStorage.removeItem('unisync_login_otp')
        return { success: false, error: 'OTP expired. Please try again.' }
      }

      if (enteredOtp !== data.otp) {
        return { success: false, error: 'Invalid OTP. Please try again.' }
      }

      // Login successful
      const users = JSON.parse(localStorage.getItem('unisync_users') || '[]')
      const user = users.find(u => u.email === data.email)
      
      if (user) {
        localStorage.setItem('unisync_current_user', JSON.stringify(user))
        localStorage.removeItem('unisync_login_otp')
        setShowOTPModal(false)
        showToast('Login successful!', 'success')
        // TODO: Navigate to dashboard
      }
      
      return { success: true }
    }
  }
  
  // Handle resend OTP
  const handleResendOTP = async () => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString()
    
    if (otpType === 'signup') {
      const tempUserData = localStorage.getItem('unisync_temp_user')
      if (tempUserData) {
        const tempUser = JSON.parse(tempUserData)
        tempUser.otp = newOtp
        tempUser.otpExpiry = Date.now() + 10 * 60 * 1000
        localStorage.setItem('unisync_temp_user', JSON.stringify(tempUser))
      }
    } else {
      const loginData = localStorage.getItem('unisync_login_otp')
      if (loginData) {
        const data = JSON.parse(loginData)
        data.otp = newOtp
        data.otpExpiry = Date.now() + 10 * 60 * 1000
        localStorage.setItem('unisync_login_otp', JSON.stringify(data))
      }
    }
    
    console.log('🔐 New OTP Code:', newOtp)
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
                  <a className="text-sm text-primary hover:underline" href="#">Forgot password?</a>
                </div>
              </div>

              <Button type="submit" className="w-full">Sign in</Button>

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
                  hint="At least 6 characters"
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

              <Button type="submit" className="w-full">
                Send OTP & Register →
              </Button>

              <p className="text-center text-xs text-gray-500">
                This system is exclusively for CvSU Imus Campus community.<br />
                Need help? <a href="#" className="text-primary hover:underline">Contact Support</a>
              </p>
            </form>
          )}
        </div>
      </div>
      
      {/* OTP Verification Modal */}
      <OTPModal
        isOpen={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        email={otpEmail}
        onVerify={handleVerifyOTP}
        onResend={handleResendOTP}
        verificationType={otpType}
      />
    </div>
  )
}
