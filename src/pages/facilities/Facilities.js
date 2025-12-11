import React, { useState } from 'react';
import { 
  Search, 
  MapPin,
  Users,
  Clock,
  Building2,
  Dumbbell,
  UtensilsCrossed,
  Home,
  Fan,
  Snowflake,
  AlertTriangle,
  CheckCircle,
  Key,
  Calendar,
  Zap,
  RefreshCw,
  Filter
} from 'lucide-react';
import { Card, Button, Badge, Modal, Alert, Select } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import './Facilities.css';

const Facilities = () => {
  const { user } = useAuth();
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showInstantBookModal, setShowInstantBookModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [instantBookParams, setInstantBookParams] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '',
    facilityType: '',
    capacity: ''
  });

  // Check if user can request room access (Faculty, Class Reps)
  const canRequestRoom = user?.role === 'faculty' || user?.isClassRep;
  
  // Check if user can use instant booking (Faculty only for Ad-Hoc)
  const canInstantBook = user?.role === 'faculty';
  
  // Check if user can mark room as vacant (Class Reps only)
  const canMarkVacant = user?.isClassRep;

  const buildings = [
    { id: 'all', name: 'All Buildings', icon: Building2 },
    { id: 'new', name: 'New Building', icon: Building2 },
    { id: 'old', name: 'Old Building', icon: Building2 },
    { id: 'gym', name: 'Stage & Gymnasium', icon: Dumbbell },
    { id: 'canteen', name: 'Canteen', icon: UtensilsCrossed },
    { id: 'hm', name: 'HM Laboratory', icon: Home },
  ];

  const facilities = [
    // New Building
    { id: 1, name: 'Room 101', building: 'new', floor: 1, type: 'Classroom', capacity: 40, status: 'vacant', currentClass: null, hasAC: true, fans: 0, nextClass: '10:00 AM - IT Elective 3' },
    { id: 2, name: 'Room 102', building: 'new', floor: 1, type: 'Classroom', capacity: 40, status: 'occupied', currentClass: 'IT Elective 3 - BSIT 4A', hasAC: true, fans: 0, nextClass: null },
    { id: 3, name: 'Room 201', building: 'new', floor: 2, type: 'Classroom', capacity: 35, status: 'vacant', currentClass: null, hasAC: true, fans: 0, nextClass: '1:00 PM - Database Systems' },
    { id: 4, name: 'Room 202', building: 'new', floor: 2, type: 'Classroom', capacity: 35, status: 'occupied', currentClass: 'Software Eng - BSIT 3B', hasAC: true, fans: 0, nextClass: null },
    { id: 5, name: 'Room 301', building: 'new', floor: 3, type: 'Classroom', capacity: 40, status: 'vacant', currentClass: null, hasAC: true, fans: 0, nextClass: null },
    { id: 6, name: 'Room 302', building: 'new', floor: 3, type: 'Classroom', capacity: 40, status: 'occupied', currentClass: 'Database Systems - BSIT 2A', hasAC: true, fans: 0, nextClass: null },
    { id: 7, name: 'Room 401', building: 'new', floor: 4, type: 'Classroom', capacity: 35, status: 'maintenance', currentClass: 'Under Maintenance', hasAC: true, fans: 0, nextClass: null },
    { id: 8, name: 'DIT Office', building: 'new', floor: 2, type: 'Office', capacity: 10, status: 'occupied', currentClass: 'Department Office', hasAC: true, fans: 0, nextClass: null },
    
    // Old Building - Computer Labs
    { id: 9, name: 'CompLab 1', building: 'old', floor: 2, type: 'Computer Lab', capacity: 30, status: 'occupied', currentClass: 'Programming 2 - BSIT 1A', hasAC: true, fans: 0, nextClass: null },
    { id: 10, name: 'CompLab 2', building: 'old', floor: 2, type: 'Computer Lab', capacity: 30, status: 'vacant', currentClass: null, hasAC: true, fans: 0, nextClass: '2:30 PM - Web Dev' },
    { id: 11, name: 'CompLab 3', building: 'old', floor: 2, type: 'Computer Lab', capacity: 30, status: 'vacant', currentClass: null, hasAC: true, fans: 0, nextClass: null },
    
    // Old Building - Classrooms
    { id: 19, name: 'Room 201', building: 'old', floor: 2, type: 'Classroom', capacity: 35, status: 'occupied', currentClass: 'Business Math - BSE 2A', hasAC: false, fans: 2, nextClass: null },
    { id: 20, name: 'Room 202', building: 'old', floor: 2, type: 'Classroom', capacity: 35, status: 'vacant', currentClass: null, hasAC: false, fans: 2, nextClass: null },
    { id: 24, name: 'Room 301', building: 'old', floor: 3, type: 'Classroom', capacity: 40, status: 'vacant', currentClass: null, hasAC: false, fans: 2, nextClass: null },
    { id: 29, name: 'Room 401', building: 'old', floor: 4, type: 'Classroom', capacity: 35, status: 'vacant', currentClass: null, hasAC: false, fans: 1, nextClass: null },
    
    // Old Building - Services
    { id: 12, name: 'Library', building: 'old', floor: 1, type: 'Library', capacity: 50, status: 'occupied', currentClass: 'Open for Students', hasAC: true, fans: 0, nextClass: null },
    { id: 13, name: 'Civil Security', building: 'old', floor: 1, type: 'Service', capacity: 5, status: 'occupied', currentClass: 'Guard Station', hasAC: false, fans: 1, nextClass: null },
    { id: 34, name: 'Health Service', building: 'old', floor: 1, type: 'Service', capacity: 5, status: 'occupied', currentClass: 'Operating Hours', hasAC: true, fans: 0, nextClass: null },
    
    // Gym
    { id: 14, name: 'Basketball Court', building: 'gym', floor: 1, type: 'Sports Facility', capacity: 100, status: 'vacant', currentClass: null, hasAC: false, fans: 4, nextClass: '3:00 PM - PE Class' },
    { id: 15, name: 'Stage', building: 'gym', floor: 1, type: 'Event Venue', capacity: 200, status: 'vacant', currentClass: null, hasAC: false, fans: 6, nextClass: null },
    { id: 35, name: 'Equipment Storage', building: 'gym', floor: 1, type: 'Storage', capacity: 5, status: 'occupied', currentClass: 'Staff Only', hasAC: false, fans: 0, nextClass: null },
    
    // Canteen
    { id: 16, name: 'Main Dining Area', building: 'canteen', floor: 1, type: 'Dining', capacity: 150, status: 'occupied', currentClass: 'Open Hours', hasAC: false, fans: 8, nextClass: null },
    
    // HM Lab
    { id: 17, name: 'Kitchen Lab 1', building: 'hm', floor: 1, type: 'Laboratory', capacity: 20, status: 'occupied', currentClass: 'Food Prep - BSHM 2A', hasAC: true, fans: 0, nextClass: null },
    { id: 18, name: 'Kitchen Lab 2', building: 'hm', floor: 1, type: 'Laboratory', capacity: 20, status: 'vacant', currentClass: null, hasAC: true, fans: 0, nextClass: null },
    { id: 36, name: 'Mock Hotel Room', building: 'hm', floor: 1, type: 'Laboratory', capacity: 10, status: 'vacant', currentClass: null, hasAC: true, fans: 0, nextClass: null },
  ];

  // Best-Fit Algorithm for Instant Booking
  const findBestFitRoom = (params) => {
    const { facilityType, capacity } = params;
    const requiredCapacity = parseInt(capacity) || 0;
    
    // Filter rooms that match criteria
    let candidates = facilities.filter(room => {
      // Must be vacant
      if (room.status !== 'vacant') return false;
      // Must match facility type or be 'Classroom' if looking for general space
      if (facilityType && facilityType !== 'any') {
        if (room.type !== facilityType) return false;
      }
      // Must have enough capacity
      if (room.capacity < requiredCapacity) return false;
      return true;
    });
    
    // Sort by capacity (smallest that fits - Best-Fit)
    candidates.sort((a, b) => a.capacity - b.capacity);
    
    return candidates[0] || null;
  };

  const handleInstantBook = () => {
    const bestRoom = findBestFitRoom(instantBookParams);
    if (bestRoom) {
      setSelectedRoom(bestRoom);
      setBookingSuccess(true);
    }
  };

  const handleMarkVacant = (room) => {
    // In real implementation, this would update the database
    alert(`Room ${room.name} has been marked as vacant. Guard will be notified.`);
  };

  const filteredFacilities = selectedBuilding === 'all' 
    ? facilities 
    : facilities.filter(f => f.building === selectedBuilding);

  const vacantCount = filteredFacilities.filter(f => f.status === 'vacant').length;
  const occupiedCount = filteredFacilities.filter(f => f.status === 'occupied').length;
  const maintenanceCount = filteredFacilities.filter(f => f.status === 'maintenance').length;

  const handleRoomClick = (room) => {
    setSelectedRoom(room);
    setBookingSuccess(false);
  };

  const handleBookRoom = () => {
    setShowBookingModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'vacant': return 'success';
      case 'occupied': return 'error';
      case 'maintenance': return 'warning';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'vacant': return <CheckCircle size={14} />;
      case 'occupied': return <Users size={14} />;
      case 'maintenance': return <AlertTriangle size={14} />;
      default: return null;
    }
  };

  return (
    <div className="facilities-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Facilities & Room Status</h1>
          <p className="page-subtitle">Real-time room availability across campus</p>
        </div>
        <div className="header-actions">
          {canInstantBook && (
            <Button variant="primary" icon={Zap} onClick={() => setShowInstantBookModal(true)}>
              Instant Book
            </Button>
          )}
          <Button variant="outline" icon={RefreshCw}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="status-summary-bar">
        <div className="status-item vacant">
          <CheckCircle size={16} />
          <span>{vacantCount} Vacant</span>
        </div>
        <div className="status-item occupied">
          <Users size={16} />
          <span>{occupiedCount} Occupied</span>
        </div>
        <div className="status-item maintenance">
          <AlertTriangle size={16} />
          <span>{maintenanceCount} Maintenance</span>
        </div>
      </div>

      {/* Building Filter */}
      <div className="building-tabs">
        {buildings.map((building) => (
          <button
            key={building.id}
            className={`building-tab ${selectedBuilding === building.id ? 'active' : ''}`}
            onClick={() => setSelectedBuilding(building.id)}
          >
            <building.icon size={18} />
            {building.name}
          </button>
        ))}
      </div>

      <div className="facilities-layout">
        {/* Room Grid */}
        <div className="room-grid">
          {filteredFacilities.map((room) => (
            <div 
              key={room.id}
              className={`room-tile ${room.status} ${selectedRoom?.id === room.id ? 'selected' : ''}`}
              onClick={() => handleRoomClick(room)}
            >
              <div className="room-tile-header">
                <h4 className="room-tile-name">{room.name}</h4>
                <div className={`status-indicator ${room.status}`}>
                  {getStatusIcon(room.status)}
                </div>
              </div>
              <div className="room-tile-info">
                <span><MapPin size={12} /> Floor {room.floor}</span>
                <span><Users size={12} /> {room.capacity}</span>
              </div>
              <div className="room-tile-amenities">
                {room.hasAC && (
                  <span className="amenity-badge ac">
                    <Snowflake size={12} /> AC
                  </span>
                )}
                {room.fans > 0 && (
                  <span className="amenity-badge fan">
                    <Fan size={12} /> {room.fans}x
                  </span>
                )}
              </div>
              {room.currentClass && (
                <div className="room-tile-class">
                  <Clock size={12} />
                  <span>{room.currentClass}</span>
                </div>
              )}
              {room.status === 'vacant' && room.nextClass && (
                <div className="room-tile-next">
                  <Calendar size={12} />
                  <span>Next: {room.nextClass}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Room Details Panel */}
        {selectedRoom && (
          <Card className="room-details">
            <div className="room-details-header">
              <h3>{selectedRoom.name}</h3>
              <Badge variant={getStatusColor(selectedRoom.status)} dot>
                {selectedRoom.status}
              </Badge>
            </div>
            
            <div className="room-details-info">
              <div className="detail-row">
                <MapPin size={16} />
                <span>{buildings.find(b => b.id === selectedRoom.building)?.name}, Floor {selectedRoom.floor}</span>
              </div>
              <div className="detail-row">
                <Building2 size={16} />
                <span>{selectedRoom.type}</span>
              </div>
              <div className="detail-row">
                <Users size={16} />
                <span>Capacity: {selectedRoom.capacity} people</span>
              </div>
              {selectedRoom.currentClass && (
                <div className="detail-row current">
                  <Clock size={16} />
                  <span>{selectedRoom.currentClass}</span>
                </div>
              )}
              {selectedRoom.nextClass && (
                <div className="detail-row next">
                  <Calendar size={16} />
                  <span>Next: {selectedRoom.nextClass}</span>
                </div>
              )}
            </div>

            <div className="room-amenities-section">
              <h4>Amenities</h4>
              <div className="amenities-list">
                <div className={`amenity-item ${selectedRoom.hasAC ? 'has' : 'none'}`}>
                  <Snowflake size={16} />
                  <span>Air Conditioning</span>
                  <Badge variant={selectedRoom.hasAC ? 'success' : 'gray'}>
                    {selectedRoom.hasAC ? 'Available' : 'None'}
                  </Badge>
                </div>
                <div className={`amenity-item ${selectedRoom.fans > 0 ? 'has' : 'none'}`}>
                  <Fan size={16} />
                  <span>Electric Fans</span>
                  <Badge variant={selectedRoom.fans > 0 ? 'success' : 'gray'}>
                    {selectedRoom.fans > 0 ? `${selectedRoom.fans}x` : 'None'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="room-details-actions">
              {selectedRoom.status === 'vacant' ? (
                canRequestRoom ? (
                  <Button variant="primary" icon={Key} onClick={handleBookRoom} style={{ flex: 1 }}>
                    Request Access
                  </Button>
                ) : (
                  <div style={{ width: '100%' }}>
                    <Button variant="outline" disabled style={{ width: '100%' }}>
                      Request Access
                    </Button>
                    <p style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '8px', textAlign: 'center' }}>
                      Only Faculty and Class Reps can request
                    </p>
                  </div>
                )
              ) : selectedRoom.status === 'maintenance' ? (
                <Button variant="outline" disabled style={{ flex: 1 }}>
                  Under Maintenance
                </Button>
              ) : (
                <Button variant="outline" disabled style={{ flex: 1 }}>
                  Currently Occupied
                </Button>
              )}
            </div>

            {/* Mark as Vacant - Class Rep Feature */}
            {selectedRoom.status === 'occupied' && canMarkVacant && (
              <div className="mark-vacant-section">
                <p className="mark-vacant-text">Is this room actually vacant? (Prof absent?)</p>
                <Button variant="ghost" size="sm" onClick={() => handleMarkVacant(selectedRoom)}>
                  Mark as Vacant
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Role-specific Info */}
      {user?.role === 'faculty' && (
        <Alert variant="info" style={{ marginTop: '20px' }}>
          <strong>Faculty:</strong> Use "Instant Book" for Ad-Hoc room access. The system will automatically find the best available room matching your requirements.
        </Alert>
      )}
      
      {user?.isClassRep && (
        <Alert variant="info" style={{ marginTop: '20px' }}>
          <strong>Class Representative:</strong> You can request room access for scheduled classes and mark rooms as vacant when professors are absent.
        </Alert>
      )}

      {/* Standard Booking Modal */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        title={`Request Access: ${selectedRoom?.name}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowBookingModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => {
              setShowBookingModal(false);
              alert('Request sent to Civil Security. Please wait for confirmation.');
            }}>
              Submit Request
            </Button>
          </>
        }
      >
        {user?.isClassRep && (
          <div className="form-group">
            <label className="form-label">Requesting for Section</label>
            <input className="form-input" value={user.section || 'BSCS 3-1'} disabled />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Request Type</label>
          <select className="form-input">
            <option value="standard">Standard Request (Scheduled Class)</option>
            {user?.role === 'faculty' && (
              <option value="adhoc">Ad-Hoc Request (Make-up/Emergency)</option>
            )}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Reason for Access</label>
          <select className="form-input">
            <option>Select reason</option>
            <option>Scheduled Class (Room Unlock)</option>
            <option>Make-up Class</option>
            <option>Thesis Defense</option>
            <option>Group Study</option>
            <option>Department Meeting</option>
            <option>Consultation</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Duration</label>
          <select className="form-input">
            <option>1 hour</option>
            <option>2 hours</option>
            <option>3 hours</option>
            <option>Half day (4 hours)</option>
          </select>
        </div>
        {user?.role === 'faculty' && (
          <Alert variant="warning" style={{ marginTop: '10px' }}>
            <strong>Ad-Hoc Access:</strong> Guard will verify your Faculty ID before unlocking the room.
          </Alert>
        )}
      </Modal>

      {/* Instant Book Modal (Faculty Only) */}
      <Modal
        isOpen={showInstantBookModal}
        onClose={() => {
          setShowInstantBookModal(false);
          setBookingSuccess(false);
        }}
        title="Instant Room Booking"
        size="lg"
        footer={
          !bookingSuccess && (
            <>
              <Button variant="outline" onClick={() => setShowInstantBookModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" icon={Zap} onClick={handleInstantBook}>
                Find Best Room
              </Button>
            </>
          )
        }
      >
        {bookingSuccess ? (
          <div className="booking-success">
            <CheckCircle size={48} className="success-icon" />
            <h3>Room Booked Successfully!</h3>
            <p>You have been assigned <strong>{selectedRoom?.name}</strong></p>
            <div className="booked-room-details">
              <span><MapPin size={14} /> {buildings.find(b => b.id === selectedRoom?.building)?.name}</span>
              <span><Users size={14} /> Capacity: {selectedRoom?.capacity}</span>
            </div>
            <Alert variant="info" style={{ marginTop: '20px' }}>
              <strong>Next Step:</strong> Proceed to Civil Security with your Faculty ID to unlock the room.
            </Alert>
            <Button variant="primary" onClick={() => {
              setShowInstantBookModal(false);
              setBookingSuccess(false);
            }} style={{ marginTop: '20px' }}>
              Done
            </Button>
          </div>
        ) : (
          <div className="instant-book-form">
            <p className="form-description">
              The Best-Fit algorithm will find the smallest available room that matches your requirements.
            </p>
            
            <div className="form-group">
              <label className="form-label">Date</label>
              <input 
                type="date" 
                className="form-input"
                value={instantBookParams.date}
                onChange={(e) => setInstantBookParams(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Time Slot</label>
              <select 
                className="form-input"
                value={instantBookParams.time}
                onChange={(e) => setInstantBookParams(prev => ({ ...prev, time: e.target.value }))}
              >
                <option value="">Select time</option>
                <option value="07:00">7:00 AM - 8:00 AM</option>
                <option value="08:00">8:00 AM - 9:00 AM</option>
                <option value="09:00">9:00 AM - 10:00 AM</option>
                <option value="10:00">10:00 AM - 11:00 AM</option>
                <option value="11:00">11:00 AM - 12:00 PM</option>
                <option value="13:00">1:00 PM - 2:00 PM</option>
                <option value="14:00">2:00 PM - 3:00 PM</option>
                <option value="15:00">3:00 PM - 4:00 PM</option>
                <option value="16:00">4:00 PM - 5:00 PM</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Facility Type</label>
              <select 
                className="form-input"
                value={instantBookParams.facilityType}
                onChange={(e) => setInstantBookParams(prev => ({ ...prev, facilityType: e.target.value }))}
              >
                <option value="any">Any Available</option>
                <option value="Classroom">Classroom</option>
                <option value="Computer Lab">Computer Lab</option>
                <option value="Laboratory">Laboratory</option>
                <option value="Sports Facility">Sports Facility</option>
                <option value="Event Venue">Event Venue</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Minimum Capacity Needed</label>
              <select 
                className="form-input"
                value={instantBookParams.capacity}
                onChange={(e) => setInstantBookParams(prev => ({ ...prev, capacity: e.target.value }))}
              >
                <option value="10">10+ people</option>
                <option value="20">20+ people</option>
                <option value="30">30+ people</option>
                <option value="40">40+ people</option>
                <option value="50">50+ people</option>
                <option value="100">100+ people</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Reason (for Ad-Hoc)</label>
              <select className="form-input">
                <option>Make-up Class</option>
                <option>Emergency Lecture</option>
                <option>Thesis Defense</option>
                <option>Department Meeting</option>
                <option>Consultation Session</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Facilities;
