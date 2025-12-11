import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  DoorOpen, 
  Clock,
  ChevronRight,
  MapPin,
  Users,
  Plus,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Card, Badge, Button, Modal } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const [showBookingModal, setShowBookingModal] = useState(false);

  const stats = [
    { icon: Calendar, label: 'Classes Today', value: '3', change: '1 remaining', color: 'primary' },
    { icon: DoorOpen, label: 'Active Bookings', value: '2', change: 'This week', color: 'success' },
    { icon: Users, label: 'Total Students', value: '145', change: 'Across sections', color: 'warning' },
    { icon: Clock, label: 'Office Hours', value: '4', change: 'Hours today', color: 'error' },
  ];

  const schedule = [
    { time: '7:30 AM', subject: 'IT Elective 3 - BSIT 4A', room: 'Room 301', status: 'completed' },
    { time: '10:00 AM', subject: 'Software Engineering - BSIT 3B', room: 'Room 204', status: 'ongoing' },
    { time: '1:00 PM', subject: 'Database Systems - BSIT 2A', room: 'CompLab 2', status: 'upcoming' },
  ];

  const bookings = [
    { id: 1, room: 'Room 305', date: 'Dec 12', time: '2:00 PM - 4:00 PM', reason: 'Make-up Class', status: 'approved' },
    { id: 2, room: 'CompLab 1', date: 'Dec 13', time: '9:00 AM - 11:00 AM', reason: 'Thesis Defense', status: 'pending' },
  ];

  const vacantRooms = [
    { name: 'Room 302', building: 'New Building', capacity: 40, status: 'vacant' },
    { name: 'Room 401', building: 'New Building', capacity: 35, status: 'vacant' },
    { name: 'CompLab 3', building: 'Old Building', capacity: 30, status: 'vacant' },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Welcome, Prof. {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="page-subtitle">Manage your schedule and room bookings.</p>
        </div>
        <div className="dashboard-header-actions">
          <Button variant="primary" icon={Plus} onClick={() => setShowBookingModal(true)}>
            Book a Room
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

      <div className="dashboard-grid">
        {/* Today's Schedule */}
        <Card 
          title="Today's Teaching Schedule" 
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

        {/* My Bookings */}
        <Card 
          title="My Room Bookings" 
          subtitle="Upcoming reservations"
          headerAction={
            <Link to="/my-bookings" className="card-link">
              View all <ChevronRight size={16} />
            </Link>
          }
        >
          <div className="schedule-list">
            {bookings.map((booking) => (
              <div key={booking.id} className="schedule-item">
                <div className="schedule-details" style={{ flex: 1 }}>
                  <h4 className="schedule-subject">{booking.room}</h4>
                  <p className="schedule-room">
                    <Calendar size={12} />
                    {booking.date} • {booking.time}
                  </p>
                  <p className="schedule-room" style={{ marginTop: '4px' }}>
                    {booking.reason}
                  </p>
                </div>
                <Badge variant={booking.status === 'approved' ? 'success' : 'warning'}>
                  {booking.status === 'approved' ? (
                    <><CheckCircle size={12} /> Approved</>
                  ) : (
                    <><AlertCircle size={12} /> Pending</>
                  )}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Vacant Rooms for Ad-Hoc Booking */}
      <Card 
        title="Available Rooms for Ad-Hoc Booking" 
        subtitle="Request access to vacant rooms for make-up classes or meetings"
        headerAction={
          <Link to="/facilities" className="card-link">
            View all rooms <ChevronRight size={16} />
          </Link>
        }
      >
        <div className="booking-grid">
          {vacantRooms.map((room, index) => (
            <div key={index} className="room-card">
              <div className="room-card-header">
                <div>
                  <div className="room-name">{room.name}</div>
                  <div className="room-building">{room.building}</div>
                </div>
                <Badge variant="success" dot>Vacant</Badge>
              </div>
              <div className="room-capacity">
                <Users size={12} /> Capacity: {room.capacity} students
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                style={{ width: '100%', marginTop: '12px' }}
                onClick={() => setShowBookingModal(true)}
              >
                Request Access
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Booking Modal */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        title="Request Room Access"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowBookingModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setShowBookingModal(false)}>
              Submit Request
            </Button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Select Room</label>
          <select className="form-input">
            <option>Select a room</option>
            <option>Room 302 - New Building</option>
            <option>Room 401 - New Building</option>
            <option>CompLab 3 - Old Building</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Reason</label>
          <select className="form-input">
            <option>Select reason</option>
            <option>Make-up Class</option>
            <option>Thesis Defense</option>
            <option>Emergency Meeting</option>
            <option>Consultation</option>
            <option>Other</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Date</label>
          <input type="date" className="form-input" />
        </div>
        <div className="form-group">
          <label className="form-label">Duration</label>
          <select className="form-input">
            <option>Select duration</option>
            <option>1 hour</option>
            <option>2 hours</option>
            <option>3 hours</option>
            <option>Half day (4 hours)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Additional Notes</label>
          <textarea className="form-input" rows="3" placeholder="Any additional information..."></textarea>
        </div>
      </Modal>
    </div>
  );
};

export default FacultyDashboard;
