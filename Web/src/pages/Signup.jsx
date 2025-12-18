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
  userExists,
  createSignupOTP,
  ALLOWED_DOMAIN 
} from '../services/authService.js'

export default function Signup() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ 
    fullName: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  })
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

    // Validate full name
    if (!formData.fullName.trim()) {
      setErrors({ fullName: 'Full name is required' })
      setIsLoading(false)
      return
    }

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

    // Check passwords match
    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' })
      setIsLoading(false)
      return
    }

    // Check if user already exists
    if (userExists(formData.email)) {
      showToast('An account with this email already exists. Please sign in.', 'warning')
      setIsLoading(false)
      return
    }

    // Parse name
    const nameParts = formData.fullName.trim().split(' ')
    const givenName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || ''

    // Generate and send OTP
    const otp = createSignupOTP({
      givenName,
      lastName,
      email: formData.email,
      password: formData.password
    })
    
    console.log('🔐 Signup OTP:', otp)
    setIsLoading(false)
    setShowOTPModal(true)
  }

  const handleVerifyOTP = async (enteredOtp) => {
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
    showToast('Account created successfully!', 'success')

    // Reset form and switch to login
    setFormData({ fullName: '', email: '', password: '', confirmPassword: '' })
    
    return { success: true }
  }

  const handleResendOTP = async () => {
    const nameParts = formData.fullName.trim().split(' ')
    const givenName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || ''

    const otp = createSignupOTP({
      givenName,
      lastName,
      email: formData.email,
      password: formData.password
    })
    
    console.log('🔐 New Signup OTP:', otp)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <FormCard
          title="Create your account"
          description="Join the CVSU community"
          footer={
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          }
        >
          {toast.show && <Toast kind={toast.kind} message={toast.message} />}
          
          <TextInput 
            id="fullName" 
            label="Full name" 
            placeholder="Juan Dela Cruz"
            value={formData.fullName}
            onChange={handleChange}
            error={errors.fullName}
          />
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
          <PasswordInput 
            id="confirmPassword" 
            label="Confirm password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
          />
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
        verificationType="signup"
      />
    </div>
  )
}
