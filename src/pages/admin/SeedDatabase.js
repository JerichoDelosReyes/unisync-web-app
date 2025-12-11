import React, { useState } from 'react';
import { seedDatabase } from '../../services/firestoreService';
import { Button, Card, Alert } from '../../components/common';
import { Database, CheckCircle, AlertTriangle, Loader } from 'lucide-react';

const SeedDatabase = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSeed = async () => {
    if (!window.confirm('This will add sample data to your database. Continue?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await seedDatabase();
      setSuccess(true);
    } catch (err) {
      console.error('Seed error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
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
            <Database size={40} color="var(--cvsu-green)" />
          </div>

          <h2 style={{ marginBottom: '8px' }}>Seed Database</h2>
          <p style={{ color: 'var(--gray-600)', marginBottom: '24px' }}>
            Populate your Firestore database with sample data for testing.
            This will add announcements, facilities, organizations, schedules, and more.
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
              <span>Database seeded successfully! Sample data has been added.</span>
            </Alert>
          )}

          <Button
            variant="primary"
            onClick={handleSeed}
            disabled={loading}
            style={{ minWidth: '200px' }}
          >
            {loading ? (
              <>
                <Loader size={18} className="spin" />
                <span style={{ marginLeft: '8px' }}>Seeding...</span>
              </>
            ) : (
              'Seed Database'
            )}
          </Button>

          <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--gray-500)' }}>
            <p><strong>This will create:</strong></p>
            <ul style={{ textAlign: 'left', marginTop: '8px' }}>
              <li>4 Sample Announcements</li>
              <li>18 Facilities/Rooms</li>
              <li>5 Organizations</li>
              <li>11 Class Schedules</li>
              <li>4 Emergency Contacts</li>
              <li>5 Buildings</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SeedDatabase;
