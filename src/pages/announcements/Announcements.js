import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock,
  User,
  Heart,
  MessageSquare,
  Share2,
  MoreVertical,
  Image,
  Globe,
  Building2,
  Users,
  BookOpen
} from 'lucide-react';
import { Card, Button, Badge, Modal, Input, Select } from '../../components/common';
import './Announcements.css';

const Announcements = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filters = [
    { id: 'all', label: 'All', icon: Globe },
    { id: 'campus', label: 'Campus-wide', icon: Globe },
    { id: 'department', label: 'Department', icon: Building2 },
    { id: 'organization', label: 'Organization', icon: Users },
    { id: 'section', label: 'Section', icon: BookOpen },
  ];

  const announcements = [
    {
      id: 1,
      title: 'Final Examination Schedule for First Semester A.Y. 2024-2025',
      content: 'The final examination for the first semester will be held from December 15-20, 2024. Please check your respective schedules through the student portal. All students are required to bring their school ID during the examination.',
      author: 'Office of the Registrar',
      authorRole: 'Admin',
      type: 'campus',
      timestamp: '2 hours ago',
      likes: 145,
      comments: 23,
      image: null,
      priority: 'high'
    },
    {
      id: 2,
      title: 'BITS General Assembly - December Meeting',
      content: 'All BITS members are invited to attend our monthly general assembly this Friday at 3:00 PM in Room 301, New Building. Attendance is mandatory for all officers.',
      author: 'BITS Organization',
      authorRole: 'Organization',
      type: 'organization',
      timestamp: '5 hours ago',
      likes: 67,
      comments: 12,
      image: null,
      priority: 'normal'
    },
    {
      id: 3,
      title: 'DIT Department Advisory',
      content: 'All DIT students are reminded to complete their clearance requirements before the enrollment period. Please submit all necessary documents to the department office.',
      author: 'DIT Department',
      authorRole: 'Department',
      type: 'department',
      timestamp: '1 day ago',
      likes: 89,
      comments: 8,
      image: null,
      priority: 'normal'
    },
    {
      id: 4,
      title: 'Christmas Party Announcement',
      content: 'CvSU Bacoor Campus will be holding its annual Christmas party on December 18, 2024. All students and faculty are invited to join the celebration. There will be games, prizes, and food!',
      author: 'CSG - Central Student Government',
      authorRole: 'Organization',
      type: 'campus',
      timestamp: '2 days ago',
      likes: 234,
      comments: 45,
      image: null,
      priority: 'normal'
    },
  ];

  const audienceOptions = [
    { value: 'campus', label: 'Campus-wide (All Students & Faculty)' },
    { value: 'department', label: 'Department Only' },
    { value: 'organization', label: 'Organization Members Only' },
    { value: 'section', label: 'Specific Section' },
  ];

  const filteredAnnouncements = announcements.filter(announcement => {
    if (activeFilter !== 'all' && announcement.type !== activeFilter) return false;
    if (searchQuery && !announcement.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="announcements-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Stay updated with campus news and events</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setShowCreateModal(true)}>
          Create Announcement
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="announcements-toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-tabs">
          {filters.map((filter) => (
            <button
              key={filter.id}
              className={`filter-tab ${activeFilter === filter.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              <filter.icon size={16} />
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements Feed */}
      <div className="announcements-feed">
        {filteredAnnouncements.map((announcement) => (
          <Card key={announcement.id} className="announcement-card">
            <div className="announcement-header">
              <div className="announcement-author">
                <div className="avatar">{announcement.author.charAt(0)}</div>
                <div>
                  <div className="author-name">{announcement.author}</div>
                  <div className="announcement-meta">
                    <Clock size={12} />
                    {announcement.timestamp}
                  </div>
                </div>
              </div>
              <div className="announcement-badges">
                {announcement.priority === 'high' && (
                  <Badge variant="error">Important</Badge>
                )}
                <Badge variant={
                  announcement.type === 'campus' ? 'primary' :
                  announcement.type === 'department' ? 'info' :
                  announcement.type === 'organization' ? 'warning' : 'gray'
                }>
                  {announcement.type === 'campus' ? 'Campus-wide' :
                   announcement.type === 'department' ? 'Department' :
                   announcement.type === 'organization' ? 'Organization' : 'Section'}
                </Badge>
                <button className="icon-btn">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
            
            <div className="announcement-content">
              <h3 className="announcement-title">{announcement.title}</h3>
              <p className="announcement-body">{announcement.content}</p>
            </div>

            {announcement.image && (
              <div className="announcement-image">
                <img src={announcement.image} alt="" />
              </div>
            )}

            <div className="announcement-actions">
              <button className="action-btn">
                <Heart size={18} />
                <span>{announcement.likes}</span>
              </button>
              <button className="action-btn">
                <MessageSquare size={18} />
                <span>{announcement.comments}</span>
              </button>
              <button className="action-btn">
                <Share2 size={18} />
                <span>Share</span>
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Announcement Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Announcement"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary">
              Publish Announcement
            </Button>
          </>
        }
      >
        <div className="create-announcement-form">
          <Input
            label="Title"
            placeholder="Enter announcement title"
          />
          
          <div className="form-group">
            <label className="form-label">Content</label>
            <textarea
              className="form-input"
              rows="6"
              placeholder="Write your announcement here..."
            />
          </div>

          <Select
            label="Target Audience"
            options={audienceOptions}
            placeholder="Select audience"
          />

          <div className="form-group">
            <label className="form-label">Attach Image (Optional)</label>
            <div className="image-upload">
              <Image size={24} />
              <span>Click or drag to upload image</span>
            </div>
          </div>

          <div className="moderation-notice">
            <Badge variant="info">Auto-Moderation Active</Badge>
            <p>Your announcement will be automatically reviewed. Safe content will be published instantly. Flagged content will be sent for admin review.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Announcements;
