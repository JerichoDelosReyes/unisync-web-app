import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Calendar, 
  DoorOpen, 
  Users, 
  Clock,
  ChevronRight,
  MapPin,
  LayoutDashboard
} from 'lucide-react';
import { Card, Badge, Button } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

const StudentDashboard = () => {
  const { user } = useAuth();

  // Mock data
  const stats = [
    { icon: Bell, label: 'Announcements', value: '12', change: '+3 new', color: 'primary' },
    { icon: Calendar, label: 'Classes Today', value: '4', change: '2 remaining', color: 'success' },
    { icon: Users, label: 'Organizations', value: '3', change: 'Active member', color: 'warning' },
    { icon: DoorOpen, label: 'Room Status', value: '8', change: 'Vacant rooms', color: 'error' },
  ];

  const announcements = [
    {
      id: 1,
      title: 'Final Exam Schedule Released',
      author: 'Office of the Registrar',
      time: '2 hours ago',
      type: 'Campus-wide',
      priority: 'high'
    },
    {
      id: 2,
      title: 'BITS General Assembly',
      author: 'BITS Organization',
      time: '5 hours ago',
      type: 'Organization',
      priority: 'normal'
    },
    {
      id: 3,
      title: 'DIT Department Meeting',
      author: 'DIT Department',
      time: '1 day ago',
      type: 'Department',
      priority: 'normal'
    },
  ];

  const schedule = [
    { time: '7:30 AM', subject: 'IT Elective 3', room: 'Room 301', status: 'completed' },
    { time: '10:00 AM', subject: 'Software Engineering', room: 'Room 204', status: 'ongoing' },
    { time: '1:00 PM', subject: 'Database Systems', room: 'CompLab 2', status: 'upcoming' },
    { time: '4:00 PM', subject: 'Capstone Project', room: 'Room 401', status: 'upcoming' },
  ];

  return (
    <div className="dashboard">
      {/* Mobile Quick Actions - Only visible on mobile */}
      <div className="mobile-quick-actions">
        <Link to="/dashboard" className="mobile-quick-btn active">
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        <Link to="/announcements" className="mobile-quick-btn">
          <Bell size={20} />
          <span>Announcements</span>
        </Link>
        <Link to="/schedule" className="mobile-quick-btn">
          <Calendar size={20} />
          <span>My Schedule</span>
        </Link>
        <Link to="/facilities" className="mobile-quick-btn">
          <DoorOpen size={20} />
          <span>Facilities</span>
        </Link>
      </div>

      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="page-subtitle">Here's what's happening at CvSU Imus today.</p>
        </div>
        <div className="dashboard-header-actions">
          <Button variant="secondary" icon={Calendar}>
            View Full Schedule
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
              <span className={`stat-card-change positive`}>{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Today's Schedule */}
        <Card 
          title="Today's Schedule" 
          subtitle="Thursday, December 11"
          headerAction={
            <Link to="/schedule" className="card-link">
              View all <ChevronRight size={16} />
            </Link>
          }
        >
          <div className="schedule-list">
            {schedule.map((item, index) => (
              <div key={index} className={`schedule-item ${item.status}`}>
                <div className="schedule-time">
                  <Clock size={14} />
                  {item.time}
                </div>
                <div className="schedule-details">
                  <h4 className="schedule-subject">{item.subject}</h4>
                  <p className="schedule-room">
                    <MapPin size={12} />
                    {item.room}
                  </p>
                </div>
                <Badge variant={
                  item.status === 'completed' ? 'gray' :
                  item.status === 'ongoing' ? 'success' : 'primary'
                }>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Announcements */}
        <Card 
          title="Recent Announcements" 
          subtitle="Stay updated with campus news"
          headerAction={
            <Link to="/announcements" className="card-link">
              View all <ChevronRight size={16} />
            </Link>
          }
        >
          <div className="announcement-list">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="announcement-item">
                <div className="announcement-content">
                  <h4 className="announcement-title">{announcement.title}</h4>
                  <p className="announcement-meta">
                    {announcement.author} • {announcement.time}
                  </p>
                </div>
                <Badge variant={
                  announcement.type === 'Campus-wide' ? 'primary' :
                  announcement.type === 'Organization' ? 'warning' : 'info'
                }>
                  {announcement.type}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="quick-actions">
          <Link to="/facilities" className="quick-action-btn">
            <DoorOpen size={24} />
            <span>Check Room Status</span>
          </Link>
          <Link to="/announcements" className="quick-action-btn">
            <Bell size={24} />
            <span>View Announcements</span>
          </Link>
          <Link to="/organizations" className="quick-action-btn">
            <Users size={24} />
            <span>My Organizations</span>
          </Link>
          <Link to="/schedule" className="quick-action-btn">
            <Calendar size={24} />
            <span>My Schedule</span>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default StudentDashboard;
