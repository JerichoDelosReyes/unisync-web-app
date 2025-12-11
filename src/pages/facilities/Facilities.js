import React, { useState, useEffect } from 'react';
import { 
  MapPin,
  Users,
  Clock,
  Building2,
  Dumbbell,
  UtensilsCrossed,
  Home,
  Loader
} from 'lucide-react';
import { Card, Button, Badge, Modal, Alert } from '../../components/common';
import { getFacilities, createBooking, subscribeToFacilities } from '../../services/firestoreService';
import { useAuth } from '../../context/AuthContext';
import './Facilities.css';

const Facilities = () => {
  const { user, userProfile } = useAuth();
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingData, setBookingData] = useState({
    reason: '',
    duration: '',
    notes: ''
  });

  const buildings = [
    { id: 'all', name: 'All Buildings', icon: Building2 },
    { id: 'new', name: 'New Building', icon: Building2 },
    { id: 'old', name: 'Old Building', icon: Building2 },
    { id: 'gym', name: 'Stage & Gymnasium', icon: Dumbbell },
    { id: 'canteen', name: 'Canteen', icon: UtensilsCrossed },
    { id: 'hm', name: 'HM Laboratory', icon: Home },
  ];

  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = subscribeToFacilities((data) => {
      setFacilities(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    setBookingSuccess(false);
  };

  const handleSubmitBooking = async () => {
    if (!bookingData.reason || !bookingData.duration) {
      return;
    }

    setSubmitting(true);
    try {
      await createBooking({
        facilityId: selectedRoom.id,
        facilityName: selectedRoom.name,
        userId: user.uid,
        userName: userProfile?.name || user.email,
        ...bookingData
      });
      setBookingSuccess(true);
      setBookingData({ reason: '', duration: '', notes: '' });
    } catch (error) {
      console.error('Booking error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Loader size={32} className="spin" />
      </div>
    );
  }

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
          {filteredFacilities.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '48px', gridColumn: '1 / -1' }}>
              <p style={{ color: 'var(--gray-500)' }}>No facilities found</p>
            </Card>
          ) : (
            filteredFacilities.map((room) => (
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
                {room.currentClass && (
                  <div className="room-tile-class">
                    <Clock size={12} />
                    {room.currentClass}
                  </div>
                )}
              </div>
            ))
          )}
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

            <div className="room-details-actions">
              {selectedRoom.status === 'vacant' ? (
                <>
                  <Button variant="primary" onClick={handleBookRoom} style={{ flex: 1 }}>
                    Request Room Access
                  </Button>
                </>
              ) : (
                <Button variant="outline" disabled style={{ flex: 1 }}>
                  Currently Occupied
                </Button>
              )}
            </div>

            {selectedRoom.status === 'occupied' && (
              <div className="mark-vacant-section">
                <p className="mark-vacant-text">Is this room actually vacant?</p>
                <Button variant="ghost" size="sm">
                  Mark as Vacant (Class Rep Only)
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Booking Modal */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        title={`Request Access: ${selectedRoom?.name}`}
        footer={
          bookingSuccess ? null : (
            <>
              <Button variant="outline" onClick={() => setShowBookingModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmitBooking} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </>
          )
        }
      >
        {bookingSuccess ? (
          <Alert variant="success">
            Booking request submitted successfully! You will be notified once it's approved.
          </Alert>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">Reason for Access</label>
              <select 
                className="form-input"
                value={bookingData.reason}
                onChange={(e) => setBookingData({ ...bookingData, reason: e.target.value })}
              >
                <option value="">Select reason</option>
                <option value="Scheduled Class">Scheduled Class</option>
                <option value="Make-up Class">Make-up Class</option>
                <option value="Thesis Defense">Thesis Defense</option>
                <option value="Emergency Meeting">Emergency Meeting</option>
                <option value="Consultation">Consultation</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Duration</label>
              <select 
                className="form-input"
                value={bookingData.duration}
                onChange={(e) => setBookingData({ ...bookingData, duration: e.target.value })}
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
                value={bookingData.notes}
                onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
              ></textarea>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default Facilities;
