import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormCard from '../components/ui/FormCard.jsx'
import TextInput from '../components/forms/TextInput.jsx'
import PasswordInput from '../components/forms/PasswordInput.jsx'
import Button from '../components/ui/Button.jsx'
import OAuthButtons from '../components/forms/OAuthButtons.jsx'
import Toast from '../components/ui/Toast.jsx'
import OTPModal from '../components/ui/OTPModal.jsx'
import { 
  validateCvsuEmail, 
  validatePassword,
  authenticateUser, 
  userExists,
  createLoginOTP,
  verifyLoginOTP,
  ALLOWED_DOMAIN 
} from '../services/authService.js'

export default function Login() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState({ show: false, message: '', kind: 'info' })
  const [isLoading, setIsLoading] = useState(false)
  const [showOTPModal, setShowOTPModal] = useState(false)

  const showToast = (message, kind = 'info') => {
    setToast({ show: true, message, kind })
    setTimeout(() => setToast({ show: false, message: '', kind: 'info' }), 4000)
  }

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
    // Clear error when user types
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: null }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    // Validate email domain
    const emailValidation = validateCvsuEmail(formData.email)
    if (!emailValidation.valid) {
      setErrors({ email: emailValidation.error })
      setIsLoading(false)
      return
    }

    // Validate password
    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.valid) {
      setErrors({ password: passwordValidation.error })
      setIsLoading(false)
      return
    }

    // Check if user exists
    if (!userExists(formData.email)) {
      showToast('No account found with this email. Please sign up first.', 'warning')
      setIsLoading(false)
      return
    }

    // Authenticate user credentials
    const authResult = authenticateUser(formData.email, formData.password)
    if (!authResult.success) {
      showToast(authResult.error, 'warning')
      setIsLoading(false)
      return
    }

    // Generate and send OTP for login verification
    const otp = createLoginOTP(formData.email)
    console.log('🔐 Login OTP:', otp)

    // Store password temporarily for final auth after OTP
    localStorage.setItem('unisync_login_pending', JSON.stringify({
      email: formData.email,
      password: formData.password
    }))

    setIsLoading(false)
    setShowOTPModal(true)
  }

  const handleVerifyOTP = async (enteredOtp) => {
    const result = verifyLoginOTP(formData.email, enteredOtp)
    
    if (!result.valid) {
      return { success: false, error: result.error }
    }

    // OTP verified - complete login
    const users = JSON.parse(localStorage.getItem('unisync_users') || '[]')
    const user = users.find(u => u.email.toLowerCase() === formData.email.toLowerCase())

    if (user) {
      localStorage.setItem('unisync_current_user', JSON.stringify(user))
      localStorage.removeItem('unisync_login_pending')
      
      setShowOTPModal(false)
      showToast('Login successful!', 'success')
      
      setTimeout(() => {
        navigate('/dashboard')
      }, 1000)
    }

    return { success: true }
  }

  const handleResendOTP = async () => {
    const otp = createLoginOTP(formData.email)
    console.log('🔐 New Login OTP:', otp)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <FormCard
          title="Welcome back"
          description="Sign in to your CVSU account"
          footer={
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          }
        >
          {toast.show && <Toast kind={toast.kind} message={toast.message} />}
          
          <TextInput 
            id="email" 
            label="Email" 
            placeholder={`you@${ALLOWED_DOMAIN}`}
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
          />
          <PasswordInput 
            id="password" 
            label="Password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
          />
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" />
              Remember me
            </label>
            <a className="text-sm text-primary hover:underline" href="#">Forgot password?</a>
          </div>
        </FormCard>
      </form>

      <div className="relative flex items-center">
        <div className="flex-grow border-t border-gray-200" />
        <span className="mx-3 text-xs uppercase tracking-wider text-gray-500">or</span>
        <div className="flex-grow border-t border-gray-200" />
      </div>

      <OAuthButtons />

      {/* OTP Verification Modal */}
      <OTPModal
        isOpen={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        email={formData.email}
        onVerify={handleVerifyOTP}
        onResend={handleResendOTP}
        verificationType="login"
      />
    </div>
  )
}
