import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, AlertTriangle, Lock } from 'lucide-react';
import { Button, Card, Alert, Input } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const AdminSetup = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const [setupKey, setSetupKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Secret setup key - change this to your own secret
  const SETUP_KEY = 'UNISYNC2024';

  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'admin'));
      const snapshot = await getDocs(q);
      setAdminExists(!snapshot.empty);
    } catch (err) {
      console.error('Error checking admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAdmin = async () => {
    if (setupKey !== SETUP_KEY) {
      setError('Invalid setup key');
      return;
    }

    if (!user || !userProfile) {
      setError('You must be logged in to become admin');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Update user role to admin in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        role: 'admin'
      });

      setSuccess(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.reload(); // Reload to refresh user profile
      }, 2000);
    } catch (err) {
      console.error('Error setting up admin:', err);
      setError('Failed to set up admin: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div className="loader loader-lg" />
      </div>
    );
  }

  // If admin already exists and current user is not admin
  if (adminExists && userProfile?.role !== 'admin') {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'var(--error-light)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <Lock size={40} color="var(--error)" />
            </div>
            <h2 style={{ marginBottom: '8px' }}>Admin Already Exists</h2>
            <p style={{ color: 'var(--gray-600)', marginBottom: '24px' }}>
              An administrator has already been set up for this system.
              Contact your system administrator if you need admin access.
            </p>
            <Button variant="primary" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // If current user is already admin
  if (userProfile?.role === 'admin') {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'var(--success-light)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <CheckCircle size={40} color="var(--success)" />
            </div>
            <h2 style={{ marginBottom: '8px' }}>You're Already an Admin</h2>
            <p style={{ color: 'var(--gray-600)', marginBottom: '24px' }}>
              You have administrator privileges. You can access all admin features.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
              <Button variant="primary" onClick={() => navigate('/seed-database')}>
                Seed Database
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '24px' }}>
      <Card>
        <div style={{ textAlign: 'center', padding: '24px' }}>
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
            <Shield size={40} color="var(--cvsu-green)" />
          </div>

          <h2 style={{ marginBottom: '8px' }}>Admin Setup</h2>
          <p style={{ color: 'var(--gray-600)', marginBottom: '24px' }}>
            Set up the first administrator account for UniSync.
            Enter the setup key to become an admin.
          </p>

          {error && (
            <Alert variant="error" style={{ marginBottom: '16px', textAlign: 'left' }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </Alert>
          )}

          {success && (
            <Alert variant="success" style={{ marginBottom: '16px', textAlign: 'left' }}>
              <CheckCircle size={18} />
              <span>You are now an admin! Redirecting...</span>
            </Alert>
          )}

          <div style={{ marginBottom: '16px', textAlign: 'left' }}>
            <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '8px' }}>
              <strong>Current User:</strong> {userProfile?.email || user?.email || 'Not logged in'}
            </p>
          </div>

          <Input
            label="Setup Key"
            type="password"
            placeholder="Enter the secret setup key"
            value={setupKey}
            onChange={(e) => setSetupKey(e.target.value)}
            icon={Lock}
          />

          <Button
            variant="primary"
            onClick={handleSetupAdmin}
            disabled={processing || !setupKey || success}
            style={{ width: '100%', marginTop: '16px' }}
          >
            {processing ? 'Setting up...' : 'Make Me Admin'}
          </Button>

          <p style={{ 
            marginTop: '24px', 
            fontSize: '12px', 
            color: 'var(--gray-400)',
            padding: '12px',
            background: 'var(--gray-50)',
            borderRadius: 'var(--radius-md)'
          }}>
            💡 Hint: The default setup key is <strong>UNISYNC2024</strong>
            <br />
            (Change this in production!)
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AdminSetup;
