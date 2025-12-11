import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles,
  Bell,
  Calendar,
  Users,
  Building2,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Alert } from '../../components/common';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const features = [
    { icon: Bell, text: 'Real-time Announcements', desc: 'Stay updated instantly' },
    { icon: Calendar, text: 'Smart Scheduling', desc: 'Never miss a class' },
    { icon: Building2, text: 'Room Finder', desc: 'Locate any facility' },
    { icon: Users, text: 'Organization Hub', desc: 'Connect with peers' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await login(formData.email, formData.password);
      
      switch (user.role) {
        case 'admin':
          navigate('/analytics');
          break;
        case 'faculty':
          navigate('/schedule');
          break;
        case 'guard':
          navigate('/dispatch');
          break;
        default:
          navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated Background */}
      <div className="login-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="login-container">
        {/* Left Side - Branding */}
        <div className="login-branding">
          <div className="branding-content">
            <div className="login-logo-section">
              <div className="login-logo">
                <img src="/assets/images/logo.png" alt="UNISYNC Logo" />
              </div>
              <div className="logo-glow"></div>
            </div>
            
            <h1 className="login-brand-title">
              UNI<span>SYNC</span>
            </h1>
            <p className="login-brand-tagline">
              Your Gateway to Campus Excellence
            </p>
            
            <div className="login-hero-text">
              <h2>Welcome to the Future of Campus Management</h2>
            </div>

            <div className="login-features">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className="login-feature"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="feature-icon">
                    <feature.icon size={20} />
                  </div>
                  <div className="feature-text">
                    <span className="feature-title">{feature.text}</span>
                    <span className="feature-desc">{feature.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="login-stats">
              <div className="stat-item">
                <span className="stat-number">2,500+</span>
                <span className="stat-label">Active Users</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-number">50+</span>
                <span className="stat-label">Facilities</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-number">20+</span>
                <span className="stat-label">Organizations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-section">
          <div className="login-form-wrapper">
            <div className="mobile-logo">
              <img src="/assets/images/logo.png" alt="UNISYNC" />
              <span>UNISYNC</span>
            </div>

            <div className="login-form-header">
              <div className="welcome-badge">
                <Sparkles size={14} />
                <span>CvSU Imus Campus</span>
              </div>
              <h2>Welcome Back! 👋</h2>
              <p>Sign in to continue your journey</p>
            </div>

            {error && (
              <Alert variant="error" style={{ marginBottom: '20px' }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label">
                  <Mail size={14} />
                  Institutional Email
                </label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    name="email"
                    className="form-input-modern"
                    placeholder="yourname@cvsu.edu.ph"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  {formData.email.includes('@cvsu.edu.ph') && (
                    <CheckCircle2 className="input-valid-icon" size={18} />
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Lock size={14} />
                  Password
                </label>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="form-input-modern"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" />
                  <span className="checkmark"></span>
                  <span>Remember me</span>
                </label>
                <a href="/forgot-password" className="forgot-link">
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="login-submit-btn"
              >
                {loading ? 'Signing in...' : (
                  <>
                    Sign In
                    <ArrowRight size={18} />
                  </>
                )}
              </Button>
            </form>

            <div className="login-divider">
              <span>Demo Accounts</span>
            </div>

            <div className="demo-accounts">
              <button 
                className="demo-btn"
                onClick={() => setFormData({ email: 'student@cvsu.edu.ph', password: 'password' })}
              >
                <Users size={14} />
                Student
              </button>
              <button 
                className="demo-btn"
                onClick={() => setFormData({ email: 'class.rep@cvsu.edu.ph', password: 'password' })}
              >
                <Users size={14} />
                Class Rep
              </button>
              <button 
                className="demo-btn"
                onClick={() => setFormData({ email: 'faculty@cvsu.edu.ph', password: 'password' })}
              >
                <Users size={14} />
                Faculty
              </button>
              <button 
                className="demo-btn"
                onClick={() => setFormData({ email: 'imus.guard@cvsu.edu.ph', password: 'password' })}
              >
                <Users size={14} />
                Guard
              </button>
              <button 
                className="demo-btn"
                onClick={() => setFormData({ email: 'admin@cvsu.edu.ph', password: 'password' })}
              >
                <Users size={14} />
                Admin/MIS
              </button>
              <button 
                className="demo-btn"
                onClick={() => setFormData({ email: 'csg.officer@cvsu.edu.ph', password: 'password' })}
              >
                <Users size={14} />
                Org Officer
              </button>
            </div>

            <div className="login-footer">
              <p>
                This system is exclusively for CvSU Imus Campus community.
              </p>
              <p>
                Need help? <a href="mailto:support@cvsu.edu.ph">Contact Support</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
