import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormCard from '../components/ui/FormCard.jsx'
import TextInput from '../components/forms/TextInput.jsx'
import PasswordInput from '../components/forms/PasswordInput.jsx'
import Button from '../components/ui/Button.jsx'
import OAuthButtons from '../components/forms/OAuthButtons.jsx'
import Toast from '../components/ui/Toast.jsx'
import ForgotPasswordModal from '../components/ui/ForgotPasswordModal.jsx'
import { 
  validateCvsuEmail, 
  validatePassword,
  loginUser,
  ALLOWED_DOMAIN 
} from '../services/authService.js'

export default function Login() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState({ show: false, message: '', kind: 'info' })
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

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

    // Authenticate with Firebase
    const authResult = await loginUser(formData.email, formData.password)
    
    setIsLoading(false)

    if (!authResult.success) {
      showToast(authResult.error, 'warning')
      return
    }

    // Login successful
    showToast('Login successful!', 'success')
    
    setTimeout(() => {
      navigate('/dashboard')
    }, 1000)
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
            <button 
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
        </FormCard>
      </form>

      <div className="relative flex items-center">
        <div className="flex-grow border-t border-gray-200" />
        <span className="mx-3 text-xs uppercase tracking-wider text-gray-500">or</span>
        <div className="flex-grow border-t border-gray-200" />
      </div>

      <OAuthButtons />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  )
}
