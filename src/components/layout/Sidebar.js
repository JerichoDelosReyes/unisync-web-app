import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Bell,
  Calendar,
  DoorOpen,
  Users,
  MessageSquare,
  FileText,
  Phone,
  BarChart3,
  Building2,
  Settings,
  LogOut,
  Menu,
  Shield,
  BookOpen,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Define navigation items based on user role
  const getNavItems = () => {
    const commonItems = [
      { icon: Home, label: 'Dashboard', path: '/dashboard' },
      { icon: Bell, label: 'Announcements', path: '/announcements' },
      { icon: Building2, label: 'Facilities', path: '/facilities' },
      { icon: MessageSquare, label: 'AI Assistant', path: '/assistant' },
    ];

    const roleSpecificItems = {
      student: [
        { icon: Calendar, label: 'My Schedule', path: '/schedule' },
        { icon: Users, label: 'Organizations', path: '/organizations' },
        { icon: FileText, label: 'Report Issue', path: '/report' },
      ],
      faculty: [
        { icon: Calendar, label: 'My Schedule', path: '/schedule' },
        { icon: DoorOpen, label: 'Room Booking', path: '/booking' },
        { icon: ClipboardList, label: 'My Bookings', path: '/my-bookings' },
        { icon: FileText, label: 'Report Issue', path: '/report' },
      ],
      admin: [
        { icon: BarChart3, label: 'Analytics', path: '/analytics' },
        { icon: Shield, label: 'Moderation', path: '/moderation' },
        { icon: Users, label: 'User Management', path: '/users' },
        { icon: Settings, label: 'Settings', path: '/settings' },
      ],
      guard: [
        { icon: DoorOpen, label: 'Dispatch Dashboard', path: '/dispatch' },
        { icon: ClipboardList, label: 'Request History', path: '/request-history' },
      ],
    };

    return [...commonItems, ...(roleSpecificItems[user?.role] || [])];
  };

  const utilityItems = [
    { icon: Phone, label: 'Emergency Directory', path: '/emergency' },
    { icon: BookOpen, label: 'Building Directory', path: '/directory' },
  ];

  const navItems = getNavItems();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">U</div>
          <div className="sidebar-logo-text">
            Uni<span>Sync</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-section-title">Main Menu</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon className="sidebar-link-icon" size={20} />
              <span className="sidebar-link-text">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Resources</div>
          {utilityItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon className="sidebar-link-icon" size={20} />
              <span className="sidebar-link-text">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || 'User'}</div>
            <div className="sidebar-user-role">{user?.role || 'Student'}</div>
          </div>
        </div>
        <button className="sidebar-link" onClick={logout} style={{ width: '100%', marginTop: '8px' }}>
          <LogOut className="sidebar-link-icon" size={20} />
          <span className="sidebar-link-text">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
