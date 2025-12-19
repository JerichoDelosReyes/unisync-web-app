import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormCard from '../components/ui/FormCard.jsx'
import TextInput from '../components/forms/TextInput.jsx'
import PasswordInput from '../components/forms/PasswordInput.jsx'
import Button from '../components/ui/Button.jsx'
import OAuthButtons from '../components/forms/OAuthButtons.jsx'
import Toast from '../components/ui/Toast.jsx'
import { 
  validateCvsuEmail, 
  validatePassword,
  registerUser,
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
  const [emailSent, setEmailSent] = useState(false)
  const [sentToEmail, setSentToEmail] = useState('')

  const showToast = (message, kind = 'info') => {
    setToast({ show: true, message, kind })
    setTimeout(() => setToast({ show: false, message: '', kind: 'info' }), 5000)
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

    // Parse name
    const nameParts = formData.fullName.trim().split(' ')
    const givenName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || ''

    // Register user with Firebase (sends verification email automatically)
    const result = await registerUser({
      email: formData.email,
      password: formData.password,
      givenName,
      lastName
    })

    setIsLoading(false)

    if (!result.success) {
      showToast(result.error, 'warning')
      return
    }

    // Success - show verification email sent message
    setEmailSent(true)
    setSentToEmail(formData.email)
    showToast('Verification email sent! Please check your inbox.', 'success')
  }

  // Show email sent confirmation screen
  if (emailSent) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          {/* Email Icon */}
          <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-600 mb-4">
            We've sent a verification link to:
          </p>
          <p className="text-primary font-medium mb-6">{sentToEmail}</p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong> Click the link in your email to complete your registration. 
              The link will expire in 1 hour.
            </p>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Didn't receive the email? Check your spam folder or
            </p>
            <button
              onClick={() => {
                setEmailSent(false)
                setSentToEmail('')
              }}
              className="text-primary font-medium hover:underline"
            >
              Try signing up again
            </button>
          </div>
        </div>
      </div>
    )
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
    </div>
  )
}
