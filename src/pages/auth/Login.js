import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Alert } from '../../components/common';
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
      
      // Redirect based on role
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
    <div className="auth-layout">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-logo">
            <div style={{ 
              fontSize: '48px', 
              fontWeight: 700, 
              color: 'var(--cvsu-green)' 
            }}>
              U
            </div>
          </div>
          <h1 className="auth-title">UniSync</h1>
          <p className="auth-subtitle">
            Your unified campus management system. Access announcements, 
            schedule rooms, manage organizations, and stay connected with 
            CvSU Bacoor Campus.
          </p>
          
          <div className="auth-features">
            <div className="auth-feature">
              <Shield size={24} />
              <span>Secure institutional login</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Welcome back</h2>
            <p className="auth-form-subtitle">
              Sign in with your CvSU institutional email
            </p>
          </div>

          {error && (
            <Alert variant="error" style={{ marginBottom: '20px' }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              name="email"
              placeholder="your.name@cvsu.edu.ph"
              value={formData.email}
              onChange={handleChange}
              icon={Mail}
              required
            />

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: 'var(--gray-400)'
                  }} 
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  style={{ paddingLeft: '40px', paddingRight: '40px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--gray-400)'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-options">
              <label className="auth-checkbox">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="/forgot-password" className="auth-link">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              style={{ width: '100%', marginTop: '24px' }}
            >
              Sign In
            </Button>
          </form>

          <div className="auth-footer">
            <p className="auth-footer-text">
              This system is exclusively for CvSU Bacoor Campus community.
              <br />
              Need help? Contact <a href="mailto:support@cvsu.edu.ph">support@cvsu.edu.ph</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
