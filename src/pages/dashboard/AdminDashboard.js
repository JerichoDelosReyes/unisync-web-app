import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Bell, 
  DoorOpen,
  Shield,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  Activity
} from 'lucide-react';
import { Card, Badge, Button } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();

  const stats = [
    { icon: Users, label: 'Active Users', value: '1,234', change: '+45 today', color: 'primary' },
    { icon: Bell, label: 'Announcements', value: '89', change: '12 pending', color: 'success' },
    { icon: DoorOpen, label: 'Room Bookings', value: '156', change: 'This week', color: 'warning' },
    { icon: Shield, label: 'Flagged Content', value: '3', change: 'Needs review', color: 'error' },
  ];

  const flaggedContent = [
    {
      id: 1,
      title: 'Suspicious announcement detected',
      author: 'Unknown User',
      reason: 'Naive Bayes flagged as potentially unsafe',
      time: '10 minutes ago'
    },
    {
      id: 2,
      title: 'Inappropriate content in post',
      author: 'student123@cvsu.edu.ph',
      reason: 'Contains prohibited keywords',
      time: '1 hour ago'
    },
    {
      id: 3,
      title: 'Spam detection triggered',
      author: 'newuser@cvsu.edu.ph',
      reason: 'Multiple similar posts in short time',
      time: '2 hours ago'
    },
  ];

  const systemHealth = [
    { name: 'API Server', status: 'healthy', uptime: '99.9%' },
    { name: 'Database', status: 'healthy', uptime: '99.8%' },
    { name: 'Auth Service', status: 'healthy', uptime: '100%' },
    { name: 'File Storage', status: 'warning', uptime: '98.5%' },
  ];

  const recentUsers = [
    { name: 'Juan Dela Cruz', email: 'juan@cvsu.edu.ph', role: 'Student', joined: '5 min ago' },
    { name: 'Maria Santos', email: 'maria.faculty@cvsu.edu.ph', role: 'Faculty', joined: '1 hour ago' },
    { name: 'Jose Garcia', email: 'jose@cvsu.edu.ph', role: 'Student', joined: '2 hours ago' },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Admin Dashboard 📊</h1>
          <p className="page-subtitle">Monitor system health and manage campus operations.</p>
        </div>
        <div className="dashboard-header-actions">
          <Button variant="secondary" icon={BarChart3}>
            Export Report
          </Button>
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

      <div className="analytics-grid">
        {/* Analytics Chart Area */}
        <Card 
          title="Campus Analytics" 
          subtitle="Room utilization and engagement"
          headerAction={
            <Link to="/analytics" className="card-link">
              View details <ChevronRight size={16} />
            </Link>
          }
        >
          <div className="chart-placeholder">
            <div style={{ textAlign: 'center' }}>
              <TrendingUp size={48} />
              <p style={{ marginTop: '12px' }}>Analytics charts will be displayed here</p>
              <p style={{ fontSize: '12px', marginTop: '8px' }}>Room Utilization • Announcement Engagement • User Activity</p>
            </div>
          </div>
        </Card>

        {/* System Health */}
        <Card 
          title="System Health" 
          subtitle="Service status"
        >
          <div className="schedule-list">
            {systemHealth.map((service, index) => (
              <div key={index} className="schedule-item">
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  background: service.status === 'healthy' ? 'var(--success)' : 'var(--warning)',
                  marginRight: '12px'
                }} />
                <div className="schedule-details">
                  <h4 className="schedule-subject">{service.name}</h4>
                  <p className="schedule-room">Uptime: {service.uptime}</p>
                </div>
                <Badge variant={service.status === 'healthy' ? 'success' : 'warning'}>
                  {service.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="dashboard-grid">
        {/* Moderation Queue */}
        <Card 
          title="Moderation Queue" 
          subtitle="Content flagged by Naive Bayes"
          headerAction={
            <Link to="/moderation" className="card-link">
              View all <ChevronRight size={16} />
            </Link>
          }
        >
          <div className="moderation-list">
            {flaggedContent.map((item) => (
              <div key={item.id} className="moderation-item">
                <AlertCircle size={20} color="var(--error)" />
                <div className="moderation-content">
                  <div className="moderation-title">{item.title}</div>
                  <div className="moderation-reason">{item.reason}</div>
                  <div className="moderation-meta">By: {item.author} • {item.time}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="success" size="sm" icon={CheckCircle}>
                    Approve
                  </Button>
                  <Button variant="danger" size="sm" icon={XCircle}>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Users */}
        <Card 
          title="Recent Registrations" 
          subtitle="New users"
          headerAction={
            <Link to="/users" className="card-link">
              Manage users <ChevronRight size={16} />
            </Link>
          }
        >
          <div className="schedule-list">
            {recentUsers.map((user, index) => (
              <div key={index} className="schedule-item">
                <div className="avatar" style={{ marginRight: '12px' }}>
                  {user.name.charAt(0)}
                </div>
                <div className="schedule-details">
                  <h4 className="schedule-subject">{user.name}</h4>
                  <p className="schedule-room">{user.email}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge variant={
                    user.role === 'Faculty' ? 'primary' : 
                    user.role === 'Admin' ? 'error' : 'gray'
                  }>
                    {user.role}
                  </Badge>
                  <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>
                    {user.joined}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
