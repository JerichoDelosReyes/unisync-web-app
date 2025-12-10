import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  ChevronDown,
  ChevronRight,
  Dumbbell,
  UtensilsCrossed,
  Home,
  BookOpen,
  Users,
  Shield,
  Heart
} from 'lucide-react';
import { Card, Badge } from '../../components/common';
import './Directory.css';

const BuildingDirectory = () => {
  const [expandedBuilding, setExpandedBuilding] = useState('new');

  const buildings = [
    {
      id: 'new',
      name: 'New Building',
      icon: Building2,
      floors: 4,
      description: 'Main academic building with classrooms and department offices.',
      rooms: [
        { floor: 1, rooms: ['Room 101', 'Room 102', 'Room 103', 'Registrar Office', 'Cashier'] },
        { floor: 2, rooms: ['Room 201', 'Room 202', 'Room 203', 'DIT Office', 'Guidance Office'] },
        { floor: 3, rooms: ['Room 301', 'Room 302', 'Room 303', 'Room 304', 'Faculty Room'] },
        { floor: 4, rooms: ['Room 401', 'Room 402', 'Room 403', 'Audio Visual Room'] },
      ]
    },
    {
      id: 'old',
      name: 'Old Building',
      icon: Building2,
      floors: 2,
      description: 'Houses computer laboratories, library, and student services.',
      rooms: [
        { floor: 1, rooms: ['Civil Security', 'Health Service Unit', 'Library', 'Student Affairs'] },
        { floor: 2, rooms: ['CompLab 1', 'CompLab 2', 'CompLab 3', 'Speech Lab'] },
      ]
    },
    {
      id: 'gym',
      name: 'Stage and Gymnasium',
      icon: Dumbbell,
      floors: 1,
      description: 'Sports facilities and event venue.',
      rooms: [
        { floor: 1, rooms: ['Basketball Court', 'Stage', 'Equipment Storage', 'Bleachers'] },
      ]
    },
    {
      id: 'canteen',
      name: 'Canteen',
      icon: UtensilsCrossed,
      floors: 1,
      description: 'Main dining area for students and faculty.',
      rooms: [
        { floor: 1, rooms: ['Main Dining Area', 'Food Stalls', 'Seating Area'] },
      ]
    },
    {
      id: 'hm',
      name: 'Hospitality Management Laboratory',
      icon: Home,
      floors: 1,
      description: 'Specialized facilities for HM students.',
      rooms: [
        { floor: 1, rooms: ['Kitchen Lab 1', 'Kitchen Lab 2', 'Mock Hotel Room', 'Dining Lab'] },
      ]
    },
  ];

  return (
    <div className="directory-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Building Directory</h1>
          <p className="page-subtitle">Campus facilities and room locations</p>
        </div>
      </div>

      {/* Campus Map Placeholder */}
      <Card className="campus-map">
        <div className="map-placeholder">
          <Building2 size={48} />
          <p>Interactive Campus Map</p>
          <span>Click on a building below to view details</span>
        </div>
      </Card>

      {/* Building List */}
      <div className="buildings-list">
        {buildings.map((building) => (
          <Card key={building.id} className="building-card">
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
                {building.rooms.map((floor, index) => (
                  <div key={index} className="floor-section">
                    <h4 className="floor-title">Floor {floor.floor}</h4>
                    <div className="floor-rooms">
                      {floor.rooms.map((room, roomIndex) => (
                        <div key={roomIndex} className="room-tag">
                          <MapPin size={12} />
                          {room}
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
    </div>
  );
};

export default BuildingDirectory;
