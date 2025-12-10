import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Menu, 
  X,
  ChevronRight,
  Settings,
  User,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = ({ collapsed, onToggle, title, breadcrumbs = [] }) => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifications = [
    { id: 1, title: 'New Announcement', message: 'CSG posted a new announcement', time: '5 min ago', unread: true },
    { id: 2, title: 'Room Booked', message: 'Room 301 has been confirmed', time: '1 hour ago', unread: true },
    { id: 3, title: 'Schedule Update', message: 'Your class schedule has been updated', time: '2 hours ago', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className={`navbar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="navbar-left">
        <button className="navbar-toggle" onClick={onToggle}>
          {collapsed ? <Menu size={20} /> : <Menu size={20} />}
        </button>
        
        {breadcrumbs.length > 0 ? (
          <nav className="navbar-breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight size={14} className="navbar-breadcrumb-separator" />}
                {crumb.link ? (
                  <a href={crumb.link}>{crumb.label}</a>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : (
          <h1 className="navbar-title">{title}</h1>
        )}
      </div>

      <div className="navbar-right">
        <div className="navbar-search">
          <Search className="navbar-search-icon" size={18} />
          <input
            type="text"
            className="navbar-search-input"
            placeholder="Search announcements, rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Notifications */}
        <div className="dropdown">
          <button 
            className="navbar-icon-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false);
            }}
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className="dropdown-menu" style={{ width: '320px', right: 0 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-200)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Notifications</h4>
              </div>
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className="dropdown-item"
                  style={{ 
                    flexDirection: 'column', 
                    alignItems: 'flex-start',
                    padding: '12px 16px',
                    background: notification.unread ? 'var(--primary-50)' : 'transparent'
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: '13px' }}>{notification.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>
                    {notification.message}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '4px' }}>
                    {notification.time}
                  </div>
                </div>
              ))}
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--gray-200)', textAlign: 'center' }}>
                <a href="/notifications" style={{ fontSize: '13px', color: 'var(--cvsu-green)', fontWeight: 500 }}>
                  View all notifications
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="dropdown">
          <button 
            className="navbar-icon-btn"
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
            }}
          >
            <div className="avatar avatar-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </button>

          {showProfile && (
            <div className="dropdown-menu">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-200)' }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{user?.name || 'User'}</div>
                <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{user?.email}</div>
              </div>
              <button className="dropdown-item">
                <User size={16} />
                Profile
              </button>
              <button className="dropdown-item">
                <Settings size={16} />
                Settings
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item danger" onClick={logout}>
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
