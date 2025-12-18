import FormCard from '../components/ui/FormCard.jsx'
import TextInput from '../components/forms/TextInput.jsx'
import PasswordInput from '../components/forms/PasswordInput.jsx'
import Button from '../components/ui/Button.jsx'
import OAuthButtons from '../components/forms/OAuthButtons.jsx'
import Toast from '../components/ui/Toast.jsx'

export default function Login() {
  return (
    <div className="space-y-6">
      <FormCard
        title="Welcome back"
        description="Sign in to your CVSU account"
        footer={<Button disabled className="w-full">Sign in</Button>}
      >
        <Toast kind="info" message="Demo UI only — no logic yet." />
        <TextInput id="email" label="Email" placeholder="you@example.com" type="email" />
        <PasswordInput id="password" label="Password" />
        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" />
            Remember me
          </label>
          <a className="text-sm text-primary hover:underline" href="#">Forgot password?</a>
        </div>
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
