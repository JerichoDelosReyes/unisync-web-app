import FormCard from '../components/ui/FormCard.jsx'
import TextInput from '../components/forms/TextInput.jsx'
import PasswordInput from '../components/forms/PasswordInput.jsx'
import Button from '../components/ui/Button.jsx'
import OAuthButtons from '../components/forms/OAuthButtons.jsx'
import Toast from '../components/ui/Toast.jsx'

export default function Signup() {
  return (
    <div className="space-y-6">
      <FormCard
        title="Create your account"
        description="Join the CVSU community"
        footer={<Button disabled className="w-full">Create account</Button>}
      >
        <Toast kind="info" message="Demo UI only — no logic yet." />
        <TextInput id="fullName" label="Full name" placeholder="Juan Dela Cruz" />
        <TextInput id="email" label="Email" placeholder="you@example.com" type="email" />
        <PasswordInput id="password" label="Password" />
        <PasswordInput id="confirmPassword" label="Confirm password" />
      </FormCard>

      <div className="relative flex items-center">
        <div className="flex-grow border-t border-gray-200" />
        <span className="mx-3 text-xs uppercase tracking-wider text-gray-500">or</span>
        <div className="flex-grow border-t border-gray-200" />
      </div>

      <OAuthButtons />
    </div>
  )
}
