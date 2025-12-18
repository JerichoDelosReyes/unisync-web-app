import { useState } from 'react'
import BrandLogo from '../components/BrandLogo.jsx'
import TextInput from '../components/forms/TextInput.jsx'
import PasswordInput from '../components/forms/PasswordInput.jsx'
import Button from '../components/ui/Button.jsx'
import logo from '../assets/cvsu-logo.png'

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('signup')

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left Panel - Brand & Features */}
      <div className="bg-gradient-to-br from-[#1a5f3a] to-[#0d4028] text-white p-8 lg:p-12 flex flex-col justify-between">
        <div className="space-y-8">
          <BrandLogo />
          
          <div className="space-y-2">
            <h1 className="text-5xl font-bold">UNISYNC</h1>
            <p className="text-white/90 text-sm tracking-wider">YOUR GATEWAY TO CAMPUS EXCELLENCE</p>
          </div>

          <div className="pt-8">
            <h2 className="text-2xl font-semibold mb-6">Welcome to the Future of Campus Management</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Feature Cards */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 rounded-md p-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-semibold">Real-time Announcements</h3>
                <p className="text-sm text-white/80">Stay updated instantly</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 rounded-md p-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-semibold">Smart Scheduling</h3>
                <p className="text-sm text-white/80">Never miss a class</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 rounded-md p-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-semibold">Room Finder</h3>
                <p className="text-sm text-white/80">Locate any facility</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 rounded-md p-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-semibold">Organization Hub</h3>
                <p className="text-sm text-white/80">Connect with peers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/20">
          <div>
            <div className="text-3xl font-bold">2,500+</div>
            <div className="text-sm text-white/70">ACTIVE USERS</div>
          </div>
          <div>
            <div className="text-3xl font-bold">50+</div>
            <div className="text-sm text-white/70">FACILITIES</div>
          </div>
          <div>
            <div className="text-3xl font-bold">20+</div>
            <div className="text-sm text-white/70">ORGANIZATIONS</div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src={logo} alt="CVSU" className="h-6 w-auto" />
              <span className="text-sm font-medium text-primary">CvSU Imus Campus</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('signin')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'signin'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'signup'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Sign In Form */}
          {activeTab === 'signin' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
                <p className="mt-1 text-sm text-gray-600">Sign in to your CVSU account</p>
              </div>

              <div className="space-y-4">
                <TextInput 
                  id="signin-email" 
                  label="CvSU Email" 
                  placeholder="yourname@cvsu.edu.ph" 
                  type="email" 
                />
                <PasswordInput 
                  id="signin-password" 
                  label="Password" 
                />
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" />
                    Remember me
                  </label>
                  <a className="text-sm text-primary hover:underline" href="#">Forgot password?</a>
                </div>
              </div>

              <Button disabled className="w-full">Sign in</Button>

              <p className="text-center text-xs text-gray-500">
                This system is exclusively for CvSU Imus Campus community.<br />
                Need help? <a href="#" className="text-primary hover:underline">Contact Support</a>
              </p>
            </div>
          )}

          {/* Sign Up Form */}
          {activeTab === 'signup' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
                <p className="mt-1 text-sm text-gray-600">Join the CvSU community portal</p>
              </div>

              <div className="space-y-4">
                {/* Two-column name fields */}
                <div className="grid grid-cols-2 gap-4">
                  <TextInput 
                    id="given-name" 
                    label="Given Name" 
                    placeholder="Juan" 
                  />
                  <TextInput 
                    id="last-name" 
                    label="Last Name" 
                    placeholder="Dela Cruz" 
                  />
                </div>

                <TextInput 
                  id="signup-email" 
                  label="CvSU Email" 
                  placeholder="yourname@cvsu.edu.ph" 
                  type="email" 
                />
                <PasswordInput 
                  id="signup-password" 
                  label="Password"
                  hint="At least 6 characters"
                />
                <PasswordInput 
                  id="confirm-password" 
                  label="Confirm Password"
                  placeholder="Re-enter password"
                />
              </div>

              <Button disabled className="w-full">
                Send OTP & Register →
              </Button>

              <p className="text-center text-xs text-gray-500">
                This system is exclusively for CvSU Imus Campus community.<br />
                Need help? <a href="#" className="text-primary hover:underline">Contact Support</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
