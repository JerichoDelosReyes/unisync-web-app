import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  DoorOpen, 
  Clock,
  ChevronRight,
  MapPin,
  Users,
  Plus,
  CheckCircle,
  AlertCircle,
  Key,
  X
} from 'lucide-react';
import { Card, Badge, Button, Modal, Alert } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import './styles/index.css';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    room: '',
    reason: '',
    date: '',
    duration: '',
    notes: ''
  });

  const handleRequestUnlock = (item) => {
    setSelectedClass(item);
    setShowUnlockModal(true);
  };

  const submitUnlockRequest = () => {
    if (selectedClass) {
      // Set the active request - this will grey out all other rooms
      setActiveRequest({
        subject: selectedClass.subject,
        room: selectedClass.room,
        time: selectedClass.time,
        requestedAt: new Date().toISOString()
      });
      setShowUnlockModal(false);
      
      // Show success toast
      setSuccessMessage(`Unlock request sent for ${selectedClass.room}! Guard has been notified.`);
      setShowSuccessToast(true);
      setSelectedClass(null);
      
      // Simulate guard response
      setTimeout(() => {
        setShowSuccessToast(false);
        setTimeout(() => {
          setActiveRequest(null);
          setSuccessMessage('Your room has been unlocked! You may now enter.');
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 5000);
        }, 8000);
      }, 5000);
    }
  };

  const submitBookingRequest = () => {
    if (bookingForm.room && bookingForm.reason && bookingForm.date && bookingForm.duration) {
      setShowBookingModal(false);
      setSuccessMessage(`Room booking request submitted for ${bookingForm.room}! Awaiting approval.`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
      
      // Reset form
      setBookingForm({ room: '', reason: '', date: '', duration: '', notes: '' });
    }
  };

  // Handle stat card clicks
  const handleStatClick = (label) => {
    switch(label) {
      case 'Classes Today':
        navigate('/schedule');
        break;
      case 'Active Bookings':
        navigate('/facilities');
        break;
      case 'Total Students':
        navigate('/directory/building');
        break;
      case 'Office Hours':
        navigate('/schedule');
        break;
      default:
        break;
    }
  };

  // Check if class is eligible for unlock request
  // - Ongoing classes can always request
  // - Upcoming classes can request 5 minutes before scheduled time
  const isClassEligible = (item) => {
    if (item.status === 'ongoing') return true;
    if (item.status === 'upcoming') {
      // Parse the scheduled time and check if within 5 minutes
      const now = new Date();
      const [time, period] = item.time.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let scheduledHour = hours;
      if (period === 'PM' && hours !== 12) scheduledHour += 12;
      if (period === 'AM' && hours === 12) scheduledHour = 0;
      
      const scheduledTime = new Date();
      scheduledTime.setHours(scheduledHour, minutes, 0, 0);
      
      // Calculate minutes until class
      const diffMs = scheduledTime - now;
      const diffMins = diffMs / (1000 * 60);
      
      // Allow if within 5 minutes before class
      return diffMins <= 5 && diffMins >= -60; // 5 min before to 60 min after start
    }
    return false;
  };

  // Check if unlock button should be disabled
  // - Disabled if not eligible (not ongoing or not within 5 min window)
  // - Disabled if there's already an active request (cooldown)
  const isUnlockDisabled = (item) => {
    // If there's an active request, disable all buttons
    if (activeRequest) return true;
    // Check if class is eligible
    if (!isClassEligible(item)) return true;
    return false;
  };

  // Check if this item has the active request
  const hasActiveRequest = (item) => {
    return activeRequest && activeRequest.subject === item.subject;
  };

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
              <div key={index} className={`schedule-item ${item.status} ${activeRequest && !hasActiveRequest(item) ? 'cooldown-disabled' : ''}`}>
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
                <div className="schedule-actions">
                  <Badge variant={
                    item.status === 'completed' ? 'gray' :
                    item.status === 'ongoing' ? 'success' : 'primary'
                  }>
                    {item.status}
                  </Badge>
                  {hasActiveRequest(item) ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="unlock-btn requested"
                      disabled
                    >
                      <CheckCircle size={14} />
                      <span className="unlock-text">Requested</span>
                    </Button>
                  ) : (
                    <Button 
                      variant={isClassEligible(item) && !activeRequest ? 'primary' : 'ghost'}
                      size="sm"
                      className={`unlock-btn ${isUnlockDisabled(item) ? 'disabled' : ''}`}
                      disabled={isUnlockDisabled(item)}
                      onClick={() => handleRequestUnlock(item)}
                      title={
                        activeRequest 
                          ? 'Request cooldown active - wait for current request to be processed'
                          : !isClassEligible(item) 
                            ? 'Can only request 5 minutes before class or during ongoing class'
                            : 'Request room unlock'
                      }
                    >
                      <Key size={14} />
                      <span className="unlock-text">
                        {activeRequest ? 'Cooldown' : 'Request Unlock'}
                      </span>
                    </Button>
                  )}
                </div>
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

      {/* Unlock Request Modal */}
      <Modal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        title="Request Room Unlock"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowUnlockModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submitUnlockRequest}>
              Send Request to Guard
            </Button>
          </>
        }
      >
        {selectedClass && (
          <>
            <Alert variant="success" style={{ marginBottom: '16px' }}>
              <strong>Faculty Priority:</strong> Your unlock request will be processed immediately.
            </Alert>
            <div className="unlock-request-details">
              <div className="unlock-detail-row">
                <span className="unlock-label">Subject:</span>
                <span className="unlock-value">{selectedClass.subject}</span>
              </div>
              <div className="unlock-detail-row">
                <span className="unlock-label">Room:</span>
                <span className="unlock-value">{selectedClass.room}</span>
              </div>
              <div className="unlock-detail-row">
                <span className="unlock-label">Time:</span>
                <span className="unlock-value">{selectedClass.time}</span>
              </div>
              <div className="unlock-detail-row">
                <span className="unlock-label">Professor:</span>
                <span className="unlock-value">{user?.name}</span>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '16px' }}>
              The guard will receive this request and unlock the room immediately.
            </p>
          </>
        )}
      </Modal>

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
            <Button 
              variant="primary" 
              onClick={submitBookingRequest}
              disabled={!bookingForm.room || !bookingForm.reason || !bookingForm.date || !bookingForm.duration}
            >
              Submit Request
            </Button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Select Room</label>
          <select 
            className="form-input"
            value={bookingForm.room}
            onChange={(e) => setBookingForm({...bookingForm, room: e.target.value})}
          >
            <option value="">Select a room</option>
            <option value="Room 302 - New Building">Room 302 - New Building</option>
            <option value="Room 401 - New Building">Room 401 - New Building</option>
            <option value="CompLab 3 - Old Building">CompLab 3 - Old Building</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Reason</label>
          <select 
            className="form-input"
            value={bookingForm.reason}
            onChange={(e) => setBookingForm({...bookingForm, reason: e.target.value})}
          >
            <option value="">Select reason</option>
            <option value="Make-up Class">Make-up Class</option>
            <option value="Thesis Defense">Thesis Defense</option>
            <option value="Emergency Meeting">Emergency Meeting</option>
            <option value="Consultation">Consultation</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Date</label>
          <input 
            type="date" 
            className="form-input"
            value={bookingForm.date}
            onChange={(e) => setBookingForm({...bookingForm, date: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Duration</label>
          <select 
            className="form-input"
            value={bookingForm.duration}
            onChange={(e) => setBookingForm({...bookingForm, duration: e.target.value})}
          >
            <option value="">Select duration</option>
            <option value="1 hour">1 hour</option>
            <option value="2 hours">2 hours</option>
            <option value="3 hours">3 hours</option>
            <option value="Half day (4 hours)">Half day (4 hours)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Additional Notes</label>
          <textarea 
            className="form-input" 
            rows="3" 
            placeholder="Any additional information..."
            value={bookingForm.notes}
            onChange={(e) => setBookingForm({...bookingForm, notes: e.target.value})}
          ></textarea>
        </div>
      </Modal>
    </div>
  );
};

export default FacultyDashboard;
