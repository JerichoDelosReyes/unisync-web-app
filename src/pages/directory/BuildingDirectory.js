import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  ChevronDown,
  ChevronRight,
  Dumbbell,
  UtensilsCrossed,
  Home,
  Search,
  Navigation,
  Clock,
  Users,
  Monitor,
  Wifi,
  Wind,
  Accessibility
} from 'lucide-react';
import { Card, Badge, Input } from '../../components/common';
import './Directory.css';

const BuildingDirectory = () => {
  const [expandedBuilding, setExpandedBuilding] = useState('academic');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Comprehensive building data with detailed room information
  const buildings = [
    {
      id: 'academic',
      name: 'Academic Building',
      icon: Building2,
      floors: 4,
      description: 'Main academic building with classrooms, lecture halls, and department offices.',
      operatingHours: '6:00 AM - 9:00 PM (Mon-Sat)',
      floorData: [
        { 
          floor: 'Ground Floor', 
          rooms: [
            { name: 'Room 101', type: 'classroom', capacity: 40, amenities: ['AC', 'Projector', 'WiFi'] },
            { name: 'Room 102', type: 'classroom', capacity: 40, amenities: ['AC', 'Projector', 'WiFi'] },
            { name: 'Room 103', type: 'classroom', capacity: 40, amenities: ['AC', 'Projector', 'WiFi'] },
            { name: 'Registrar Office', type: 'office', capacity: 15, amenities: ['AC', 'WiFi'] },
            { name: 'Cashier\'s Office', type: 'office', capacity: 10, amenities: ['AC', 'WiFi'] },
            { name: 'Admission Office', type: 'office', capacity: 12, amenities: ['AC', 'WiFi'] },
            { name: 'Guard Station', type: 'security', capacity: 5, amenities: ['CCTV Monitor'] },
          ]
        },
        { 
          floor: '2nd Floor', 
          rooms: [
            { name: 'Room 201', type: 'classroom', capacity: 45, amenities: ['AC', 'Projector', 'WiFi'] },
            { name: 'Room 202', type: 'classroom', capacity: 45, amenities: ['AC', 'Projector', 'WiFi'] },
            { name: 'Room 203', type: 'classroom', capacity: 45, amenities: ['AC', 'Projector', 'WiFi'] },
            { name: 'DIT Office', type: 'office', capacity: 20, amenities: ['AC', 'WiFi', 'Server Access'] },
            { name: 'Guidance Office', type: 'office', capacity: 8, amenities: ['AC', 'WiFi'] },
            { name: 'Faculty Lounge', type: 'lounge', capacity: 25, amenities: ['AC', 'WiFi', 'Pantry'] },
          ]
        },
        { 
          floor: '3rd Floor', 
          rooms: [
            { name: 'Room 301', type: 'classroom', capacity: 50, amenities: ['AC', 'Projector', 'WiFi'] },
            { name: 'Room 302', type: 'classroom', capacity: 50, amenities: ['AC', 'Projector', 'WiFi'] },
            { name: 'Room 303', type: 'lecture-hall', capacity: 80, amenities: ['AC', 'Projector', 'WiFi', 'Microphone'] },
            { name: 'Room 304', type: 'classroom', capacity: 45, amenities: ['AC', 'Projector', 'WiFi'] },
            { name: 'Conference Room A', type: 'conference', capacity: 20, amenities: ['AC', 'Projector', 'WiFi', 'Whiteboard'] },
          ]
        },
        { 
          floor: '4th Floor', 
          rooms: [
            { name: 'Room 401', type: 'classroom', capacity: 40, amenities: ['AC', 'Projector', 'WiFi'] },
            { name: 'Room 402', type: 'classroom', capacity: 40, amenities: ['AC', 'Projector', 'WiFi'] },
            { name: 'AVR (Audio Visual Room)', type: 'avr', capacity: 100, amenities: ['AC', 'Projector', 'Sound System', 'Stage'] },
            { name: 'Research Center', type: 'lab', capacity: 15, amenities: ['AC', 'WiFi', 'Computers'] },
          ]
        },
      ]
    },
    {
      id: 'it-building',
      name: 'IT & Computer Laboratory Building',
      icon: Monitor,
      floors: 3,
      description: 'Computer laboratories, IT offices, and technology-focused facilities.',
      operatingHours: '7:00 AM - 8:00 PM (Mon-Sat)',
      floorData: [
        { 
          floor: 'Ground Floor', 
          rooms: [
            { name: 'Computer Lab 1', type: 'complab', capacity: 50, amenities: ['AC', 'WiFi', '50 PCs', 'Projector'] },
            { name: 'Computer Lab 2', type: 'complab', capacity: 50, amenities: ['AC', 'WiFi', '50 PCs', 'Projector'] },
            { name: 'MIS Office', type: 'office', capacity: 10, amenities: ['AC', 'WiFi', 'Server Room'] },
            { name: 'Technical Support', type: 'office', capacity: 8, amenities: ['AC', 'WiFi'] },
          ]
        },
        { 
          floor: '2nd Floor', 
          rooms: [
            { name: 'Computer Lab 3', type: 'complab', capacity: 45, amenities: ['AC', 'WiFi', '45 PCs', 'Projector'] },
            { name: 'Computer Lab 4', type: 'complab', capacity: 45, amenities: ['AC', 'WiFi', '45 PCs', 'Projector'] },
            { name: 'Cisco Lab', type: 'specialized-lab', capacity: 30, amenities: ['AC', 'WiFi', 'Networking Equipment'] },
            { name: 'Programming Lab', type: 'specialized-lab', capacity: 35, amenities: ['AC', 'WiFi', 'Development Servers'] },
          ]
        },
        { 
          floor: '3rd Floor', 
          rooms: [
            { name: 'Software Development Lab', type: 'specialized-lab', capacity: 40, amenities: ['AC', 'WiFi', 'High-end PCs'] },
            { name: 'Multimedia Lab', type: 'specialized-lab', capacity: 30, amenities: ['AC', 'WiFi', 'Mac Computers', 'Drawing Tablets'] },
            { name: 'Server Room', type: 'restricted', capacity: 5, amenities: ['AC', 'UPS', 'Fire Suppression'] },
            { name: 'IT Faculty Office', type: 'office', capacity: 15, amenities: ['AC', 'WiFi'] },
          ]
        },
      ]
    },
    {
      id: 'library-building',
      name: 'Library & Student Services Building',
      icon: Building2,
      floors: 2,
      description: 'Main library, student affairs, health services, and civil security office.',
      operatingHours: '7:00 AM - 6:00 PM (Mon-Sat)',
      floorData: [
        { 
          floor: 'Ground Floor', 
          rooms: [
            { name: 'Civil Security Office', type: 'security', capacity: 15, amenities: ['AC', 'CCTV Monitors', 'Radio System'] },
            { name: 'Health Services Unit', type: 'clinic', capacity: 10, amenities: ['AC', 'Medical Equipment', 'First Aid'] },
            { name: 'Student Affairs Office', type: 'office', capacity: 12, amenities: ['AC', 'WiFi'] },
            { name: 'Scholarship Office', type: 'office', capacity: 8, amenities: ['AC', 'WiFi'] },
            { name: 'Lost and Found', type: 'service', capacity: 5, amenities: ['AC'] },
          ]
        },
        { 
          floor: '2nd Floor', 
          rooms: [
            { name: 'Main Library', type: 'library', capacity: 150, amenities: ['AC', 'WiFi', 'Study Areas', 'E-Library'] },
            { name: 'Reading Room', type: 'study', capacity: 50, amenities: ['AC', 'WiFi', 'Quiet Zone'] },
            { name: 'Audio-Visual Section', type: 'av-room', capacity: 20, amenities: ['AC', 'Headphones', 'Viewing Stations'] },
            { name: 'Periodicals Section', type: 'library', capacity: 30, amenities: ['AC', 'WiFi'] },
            { name: 'Discussion Room 1', type: 'study', capacity: 10, amenities: ['AC', 'Whiteboard'] },
            { name: 'Discussion Room 2', type: 'study', capacity: 10, amenities: ['AC', 'Whiteboard'] },
          ]
        },
      ]
    },
    {
      id: 'gym',
      name: 'Gymnasium & Sports Complex',
      icon: Dumbbell,
      floors: 1,
      description: 'Main sports facility, events venue, and physical education area.',
      operatingHours: '6:00 AM - 8:00 PM (Mon-Sat)',
      floorData: [
        { 
          floor: 'Main Level', 
          rooms: [
            { name: 'Main Court', type: 'sports', capacity: 500, amenities: ['Basketball', 'Volleyball', 'Badminton'] },
            { name: 'Stage', type: 'stage', capacity: 100, amenities: ['Sound System', 'Lighting', 'Backstage'] },
            { name: 'Bleachers Section A', type: 'seating', capacity: 250, amenities: ['Covered'] },
            { name: 'Bleachers Section B', type: 'seating', capacity: 250, amenities: ['Covered'] },
            { name: 'Equipment Room', type: 'storage', capacity: 10, amenities: ['Sports Equipment'] },
            { name: 'PE Faculty Office', type: 'office', capacity: 8, amenities: ['AC', 'WiFi'] },
            { name: 'Locker Room (Male)', type: 'locker', capacity: 30, amenities: ['Showers', 'Lockers'] },
            { name: 'Locker Room (Female)', type: 'locker', capacity: 30, amenities: ['Showers', 'Lockers'] },
          ]
        },
      ]
    },
    {
      id: 'canteen',
      name: 'Canteen & Student Center',
      icon: UtensilsCrossed,
      floors: 1,
      description: 'Main dining facility, food stalls, and student hangout area.',
      operatingHours: '6:00 AM - 7:00 PM (Mon-Sat)',
      floorData: [
        { 
          floor: 'Main Level', 
          rooms: [
            { name: 'Main Dining Hall', type: 'dining', capacity: 200, amenities: ['Tables', 'WiFi', 'Fans'] },
            { name: 'Food Stall Area', type: 'vendor', capacity: 50, amenities: ['10 Food Stalls'] },
            { name: 'Student Lounge', type: 'lounge', capacity: 40, amenities: ['WiFi', 'Charging Stations'] },
            { name: 'Mini Store', type: 'store', capacity: 10, amenities: ['School Supplies'] },
            { name: 'Organization Hub', type: 'office', capacity: 30, amenities: ['AC', 'WiFi', 'Meeting Space'] },
          ]
        },
      ]
    },
    {
      id: 'hm-building',
      name: 'Hospitality Management Building',
      icon: Home,
      floors: 2,
      description: 'Specialized facilities for HM students including kitchen labs and mock facilities.',
      operatingHours: '7:00 AM - 6:00 PM (Mon-Sat)',
      floorData: [
        { 
          floor: 'Ground Floor', 
          rooms: [
            { name: 'Main Kitchen Lab', type: 'kitchen-lab', capacity: 30, amenities: ['AC', 'Cooking Equipment', 'Ventilation'] },
            { name: 'Baking Lab', type: 'kitchen-lab', capacity: 20, amenities: ['AC', 'Ovens', 'Bakery Equipment'] },
            { name: 'Food Storage', type: 'storage', capacity: 5, amenities: ['Refrigeration', 'Dry Storage'] },
            { name: 'Pantry Lab', type: 'kitchen-lab', capacity: 15, amenities: ['AC', 'Bar Equipment'] },
          ]
        },
        { 
          floor: '2nd Floor', 
          rooms: [
            { name: 'Mock Hotel Room', type: 'training', capacity: 15, amenities: ['AC', 'Hotel Furnishings'] },
            { name: 'Front Desk Training', type: 'training', capacity: 20, amenities: ['AC', 'PMS System'] },
            { name: 'Fine Dining Lab', type: 'training', capacity: 40, amenities: ['AC', 'Table Setup', 'Service Equipment'] },
            { name: 'HM Faculty Office', type: 'office', capacity: 10, amenities: ['AC', 'WiFi'] },
            { name: 'HM Lecture Room', type: 'classroom', capacity: 45, amenities: ['AC', 'Projector', 'WiFi'] },
          ]
        },
      ]
    },
  ];

  // Flatten all rooms for search
  const getAllRooms = () => {
    const allRooms = [];
    buildings.forEach(building => {
      building.floorData.forEach(floor => {
        floor.rooms.forEach(room => {
          allRooms.push({
            ...room,
            building: building.name,
            buildingId: building.id,
            floor: floor.floor
          });
        });
      });
    });
    return allRooms;
  };

  // Filter rooms based on search
  const filteredRooms = searchQuery.length > 0 
    ? getAllRooms().filter(room => 
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.building.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Get room type badge color
  const getRoomTypeBadge = (type) => {
    const typeMap = {
      'classroom': { variant: 'success', label: 'Classroom' },
      'lecture-hall': { variant: 'success', label: 'Lecture Hall' },
      'complab': { variant: 'primary', label: 'Computer Lab' },
      'specialized-lab': { variant: 'primary', label: 'Specialized Lab' },
      'lab': { variant: 'primary', label: 'Laboratory' },
      'office': { variant: 'gray', label: 'Office' },
      'library': { variant: 'warning', label: 'Library' },
      'study': { variant: 'warning', label: 'Study Area' },
      'avr': { variant: 'error', label: 'AVR' },
      'conference': { variant: 'error', label: 'Conference' },
      'security': { variant: 'error', label: 'Security' },
      'clinic': { variant: 'error', label: 'Clinic' },
      'sports': { variant: 'success', label: 'Sports Facility' },
      'dining': { variant: 'warning', label: 'Dining' },
      'training': { variant: 'primary', label: 'Training Facility' },
      'kitchen-lab': { variant: 'primary', label: 'Kitchen Lab' },
      'lounge': { variant: 'gray', label: 'Lounge' },
      'storage': { variant: 'gray', label: 'Storage' },
      'locker': { variant: 'gray', label: 'Locker Room' },
      'vendor': { variant: 'warning', label: 'Vendor Area' },
      'store': { variant: 'warning', label: 'Store' },
      'service': { variant: 'gray', label: 'Service' },
      'stage': { variant: 'error', label: 'Stage' },
      'seating': { variant: 'gray', label: 'Seating' },
      'av-room': { variant: 'primary', label: 'AV Room' },
      'restricted': { variant: 'error', label: 'Restricted' },
    };
    return typeMap[type] || { variant: 'gray', label: type };
  };

  // Get amenity icon
  const getAmenityIcon = (amenity) => {
    if (amenity.toLowerCase().includes('wifi')) return <Wifi size={12} />;
    if (amenity.toLowerCase().includes('ac')) return <Wind size={12} />;
    if (amenity.toLowerCase().includes('pc') || amenity.toLowerCase().includes('computer')) return <Monitor size={12} />;
    return null;
  };

  return (
    <div className="directory-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Building Directory</h1>
          <p className="page-subtitle">Complete campus facility and room location guide</p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="directory-search-card">
        <div className="directory-search">
          <Search size={20} className="search-icon" />
          <Input
            placeholder="Search for rooms, facilities, or buildings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="directory-search-input"
          />
        </div>

        {/* Search Results */}
        {searchQuery.length > 0 && (
          <div className="search-results">
            <div className="search-results-header">
              <span>Found {filteredRooms.length} result{filteredRooms.length !== 1 ? 's' : ''}</span>
            </div>
            {filteredRooms.length > 0 ? (
              <div className="search-results-list">
                {filteredRooms.slice(0, 10).map((room, index) => (
                  <div 
                    key={index} 
                    className="search-result-item"
                    onClick={() => {
                      setExpandedBuilding(room.buildingId);
                      setSelectedRoom(room.name);
                      setSearchQuery('');
                    }}
                  >
                    <div className="result-main">
                      <Navigation size={16} />
                      <div>
                        <span className="result-name">{room.name}</span>
                        <span className="result-location">{room.building} • {room.floor}</span>
                      </div>
                    </div>
                    <Badge variant={getRoomTypeBadge(room.type).variant}>
                      {getRoomTypeBadge(room.type).label}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <p>No rooms found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Quick Stats */}
      <div className="directory-stats">
        <div className="stat-card">
          <Building2 size={24} />
          <div>
            <span className="stat-value">{buildings.length}</span>
            <span className="stat-label">Buildings</span>
          </div>
        </div>
        <div className="stat-card">
          <MapPin size={24} />
          <div>
            <span className="stat-value">{getAllRooms().length}</span>
            <span className="stat-label">Total Rooms</span>
          </div>
        </div>
        <div className="stat-card">
          <Users size={24} />
          <div>
            <span className="stat-value">
              {getAllRooms().reduce((sum, room) => sum + (room.capacity || 0), 0).toLocaleString()}
            </span>
            <span className="stat-label">Total Capacity</span>
          </div>
        </div>
        <div className="stat-card">
          <Monitor size={24} />
          <div>
            <span className="stat-value">
              {getAllRooms().filter(r => r.type === 'complab' || r.type === 'specialized-lab').length}
            </span>
            <span className="stat-label">Computer Labs</span>
          </div>
        </div>
      </div>

      {/* Building List */}
      <div className="buildings-list">
        {buildings.map((building) => (
          <Card key={building.id} className={`building-card ${expandedBuilding === building.id ? 'expanded' : ''}`}>
            <div 
              className="building-header"
              onClick={() => setExpandedBuilding(expandedBuilding === building.id ? null : building.id)}
            >
              <div className="building-icon">
                <building.icon size={24} />
              </div>
              <div className="building-info">
                <h3 className="building-name">{building.name}</h3>
                <p className="building-description">{building.description}</p>
                <div className="building-hours">
                  <Clock size={14} />
                  <span>{building.operatingHours}</span>
                </div>
              </div>
              <div className="building-meta">
                <Badge variant="gray">{building.floors} {building.floors > 1 ? 'Floors' : 'Floor'}</Badge>
                {expandedBuilding === building.id ? (
                  <ChevronDown size={20} />
                ) : (
                  <ChevronRight size={20} />
                )}
              </div>
            </div>

            {expandedBuilding === building.id && (
              <div className="building-details">
                {building.floorData.map((floor, index) => (
                  <div key={index} className="floor-section">
                    <h4 className="floor-title">{floor.floor}</h4>
                    <div className="floor-rooms-detailed">
                      {floor.rooms.map((room, roomIndex) => (
                        <div 
                          key={roomIndex} 
                          className={`room-card ${selectedRoom === room.name ? 'selected' : ''}`}
                          onClick={() => setSelectedRoom(selectedRoom === room.name ? null : room.name)}
                        >
                          <div className="room-card-header">
                            <span className="room-name">{room.name}</span>
                            <Badge variant={getRoomTypeBadge(room.type).variant} size="small">
                              {getRoomTypeBadge(room.type).label}
                            </Badge>
                          </div>
                          <div className="room-card-details">
                            <div className="room-capacity">
                              <Users size={14} />
                              <span>Capacity: {room.capacity}</span>
                            </div>
                            {selectedRoom === room.name && (
                              <div className="room-amenities">
                                <span className="amenities-label">Amenities:</span>
                                <div className="amenities-list">
                                  {room.amenities.map((amenity, aIndex) => (
                                    <span key={aIndex} className="amenity-tag">
                                      {getAmenityIcon(amenity)}
                                      {amenity}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Accessibility Notice */}
      <Card className="accessibility-notice">
        <Accessibility size={20} />
        <div>
          <strong>Accessibility Information</strong>
          <p>All buildings have wheelchair-accessible entrances. Elevators are available in multi-story buildings. For special assistance, contact the Student Affairs Office.</p>
        </div>
      </Card>
    </div>
  );
};

export default BuildingDirectory;
