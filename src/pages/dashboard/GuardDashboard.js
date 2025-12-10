import React from 'react';
import { Link } from 'react-router-dom';
import { 
  DoorOpen, 
  Clock,
  ChevronRight,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Key
} from 'lucide-react';
import { Card, Badge, Button } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

const GuardDashboard = () => {
  const { user } = useAuth();

  const stats = [
    { icon: DoorOpen, label: 'Pending Requests', value: '5', change: 'Awaiting action', color: 'warning' },
    { icon: CheckCircle, label: 'Approved Today', value: '12', change: 'Rooms unlocked', color: 'success' },
    { icon: Clock, label: 'Avg. Response', value: '3m', change: 'Response time', color: 'primary' },
    { icon: Key, label: 'Active Unlocks', value: '2', change: 'Currently open', color: 'error' },
  ];

  const requests = [
    {
      id: 1,
      type: 'adhoc',
      room: 'Room 304',
      building: 'New Building',
      requester: 'Prof. Juan Dela Cruz',
      reason: 'Make-up Class',
      duration: '2 hours',
      time: '2 minutes ago',
      status: 'pending'
    },
    {
      id: 2,
      type: 'standard',
      room: 'CompLab 2',
      building: 'Old Building',
      requester: 'Maria Santos (Class Rep)',
      reason: 'Scheduled Class - IT Elective',
      duration: '3 hours',
      time: '5 minutes ago',
      status: 'pending'
    },
    {
      id: 3,
      type: 'adhoc',
      room: 'Room 401',
      building: 'New Building',
      requester: 'Prof. Ana Reyes',
      reason: 'Thesis Defense',
      duration: '4 hours',
      time: '10 minutes ago',
      status: 'pending'
    },
    {
      id: 4,
      type: 'standard',
      room: 'Room 201',
      building: 'New Building',
      requester: 'Jose Garcia (Class Rep)',
      reason: 'Scheduled Class - Database',
      duration: '2 hours',
      time: '15 minutes ago',
      status: 'pending'
    },
  ];

  const recentActivity = [
    { action: 'Unlocked', room: 'Room 301', user: 'Prof. Cruz', time: '30 min ago' },
    { action: 'Unlocked', room: 'CompLab 1', user: 'Prof. Santos', time: '1 hour ago' },
    { action: 'Denied', room: 'Room 205', user: 'Unknown', time: '2 hours ago' },
    { action: 'Unlocked', room: 'Room 302', user: 'Class Rep', time: '3 hours ago' },
  ];

  const handleApprove = (id) => {
    console.log('Approved request:', id);
    // Handle approval logic
  };

  const handleDeny = (id) => {
    console.log('Denied request:', id);
    // Handle denial logic
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Dispatch Dashboard 🔐</h1>
          <p className="page-subtitle">Manage room unlock requests from faculty and students.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div className="stat-card" key={index}>
            <div className={`stat-card-icon ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">{stat.label}</p>
              <h3 className="stat-card-value">{stat.value}</h3>
              <span className="stat-card-change positive">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Pending Requests */}
        <Card 
          title="Pending Unlock Requests" 
          subtitle="Requests awaiting your action"
          headerAction={
            <Badge variant="warning">{requests.length} pending</Badge>
          }
        >
          <div className="dispatch-grid">
            {requests.map((request) => (
              <div key={request.id} className={`dispatch-item ${request.type}`}>
                <div className="dispatch-icon">
                  {request.type === 'adhoc' ? (
                    <AlertTriangle size={24} color="var(--warning)" />
                  ) : (
                    <DoorOpen size={24} color="var(--cvsu-green)" />
                  )}
                </div>
                <div className="dispatch-content">
                  <div className="dispatch-title">
                    {request.room} - {request.building}
                    {request.type === 'adhoc' && (
                      <Badge variant="warning" style={{ marginLeft: '8px' }}>Ad-Hoc</Badge>
                    )}
                  </div>
                  <div className="dispatch-meta">
                    <User size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {request.requester}
                  </div>
                  <div className="dispatch-meta">
                    Reason: {request.reason} • Duration: {request.duration}
                  </div>
                  <div className="dispatch-time">
                    <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {request.time}
                  </div>
                </div>
                <div className="dispatch-actions">
                  <Button 
                    variant="success" 
                    size="sm"
                    icon={CheckCircle}
                    onClick={() => handleApprove(request.id)}
                  >
                    Approve
                  </Button>
                  <Button 
                    variant="danger" 
                    size="sm"
                    icon={XCircle}
                    onClick={() => handleDeny(request.id)}
                  >
                    Deny
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card 
          title="Recent Activity" 
          subtitle="Your recent actions"
          headerAction={
            <Link to="/request-history" className="card-link">
              View history <ChevronRight size={16} />
            </Link>
          }
        >
          <div className="schedule-list">
            {recentActivity.map((activity, index) => (
              <div key={index} className="schedule-item">
                <div className="schedule-time" style={{ minWidth: '80px' }}>
                  {activity.action === 'Unlocked' ? (
                    <CheckCircle size={14} color="var(--success)" />
                  ) : (
                    <XCircle size={14} color="var(--error)" />
                  )}
                  {activity.action}
                </div>
                <div className="schedule-details">
                  <h4 className="schedule-subject">{activity.room}</h4>
                  <p className="schedule-room">
                    <User size={12} />
                    {activity.user}
                  </p>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Protocol Reminder */}
      <Card>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          padding: '8px',
          background: 'var(--warning-light)',
          borderRadius: 'var(--radius-md)'
        }}>
          <AlertTriangle size={24} color="var(--warning)" />
          <div>
            <strong style={{ color: 'var(--gray-800)' }}>Ad-Hoc Request Protocol</strong>
            <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginTop: '4px' }}>
              For requests marked "Ad-Hoc", verify the professor's physical ID before unlocking. 
              These are valid unscheduled room usages.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GuardDashboard;
