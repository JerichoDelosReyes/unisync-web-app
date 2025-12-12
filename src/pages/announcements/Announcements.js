import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Clock,
  Heart,
  MessageSquare,
  Share2,
  MoreVertical,
  Image,
  Globe,
  Building2,
  Users,
  BookOpen,
  Loader,
  X,
  Upload
} from 'lucide-react';
import { Card, Button, Badge, Modal, Input, Select, Alert } from '../../components/common';
import { getAnnouncements, createAnnouncement, subscribeToAnnouncements } from '../../services/firestoreService';
import { useAuth } from '../../context/AuthContext';
import './Announcements.css';

const Announcements = () => {
  const { userProfile } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'campus',
    priority: 'normal'
  });

  const filters = [
    { id: 'all', label: 'All', icon: Globe },
    { id: 'campus', label: 'Campus-wide', icon: Globe },
    { id: 'department', label: 'Department', icon: Building2 },
    { id: 'organization', label: 'Organization', icon: Users },
    { id: 'section', label: 'Section', icon: BookOpen },
  ];

  const audienceOptions = [
    { value: 'campus', label: 'Campus-wide (All Students & Faculty)' },
    { value: 'department', label: 'Department Only' },
    { value: 'organization', label: 'Organization Members Only' },
    { value: 'section', label: 'Specific Section' },
  ];

  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = subscribeToAnnouncements((data) => {
      setAnnouncements(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (max 1MB for base64 storage)
      if (file.size > 1 * 1024 * 1024) {
        setError('Image size should be less than 1MB (for free storage)');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Convert image to base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let imageData = null;
      
      // Convert image to base64 if selected
      if (selectedImage) {
        try {
          setUploadProgress(50);
          imageData = await convertToBase64(selectedImage);
          setUploadProgress(100);
        } catch (uploadErr) {
          console.error('Image conversion failed:', uploadErr);
          setError('Image processing failed. Publishing without image.');
          imageData = null;
        }
      }

      await createAnnouncement({
        ...newAnnouncement,
        author: userProfile?.name || 'Anonymous',
        authorRole: userProfile?.role || 'Student',
        image: imageData
      });
      
      setShowCreateModal(false);
      setNewAnnouncement({ title: '', content: '', type: 'campus', priority: 'normal' });
      setSelectedImage(null);
      setImagePreview(null);
      setUploadProgress(0);
      setError(null);
    } catch (err) {
      console.error('Create announcement error:', err);
      setError('Failed to publish: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    if (activeFilter !== 'all' && announcement.type !== activeFilter) return false;
    if (searchQuery && !announcement.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Loader size={32} className="spin" />
      </div>
    );
  }

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
        {filteredAnnouncements.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: 'var(--gray-500)' }}>No announcements found</p>
          </Card>
        ) : (
          filteredAnnouncements.map((announcement) => (
            <Card key={announcement.id} className="announcement-card">
              <div className="announcement-header">
                <div className="announcement-author">
                  <div className="avatar">{announcement.author?.charAt(0) || 'A'}</div>
                  <div>
                    <div className="author-name">{announcement.author}</div>
                    <div className="announcement-meta">
                      <Clock size={12} />
                      {formatTimestamp(announcement.createdAt)}
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
                  <span>{announcement.likes || 0}</span>
                </button>
                <button className="action-btn">
                  <MessageSquare size={18} />
                  <span>{announcement.comments || 0}</span>
                </button>
                <button className="action-btn">
                  <Share2 size={18} />
                  <span>Share</span>
                </button>
              </div>
            </Card>
          ))
        )}
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
            <Button variant="primary" onClick={handleCreateAnnouncement} disabled={submitting}>
              {submitting ? 'Publishing...' : 'Publish Announcement'}
            </Button>
          </>
        }
      >
        <div className="create-announcement-form">
          {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}
          
          <Input
            label="Title"
            placeholder="Enter announcement title"
            value={newAnnouncement.title}
            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
          />
          
          <div className="form-group">
            <label className="form-label">Content</label>
            <textarea
              className="form-input"
              rows="6"
              placeholder="Write your announcement here..."
              value={newAnnouncement.content}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
            />
          </div>

          <Select
            label="Target Audience"
            options={audienceOptions}
            placeholder="Select audience"
            value={newAnnouncement.type}
            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
          />

          <div className="form-group">
            <label className="form-label">Priority</label>
            <select 
              className="form-input"
              value={newAnnouncement.priority}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value })}
            >
              <option value="normal">Normal</option>
              <option value="high">High (Important)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Attach Image (Optional)</label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            {imagePreview ? (
              <div className="image-preview-container">
                <img src={imagePreview} alt="Preview" className="image-preview" />
                <button 
                  type="button" 
                  className="remove-image-btn"
                  onClick={handleRemoveImage}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div 
                className="image-upload"
                onClick={() => fileInputRef.current?.click()}
                style={{ cursor: 'pointer' }}
              >
                <Upload size={24} />
                <span>Click to upload image</span>
                <small style={{ color: 'var(--gray-400)', marginTop: '4px' }}>Max 1MB - JPG, PNG, GIF</small>
              </div>
            )}
            {submitting && uploadProgress > 0 && uploadProgress < 100 && (
              <div className="upload-progress">
                <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                <span>{Math.round(uploadProgress)}% uploaded</span>
              </div>
            )}
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
