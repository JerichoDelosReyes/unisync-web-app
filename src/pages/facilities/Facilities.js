import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MapPin,
  Users,
  Clock,
  ChevronDown,
  Building2,
  Dumbbell,
  BookOpen,
  UtensilsCrossed,
  Home,
  Wind,
  Fan,
  Snowflake,
  Info
} from 'lucide-react';
import { Card, Button, Badge, Modal, Alert } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import './Facilities.css';

const Facilities = () => {
  const { user } = useAuth();
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Check if user can request room access
  const canRequestRoom = user?.role === 'admin' || user?.role === 'faculty' || user?.isClassRep;

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
    { id: 1, name: 'Room 101', building: 'new', floor: 1, type: 'Classroom', capacity: 40, status: 'vacant', currentClass: null, hasAC: true, fans: 0 },
    { id: 2, name: 'Room 102', building: 'new', floor: 1, type: 'Classroom', capacity: 40, status: 'occupied', currentClass: 'IT Elective 3 - BSIT 4A', hasAC: true, fans: 0 },
    { id: 3, name: 'Room 201', building: 'new', floor: 2, type: 'Classroom', capacity: 35, status: 'vacant', currentClass: null, hasAC: true, fans: 0 },
    { id: 4, name: 'Room 202', building: 'new', floor: 2, type: 'Classroom', capacity: 35, status: 'occupied', currentClass: 'Software Eng - BSIT 3B', hasAC: true, fans: 0 },
    { id: 5, name: 'Room 301', building: 'new', floor: 3, type: 'Classroom', capacity: 40, status: 'vacant', currentClass: null, hasAC: true, fans: 0 },
    { id: 6, name: 'Room 302', building: 'new', floor: 3, type: 'Classroom', capacity: 40, status: 'occupied', currentClass: 'Database Systems - BSIT 2A', hasAC: true, fans: 0 },
    { id: 7, name: 'Room 401', building: 'new', floor: 4, type: 'Classroom', capacity: 35, status: 'vacant', currentClass: null, hasAC: true, fans: 0 },
    { id: 8, name: 'DIT Office', building: 'new', floor: 2, type: 'Office', capacity: 10, status: 'occupied', currentClass: 'Department Office', hasAC: true, fans: 0 },
    
    // Old Building - Computer Labs
    { id: 9, name: 'CompLab 1', building: 'old', floor: 2, type: 'Computer Lab', capacity: 30, status: 'occupied', currentClass: 'Programming 2 - BSIT 1A', hasAC: true, fans: 0 },
    { id: 10, name: 'CompLab 2', building: 'old', floor: 2, type: 'Computer Lab', capacity: 30, status: 'vacant', currentClass: null, hasAC: true, fans: 0 },
    { id: 11, name: 'CompLab 3', building: 'old', floor: 2, type: 'Computer Lab', capacity: 30, status: 'vacant', currentClass: null, hasAC: true, fans: 0 },
    
    // Old Building - 2nd Floor Rooms
    { id: 19, name: 'Room 201', building: 'old', floor: 2, type: 'Classroom', capacity: 35, status: 'occupied', currentClass: 'Business Math - BSE 2A', hasAC: false, fans: 2 },
    { id: 20, name: 'Room 202', building: 'old', floor: 2, type: 'Classroom', capacity: 35, status: 'vacant', currentClass: null, hasAC: false, fans: 2 },
    { id: 21, name: 'Room 203', building: 'old', floor: 2, type: 'Classroom', capacity: 35, status: 'occupied', currentClass: 'Gen Psychology - BSP 1A', hasAC: false, fans: 2 },
    { id: 22, name: 'Room 204', building: 'old', floor: 2, type: 'Classroom', capacity: 35, status: 'vacant', currentClass: null, hasAC: false, fans: 2 },
    { id: 23, name: 'Room 205', building: 'old', floor: 2, type: 'Classroom', capacity: 35, status: 'vacant', currentClass: null, hasAC: false, fans: 2 },
    
    // Old Building - 3rd Floor Rooms
    { id: 24, name: 'Room 301', building: 'old', floor: 3, type: 'Classroom', capacity: 40, status: 'vacant', currentClass: null, hasAC: false, fans: 2 },
    { id: 25, name: 'Room 302', building: 'old', floor: 3, type: 'Classroom', capacity: 40, status: 'occupied', currentClass: 'English Comm - BA 2A', hasAC: false, fans: 2 },
    { id: 26, name: 'Room 303', building: 'old', floor: 3, type: 'Classroom', capacity: 40, status: 'vacant', currentClass: null, hasAC: false, fans: 2 },
    { id: 27, name: 'Room 304', building: 'old', floor: 3, type: 'Classroom', capacity: 40, status: 'vacant', currentClass: null, hasAC: false, fans: 2 },
    { id: 28, name: 'Room 305', building: 'old', floor: 3, type: 'Classroom', capacity: 40, status: 'occupied', currentClass: 'Statistics - BSA 1A', hasAC: false, fans: 2 },
    
    // Old Building - 4th Floor Rooms
    { id: 29, name: 'Room 401', building: 'old', floor: 4, type: 'Classroom', capacity: 35, status: 'vacant', currentClass: null, hasAC: false, fans: 1 },
    { id: 30, name: 'Room 402', building: 'old', floor: 4, type: 'Classroom', capacity: 35, status: 'vacant', currentClass: null, hasAC: false, fans: 1 },
    { id: 31, name: 'Room 403', building: 'old', floor: 4, type: 'Classroom', capacity: 35, status: 'occupied', currentClass: 'PE 3 - BSIT 2A', hasAC: false, fans: 1 },
    { id: 32, name: 'Room 404', building: 'old', floor: 4, type: 'Classroom', capacity: 35, status: 'vacant', currentClass: null, hasAC: false, fans: 1 },
    { id: 33, name: 'Room 405', building: 'old', floor: 4, type: 'Classroom', capacity: 35, status: 'vacant', currentClass: null, hasAC: false, fans: 1 },
    
    // Old Building - Services
    { id: 12, name: 'Library', building: 'old', floor: 1, type: 'Library', capacity: 50, status: 'occupied', currentClass: 'Open for Students', hasAC: true, fans: 0 },
    { id: 13, name: 'Health Service', building: 'old', floor: 1, type: 'Service', capacity: 5, status: 'occupied', currentClass: 'Operating Hours', hasAC: true, fans: 0 },
    
    // Gym
    { id: 14, name: 'Basketball Court', building: 'gym', floor: 1, type: 'Sports Facility', capacity: 100, status: 'vacant', currentClass: null, hasAC: false, fans: 4 },
    { id: 15, name: 'Stage', building: 'gym', floor: 1, type: 'Event Venue', capacity: 200, status: 'vacant', currentClass: null, hasAC: false, fans: 6 },
    
    // Canteen
    { id: 16, name: 'Main Dining Area', building: 'canteen', floor: 1, type: 'Dining', capacity: 150, status: 'occupied', currentClass: 'Open Hours', hasAC: false, fans: 8 },
    
    // HM Lab
    { id: 17, name: 'Kitchen Lab 1', building: 'hm', floor: 1, type: 'Laboratory', capacity: 20, status: 'occupied', currentClass: 'Food Prep - BSHM 2A', hasAC: true, fans: 0 },
    { id: 18, name: 'Mock Hotel Room', building: 'hm', floor: 1, type: 'Laboratory', capacity: 10, status: 'vacant', currentClass: null, hasAC: true, fans: 0 },
  ];

  const filteredFacilities = selectedBuilding === 'all' 
    ? facilities 
    : facilities.filter(f => f.building === selectedBuilding);

  const vacantCount = filteredFacilities.filter(f => f.status === 'vacant').length;
  const occupiedCount = filteredFacilities.filter(f => f.status === 'occupied').length;

  const handleRoomClick = (room) => {
    setSelectedRoom(room);
  };

  const handleBookRoom = () => {
    setShowBookingModal(true);
  };

  return (
    <div className="facilities-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Facilities & Room Status</h1>
          <p className="page-subtitle">Real-time room availability across campus</p>
        </div>
        <div className="status-summary">
          <div className="status-item vacant">
            <span className="status-dot"></span>
            <span>{vacantCount} Vacant</span>
          </div>
          <div className="status-item occupied">
            <span className="status-dot"></span>
            <span>{occupiedCount} Occupied</span>
          </div>
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
                <Badge variant={room.status === 'vacant' ? 'success' : 'error'} dot>
                  {room.status}
                </Badge>
              </div>
              <div className="room-tile-info">
                <span><MapPin size={12} /> {buildings.find(b => b.id === room.building)?.name}</span>
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
                    <Fan size={12} /> {room.fans}x Fan{room.fans > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {room.currentClass && (
                <div className="room-tile-class">
                  <Clock size={12} />
                  {room.currentClass}
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
              <Badge variant={selectedRoom.status === 'vacant' ? 'success' : 'error'} dot>
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
                <div className="detail-row">
                  <Clock size={16} />
                  <span>{selectedRoom.currentClass}</span>
                </div>
              )}
            </div>

            <div className="room-amenities-section">
              <h4>Amenities</h4>
              <div className="amenities-list">
                {selectedRoom.hasAC ? (
                  <div className="amenity-item has">
                    <Snowflake size={16} />
                    <span>Air Conditioning</span>
                    <Badge variant="success">Available</Badge>
                  </div>
                ) : (
                  <div className="amenity-item none">
                    <Snowflake size={16} />
                    <span>Air Conditioning</span>
                    <Badge variant="gray">Not Available</Badge>
                  </div>
                )}
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
                  <Button variant="primary" onClick={handleBookRoom} style={{ flex: 1 }}>
                    Request Room Access
                  </Button>
                ) : (
                  <div style={{ width: '100%' }}>
                    <Button variant="outline" disabled style={{ width: '100%' }}>
                      Request Room Access
                    </Button>
                    <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '8px', textAlign: 'center' }}>
                      Only Class Representatives can request room access
                    </p>
                  </div>
                )
              ) : (
                <Button variant="outline" disabled style={{ flex: 1 }}>
                  Currently Occupied
                </Button>
              )}
            </div>

            {selectedRoom.status === 'occupied' && user?.isClassRep && (
              <div className="mark-vacant-section">
                <p className="mark-vacant-text">Is this room actually vacant?</p>
                <Button variant="ghost" size="sm">
                  Mark as Vacant
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Class Rep Info */}
      {user?.isClassRep && (
        <Alert variant="info" style={{ marginTop: '20px' }}>
          <strong>Class Representative:</strong> You can request room access for your section ({user.section}) and mark rooms as vacant when they're incorrectly shown as occupied.
        </Alert>
      )}

      {/* Booking Modal */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        title={`Request Access: ${selectedRoom?.name}`}
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
        {user?.isClassRep && (
          <div className="form-group">
            <label className="form-label">Requesting for Section</label>
            <input className="form-input" value={user.section || 'BSIT 4A'} disabled />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Reason for Access</label>
          <select className="form-input">
            <option>Select reason</option>
            {user?.isClassRep ? (
              <>
                <option>Scheduled Class (Room Unlock)</option>
                <option>Make-up Class</option>
                <option>Group Study</option>
                <option>Class Meeting</option>
                <option>Review Session</option>
              </>
            ) : user?.role === 'faculty' ? (
              <>
                <option>Scheduled Class</option>
                <option>Make-up Class</option>
                <option>Thesis Defense</option>
                <option>Consultation</option>
                <option>Department Meeting</option>
              </>
            ) : (
              <>
                <option>Scheduled Class</option>
                <option>Make-up Class</option>
                <option>Thesis Defense</option>
                <option>Emergency Meeting</option>
                <option>Consultation</option>
                <option>Other</option>
              </>
            )}
          </select>
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

export default Facilities;
