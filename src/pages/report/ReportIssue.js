import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Calendar, 
  Wrench, 
  Flag,
  Send,
  CheckCircle,
  Lightbulb,
  Wifi,
  Zap,
  Droplets,
  Wind,
  Monitor,
  DoorClosed,
  Building2,
  Clock,
  FileText,
  Camera,
  Upload,
  History,
  Eye
} from 'lucide-react';
import { Card, Button, Input, Select, Alert, Badge } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import './ReportIssue.css';

const ReportIssue = () => {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState('new');
  const [formData, setFormData] = useState({
    type: '',
    category: '',
    subject: '',
    description: '',
    location: '',
    building: '',
    priority: 'normal',
    attachments: []
  });

  // Issue types with specific categories
  const issueTypes = [
    { value: 'schedule', label: 'Schedule Error', icon: Calendar, description: 'Wrong class times or room assignments' },
    { value: 'equipment', label: 'Defective Equipment', icon: Wrench, description: 'Broken or malfunctioning equipment' },
    { value: 'facility', label: 'Facility Problem', icon: Building2, description: 'Room, building, or infrastructure issues' },
    { value: 'content', label: 'Offensive Content', icon: Flag, description: 'Inappropriate posts or announcements' },
    { value: 'suggestion', label: 'Suggestion', icon: Lightbulb, description: 'Ideas to improve campus services' },
    { value: 'other', label: 'Other Issue', icon: AlertTriangle, description: 'Any other concerns' },
  ];

  // Equipment/Facility categories
  const equipmentCategories = [
    { value: 'aircon', label: 'Air Conditioning', icon: Wind },
    { value: 'lights', label: 'Lighting', icon: Zap },
    { value: 'projector', label: 'Projector/Display', icon: Monitor },
    { value: 'computer', label: 'Computer/PC', icon: Monitor },
    { value: 'wifi', label: 'WiFi/Network', icon: Wifi },
    { value: 'plumbing', label: 'Plumbing/Water', icon: Droplets },
    { value: 'door', label: 'Door/Lock', icon: DoorClosed },
    { value: 'other', label: 'Other', icon: Wrench },
  ];

  // Building options
  const buildings = [
    { value: 'academic', label: 'Academic Building' },
    { value: 'it-building', label: 'IT & Computer Lab Building' },
    { value: 'library', label: 'Library & Student Services Building' },
    { value: 'gym', label: 'Gymnasium & Sports Complex' },
    { value: 'canteen', label: 'Canteen & Student Center' },
    { value: 'hm', label: 'Hospitality Management Building' },
  ];

  // Sample past reports
  const myReports = [
    {
      id: 'REP-2024-001',
      type: 'equipment',
      subject: 'Broken projector in Room 301',
      status: 'resolved',
      date: '2024-01-15',
      resolvedDate: '2024-01-17'
    },
    {
      id: 'REP-2024-002',
      type: 'facility',
      subject: 'AC not working in CompLab 2',
      status: 'in-progress',
      date: '2024-01-20',
      assignedTo: 'Maintenance Dept'
    },
    {
      id: 'REP-2024-003',
      type: 'schedule',
      subject: 'Wrong room assignment for CC102',
      status: 'pending',
      date: '2024-01-22'
    },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData({
      ...formData,
      attachments: [...formData.attachments, ...files.map(f => f.name)]
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return <Badge variant="success">Resolved</Badge>;
      case 'in-progress':
        return <Badge variant="warning">In Progress</Badge>;
      case 'pending':
        return <Badge variant="gray">Pending Review</Badge>;
      default:
        return <Badge variant="gray">{status}</Badge>;
    }
  };

  if (submitted) {
    return (
      <div className="report-success">
        <div className="success-icon">
          <CheckCircle size={48} />
        </div>
        <h2>Report Submitted Successfully!</h2>
        <p className="report-id">Reference ID: <strong>REP-2024-{String(Math.floor(Math.random() * 900) + 100)}</strong></p>
        <p className="success-message">
          Thank you for your report. Our team will review it and take appropriate action.
          You'll receive a notification once it's been addressed.
        </p>
        <div className="success-info">
          <Clock size={16} />
          <span>Average resolution time: 24-48 hours</span>
        </div>
        <div className="success-actions">
          <Button variant="primary" onClick={() => {
            setSubmitted(false);
            setFormData({
              type: '',
              category: '',
              subject: '',
              description: '',
              location: '',
              building: '',
              priority: 'normal',
              attachments: []
            });
          }}>
            Submit Another Report
          </Button>
          <Button variant="outline" onClick={() => setActiveTab('history')}>
            View My Reports
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Report an Issue</h1>
          <p className="page-subtitle">Help us improve campus facilities and services</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="report-tabs">
        <button 
          className={`report-tab ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          <FileText size={18} />
          New Report
        </button>
        <button 
          className={`report-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={18} />
          My Reports
        </button>
      </div>

      {activeTab === 'new' ? (
        <Card>
          <form onSubmit={handleSubmit}>
            {/* Issue Type Selection */}
            <div className="form-group">
              <label className="form-label">What type of issue are you reporting?</label>
              <div className="issue-type-grid">
                {issueTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.value, category: '' })}
                    className={`issue-type-btn ${formData.type === type.value ? 'active' : ''}`}
                  >
                    <type.icon size={24} />
                    <span className="type-label">{type.label}</span>
                    <span className="type-desc">{type.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Equipment Category (if equipment/facility selected) */}
            {(formData.type === 'equipment' || formData.type === 'facility') && (
              <div className="form-group">
                <label className="form-label">Category</label>
                <div className="category-grid">
                  {equipmentCategories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      className={`category-btn ${formData.category === cat.value ? 'active' : ''}`}
                    >
                      <cat.icon size={18} />
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Building Selection */}
            {(formData.type === 'equipment' || formData.type === 'facility' || formData.type === 'schedule') && (
              <Select
                label="Building"
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                options={[
                  { value: '', label: 'Select building...' },
                  ...buildings
                ]}
              />
            )}

            {/* Location */}
            {(formData.type === 'equipment' || formData.type === 'facility') && (
              <Input
                label="Specific Location"
                placeholder="e.g., Room 301, 3rd Floor or CompLab 2, PC #15"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            )}

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
                placeholder="Please provide detailed information about the issue. Include any relevant dates, times, or people involved..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* Priority (for equipment/facility issues) */}
            {(formData.type === 'equipment' || formData.type === 'facility') && (
              <div className="form-group">
                <label className="form-label">Priority Level</label>
                <div className="priority-options">
                  <label className={`priority-option ${formData.priority === 'low' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="priority"
                      value="low"
                      checked={formData.priority === 'low'}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    />
                    <span className="priority-label low">Low</span>
                    <span className="priority-desc">Minor inconvenience, can wait</span>
                  </label>
                  <label className={`priority-option ${formData.priority === 'normal' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="priority"
                      value="normal"
                      checked={formData.priority === 'normal'}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    />
                    <span className="priority-label normal">Normal</span>
                    <span className="priority-desc">Affects daily activities</span>
                  </label>
                  <label className={`priority-option ${formData.priority === 'high' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="priority"
                      value="high"
                      checked={formData.priority === 'high'}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    />
                    <span className="priority-label high">High</span>
                    <span className="priority-desc">Urgent, affects many users</span>
                  </label>
                </div>
              </div>
            )}

            {/* Photo Upload */}
            <div className="form-group">
              <label className="form-label">Attachments (Optional)</label>
              <div className="upload-area">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <label htmlFor="file-upload" className="upload-label">
                  <Camera size={24} />
                  <span>Add photos or screenshots</span>
                  <span className="upload-hint">PNG, JPG up to 5MB each</span>
                </label>
                {formData.attachments.length > 0 && (
                  <div className="uploaded-files">
                    {formData.attachments.map((file, index) => (
                      <div key={index} className="uploaded-file">
                        <Upload size={14} />
                        {file}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Alert variant="info">
              <strong>Note:</strong> Your report will be reviewed by the appropriate department. 
              For urgent safety concerns, please contact Civil Security directly at the main gate.
            </Alert>

            <Button 
              type="submit" 
              variant="primary" 
              icon={Send}
              style={{ width: '100%', marginTop: '24px' }}
              disabled={!formData.type || !formData.subject || !formData.description}
            >
              Submit Report
            </Button>
          </form>
        </Card>
      ) : (
        <Card title="My Reports" subtitle="Track the status of your submitted reports">
          {myReports.length === 0 ? (
            <div className="empty-reports">
              <FileText size={48} />
              <p>No reports submitted yet</p>
              <Button variant="outline" onClick={() => setActiveTab('new')}>
                Submit a Report
              </Button>
            </div>
          ) : (
            <div className="reports-list">
              {myReports.map((report) => (
                <div key={report.id} className={`report-item status-${report.status}`}>
                  <div className="report-item-header">
                    <span className="report-id">{report.id}</span>
                    {getStatusBadge(report.status)}
                  </div>
                  <h4 className="report-subject">{report.subject}</h4>
                  <div className="report-meta">
                    <span><Calendar size={14} /> Submitted: {report.date}</span>
                    {report.resolvedDate && (
                      <span><CheckCircle size={14} /> Resolved: {report.resolvedDate}</span>
                    )}
                    {report.assignedTo && (
                      <span><Wrench size={14} /> Assigned to: {report.assignedTo}</span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" icon={Eye}>
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default ReportIssue;
