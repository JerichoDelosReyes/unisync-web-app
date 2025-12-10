import React, { useState } from 'react';
import { 
  Search, 
  Users,
  Mail,
  Calendar,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Card, Button, Badge } from '../../components/common';
import './Organizations.css';

const Organizations = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null);

  const organizations = [
    {
      id: 1,
      name: 'CSG',
      fullName: 'Central Student Government',
      description: 'The official student government body representing all students of CvSU Bacoor Campus.',
      members: 15,
      type: 'Government',
      officers: [
        { position: 'President', name: 'Juan Dela Cruz' },
        { position: 'Vice President', name: 'Maria Santos' },
        { position: 'Secretary', name: 'Jose Garcia' },
      ],
      events: ['General Assembly', 'Leadership Summit', 'Campus Elections'],
      color: '#0D5C2F'
    },
    {
      id: 2,
      name: 'BITS',
      fullName: 'Bachelor of Information Technology Society',
      description: 'An organization for IT students fostering technical skills and professional development.',
      members: 250,
      type: 'Academic',
      officers: [
        { position: 'President', name: 'Carlo Reyes' },
        { position: 'Vice President', name: 'Ana Lim' },
        { position: 'Secretary', name: 'Mark Tan' },
      ],
      events: ['IT Week', 'Hackathon', 'Tech Talks'],
      color: '#3b82f6'
    },
    {
      id: 3,
      name: 'BMS',
      fullName: 'Business Management Society',
      description: 'Developing future business leaders through seminars, workshops, and entrepreneurial activities.',
      members: 180,
      type: 'Academic',
      officers: [
        { position: 'President', name: 'Sarah Cruz' },
        { position: 'Vice President', name: 'Paulo Santos' },
      ],
      events: ['Business Week', 'Trade Fair'],
      color: '#f59e0b'
    },
    {
      id: 4,
      name: 'Cavite Communicators',
      fullName: 'Cavite Communicators',
      description: 'Enhancing communication skills through debates, public speaking, and media production.',
      members: 45,
      type: 'Special Interest',
      officers: [
        { position: 'President', name: 'Lisa Reyes' },
        { position: 'Vice President', name: 'Miguel Torres' },
      ],
      events: ['Debate Tournament', 'Speech Fest'],
      color: '#8b5cf6'
    },
    {
      id: 5,
      name: 'CHTS',
      fullName: 'Hospitality and Tourism Society',
      description: 'Preparing students for careers in hospitality, tourism, and culinary arts.',
      members: 120,
      type: 'Academic',
      officers: [
        { position: 'President', name: 'Rica Mendoza' },
        { position: 'Vice President', name: 'James Villa' },
      ],
      events: ['Hotel Tour', 'Culinary Arts Week'],
      color: '#ec4899'
    },
    {
      id: 6,
      name: 'CYLE',
      fullName: 'CvSU Youth Leadership Experience',
      description: 'Building young leaders through community service and leadership programs.',
      members: 60,
      type: 'Leadership',
      officers: [
        { position: 'President', name: 'Chris Aquino' },
      ],
      events: ['Leadership Camp', 'Community Outreach'],
      color: '#10b981'
    },
    {
      id: 7,
      name: 'CSC',
      fullName: 'Computer Science Club',
      description: 'Exploring the world of computer science through coding challenges and tech projects.',
      members: 85,
      type: 'Academic',
      officers: [
        { position: 'President', name: 'Kevin Lim' },
      ],
      events: ['Code Wars', 'Project Showcase'],
      color: '#06b6d4'
    },
    {
      id: 8,
      name: "Educators' Guild",
      fullName: "Educators' Guild",
      description: 'Supporting future educators with teaching methodologies and practicum preparation.',
      members: 95,
      type: 'Academic',
      officers: [
        { position: 'President', name: 'Teacher Maria' },
      ],
      events: ['Teaching Demo', 'Education Summit'],
      color: '#f97316'
    },
  ];

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="organizations-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Campus Organizations</h1>
          <p className="page-subtitle">Discover and join student organizations</p>
        </div>
      </div>

      <div className="search-box" style={{ maxWidth: '400px', marginBottom: '24px' }}>
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search organizations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="orgs-grid">
        {filteredOrgs.map((org) => (
          <Card 
            key={org.id} 
            className="org-card"
            onClick={() => setSelectedOrg(org)}
          >
            <div className="org-header">
              <div 
                className="org-logo"
                style={{ background: org.color }}
              >
                {org.name.charAt(0)}
              </div>
              <div className="org-info">
                <h3 className="org-name">{org.name}</h3>
                <p className="org-fullname">{org.fullName}</p>
              </div>
            </div>
            
            <p className="org-description">{org.description}</p>
            
            <div className="org-stats">
              <div className="org-stat">
                <Users size={14} />
                <span>{org.members} members</span>
              </div>
              <Badge variant="gray">{org.type}</Badge>
            </div>

            <div className="org-officers">
              <h4>Officers</h4>
              {org.officers.slice(0, 2).map((officer, idx) => (
                <div key={idx} className="officer-item">
                  <span className="officer-position">{officer.position}:</span>
                  <span className="officer-name">{officer.name}</span>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" style={{ width: '100%', marginTop: '12px' }}>
              View Details <ChevronRight size={14} />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Organizations;
