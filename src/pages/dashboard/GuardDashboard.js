import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  DoorOpen, 
  Clock,
  ChevronRight,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Key,
  Building2,
  Filter,
  RefreshCw,
  Bell,
  Phone,
  Shield,
  Search,
  X
} from 'lucide-react';
import { Card, Badge, Button, Input } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import './styles/index.css';

const GuardDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProcessedModal, setShowProcessedModal] = useState(false);
  const [processedRequest, setProcessedRequest] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const stats = [
    { icon: DoorOpen, label: 'Pending Requests', value: '5', change: 'Awaiting action', color: 'warning' },
    { icon: CheckCircle, label: 'Approved Today', value: '12', change: 'Rooms unlocked', color: 'success' },
    { icon: Clock, label: 'Avg. Response', value: '3m', change: 'Response time', color: 'primary' },
    { icon: Key, label: 'Active Unlocks', value: '2', change: 'Currently open', color: 'error' },
  ];

  const [requests, setRequests] = useState([
    {
      id: 1,
      type: 'adhoc',
      priority: 'high',
      room: 'Room 304',
      building: 'Academic Building',
      floor: '3rd Floor',
      requester: 'Prof. Juan Dela Cruz',
      requesterType: 'faculty',
      department: 'DIT',
      reason: 'Make-up Class for CC 102',
      duration: '2 hours',
      time: '2 minutes ago',
      timestamp: Date.now() - 120000,
      status: 'pending',
      studentsExpected: 35
    },
    {
      id: 2,
      type: 'standard',
      priority: 'normal',
      room: 'Computer Lab 2',
      building: 'IT Building',
      floor: 'Ground Floor',
      requester: 'Maria Santos (Class Rep)',
      requesterType: 'class-rep',
      department: 'BSIT 3-1',
      reason: 'Scheduled Class - IT Elective',
      duration: '3 hours',
      time: '5 minutes ago',
      timestamp: Date.now() - 300000,
      status: 'pending',
      studentsExpected: 45
    },
    {
      id: 3,
      type: 'adhoc',
      priority: 'high',
      room: 'Room 401',
      building: 'Academic Building',
      floor: '4th Floor',
      requester: 'Prof. Ana Reyes',
      requesterType: 'faculty',
      department: 'DIT',
      reason: 'Thesis Defense Panel',
      duration: '4 hours',
      time: '10 minutes ago',
      timestamp: Date.now() - 600000,
      status: 'pending',
      studentsExpected: 15
    },
    {
      id: 4,
      type: 'standard',
      priority: 'normal',
      room: 'Room 201',
      building: 'Academic Building',
      floor: '2nd Floor',
      requester: 'Jose Garcia (Class Rep)',
      requesterType: 'class-rep',
      department: 'BSIT 2-2',
      reason: 'Scheduled Class - Database Management',
      duration: '2 hours',
      time: '15 minutes ago',
      timestamp: Date.now() - 900000,
      status: 'pending',
      studentsExpected: 40
    },
    {
      id: 5,
      type: 'organization',
      priority: 'low',
      room: 'AVR',
      building: 'Academic Building',
      floor: '4th Floor',
      requester: 'BITS Organization',
      requesterType: 'organization',
      department: 'DIT',
      reason: 'General Assembly Meeting',
      duration: '2 hours',
      time: '20 minutes ago',
      timestamp: Date.now() - 1200000,
      status: 'pending',
      studentsExpected: 80
    },
  ]);

  const recentActivity = [
    { action: 'Unlocked', room: 'Room 301', building: 'Academic', user: 'Prof. Cruz', time: '30 min ago', type: 'success' },
    { action: 'Unlocked', room: 'CompLab 1', building: 'IT Building', user: 'Prof. Santos', time: '1 hour ago', type: 'success' },
    { action: 'Denied', room: 'Room 205', building: 'Academic', user: 'Unknown', time: '2 hours ago', type: 'denied', reason: 'No valid ID' },
    { action: 'Unlocked', room: 'Room 302', building: 'Academic', user: 'Class Rep', time: '3 hours ago', type: 'success' },
    { action: 'Auto-Locked', room: 'Room 101', building: 'Academic', user: 'System', time: '4 hours ago', type: 'system' },
  ];

  // Room status overview
  const roomStatuses = [
    { building: 'Academic Building', occupied: 8, vacant: 12, total: 20 },
    { building: 'IT Building', occupied: 5, vacant: 7, total: 12 },
    { building: 'HM Building', occupied: 2, vacant: 6, total: 8 },
    { building: 'Gymnasium', occupied: 0, vacant: 1, total: 1 },
  ];

  const handleApprove = (id) => {
    const request = requests.find(r => r.id === id);
    setProcessedRequest({ ...request, action: 'approved' });
    setShowProcessedModal(true);
    setRequests(prev => prev.filter(r => r.id !== id));
    
    // Show toast
    setSuccessMessage(`${request.room} has been approved and unlocked!`);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 5000);
  };

  const handleDeny = (id) => {
    const request = requests.find(r => r.id === id);
    setProcessedRequest({ ...request, action: 'denied' });
    setShowProcessedModal(true);
    setRequests(prev => prev.filter(r => r.id !== id));
    
    // Show toast
    setSuccessMessage(`Request for ${request.room} has been denied.`);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 5000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
      setSuccessMessage('Dashboard refreshed! All data is up to date.');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }, 1000);
  };

  const handleEmergencyCall = (type) => {
    const emergencyNumbers = {
      health: 'Health Services: (046) 411-0775',
      fire: 'Fire Emergency: 911',
      police: 'Police: (046) 411-0666',
      admin: 'Admin Office: (046) 411-0775'
    };
    setSuccessMessage(`Calling ${emergencyNumbers[type]}`);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  // Handle stat card clicks
  const handleStatClick = (label) => {
    switch(label) {
      case 'Pending Requests':
        setFilter('all');
        break;
      case 'Approved Today':
      case 'Active Unlocks':
        navigate('/facilities');
        break;
      case 'Avg. Response':
        // Scroll to activity section
        break;
      default:
        break;
    }
  };

  // System alerts data
  const systemAlerts = [
    { id: 1, type: 'warning', message: 'Room 305 has been unlocked for over 4 hours', time: '10 min ago' },
    { id: 2, type: 'info', message: 'Scheduled maintenance for CompLab 1 at 5:00 PM', time: '1 hour ago' },
    { id: 3, type: 'success', message: 'All emergency exits verified and clear', time: '2 hours ago' },
  ];

  // Filter requests
  const filteredRequests = requests.filter(request => {
    const matchesFilter = filter === 'all' || request.type === filter || request.priority === filter;
    const matchesSearch = searchQuery === '' || 
      request.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requester.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.building.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Sort by timestamp (most recent first) and priority
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (a.priority !== 'high' && b.priority === 'high') return 1;
    return b.timestamp - a.timestamp;
  });

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high': return <Badge variant="error">High Priority</Badge>;
      case 'normal': return <Badge variant="primary">Normal</Badge>;
      case 'low': return <Badge variant="gray">Low</Badge>;
      default: return null;
    }
  };

  const getRequesterIcon = (type) => {
    switch (type) {
      case 'faculty': return <User size={12} />;
      case 'class-rep': return <Shield size={12} />;
      case 'organization': return <Building2 size={12} />;
      default: return <User size={12} />;
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Dispatch Dashboard 🔐</h1>
          <p className="page-subtitle">Room Access Control • CvSU Imus Campus</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            variant="outline" 
            size="sm" 
            icon={RefreshCw}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            icon={Bell}
            onClick={() => setShowAlertsModal(true)}
          >
            Alerts
            {systemAlerts.length > 0 && (
              <span style={{ 
                background: 'var(--error)', 
                color: 'white', 
                borderRadius: '50%', 
                padding: '2px 6px', 
                fontSize: '10px',
                marginLeft: '4px'
              }}>
                {systemAlerts.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="toast-notification success">
          <CheckCircle size={20} />
          <span>{successMessage}</span>
          <button onClick={() => setShowSuccessToast(false)}><X size={16} /></button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div className="stat-card" key={index} onClick={() => handleStatClick(stat.label)}>
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

      {/* Room Status Overview */}
      <Card title="Room Status Overview" subtitle="Real-time campus room availability">
        <div className="room-status-grid">
          {roomStatuses.map((building, index) => (
            <div key={index} className="room-status-item">
              <div className="room-status-header">
                <Building2 size={16} />
                <span>{building.building}</span>
              </div>
              <div className="room-status-bars">
                <div className="status-bar">
                  <div 
                    className="status-bar-fill occupied" 
                    style={{ width: `${(building.occupied / building.total) * 100}%` }}
                  />
                </div>
                <div className="status-numbers">
                  <span className="occupied">{building.occupied} occupied</span>
                  <span className="vacant">{building.vacant} vacant</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="dashboard-grid">
        {/* Pending Requests */}
        <Card 
          title="Pending Unlock Requests" 
          subtitle="Requests awaiting your action"
          headerAction={
            <Badge variant="warning">{requests.length} pending</Badge>
          }
        >
          {/* Filters */}
          <div className="dispatch-filters">
            <div className="filter-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search room or requester..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button 
                className={`filter-btn ${filter === 'high' ? 'active' : ''}`}
                onClick={() => setFilter('high')}
              >
                High Priority
              </button>
              <button 
                className={`filter-btn ${filter === 'adhoc' ? 'active' : ''}`}
                onClick={() => setFilter('adhoc')}
              >
                Ad-Hoc
              </button>
              <button 
                className={`filter-btn ${filter === 'standard' ? 'active' : ''}`}
                onClick={() => setFilter('standard')}
              >
                Scheduled
              </button>
            </div>
          </div>

          <div className="dispatch-grid">
            {sortedRequests.length === 0 ? (
              <div className="empty-dispatch">
                <CheckCircle size={48} />
                <p>No pending requests</p>
                <span>All caught up! New requests will appear here.</span>
              </div>
            ) : (
              sortedRequests.map((request) => (
                <div key={request.id} className={`dispatch-item ${request.type} ${request.priority}`}>
                  <div className="dispatch-icon">
                    {request.type === 'adhoc' ? (
                      <AlertTriangle size={24} color="var(--warning)" />
                    ) : request.type === 'organization' ? (
                      <Building2 size={24} color="var(--primary)" />
                    ) : (
                      <DoorOpen size={24} color="var(--cvsu-green)" />
                    )}
                  </div>
                  <div className="dispatch-content">
                    <div className="dispatch-header">
                      <div className="dispatch-title">
                        {request.room}
                        {request.type === 'adhoc' && (
                          <Badge variant="warning" style={{ marginLeft: '8px' }}>Ad-Hoc</Badge>
                        )}
                        {request.type === 'organization' && (
                          <Badge variant="primary" style={{ marginLeft: '8px' }}>Organization</Badge>
                        )}
                      </div>
                      {getPriorityBadge(request.priority)}
                    </div>
                    <div className="dispatch-location">
                      <MapPin size={12} />
                      {request.building} • {request.floor}
                    </div>
                    <div className="dispatch-meta">
                      {getRequesterIcon(request.requesterType)}
                      <strong>{request.requester}</strong>
                      <span className="department-tag">{request.department}</span>
                    </div>
                    <div className="dispatch-reason">
                      <span className="reason-label">Reason:</span> {request.reason}
                    </div>
                    <div className="dispatch-details">
                      <span><Clock size={12} /> {request.duration}</span>
                      <span><User size={12} /> ~{request.studentsExpected} students</span>
                    </div>
                    <div className="dispatch-time">
                      <Clock size={12} />
                      Requested {request.time}
                    </div>
                  </div>
                  <div className="dispatch-actions">
                    <Button 
                      variant="success" 
                      size="sm"
                      icon={CheckCircle}
                      onClick={() => handleApprove(request.id)}
                    >
                      Approve & Unlock
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
              ))
            )}
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
              <div key={index} className={`schedule-item ${activity.type}`}>
                <div className="schedule-time" style={{ minWidth: '90px' }}>
                  {activity.type === 'success' ? (
                    <CheckCircle size={14} color="var(--success)" />
                  ) : activity.type === 'denied' ? (
                    <XCircle size={14} color="var(--error)" />
                  ) : (
                    <RefreshCw size={14} color="var(--gray-400)" />
                  )}
                  {activity.action}
                </div>
                <div className="schedule-details">
                  <h4 className="schedule-subject">{activity.room}</h4>
                  <p className="schedule-room">
                    <Building2 size={12} />
                    {activity.building}
                  </p>
                  <p className="schedule-room">
                    <User size={12} />
                    {activity.user}
                  </p>
                  {activity.reason && (
                    <p className="schedule-room" style={{ color: 'var(--error)' }}>
                      <AlertTriangle size={12} />
                      {activity.reason}
                    </p>
                  )}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Emergency Contacts Quick Access */}
      <Card>
        <div className="emergency-quick-access">
          <div className="emergency-header">
            <Phone size={20} />
            <strong>Emergency Quick Dial</strong>
          </div>
          <div className="emergency-buttons">
            <button className="emergency-btn" onClick={() => handleEmergencyCall('health')}>
              <span>🏥</span> Health Services
            </button>
            <button className="emergency-btn" onClick={() => handleEmergencyCall('fire')}>
              <span>🚒</span> Fire Emergency
            </button>
            <button className="emergency-btn" onClick={() => handleEmergencyCall('police')}>
              <span>👮</span> Police
            </button>
            <button className="emergency-btn" onClick={() => handleEmergencyCall('admin')}>
              <span>📞</span> Admin Office
            </button>
          </div>
        </div>
      </Card>

      {/* Protocol Reminder */}
      <Card>
        <div className="protocol-reminder">
          <AlertTriangle size={24} color="var(--warning)" />
          <div>
            <strong>Ad-Hoc Request Protocol</strong>
            <p>
              For requests marked "Ad-Hoc", verify the professor's physical ID before unlocking. 
              These are valid unscheduled room usages. For organization requests, ensure proper 
              event permit documentation.
            </p>
          </div>
        </div>
      </Card>

      {/* Alerts Modal */}
      {showAlertsModal && (
        <div className="modal-overlay" onClick={() => setShowAlertsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Bell size={20} /> System Alerts</h3>
              <button onClick={() => setShowAlertsModal(false)}><X size={20} /></button>
            </div>
            <div className="alerts-list">
              {systemAlerts.map(alert => (
                <div key={alert.id} className={`alert-item ${alert.type}`}>
                  {alert.type === 'warning' && <AlertTriangle size={16} />}
                  {alert.type === 'info' && <Bell size={16} />}
                  {alert.type === 'success' && <CheckCircle size={16} />}
                  <div className="alert-content">
                    <p>{alert.message}</p>
                    <span>{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={() => setShowAlertsModal(false)} style={{ width: '100%', marginTop: '16px' }}>
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Processed Modal */}
      {showProcessedModal && processedRequest && (
        <div className="modal-overlay" onClick={() => setShowProcessedModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className={`process-result ${processedRequest.action}`}>
              {processedRequest.action === 'approved' ? (
                <CheckCircle size={48} color="var(--success)" />
              ) : (
                <XCircle size={48} color="var(--error)" />
              )}
              <h3>
                Request {processedRequest.action === 'approved' ? 'Approved' : 'Denied'}
              </h3>
              <p>
                <strong>{processedRequest.room}</strong> - {processedRequest.building}
              </p>
              {processedRequest.action === 'approved' && (
                <div className="unlock-instructions">
                  <p>Proceed to unlock the room. The requester has been notified.</p>
                  <Badge variant="success">Room Ready for Unlock</Badge>
                </div>
              )}
              <Button onClick={() => setShowProcessedModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuardDashboard;
