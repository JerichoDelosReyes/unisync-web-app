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

    // Success - show message and redirect
    showToast('Account created! Please check your email to verify your account.', 'success')
    
    // Reset form
    setFormData({ fullName: '', email: '', password: '', confirmPassword: '' })
    
    // Redirect to login after delay
    setTimeout(() => {
      navigate('/auth/login')
    }, 3000)
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
