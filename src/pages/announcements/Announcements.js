import React, { useState } from 'react';
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
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  History,
  Eye,
  Trash2,
  Edit
} from 'lucide-react';
import { Card, Button, Badge, Modal, Input, Select, Alert } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { moderateContent } from '../../utils/naiveBayes';
import './Announcements.css';

const Announcements = () => {
  const { user, canPostAnnouncement, getAnnouncementScope, TIER1_ORGS } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    audience: '',
    priority: 'normal',
    image: null,
    imageName: ''
  });
  const [moderationStatus, setModerationStatus] = useState(null);

  // Check if user can create announcements based on new privilege system
  const userCanPost = canPostAnnouncement();
  const userScope = getAnnouncementScope();
  
  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      setNewAnnouncement(prev => ({ 
        ...prev, 
        image: file,
        imageName: file.name 
      }));
    }
  };
  
  // Remove uploaded file
  const handleRemoveFile = () => {
    setNewAnnouncement(prev => ({ 
      ...prev, 
      image: null,
      imageName: '' 
    }));
  };

  const filters = [
    { id: 'all', label: 'All', icon: Globe },
    { id: 'campus', label: 'Campus-wide', icon: Globe },
    { id: 'department', label: 'Department', icon: Building2 },
    { id: 'organization', label: 'Organization', icon: Users },
    { id: 'section', label: 'Section', icon: BookOpen },
  ];

  // Sample announcements with different sources
  const announcements = [
    {
      id: 1,
      title: 'Final Examination Schedule for First Semester A.Y. 2024-2025',
      content: 'The final examination for the first semester will be held from December 15-20, 2024. Please check your respective schedules through the student portal. All students are required to bring their school ID during the examination.',
      author: 'MIS Office',
      authorRole: 'admin',
      authorEmail: 'mis@cvsu.edu.ph',
      type: 'campus',
      timestamp: '2 hours ago',
      likes: 145,
      comments: 23,
      image: null,
      priority: 'high',
      moderationStatus: 'approved',
      scope: 'Campus-Wide'
    },
    {
      id: 2,
      title: 'System Maintenance Notice - December 14',
      content: 'The UNISYNC system will undergo scheduled maintenance on December 14, 2024 from 10:00 PM to 2:00 AM. Some services may be temporarily unavailable during this period.',
      author: 'MIS Office',
      authorRole: 'admin',
      authorEmail: 'mis@cvsu.edu.ph',
      type: 'campus',
      timestamp: '3 hours ago',
      likes: 89,
      comments: 5,
      image: null,
      priority: 'high',
      moderationStatus: 'approved',
      scope: 'Campus-Wide'
    },
    {
      id: 3,
      title: 'Class Suspension Advisory',
      content: 'Due to inclement weather conditions, all afternoon classes from 1:00 PM onwards are suspended today. Students are advised to prioritize their safety. Online classes will proceed as scheduled.',
      author: 'Prof. Maria Santos',
      authorRole: 'faculty',
      authorEmail: 'maria.santos@cvsu.edu.ph',
      type: 'campus',
      timestamp: '4 hours ago',
      likes: 234,
      comments: 45,
      image: null,
      priority: 'high',
      moderationStatus: 'approved',
      scope: 'Campus-Wide'
    },
    {
      id: 4,
      title: 'CSG General Assembly - All Students Welcome',
      content: 'The Central Student Government invites all students to attend our General Assembly this Friday at 2:00 PM in the Gymnasium. Topics include upcoming events, student concerns, and campus improvement initiatives.',
      author: 'CSG - Central Student Government',
      authorRole: 'org_tier1',
      authorEmail: 'csg.officer@cvsu.edu.ph',
      type: 'campus',
      timestamp: '5 hours ago',
      likes: 156,
      comments: 28,
      image: null,
      priority: 'normal',
      moderationStatus: 'approved',
      scope: 'Campus-Wide (Tier 1 Org)'
    },
    {
      id: 5,
      title: 'The Flare Publication Call for Contributors',
      content: 'The Flare is looking for aspiring writers, photographers, and artists for our next issue! Submit your works to theflare@cvsu.edu.ph by December 20.',
      author: 'The Flare Publication',
      authorRole: 'org_tier1',
      authorEmail: 'theflare.officer@cvsu.edu.ph',
      type: 'campus',
      timestamp: '1 day ago',
      likes: 112,
      comments: 19,
      image: null,
      priority: 'normal',
      moderationStatus: 'approved',
      scope: 'Campus-Wide (Tier 1 Org)'
    },
    {
      id: 6,
      title: 'BITS Monthly Meeting - Members Only',
      content: 'All BITS members are required to attend our monthly meeting this Saturday at 9:00 AM in Room 301. Agenda includes project updates and upcoming tech talks.',
      author: 'BITS Organization',
      authorRole: 'org_tier2',
      authorEmail: 'bits.officer@cvsu.edu.ph',
      type: 'organization',
      timestamp: '1 day ago',
      likes: 45,
      comments: 8,
      image: null,
      priority: 'normal',
      moderationStatus: 'approved',
      scope: 'Members Only (Tier 2 Org)'
    },
    {
      id: 7,
      title: 'BSCS 3-1: Assignment Deadline Extended',
      content: 'Good news! The deadline for our Software Engineering project has been extended to December 18. Please coordinate with your group members and submit on time.',
      author: 'Class Representative - BSCS 3-1',
      authorRole: 'class_rep',
      authorEmail: 'class.rep@cvsu.edu.ph',
      type: 'section',
      timestamp: '6 hours ago',
      likes: 28,
      comments: 12,
      image: null,
      priority: 'normal',
      moderationStatus: 'approved',
      scope: 'Section Only (BSCS 3-1)'
    },
    {
      id: 8,
      title: 'BSCS 3-1: Room Change for Tomorrow',
      content: 'Our IT Elective 3 class tomorrow will be held in CompLab 2 instead of Room 301 due to maintenance. Please take note.',
      author: 'Class Representative - BSCS 3-1',
      authorRole: 'class_rep',
      authorEmail: 'class.rep@cvsu.edu.ph',
      type: 'section',
      timestamp: '8 hours ago',
      likes: 15,
      comments: 3,
      image: null,
      priority: 'high',
      moderationStatus: 'approved',
      scope: 'Section Only (BSCS 3-1)'
    },
  ];

  // User's announcement history
  const myAnnouncements = [
    {
      id: 101,
      title: 'Sample Posted Announcement',
      content: 'This is a previously posted announcement...',
      timestamp: '3 days ago',
      status: 'published',
      likes: 45,
      views: 230
    },
    {
      id: 102,
      title: 'Flagged Announcement Example',
      content: 'This announcement was flagged for review...',
      timestamp: '1 week ago',
      status: 'flagged',
      reason: 'Contains promotional content',
      likes: 0,
      views: 0
    },
  ];

  // Get audience options based on user's posting privileges
  const getAudienceOptions = () => {
    if (user?.role === 'admin') {
      return [
        { value: 'campus', label: 'All Students (Campus-Wide)' },
        { value: 'department', label: 'Specific Department' },
      ];
    }
    if (user?.role === 'faculty') {
      return [
        { value: 'campus', label: 'All Students (Campus-Wide)' },
        { value: 'department', label: 'Department Only' },
        { value: 'section', label: 'Specific Section/Class' },
      ];
    }
    if (user?.isOrgOfficer) {
      if (user?.orgTier === 1) {
        return [
          { value: 'campus', label: `Campus-Wide (${user.organization})` },
        ];
      } else {
        return [
          { value: 'organization', label: `Members/Followers Only (${user.organization})` },
        ];
      }
    }
    if (user?.isClassRep) {
      return [
        { value: 'section', label: `Section Only (${user.section})` },
      ];
    }
    return [];
  };

  // Simulate Naive Bayes moderation
  const moderateContent = (title, content) => {
    // List of potentially unsafe keywords (simplified simulation)
    const unsafePatterns = [
      /\b(spam|scam|fake|fraud)\b/i,
      /\b(inappropriate|offensive|vulgar)\b/i,
      /\b(buy now|click here|limited offer)\b/i,
    ];

    const combinedText = `${title} ${content}`;
    
    for (const pattern of unsafePatterns) {
      if (pattern.test(combinedText)) {
        return { safe: false, reason: 'Content flagged for review - potential policy violation' };
      }
    }
    
    return { safe: true, reason: null };
  };

  const handlePublish = () => {
    if (!newAnnouncement.title || !newAnnouncement.content || !newAnnouncement.audience) {
      return;
    }

    // Run through Naive Bayes moderation algorithm
    const moderationResult = moderateContent(newAnnouncement.title, newAnnouncement.content);
    
    console.log('Naive Bayes Moderation Result:', moderationResult); // For debugging
    
    if (moderationResult.approved) {
      setModerationStatus({ 
        type: 'success', 
        message: `Your announcement has been published successfully! (Confidence: ${(moderationResult.confidence * 100).toFixed(1)}%)` 
      });
    } else if (moderationResult.status === 'pending_review') {
      setModerationStatus({ 
        type: 'warning', 
        message: `Your announcement needs manual review. It will be checked by an administrator. (Confidence: ${(moderationResult.confidence * 100).toFixed(1)}%)` 
      });
    } else {
      const flaggedWordsText = moderationResult.flaggedWords?.length > 0 
        ? ` Flagged terms: ${moderationResult.flaggedWords.map(w => w.word).join(', ')}`
        : '';
      setModerationStatus({ 
        type: 'warning', 
        message: `Your announcement has been flagged for admin review.${flaggedWordsText}` 
      });
    }

    // Reset form after 3 seconds
    setTimeout(() => {
      setShowCreateModal(false);
      setModerationStatus(null);
      setNewAnnouncement({ title: '', content: '', audience: '', priority: 'normal', image: null, imageName: '' });
    }, 3000);
  };

  const audienceOptions = getAudienceOptions();

  const filteredAnnouncements = announcements.filter(announcement => {
    if (activeFilter !== 'all' && announcement.type !== activeFilter) return false;
    if (searchQuery && !announcement.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'faculty': return 'primary';
      case 'org_tier1': return 'warning';
      case 'org_tier2': return 'info';
      case 'class_rep': return 'success';
      default: return 'gray';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'MIS/Admin';
      case 'faculty': return 'Faculty';
      case 'org_tier1': return 'Tier 1 Org';
      case 'org_tier2': return 'Tier 2 Org';
      case 'class_rep': return 'Class Rep';
      default: return 'User';
    }
  };

  return (
    <div className="announcements-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Stay updated with campus news and events</p>
        </div>
        <div className="header-actions">
          {userCanPost && (
            <>
              <Button variant="outline" icon={History} onClick={() => setShowHistoryModal(true)}>
                My Posts
              </Button>
              <Button variant="primary" icon={Plus} onClick={() => setShowCreateModal(true)}>
                Create Announcement
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Posting Privileges Info */}
      {userCanPost && (
        <Alert variant="info" style={{ marginBottom: '20px' }}>
          <div className="privileges-info">
            <Shield size={18} />
            <div>
              <strong>Your Posting Privileges:</strong> {user?.postingPrivileges?.scope} - {user?.postingPrivileges?.purpose}
            </div>
          </div>
        </Alert>
      )}

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
                    <span className="scope-tag">• {announcement.scope}</span>
                  </div>
                </div>
              </div>
              <div className="announcement-badges">
                {announcement.priority === 'high' && (
                  <Badge variant="error">Important</Badge>
                )}
                <Badge variant={getRoleBadgeVariant(announcement.authorRole)}>
                  {getRoleLabel(announcement.authorRole)}
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
        onClose={() => {
          setShowCreateModal(false);
          setModerationStatus(null);
          setNewAnnouncement({
            title: '',
            content: '',
            audience: '',
            priority: 'normal',
            image: null,
            imageName: ''
          });
        }}
        title="Create Announcement"
        size="lg"
        footer={
          !moderationStatus && (
            <>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handlePublish}
                disabled={!newAnnouncement.title || !newAnnouncement.content || !newAnnouncement.audience}
              >
                Publish Announcement
              </Button>
            </>
          )
        }
      >
        {moderationStatus ? (
          <div className={`moderation-result ${moderationStatus.type}`}>
            {moderationStatus.type === 'success' ? (
              <CheckCircle size={48} className="result-icon success" />
            ) : (
              <AlertTriangle size={48} className="result-icon warning" />
            )}
            <p>{moderationStatus.message}</p>
          </div>
        ) : (
          <div className="create-announcement-form">
            <Input
              label="Title"
              placeholder="Enter announcement title"
              value={newAnnouncement.title}
              onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
            />
            
            <div className="form-group">
              <label className="form-label">Content</label>
              <textarea
                className="form-input rich-editor"
                rows="6"
                placeholder="Write your announcement here... (Supports basic formatting)"
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>

            <div className="form-row">
              <Select
                label="Target Audience"
                options={audienceOptions}
                placeholder="Select audience"
                value={newAnnouncement.audience}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, audience: e.target.value }))}
              />
              
              <Select
                label="Priority"
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'high', label: 'High (Important)' },
                ]}
                value={newAnnouncement.priority}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, priority: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Attach Image (Optional)</label>
              <div className={`image-upload ${newAnnouncement.imageName ? 'has-file' : ''}`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  id="announcement-image"
                />
                <Image size={24} />
                <span>{newAnnouncement.imageName || 'Click or drag to upload image'}</span>
              </div>
              {newAnnouncement.imageName && (
                <div className="uploaded-preview">
                  <Image size={16} />
                  <span>{newAnnouncement.imageName}</span>
                  <button type="button" onClick={handleRemoveFile}>
                    <XCircle size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="moderation-notice">
              <div className="notice-header">
                <Shield size={16} />
                <span>Naive Bayes Auto-Moderation Active</span>
              </div>
              <p>All announcements are automatically reviewed for safety. Safe content is published instantly. Potentially unsafe content is sent to Admin/MIS for manual review.</p>
            </div>
          </div>
        )}
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="My Announcements"
        size="lg"
      >
        <div className="announcement-history">
          {myAnnouncements.length === 0 ? (
            <div className="empty-history">
              <History size={48} />
              <p>You haven't posted any announcements yet.</p>
            </div>
          ) : (
            myAnnouncements.map((post) => (
              <div key={post.id} className={`history-item ${post.status}`}>
                <div className="history-header">
                  <h4>{post.title}</h4>
                  <Badge variant={post.status === 'published' ? 'success' : 'warning'}>
                    {post.status === 'published' ? (
                      <><CheckCircle size={12} /> Published</>
                    ) : (
                      <><AlertTriangle size={12} /> Flagged</>
                    )}
                  </Badge>
                </div>
                <p className="history-content">{post.content}</p>
                <div className="history-meta">
                  <span><Clock size={12} /> {post.timestamp}</span>
                  {post.status === 'published' && (
                    <>
                      <span><Eye size={12} /> {post.views} views</span>
                      <span><Heart size={12} /> {post.likes} likes</span>
                    </>
                  )}
                  {post.status === 'flagged' && (
                    <span className="flag-reason"><XCircle size={12} /> {post.reason}</span>
                  )}
                </div>
                <div className="history-actions">
                  <Button variant="ghost" size="sm" icon={Edit}>Edit</Button>
                  <Button variant="ghost" size="sm" icon={Trash2}>Delete</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Announcements;
