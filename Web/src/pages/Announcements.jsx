import { useState, useEffect, useRef } from 'react'
import { useAuth, ROLES, ROLE_HIERARCHY, ROLE_DISPLAY_NAMES } from '../contexts/AuthContext'
import {
  createAnnouncement,
  getAnnouncementsForUser,
  getAllAnnouncements,
  getPendingAnnouncements,
  approveAnnouncement,
  rejectAnnouncement,
  deleteAnnouncement,
  removeMediaFromAnnouncement,
  ANNOUNCEMENT_STATUS,
  PRIORITY_LEVELS
} from '../services/announcementService'

/**
 * Announcements Page
 * 
 * Features:
 * - View announcements filtered by user tags
 * - Create announcements with media (photos/videos)
 * - Moderation queue for Admin+ to review pending announcements
 * - Tag-based visibility targeting
 */
export default function Announcements() {
  const { user, userProfile, hasMinRole } = useAuth()
  
  // State
  const [announcements, setAnnouncements] = useState([])
  const [pendingAnnouncements, setPendingAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // 'all', 'pending', 'create'
  const [toast, setToast] = useState({ show: false, message: '', kind: 'info' })
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  
  // Create form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: PRIORITY_LEVELS.NORMAL,
    targetTags: []
  })
  const [mediaFiles, setMediaFiles] = useState([])
  const [mediaPreview, setMediaPreview] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [moderationPreview, setModerationPreview] = useState(null)
  const fileInputRef = useRef(null)
  
  // CvSU Imus Campus Organizations for targeting
  const organizations = [
    'Central Student Government',
    'Builders of Innovative Technologist Society',
    'Business Management Society',
    'Cavite Communicators',
    'Circle of Hospitality and Tourism Students',
    'Cavite Young Leaders for Entrepreneurship',
    'Computer Science Clique',
    'Educators\' Guild for Excellence',
    'Samahan ng mga Magaaral ng Sikolohiya',
    'Young Office Professional Advocates',
    'Sinag-Tala',
    'The Flare',
    'Honor Society'
  ]
  
  const canCreate = hasMinRole(ROLES.CLASS_REP)
  const canModerate = hasMinRole(ROLES.ADMIN)
  const skipModeration = hasMinRole(ROLES.ADMIN) // Admin+ bypasses moderation

  // Show toast notification
  const showToast = (message, kind = 'info') => {
    setToast({ show: true, message, kind })
    setTimeout(() => setToast({ show: false, message: '', kind: 'info' }), 4000)
  }

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const userTags = userProfile?.tags || []
        const data = await getAnnouncementsForUser(userTags)
        setAnnouncements(data)
        
        // Fetch pending if user can moderate
        if (canModerate) {
          const pending = await getPendingAnnouncements()
          setPendingAnnouncements(pending)
        }
      } catch (err) {
        console.error('Error fetching announcements:', err)
        setError('Failed to load announcements')
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncements()
  }, [userProfile, canModerate])

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    const validFiles = []
    const previews = []
    
    for (const file of files) {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      
      if (!isImage && !isVideo) {
        showToast(`Invalid file type: ${file.name}`, 'error')
        continue
      }
      
      if (file.size > 50 * 1024 * 1024) {
        showToast(`File too large: ${file.name} (max 50MB)`, 'error')
        continue
      }
      
      validFiles.push(file)
      
      // Create preview
      if (isImage) {
        previews.push({
          type: 'image',
          url: URL.createObjectURL(file),
          name: file.name
        })
      } else {
        previews.push({
          type: 'video',
          url: URL.createObjectURL(file),
          name: file.name
        })
      }
    }
    
    setMediaFiles(prev => [...prev, ...validFiles])
    setMediaPreview(prev => [...prev, ...previews])
  }

  // Remove media from preview
  const removeMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
    setMediaPreview(prev => {
      URL.revokeObjectURL(prev[index].url)
      return prev.filter((_, i) => i !== index)
    })
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim()) {
      showToast('Title and content are required', 'error')
      return
    }
    
    try {
      setSubmitting(true)
      
      const author = {
        uid: user.uid,
        name: `${userProfile.givenName} ${userProfile.lastName}`,
        role: userProfile.role
      }
      
      const result = await createAnnouncement(
        formData,
        mediaFiles,
        author,
        skipModeration
      )
      
      if (result.status === ANNOUNCEMENT_STATUS.APPROVED) {
        showToast('Announcement published successfully!', 'success')
        setAnnouncements(prev => [result, ...prev])
      } else if (result.status === ANNOUNCEMENT_STATUS.PENDING_REVIEW) {
        showToast('Announcement submitted for review. An admin will review it shortly.', 'info')
      } else {
        showToast(result.moderationResult.message || 'Announcement was rejected by moderation.', 'error')
      }
      
      // Reset form
      setFormData({
        title: '',
        content: '',
        priority: PRIORITY_LEVELS.NORMAL,
        targetTags: []
      })
      setMediaFiles([])
      setMediaPreview([])
      setModerationPreview(null)
      setActiveTab('all')
      
    } catch (err) {
      console.error('Error creating announcement:', err)
      showToast(err.message || 'Failed to create announcement', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle approval
  const handleApprove = async (announcementId) => {
    try {
      await approveAnnouncement(announcementId)
      showToast('Announcement approved!', 'success')
      
      // Move from pending to approved
      const approved = pendingAnnouncements.find(a => a.id === announcementId)
      if (approved) {
        approved.status = ANNOUNCEMENT_STATUS.APPROVED
        setAnnouncements(prev => [approved, ...prev])
        setPendingAnnouncements(prev => prev.filter(a => a.id !== announcementId))
      }
    } catch (err) {
      showToast('Failed to approve announcement', 'error')
    }
  }

  // Handle rejection
  const handleReject = async (announcementId, reason = '') => {
    try {
      await rejectAnnouncement(announcementId, reason)
      showToast('Announcement rejected', 'info')
      setPendingAnnouncements(prev => prev.filter(a => a.id !== announcementId))
    } catch (err) {
      showToast('Failed to reject announcement', 'error')
    }
  }

  // Handle delete
  const handleDelete = async (announcementId) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return
    
    try {
      await deleteAnnouncement(announcementId)
      showToast('Announcement deleted', 'success')
      setAnnouncements(prev => prev.filter(a => a.id !== announcementId))
      setPendingAnnouncements(prev => prev.filter(a => a.id !== announcementId))
      setSelectedAnnouncement(null)
    } catch (err) {
      showToast('Failed to delete announcement', 'error')
    }
  }

  // Toggle tag selection
  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      targetTags: prev.targetTags.includes(tag)
        ? prev.targetTags.filter(t => t !== tag)
        : [...prev.targetTags, tag]
    }))
  }

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get priority badge color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case PRIORITY_LEVELS.URGENT:
        return 'bg-red-100 text-red-700'
      case PRIORITY_LEVELS.HIGH:
        return 'bg-orange-100 text-orange-700'
      case PRIORITY_LEVELS.NORMAL:
        return 'bg-blue-100 text-blue-700'
      case PRIORITY_LEVELS.LOW:
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case ANNOUNCEMENT_STATUS.APPROVED:
        return 'bg-green-100 text-green-700'
      case ANNOUNCEMENT_STATUS.PENDING_REVIEW:
        return 'bg-yellow-100 text-yellow-700'
      case ANNOUNCEMENT_STATUS.REJECTED:
        return 'bg-red-100 text-red-700'
      case ANNOUNCEMENT_STATUS.ARCHIVED:
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all ${
          toast.kind === 'success' ? 'bg-green-500 text-white' :
          toast.kind === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-600 mt-1">Stay updated with campus news and events.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setActiveTab('create')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Announcement
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Announcements
          </button>
          {canModerate && (
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending Review
              {pendingAnnouncements.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                  {pendingAnnouncements.length}
                </span>
              )}
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => setActiveTab('create')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'create'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Create New
            </button>
          )}
        </nav>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading announcements...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="py-12 text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* All Announcements Tab */}
      {!loading && !error && activeTab === 'all' && (
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <p className="text-gray-500">No announcements yet.</p>
            </div>
          ) : (
            announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedAnnouncement(announcement)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(announcement.priority)}`}>
                      {announcement.priority?.toUpperCase() || 'NORMAL'}
                    </span>
                    {announcement.targetTags?.length > 0 && (
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                        {announcement.targetTags.length} org(s)
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(announcement.createdAt)}</span>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{announcement.title}</h3>
                <p className="text-gray-600 text-sm line-clamp-3">{announcement.content}</p>
                
                {/* Media preview */}
                {announcement.media?.length > 0 && (
                  <div className="flex gap-2 mt-4">
                    {announcement.media.slice(0, 3).map((media, idx) => (
                      <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                        {media.type === 'image' ? (
                          <img src={media.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                    {announcement.media.length > 3 && (
                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                        +{announcement.media.length - 3}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary text-xs font-semibold">
                      {announcement.authorName?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{announcement.authorName}</span>
                  <span className="text-xs text-gray-300">•</span>
                  <span className="text-xs text-gray-500">{ROLE_DISPLAY_NAMES[announcement.authorRole]}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pending Review Tab */}
      {!loading && !error && activeTab === 'pending' && canModerate && (
        <div className="space-y-4">
          {pendingAnnouncements.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <svg className="w-12 h-12 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500">No pending announcements to review.</p>
            </div>
          ) : (
            pendingAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className="bg-white rounded-xl border border-yellow-200 p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                      PENDING REVIEW
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(announcement.priority)}`}>
                      {announcement.priority?.toUpperCase() || 'NORMAL'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(announcement.createdAt)}</span>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{announcement.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{announcement.content}</p>
                
                {/* Moderation info */}
                {announcement.moderationResult && (
                  <div className="bg-yellow-50 rounded-lg p-3 mb-4 text-sm">
                    <p className="font-medium text-yellow-800 mb-1">Moderation Details:</p>
                    <p className="text-yellow-700">
                      Category: {announcement.moderationResult.category} | 
                      Confidence: {(announcement.moderationResult.confidence * 100).toFixed(1)}%
                    </p>
                    {announcement.moderationResult.flaggedWords?.length > 0 && (
                      <p className="text-yellow-700 mt-1">
                        Flagged: {announcement.moderationResult.flaggedWords.map(w => w.word || w).join(', ')}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Media preview */}
                {announcement.media?.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    {announcement.media.map((media, idx) => (
                      <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                        {media.type === 'image' ? (
                          <img src={media.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={media.url} className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary text-xs font-semibold">
                        {announcement.authorName?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{announcement.authorName}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(announcement.id)}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(announcement.id)}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Tab */}
      {!loading && activeTab === 'create' && canCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Create New Announcement</h2>
          
          {!skipModeration && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">Content Moderation</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Your announcement will be reviewed by our moderation system. Inappropriate content will be sent for admin review.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter announcement title"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>
            
            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your announcement content..."
                rows={6}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                required
              />
            </div>
            
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value={PRIORITY_LEVELS.LOW}>Low</option>
                <option value={PRIORITY_LEVELS.NORMAL}>Normal</option>
                <option value={PRIORITY_LEVELS.HIGH}>High</option>
                <option value={PRIORITY_LEVELS.URGENT}>Urgent</option>
              </select>
            </div>
            
            {/* Target Organizations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
                <span className="font-normal text-gray-500 ml-1">(Leave empty for campus-wide)</span>
              </label>
              <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
                {organizations.map((org) => (
                  <button
                    key={org}
                    type="button"
                    onClick={() => toggleTag(org)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      formData.targetTags.includes(org)
                        ? 'bg-primary text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {org}
                  </button>
                ))}
              </div>
              {formData.targetTags.length === 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  📢 This announcement will be visible to all campus users
                </p>
              )}
            </div>
            
            {/* Media Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments
                <span className="font-normal text-gray-500 ml-1">(Photos & Videos, max 50MB each)</span>
              </label>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,video/*"
                multiple
                className="hidden"
              />
              
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary font-medium hover:underline"
                >
                  Click to upload
                </button>
                <p className="text-gray-400 text-sm mt-1">or drag and drop</p>
              </div>
              
              {/* Media Previews */}
              {mediaPreview.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {mediaPreview.map((media, idx) => (
                    <div key={idx} className="relative group">
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                        {media.type === 'image' ? (
                          <img src={media.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={media.url} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMedia(idx)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 text-white text-xs rounded">
                        {media.type === 'image' ? '📷' : '🎥'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Publishing...
                  </span>
                ) : (
                  skipModeration ? 'Publish Announcement' : 'Submit for Review'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedAnnouncement(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(selectedAnnouncement.priority)}`}>
                  {selectedAnnouncement.priority?.toUpperCase() || 'NORMAL'}
                </span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(selectedAnnouncement.status)}`}>
                  {selectedAnnouncement.status?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedAnnouncement.title}</h2>
              <p className="text-sm text-gray-500 mb-4">{formatDate(selectedAnnouncement.createdAt)}</p>
              
              <div className="prose prose-sm max-w-none text-gray-700 mb-6">
                {selectedAnnouncement.content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              
              {/* Media Gallery */}
              {selectedAnnouncement.media?.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {selectedAnnouncement.media.map((media, idx) => (
                    <div key={idx} className="rounded-lg overflow-hidden bg-gray-100">
                      {media.type === 'image' ? (
                        <img src={media.url} alt="" className="w-full h-48 object-cover" />
                      ) : (
                        <video src={media.url} controls className="w-full h-48 object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Target Tags */}
              {selectedAnnouncement.targetTags?.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-2">Target Audience:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAnnouncement.targetTags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Author Info */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">
                    {selectedAnnouncement.authorName?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedAnnouncement.authorName}</p>
                  <p className="text-xs text-gray-500">{ROLE_DISPLAY_NAMES[selectedAnnouncement.authorRole]}</p>
                </div>
              </div>
              
              {/* Admin Actions */}
              {canModerate && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleDelete(selectedAnnouncement.id)}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Delete Announcement
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
