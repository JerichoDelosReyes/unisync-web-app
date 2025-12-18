import logo from '../assets/cvsu-logo.png'

export default function BrandLogo({ compact = false, size = 'default' }) {
  const sizeClasses = {
    small: 'h-12 w-auto',
    default: 'h-20 w-auto',
    large: 'h-28 w-auto',
    xlarge: 'h-36 w-auto',
    hero: 'h-44 w-auto',
    massive: 'h-56 w-auto'
  }
  
  return (
    <div className="flex items-center gap-3">
      <img
        src={logo}
        alt="Cavite State University logo"
        className={`${compact ? 'h-14 w-auto' : sizeClasses[size] || sizeClasses.default} drop-shadow-lg`}
      />
    </div>
  )
}
