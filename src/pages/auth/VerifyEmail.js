import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, RefreshCw, CheckCircle, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Alert } from '../../components/common';
import './Login.css';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const { user, emailVerified, resendVerification, checkEmailVerification, logout } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Redirect if already verified
  useEffect(() => {
    if (emailVerified) {
      navigate('/dashboard');
    }
  }, [emailVerified, navigate]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Auto-check verification every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const verified = await checkEmailVerification();
      if (verified) {
        navigate('/dashboard');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [checkEmailVerification, navigate]);

  const handleResendEmail = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await resendVerification();
      setMessage('Verification email sent! Please check your inbox and spam folder.');
      setCooldown(60); // 60 second cooldown
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    setError('');
    setMessage('');

    try {
      const verified = await checkEmailVerification();
      if (verified) {
        setMessage('Email verified! Redirecting to dashboard...');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        setError('Email not yet verified. Please check your inbox and click the verification link.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              background: 'var(--primary-50)', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <Mail size={40} color="var(--cvsu-green)" />
            </div>
            <h2 className="auth-form-title">Verify Your Email</h2>
            <p className="auth-form-subtitle">
              We've sent a verification link to:
            </p>
            <p style={{ 
              fontWeight: 600, 
              color: 'var(--cvsu-green)',
              marginTop: '8px',
              fontSize: '16px'
            }}>
              {user?.email}
            </p>
          </div>

          {error && (
            <Alert variant="error" style={{ marginBottom: '20px' }}>
              {error}
            </Alert>
          )}

          {message && (
            <Alert variant="success" style={{ marginBottom: '20px' }}>
              {message}
            </Alert>
          )}

          <div style={{ 
            background: 'var(--gray-50)', 
            padding: '20px', 
            borderRadius: 'var(--radius-lg)',
            marginBottom: '24px'
          }}>
            <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>
              Next Steps:
            </h4>
            <ol style={{ 
              paddingLeft: '20px', 
              fontSize: '14px', 
              color: 'var(--gray-600)',
              lineHeight: '1.8'
            }}>
              <li>Check your email inbox for a verification link</li>
              <li>Click the link in the email to verify your account</li>
              <li>If you don't see it, check your spam folder</li>
              <li>Click "I've Verified" below once done</li>
            </ol>
          </div>

          <Button 
            variant="primary" 
            icon={CheckCircle}
            onClick={handleCheckVerification}
            disabled={checking}
            style={{ width: '100%', marginBottom: '12px' }}
          >
            {checking ? 'Checking...' : "I've Verified My Email"}
          </Button>

          <Button 
            variant="secondary" 
            icon={RefreshCw}
            onClick={handleResendEmail}
            disabled={loading || cooldown > 0}
            style={{ width: '100%', marginBottom: '12px' }}
          >
            {cooldown > 0 
              ? `Resend in ${cooldown}s` 
              : loading 
                ? 'Sending...' 
                : 'Resend Verification Email'
            }
          </Button>

          <Button 
            variant="ghost" 
            icon={LogOut}
            onClick={handleLogout}
            style={{ width: '100%' }}
          >
            Sign Out & Use Different Email
          </Button>

          <p style={{ 
            marginTop: '24px', 
            fontSize: '13px', 
            color: 'var(--gray-500)',
            textAlign: 'center'
          }}>
            This page will automatically redirect once your email is verified.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
