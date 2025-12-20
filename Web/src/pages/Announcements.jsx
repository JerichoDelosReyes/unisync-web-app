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
  updateAnnouncement,
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
  
  // Media viewer state
  const [mediaViewer, setMediaViewer] = useState({ open: false, media: null, index: 0, allMedia: [] })
  
  // Edit modal state
  const [editModal, setEditModal] = useState({ open: false, announcement: null })
  const [editFormData, setEditFormData] = useState({
    title: '',
    content: '',
    priority: PRIORITY_LEVELS.NORMAL,
    targetTags: []
  })
  const [editSubmitting, setEditSubmitting] = useState(false)
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, announcement: null })
  const [deleting, setDeleting] = useState(false)
  
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
  // Admin+ skips review queue but profanity is ALWAYS checked
  const skipReviewQueue = hasMinRole(ROLES.ADMIN)

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
        skipReviewQueue
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
    try {
      setDeleting(true)
      await deleteAnnouncement(announcementId)
      showToast('Announcement deleted', 'success')
      setAnnouncements(prev => prev.filter(a => a.id !== announcementId))
      setPendingAnnouncements(prev => prev.filter(a => a.id !== announcementId))
      setSelectedAnnouncement(null)
      setDeleteConfirm({ open: false, announcement: null })
    } catch (err) {
      showToast('Failed to delete announcement', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // Open edit modal
  const openEditModal = (announcement) => {
    setEditFormData({
      title: announcement.title || '',
      content: announcement.content || '',
      priority: announcement.priority || PRIORITY_LEVELS.NORMAL,
      targetTags: announcement.targetTags || []
    })
    setEditModal({ open: true, announcement })
    setSelectedAnnouncement(null)
  }

  // Handle edit submission
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    
    if (!editFormData.title.trim() || !editFormData.content.trim()) {
      showToast('Title and content are required', 'error')
      return
    }
    
    try {
      setEditSubmitting(true)
      
      await updateAnnouncement(editModal.announcement.id, {
        title: editFormData.title,
        content: editFormData.content,
        priority: editFormData.priority,
        targetTags: editFormData.targetTags
      })
      
      // Update local state
      const updatedAnnouncement = {
        ...editModal.announcement,
        title: editFormData.title,
        content: editFormData.content,
        priority: editFormData.priority,
        targetTags: editFormData.targetTags
      }
      
      setAnnouncements(prev => prev.map(a => 
        a.id === editModal.announcement.id ? updatedAnnouncement : a
      ))
      
      showToast('Announcement updated successfully!', 'success')
      setEditModal({ open: false, announcement: null })
    } catch (err) {
      console.error('Error updating announcement:', err)
      showToast('Failed to update announcement', 'error')
    } finally {
      setEditSubmitting(false)
    }
  }

  // Toggle edit tag selection
  const toggleEditTag = (tag) => {
    setEditFormData(prev => ({
      ...prev,
      targetTags: prev.targetTags.includes(tag)
        ? prev.targetTags.filter(t => t !== tag)
        : [...prev.targetTags, tag]
    }))
  }

  // Open media viewer
  const openMediaViewer = (media, index, allMedia) => {
    setMediaViewer({ open: true, media, index, allMedia })
  }

  // Navigate media viewer
  const navigateMedia = (direction) => {
    const newIndex = mediaViewer.index + direction
    if (newIndex >= 0 && newIndex < mediaViewer.allMedia.length) {
      setMediaViewer(prev => ({
        ...prev,
        index: newIndex,
        media: prev.allMedia[newIndex]
      }))
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

  // Format date - handles Firestore timestamps, Date objects, and serverTimestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now'
    
    try {
      let date
      
      // Handle Firestore Timestamp
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate()
      }
      // Handle seconds/nanoseconds object (serverTimestamp pending)
      else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000)
      }
      // Handle Date object or ISO string
      else if (timestamp instanceof Date) {
        date = timestamp
      }
      else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp)
      }
      else {
        return 'Just now'
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Just now'
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Just now'
    }
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
    <div className="min-h-screen bg-white">
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 ${
          toast.kind === 'success' ? 'bg-emerald-500 text-white' :
          toast.kind === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Hero Section */}
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-sm font-medium text-gray-800">Campus News & Updates</span>
              </div>
              <h1 className="text-5xl font-bold mb-3 leading-tight text-gray-900">Announcements</h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Important campus updates, events, and announcements
              </p>
            </div>
            
            {canCreate && (
              <button
                onClick={() => setActiveTab('create')}
                className="group inline-flex items-center gap-3 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-300 text-base font-semibold shadow-lg transform hover:-translate-y-1"
              >
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Create
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-200 rounded-b-lg">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-4 px-4 font-semibold text-sm transition-all duration-300 relative ${
            activeTab === 'all'
              ? 'text-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Announcements
          {activeTab === 'all' && (
            <div className="absolute bottom-0 left-4 right-4 h-1 bg-green-600 rounded-t-lg"></div>
          )}
        </button>
        {canModerate && (
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-4 px-4 font-semibold text-sm transition-all duration-300 relative flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'text-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending Review
            {pendingAnnouncements.length > 0 && (
              <span className="ml-2 px-3 py-1 text-xs font-bold bg-red-500 text-white rounded-full">
                {pendingAnnouncements.length}
              </span>
            )}
            {activeTab === 'pending' && (
              <div className="absolute bottom-0 left-4 right-4 h-1 bg-green-600 rounded-t-lg"></div>
            )}
          </button>
        )}
        {canCreate && (
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-4 px-4 font-semibold text-sm transition-all duration-300 relative ${
              activeTab === 'create'
                ? 'text-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Create New
            {activeTab === 'create' && (
              <div className="absolute bottom-0 left-4 right-4 h-1 bg-green-600 rounded-t-lg"></div>
            )}
          </button>
        )}
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
        <div>
          {announcements.length === 0 ? (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-dashed border-gray-300 p-16 text-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Announcements Yet</h3>
              <p className="text-gray-600">Check back soon for exciting updates and campus news!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement, idx) => (
                <div
                  key={announcement.id}
                  className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-blue-300 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                  onClick={() => setSelectedAnnouncement(announcement)}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Top accent bar */}
                  <div className="h-1 bg-green-600"></div>
                  
                  <div className="p-6">
                    {/* Header with badges */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-3 py-1.5 text-xs font-bold rounded-full uppercase tracking-wide ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priority?.toUpperCase() || 'NORMAL'}
                        </span>
                        {announcement.targetTags?.length > 0 && (
                          <span className="px-3 py-1.5 text-xs font-bold bg-purple-100 text-purple-700 rounded-full">
                            {announcement.targetTags.length} org(s)
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-500">{formatDate(announcement.createdAt)}</span>
                    </div>
                    
                    {/* Title and content */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {announcement.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-4">
                      {announcement.content}
                    </p>
                    
                    {/* Media preview */}
                    {announcement.media?.length > 0 && (
                      <div className="flex gap-2 mb-4">
                        {announcement.media.slice(0, 3).map((media, idx) => (
                          <div key={idx} className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0 group-hover:shadow-md transition-all">
                            {media.type === 'image' ? (
                              <img src={media.url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-300">
                                <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ))}
                        {announcement.media.length > 3 && (
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 flex-shrink-0">
                            +{announcement.media.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Footer with author */}
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {announcement.authorName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{announcement.authorName}</p>
                        <p className="text-xs text-gray-500">{ROLE_DISPLAY_NAMES[announcement.authorRole]}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending Review Tab */}
      {!loading && !error && activeTab === 'pending' && canModerate && (
        <div>
          {pendingAnnouncements.length === 0 ? (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-dashed border-emerald-300 p-16 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">All Clear!</h3>
              <p className="text-gray-600">No pending announcements to review. Great work keeping things clean!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingAnnouncements.map((announcement, idx) => (
                <div
                  key={announcement.id}
                  className="bg-white rounded-2xl border-2 border-amber-200 hover:border-amber-300 hover:shadow-lg transition-all overflow-hidden"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Top accent bar */}
                  <div className="h-1 bg-amber-400"></div>
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-3 py-1.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full uppercase tracking-wide">
                          🔍 PENDING REVIEW
                        </span>
                        <span className={`px-3 py-1.5 text-xs font-bold rounded-full uppercase tracking-wide ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priority?.toUpperCase() || 'NORMAL'}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-gray-500">{formatDate(announcement.createdAt)}</span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{announcement.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">{announcement.content}</p>
                    
                    {/* Moderation Details Card */}
                    {announcement.moderationResult && (
                      <div className="bg-amber-50 border-l-4 border-amber-400 rounded-xl p-4 mb-4">
                        <p className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                          </svg>
                          Moderation Details
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-amber-800">
                          <div>
                            <p className="font-semibold">Category:</p>
                            <p className="text-amber-700 capitalize">{announcement.moderationResult.category}</p>
                          </div>
                          <div>
                            <p className="font-semibold">Confidence:</p>
                            <p className="text-amber-700">{(announcement.moderationResult.confidence * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                        {announcement.moderationResult.flaggedWords?.length > 0 && (
                          <div className="mt-2">
                            <p className="font-semibold text-amber-900">Flagged Words:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {announcement.moderationResult.flaggedWords.map((w, idx) => (
                                <span key={idx} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded font-medium">
                                  {w.word || w}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Media preview */}
                    {announcement.media?.length > 0 && (
                      <div className="flex gap-2 mb-6">
                        {announcement.media.map((media, idx) => (
                          <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                            {media.type === 'image' ? (
                              <img src={media.url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-400">
                                <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Author and Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">
                          {announcement.authorName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900">{announcement.authorName}</p>
                          <p className="text-xs text-gray-500">{ROLE_DISPLAY_NAMES[announcement.authorRole]}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(announcement.id)}
                          className="px-4 py-2 text-sm font-bold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-all"
                        >
                          ✗ Reject
                        </button>
                        <button
                          onClick={() => handleApprove(announcement.id)}
                          className="px-4 py-2 text-sm font-bold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 hover:shadow-lg transition-all"
                        >
                          ✓ Approve
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Tab */}
      {!loading && activeTab === 'create' && canCreate && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Share Your Announcement</h2>
            <p className="text-gray-600">Reach your audience with important campus updates and news.</p>
          </div>
          
          {!skipReviewQueue && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-8 flex gap-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Content Review</p>
                <p className="text-sm text-blue-700 mt-1">
                  Your announcement will be reviewed by our moderation system to ensure community standards are met.
                </p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Make it clear and engaging..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base"
                required
              />
            </div>
            
            {/* Content */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Share the details of your announcement..."
                rows={6}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none text-base"
                required
              />
            </div>
            
            {/* Priority */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">Priority Level</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base"
              >
                <option value={PRIORITY_LEVELS.LOW}>📍 Low Priority</option>
                <option value={PRIORITY_LEVELS.NORMAL}>📌 Normal Priority</option>
                <option value={PRIORITY_LEVELS.HIGH}>📍 High Priority</option>
                <option value={PRIORITY_LEVELS.URGENT}>🔴 Urgent Priority</option>
              </select>
            </div>
            
            {/* Target Organizations */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Target Audience
                <span className="font-normal text-gray-600 ml-2">(optional - leave empty for campus-wide)</span>
              </label>
              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl max-h-64 overflow-y-auto">
                {organizations.map((org) => (
                  <button
                    key={org}
                    type="button"
                    onClick={() => toggleTag(org)}
                    className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      formData.targetTags.includes(org)
                        ? 'bg-green-600 text-white shadow-md scale-105'
                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50'
                    }`}
                  >
                    {org}
                  </button>
                ))}
              </div>
              {formData.targetTags.length === 0 && (
                <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                  <span>📢</span> This announcement will reach all campus users
                </p>
              )}
              {formData.targetTags.length > 0 && (
                <p className="text-sm text-blue-600 mt-3 font-medium">
                  Targeting {formData.targetTags.length} organization{formData.targetTags.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            
            {/* Media Upload */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Attachments
                <span className="font-normal text-gray-600 ml-2">(Photos & Videos • Up to 50MB each)</span>
              </label>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,video/*"
                multiple
                className="hidden"
              />
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-3 border-dashed border-green-300 rounded-xl p-8 text-center hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-green-600 font-bold text-lg">Click to upload</p>
                <p className="text-gray-500 text-sm mt-1">or drag and drop your files here</p>
              </div>
              
              {/* Media Previews */}
              {mediaPreview.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-6">
                  {mediaPreview.map((media, idx) => (
                    <div key={idx} className="relative group">
                      <div className="w-28 h-28 rounded-xl overflow-hidden bg-gray-200 shadow-md">
                        {media.type === 'image' ? (
                          <img src={media.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-400">
                            <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMedia(idx)}
                        className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                      </button>
                      <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs font-bold rounded-lg">
                        {media.type === 'image' ? '📷' : '🎥'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Submit */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="flex-1 px-6 py-3 text-base font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 text-base font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 hover:shadow-lg hover:-translate-y-1 disabled:opacity-50 transition-all"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {skipReviewQueue ? 'Publishing...' : 'Submitting...'}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {skipReviewQueue ? '✨ Publish Now' : '📤 Submit for Review'}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-green-600 text-white px-8 py-6 flex items-center justify-between z-10 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${
                  selectedAnnouncement.priority === PRIORITY_LEVELS.URGENT ? 'bg-red-500' :
                  selectedAnnouncement.priority === PRIORITY_LEVELS.HIGH ? 'bg-orange-500' :
                  selectedAnnouncement.priority === PRIORITY_LEVELS.NORMAL ? 'bg-blue-500' :
                  'bg-gray-500'
                }`}>
                  {selectedAnnouncement.priority?.toUpperCase() || 'NORMAL'}
                </span>
                <span className="px-3 py-1 text-xs font-bold bg-white/20 rounded-full">
                  {selectedAnnouncement.status?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-8">
              {/* Title and meta */}
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedAnnouncement.title}</h2>
              <p className="text-sm text-gray-500 mb-6 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDate(selectedAnnouncement.createdAt)}
              </p>
              
              {/* Content */}
              <div className="prose prose-sm max-w-none text-gray-700 mb-8 leading-relaxed">
                {selectedAnnouncement.content.split('\n').map((line, i) => (
                  <p key={i} className="mb-2">{line}</p>
                ))}
              </div>
              
              {/* Media Gallery */}
              {selectedAnnouncement.media?.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Attachments ({selectedAnnouncement.media.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedAnnouncement.media.map((media, idx) => (
                      <div 
                        key={idx} 
                        className="relative rounded-xl overflow-hidden bg-gray-100 cursor-pointer group aspect-square"
                        onClick={() => openMediaViewer(media, idx, selectedAnnouncement.media)}
                      >
                        {media.type === 'image' ? (
                          <>
                            <img src={media.url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </div>
                          </>
                        ) : (
                          <div className="relative w-full h-full">
                            <video src={media.url} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                              <svg className="w-12 h-12 text-white opacity-90" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Click any image to view full size</p>
                </div>
              )}
              
              {/* Target Tags */}
              {selectedAnnouncement.targetTags?.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Target Audience
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAnnouncement.targetTags.map((tag, idx) => (
                      <span key={idx} className="px-3 py-1.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded-lg">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Author Info */}
              <div className="flex items-center gap-4 pt-8 border-t border-gray-200">
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg">
                  {selectedAnnouncement.authorName?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selectedAnnouncement.authorName}</p>
                  <p className="text-sm text-gray-600">{ROLE_DISPLAY_NAMES[selectedAnnouncement.authorRole]}</p>
                </div>
              </div>
              
              {/* Admin Actions */}
              {canModerate && (
                <div className="mt-8 pt-8 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={() => openEditModal(selectedAnnouncement)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirm({ open: true, announcement: selectedAnnouncement })
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      {mediaViewer.open && mediaViewer.media && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90">
          {/* Close button */}
          <button
            onClick={() => setMediaViewer({ open: false, media: null, index: 0, allMedia: [] })}
            className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white bg-black/50 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Navigation - Previous */}
          {mediaViewer.allMedia.length > 1 && mediaViewer.index > 0 && (
            <button
              onClick={() => navigateMedia(-1)}
              className="absolute left-4 z-10 p-3 text-white/80 hover:text-white bg-black/50 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          {/* Navigation - Next */}
          {mediaViewer.allMedia.length > 1 && mediaViewer.index < mediaViewer.allMedia.length - 1 && (
            <button
              onClick={() => navigateMedia(1)}
              className="absolute right-4 z-10 p-3 text-white/80 hover:text-white bg-black/50 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          
          {/* Media content */}
          <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            {mediaViewer.media.type === 'image' ? (
              <img 
                src={mediaViewer.media.url} 
                alt="" 
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            ) : (
              <video 
                src={mediaViewer.media.url} 
                controls 
                autoPlay
                className="max-w-full max-h-[90vh] rounded-lg"
              />
            )}
          </div>
          
          {/* Counter */}
          {mediaViewer.allMedia.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 text-white text-sm rounded-full">
              {mediaViewer.index + 1} / {mediaViewer.allMedia.length}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editModal.open && editModal.announcement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditModal({ open: false, announcement: null })} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900">Edit Announcement</h3>
              <button
                onClick={() => setEditModal({ open: false, announcement: null })}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter announcement title"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>
              
              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  value={editFormData.content}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, content: e.target.value }))}
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
                  value={editFormData.priority}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, priority: e.target.value }))}
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
                <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                  {organizations.map((org) => (
                    <button
                      key={org}
                      type="button"
                      onClick={() => toggleEditTag(org)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        editFormData.targetTags.includes(org)
                          ? 'bg-primary text-white'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {org}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Existing Media */}
              {editModal.announcement.media?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Existing Attachments</label>
                  <div className="flex flex-wrap gap-3">
                    {editModal.announcement.media.map((media, idx) => (
                      <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                        {media.type === 'image' ? (
                          <img src={media.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={media.url} className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Note: Editing media requires re-creating the announcement</p>
                </div>
              )}
              
              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditModal({ open: false, announcement: null })}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {editSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.open && deleteConfirm.announcement && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Delete Announcement?</h3>
                <p className="text-sm text-gray-600 mt-1">This action cannot be undone.</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border-l-4 border-red-500">
              <p className="text-sm font-bold text-gray-900 line-clamp-2">{deleteConfirm.announcement.title}</p>
              <p className="text-xs text-gray-500 mt-2">by {deleteConfirm.announcement.authorName}</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false, announcement: null })}
                disabled={deleting}
                className="flex-1 px-4 py-3 text-sm font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.announcement.id)}
                disabled={deleting}
                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
