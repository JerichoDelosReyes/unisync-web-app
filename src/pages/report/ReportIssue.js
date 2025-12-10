import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Calendar, 
  Wrench, 
  Flag,
  Send,
  CheckCircle
} from 'lucide-react';
import { Card, Button, Input, Select, Alert } from '../../components/common';

const ReportIssue = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    subject: '',
    description: '',
    location: ''
  });

  const issueTypes = [
    { value: 'schedule', label: 'Schedule Error', icon: Calendar },
    { value: 'equipment', label: 'Defective Equipment', icon: Wrench },
    { value: 'content', label: 'Offensive Post/Content', icon: Flag },
    { value: 'other', label: 'Other Issue', icon: AlertTriangle },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center', padding: '48px 24px' }}>
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
        <h2 style={{ marginBottom: '8px' }}>Report Submitted!</h2>
        <p style={{ color: 'var(--gray-600)', marginBottom: '24px' }}>
          Thank you for your report. Our team will review it and take appropriate action.
          You'll receive a notification once it's resolved.
        </p>
        <Button variant="primary" onClick={() => setSubmitted(false)}>
          Submit Another Report
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Report an Issue</h1>
        <p className="page-subtitle">Help us improve by reporting problems you encounter</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Issue Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {issueTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.value })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    border: `2px solid ${formData.type === type.value ? 'var(--cvsu-green)' : 'var(--gray-200)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: formData.type === type.value ? 'var(--primary-50)' : 'var(--white)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <type.icon size={20} color={formData.type === type.value ? 'var(--cvsu-green)' : 'var(--gray-500)'} />
                  <span style={{ fontWeight: 500, color: 'var(--gray-700)' }}>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Subject"
            placeholder="Brief description of the issue"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
          />

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows="5"
              placeholder="Please provide details about the issue..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <Input
            label="Location (if applicable)"
            placeholder="e.g., Room 301, CompLab 2"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />

          <Alert variant="info" style={{ marginTop: '16px' }}>
            Your report will be reviewed by the appropriate department. For urgent matters,
            please contact Civil Security directly.
          </Alert>

          <Button 
            type="submit" 
            variant="primary" 
            icon={Send}
            style={{ width: '100%', marginTop: '24px' }}
          >
            Submit Report
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ReportIssue;
