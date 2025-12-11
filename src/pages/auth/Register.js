import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Alert } from '../../components/common';
import './Login.css';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await register(formData.email, formData.password, formData.name);
      navigate('/verify-email');
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
              <span>Secure institutional registration</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Create an account</h2>
            <p className="auth-form-subtitle">
              Register with your CvSU institutional email
            </p>
          </div>

          {error && (
            <Alert variant="error" style={{ marginBottom: '20px' }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Full Name"
              type="text"
              name="name"
              placeholder="Juan Dela Cruz"
              value={formData.name}
              onChange={handleChange}
              icon={User}
              required
            />

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
                  placeholder="At least 6 characters"
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

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
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
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  className="form-input"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  style={{ paddingLeft: '40px', paddingRight: '40px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              style={{ width: '100%', marginTop: '24px' }}
            >
              Create Account
            </Button>
          </form>

          <div className="auth-divider">
            <span>Already have an account?</span>
          </div>

          <Link to="/login" style={{ textDecoration: 'none', display: 'block' }}>
            <Button
              type="button"
              variant="outline"
              style={{ width: '100%' }}
            >
              Sign In
            </Button>
          </Link>

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

export default Register;
