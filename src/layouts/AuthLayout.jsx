import { Outlet, Link, useLocation } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo.jsx'

export default function AuthLayout() {
  const location = useLocation()
  const isLogin = location.pathname === '/login'

  return (
    <div className="min-h-full grid grid-cols-1 md:grid-cols-2">
      {/* Brand / Left panel */}
      <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-primary to-brand text-white p-8">
        <div>
          <BrandLogo />
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight">Cavite State University</h1>
          <p className="mt-4 text-white/90">
            Welcome to the CVSU portal. Please {isLogin ? 'sign in' : 'create an account'} to continue.
          </p>
        </div>
        <div className="text-sm text-white/80">
          © {new Date().getFullYear()} CVSU
        </div>
      </div>

      {/* Content / Right panel */}
      <div className="flex items-center justify-center p-6 md:p-10 bg-bg">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-8 md:hidden">
            <BrandLogo compact />
          </div>
          <Outlet />
          <div className="mt-8 text-center text-sm text-gray-600">
            {isLogin ? (
              <span>
                Don’t have an account?{' '}
                <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline">Log in</Link>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
