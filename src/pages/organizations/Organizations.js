import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Users,
  ChevronRight,
  Loader
} from 'lucide-react';
import { Card, Button, Badge } from '../../components/common';
import { getOrganizations } from '../../services/firestoreService';
import './Organizations.css';

const Organizations = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const data = await getOrganizations();
        setOrganizations(data);
      } catch (error) {
        console.error('Error fetching organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Loader size={32} className="spin" />
      </div>
    );
  }

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
        {filteredOrgs.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '48px', gridColumn: '1 / -1' }}>
            <p style={{ color: 'var(--gray-500)' }}>No organizations found</p>
          </Card>
        ) : (
          filteredOrgs.map((org) => (
            <Card 
              key={org.id} 
              className="org-card"
              onClick={() => setSelectedOrg(org)}
            >
              <div className="org-header">
                <div 
                  className="org-logo"
                  style={{ background: org.color || '#0D5C2F' }}
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
                {(org.officers || []).slice(0, 2).map((officer, idx) => (
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
          ))
        )}
      </div>
    </div>
  );
};

export default Organizations;
