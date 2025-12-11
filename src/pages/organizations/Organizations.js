import React, { useState } from 'react';
import { 
  Search, 
  Users,
  Globe,
  Star,
  ChevronRight,
  Crown,
  Shield
} from 'lucide-react';
import { Card, Button, Badge, Modal } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import './Organizations.css';

const Organizations = () => {
  const { user, TIER1_ORGS, TIER2_ORGS } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // All 13 supported organizations
  const organizations = [
    // Tier 1 - Campus-Wide Posting
    {
      id: 1,
      name: 'CSG',
      fullName: 'Central Student Government',
      description: 'The official student government body representing all students of CvSU Imus Campus. Advocates for student rights and organizes campus-wide events.',
      members: 15,
      type: 'Government',
      tier: 1,
      scope: 'Campus-Wide',
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
      name: 'The Flare',
      fullName: 'The Flare Publication',
      description: 'The official student publication of CvSU Imus. Publishing campus news, features, literary works, and investigative journalism.',
      members: 25,
      type: 'Publication',
      tier: 1,
      scope: 'Campus-Wide',
      officers: [
        { position: 'Editor-in-Chief', name: 'Anna Cruz' },
        { position: 'Managing Editor', name: 'Rico Santos' },
      ],
      events: ['Publication Week', 'Campus Press Conference', 'Writers Workshop'],
      color: '#ef4444'
    },
    {
      id: 3,
      name: 'Honor Society',
      fullName: 'CvSU Imus Honor Society',
      description: 'Recognizing academic excellence and leadership. Members are top-performing students committed to community service.',
      members: 50,
      type: 'Academic',
      tier: 1,
      scope: 'Campus-Wide',
      officers: [
        { position: 'President', name: 'Grace Lim' },
        { position: 'Vice President', name: 'Mark Tan' },
      ],
      events: ['Academic Excellence Awards', 'Scholarship Program', 'Tutorial Services'],
      color: '#f59e0b'
    },
    {
      id: 4,
      name: 'Sinag-Tala',
      fullName: 'Sinag-Tala Performing Arts',
      description: 'The premier performing arts group showcasing Filipino culture through dance, music, and theater productions.',
      members: 40,
      type: 'Cultural',
      tier: 1,
      scope: 'Campus-Wide',
      officers: [
        { position: 'Artistic Director', name: 'Sofia Reyes' },
        { position: 'Production Head', name: 'Miguel Torres' },
      ],
      events: ['Cultural Night', 'Buwan ng Wika', 'Year-End Concert'],
      color: '#8b5cf6'
    },
    // Tier 2 - Members/Followers Only
    {
      id: 5,
      name: 'BITS',
      fullName: 'Bachelor of Information Technology Society',
      description: 'An organization for IT students fostering technical skills, professional development, and industry connections.',
      members: 250,
      type: 'Academic',
      tier: 2,
      scope: 'Members Only',
      officers: [
        { position: 'President', name: 'Carlo Reyes' },
        { position: 'Vice President', name: 'Ana Lim' },
        { position: 'Secretary', name: 'Mark Tan' },
      ],
      events: ['IT Week', 'Hackathon', 'Tech Talks', 'Industry Visit'],
      color: '#3b82f6'
    },
    {
      id: 6,
      name: 'BMS',
      fullName: 'Business Management Society',
      description: 'Developing future business leaders through seminars, workshops, entrepreneurial activities, and industry exposure.',
      members: 180,
      type: 'Academic',
      tier: 2,
      scope: 'Members Only',
      officers: [
        { position: 'President', name: 'Sarah Cruz' },
        { position: 'Vice President', name: 'Paulo Santos' },
      ],
      events: ['Business Week', 'Trade Fair', 'Marketing Competition'],
      color: '#10b981'
    },
    {
      id: 7,
      name: 'Cavite Communicators',
      fullName: 'Cavite Communicators',
      description: 'Enhancing communication skills through debates, public speaking, media production, and broadcasting.',
      members: 45,
      type: 'Special Interest',
      tier: 2,
      scope: 'Members Only',
      officers: [
        { position: 'President', name: 'Lisa Reyes' },
        { position: 'Vice President', name: 'Miguel Torres' },
      ],
      events: ['Debate Tournament', 'Speech Fest', 'Media Workshop'],
      color: '#6366f1'
    },
    {
      id: 8,
      name: 'CHTS',
      fullName: 'College of Hospitality and Tourism Society',
      description: 'Preparing students for careers in hospitality, tourism, culinary arts, and hotel management.',
      members: 120,
      type: 'Academic',
      tier: 2,
      scope: 'Members Only',
      officers: [
        { position: 'President', name: 'Rica Mendoza' },
        { position: 'Vice President', name: 'James Villa' },
      ],
      events: ['Hotel Tour', 'Culinary Arts Week', 'Barista Workshop'],
      color: '#ec4899'
    },
    {
      id: 9,
      name: 'CYLE',
      fullName: 'CvSU Youth Leadership Experience',
      description: 'Building young leaders through community service, leadership seminars, and civic engagement programs.',
      members: 60,
      type: 'Leadership',
      tier: 2,
      scope: 'Members Only',
      officers: [
        { position: 'President', name: 'Chris Aquino' },
        { position: 'Vice President', name: 'Joy Ramos' },
      ],
      events: ['Leadership Camp', 'Community Outreach', 'Youth Forum'],
      color: '#14b8a6'
    },
    {
      id: 10,
      name: 'CSC',
      fullName: 'Computer Science Club',
      description: 'Exploring computer science through coding challenges, algorithm competitions, and innovative tech projects.',
      members: 85,
      type: 'Academic',
      tier: 2,
      scope: 'Members Only',
      officers: [
        { position: 'President', name: 'Kevin Lim' },
        { position: 'Vice President', name: 'Jane Doe' },
      ],
      events: ['Code Wars', 'Project Showcase', 'Algorithm Competition'],
      color: '#06b6d4'
    },
    {
      id: 11,
      name: "Educators' Guild",
      fullName: "Educators' Guild",
      description: 'Supporting future educators with teaching methodologies, practicum preparation, and professional development.',
      members: 95,
      type: 'Academic',
      tier: 2,
      scope: 'Members Only',
      officers: [
        { position: 'President', name: 'Teacher Maria' },
        { position: 'Vice President', name: 'Sir John' },
      ],
      events: ['Teaching Demo', 'Education Summit', 'Classroom Management Workshop'],
      color: '#f97316'
    },
    {
      id: 12,
      name: 'SMMS',
      fullName: 'Social Media Marketing Society',
      description: 'Learning digital marketing, social media strategies, content creation, and brand management.',
      members: 70,
      type: 'Special Interest',
      tier: 2,
      scope: 'Members Only',
      officers: [
        { position: 'President', name: 'Ella Santos' },
        { position: 'Vice President', name: 'Ryan Cruz' },
      ],
      events: ['Digital Marketing Workshop', 'Social Media Challenge', 'Brand Pitch'],
      color: '#a855f7'
    },
    {
      id: 13,
      name: 'YOPA',
      fullName: 'Youth Organization for Public Affairs',
      description: 'Engaging students in public affairs, government processes, and civic participation.',
      members: 55,
      type: 'Civic',
      tier: 2,
      scope: 'Members Only',
      officers: [
        { position: 'President', name: 'Paolo Garcia' },
        { position: 'Vice President', name: 'Nina Reyes' },
      ],
      events: ['Mock Elections', 'Government Visit', 'Public Policy Forum'],
      color: '#64748b'
    },
  ];

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || 
      (activeFilter === 'tier1' && org.tier === 1) ||
      (activeFilter === 'tier2' && org.tier === 2);
    return matchesSearch && matchesFilter;
  });

  const handleViewDetails = (org) => {
    setSelectedOrg(org);
  };

  return (
    <div className="organizations-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Campus Organizations</h1>
          <p className="page-subtitle">Discover and join student organizations</p>
        </div>
      </div>

      {/* Tier Info Banner */}
      <div className="tier-info-banner">
        <div className="tier-info tier1">
          <Crown size={16} />
          <span><strong>Tier 1:</strong> Campus-Wide Announcements (CSG, The Flare, Honor Society, Sinag-Tala)</span>
        </div>
        <div className="tier-info tier2">
          <Shield size={16} />
          <span><strong>Tier 2:</strong> Members/Followers Only Announcements</span>
        </div>
      </div>

      <div className="orgs-toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All ({organizations.length})
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'tier1' ? 'active' : ''}`}
            onClick={() => setActiveFilter('tier1')}
          >
            <Crown size={14} /> Tier 1 (4)
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'tier2' ? 'active' : ''}`}
            onClick={() => setActiveFilter('tier2')}
          >
            <Shield size={14} /> Tier 2 (9)
          </button>
        </div>
      </div>

      <div className="orgs-grid">
        {filteredOrgs.map((org) => (
          <Card 
            key={org.id} 
            className="org-card"
          >
            <div className="org-header">
              <div 
                className="org-logo"
                style={{ background: org.color }}
              >
                {org.name.charAt(0)}
              </div>
              <div className="org-info">
                <h3 className="org-name">
                  {org.name}
                  {org.tier === 1 && <Crown size={14} className="tier-icon" />}
                </h3>
                <p className="org-fullname">{org.fullName}</p>
              </div>
            </div>
            
            <p className="org-description">{org.description}</p>
            
            <div className="org-stats">
              <div className="org-stat">
                <Users size={14} />
                <span>{org.members} members</span>
              </div>
              <Badge variant={org.tier === 1 ? 'warning' : 'gray'}>{org.type}</Badge>
            </div>

            <div className="org-scope">
              {org.tier === 1 ? (
                <Badge variant="success">
                  <Globe size={12} /> Campus-Wide
                </Badge>
              ) : (
                <Badge variant="info">
                  <Users size={12} /> Members Only
                </Badge>
              )}
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

            <Button 
              variant="outline" 
              size="sm" 
              style={{ width: '100%', marginTop: '12px' }}
              onClick={() => handleViewDetails(org)}
            >
              View Details <ChevronRight size={14} />
            </Button>
          </Card>
        ))}
      </div>

      {/* Organization Details Modal */}
      <Modal
        isOpen={!!selectedOrg}
        onClose={() => setSelectedOrg(null)}
        title={selectedOrg?.fullName}
        size="lg"
      >
        {selectedOrg && (
          <div className="org-details-modal">
            <div className="org-modal-header">
              <div 
                className="org-logo large"
                style={{ background: selectedOrg.color }}
              >
                {selectedOrg.name}
              </div>
              <div className="org-modal-badges">
                <Badge variant={selectedOrg.tier === 1 ? 'warning' : 'info'}>
                  {selectedOrg.tier === 1 ? 'Tier 1 Organization' : 'Tier 2 Organization'}
                </Badge>
                <Badge variant="gray">{selectedOrg.type}</Badge>
              </div>
            </div>

            <p className="org-modal-description">{selectedOrg.description}</p>

            <div className="org-modal-section">
              <h4>Posting Privileges</h4>
              <p>
                {selectedOrg.tier === 1 
                  ? 'Officers can post announcements visible to all campus students.'
                  : 'Officers can post announcements visible only to organization members/followers.'}
              </p>
            </div>

            <div className="org-modal-section">
              <h4>Officers</h4>
              <div className="officers-grid">
                {selectedOrg.officers.map((officer, idx) => (
                  <div key={idx} className="officer-card">
                    <div className="officer-avatar">{officer.name.charAt(0)}</div>
                    <div>
                      <div className="officer-name">{officer.name}</div>
                      <div className="officer-position">{officer.position}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="org-modal-section">
              <h4>Upcoming Events</h4>
              <div className="events-list">
                {selectedOrg.events.map((event, idx) => (
                  <Badge key={idx} variant="outline">{event}</Badge>
                ))}
              </div>
            </div>

            <div className="org-modal-actions">
              <Button variant="primary">
                <Star size={16} /> Follow Organization
              </Button>
              <Button variant="outline">
                Contact Officers
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Organizations;
