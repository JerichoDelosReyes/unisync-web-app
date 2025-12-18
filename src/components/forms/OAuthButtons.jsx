import Button from '../ui/Button.jsx'

export default function OAuthButtons() {
  return (
    <div className="grid grid-cols-1 gap-3">
      <Button variant="ghost" disabled aria-disabled="true">Continue with Google</Button>
      <Button variant="ghost" disabled aria-disabled="true">Continue with Microsoft</Button>
    </div>
  )
}
