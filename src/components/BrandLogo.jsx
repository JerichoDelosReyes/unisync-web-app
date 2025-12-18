import logo from '../assets/cvsu-logo.png'

export default function BrandLogo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={logo}
        alt="Cavite State University logo"
        className={compact ? 'h-12 w-auto' : 'h-16 w-auto'}
      />
    </div>
  )
}
