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
  toggleReaction,
  getReactionCounts,
  addComment,
  getComments,
  ANNOUNCEMENT_STATUS,
  PRIORITY_LEVELS
} from '../services/announcementService'
import { reportAnnouncement } from '../services/reportService'

// Import organization logos
import CSGLogo from '../assets/img/CSG-removebg-preview.png'
import BITSLogo from '../assets/img/BITS-removebg-preview.png'
import BMSLogo from '../assets/img/BMS-removebg-preview.png'
import CaviteCommLogo from '../assets/img/CAVITECOMMUNICATOR-removebg-preview.png'
import CHLSLogo from '../assets/img/CHTS-removebg-preview.png'
import CYLELogo from '../assets/img/CYLE-removebg-preview.png'
import CSCLogo from '../assets/img/CSC-removebg-preview.png'
import EDGELogo from '../assets/img/EDGE-removebg-preview.png'
import SikolohiyaLogo from '../assets/img/SIKOLOHIYA-removebg-preview (1).png'
import YOPALogo from '../assets/img/YOPA-removebg-preview.png'
import SinagTalaLogo from '../assets/img/SINAGTALA-removebg-preview.png'
import TheFlareLogo from '../assets/img/THE_FLARE-removebg-preview (1).png'
import HonorSocLogo from '../assets/img/HONORSOC-removebg-preview.png'

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
  
  // Create announcement modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Selected organization for filtering
  const [selectedOrganization, setSelectedOrganization] = useState(null)
  
  // Report announcement modal state
  const [reportModal, setReportModal] = useState({ open: false, announcement: null })
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  
  // Comments and reactions state
  const [comments, setComments] = useState([])
  const [reactions, setReactions] = useState({})
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  
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
    { name: 'Central Student Government', logo: CSGLogo },
    { name: 'Builders of Innovative Technologist Society', logo: BITSLogo },
    { name: 'Business Management Society', logo: BMSLogo },
    { name: 'Cavite Communicators', logo: CaviteCommLogo },
    { name: 'Circle of Hospitality and Tourism Students', logo: CHLSLogo },
    { name: 'Cavite Young Leaders for Entrepreneurship', logo: CYLELogo },
    { name: 'Computer Science Clique', logo: CSCLogo },
    { name: 'Educators\' Guild for Excellence', logo: EDGELogo },
    { name: 'Samahan ng mga Magaaral ng Sikolohiya', logo: SikolohiyaLogo },
    { name: 'Young Office Professional Advocates', logo: YOPALogo },
    { name: 'Sinag-Tala', logo: SinagTalaLogo },
    { name: 'The Flare', logo: TheFlareLogo },
    { name: 'Honor Society', logo: HonorSocLogo }
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

  // Fetch comments when announcement is selected
  useEffect(() => {
    if (selectedAnnouncement) {
      const fetchCommentsData = async () => {
        try {
          setLoadingComments(true)
          const data = await getComments(selectedAnnouncement.id)
          setComments(data)
          
          // Set initial reactions from announcement
          if (selectedAnnouncement.reactions) {
            const counts = getReactionCounts(selectedAnnouncement.reactions)
            setReactions(counts)
          } else {
            setReactions({})
          }
        } catch (err) {
          console.error('Error fetching comments:', err)
        } finally {
          setLoadingComments(false)
        }
      }
      
      fetchCommentsData()
      setCommentText('')
    }
  }, [selectedAnnouncement])

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
      setShowCreateModal(false)
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

  // Handle report submission
  const handleSubmitReport = async () => {
    if (!reportModal.announcement) return

    try {
      setReportSubmitting(true)
      await reportAnnouncement(
        reportModal.announcement.id,
        reportReason,
        {
          uid: user.uid,
          name: userProfile?.givenName + ' ' + userProfile?.lastName,
          email: user.email
        }
      )
      showToast('Report submitted successfully. Our team will review it.', 'success')
      setReportModal({ open: false, announcement: null })
      setReportReason('')
    } catch (err) {
      showToast(err.message || 'Failed to submit report', 'error')
    } finally {
      setReportSubmitting(false)
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

  // Handle adding a comment
  const handleAddComment = async (e) => {
    e.preventDefault()
    
    if (!commentText.trim()) {
      showToast('Comment cannot be empty', 'error')
      return
    }
    
    if (!selectedAnnouncement) return
    
    try {
      setSubmittingComment(true)
      
      const author = {
        uid: user.uid,
        name: `${userProfile.givenName} ${userProfile.lastName}`,
        role: userProfile.role
      }
      
      const newComment = await addComment(selectedAnnouncement.id, commentText.trim(), author, null, skipReviewQueue)
      setComments(prev => [newComment, ...prev])
      setCommentText('')
      showToast('Comment added successfully!', 'success')
    } catch (err) {
      console.error('Error adding comment:', err)
      showToast(err.message || 'Failed to add comment', 'error')
    } finally {
      setSubmittingComment(false)
    }
  }

  // Handle toggling a reaction
  const handleToggleReaction = async (announcementId, reactionType) => {
    try {
      const result = await toggleReaction(announcementId, reactionType, user)
      
      // Update in announcements list
      setAnnouncements(prev => prev.map(a => 
        a.id === announcementId 
          ? { ...a, reactions: result.reactions }
          : a
      ))
      
      // Update selected announcement if it's the one being reacted to
      if (selectedAnnouncement && selectedAnnouncement.id === announcementId) {
        const counts = getReactionCounts(result.reactions)
        setReactions(counts)
        
        setSelectedAnnouncement(prev => ({
          ...prev,
          reactions: result.reactions
        }))
      }
      
      showToast('Reaction added!', 'success')
    } catch (err) {
      console.error('Error toggling reaction:', err)
      showToast('Failed to add reaction', 'error')
    }
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

  // Generate acronym from organization name
  const getOrgAcronym = (orgName) => {
    return orgName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 4)
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
                onClick={() => setShowCreateModal(true)}
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
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'important', label: 'Important' },
          { key: 'academic', label: 'Academic' },
          { key: 'general', label: 'General' },
          { key: 'organizations', label: 'Organizations' },
          { key: 'pending', label: 'Pending Review', show: canModerate }
        ].map(tab => (
          tab.show !== false && (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 font-medium text-sm rounded-lg whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-green-600 hover:text-green-600'
              }`}
            >
              {tab.label}
              {tab.key === 'pending' && pendingAnnouncements.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full inline-block">
                  {pendingAnnouncements.length}
                </span>
              )}
            </button>
          )
        ))}
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
      {!loading && !error && ['all', 'important', 'academic', 'general'].includes(activeTab) && (
        <div>
          {(() => {
            let filtered = announcements
            
            if (activeTab === 'important') {
              filtered = announcements.filter(a => a.priority === 'urgent' || a.priority === 'high')
            } else if (activeTab === 'academic') {
              const academicTags = ['Computer Science Clique', 'Educators\' Guild for Excellence', 'Builders of Innovative Technologist Society', 'Business Management Society']
              filtered = announcements.filter(a => a.targetTags?.some(tag => academicTags.includes(tag)))
            } else if (activeTab === 'general') {
              filtered = announcements.filter(a => !a.targetTags || a.targetTags.length === 0)
            }
            
            if (filtered.length === 0) {
              return (
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-dashed border-gray-300 p-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No Announcements Yet</h3>
                  <p className="text-gray-600">Check back soon for exciting updates and campus news!</p>
                </div>
              )
            }
            
            return (
              <div className="space-y-4 w-full">
                {filtered.map((announcement, idx) => (
                  <div
                    key={announcement.id}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {/* Header - Facebook Style */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {announcement.authorName?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900">{announcement.authorName}</p>
                            <p className="text-xs text-gray-500">{ROLE_DISPLAY_NAMES[announcement.authorRole]} • {formatDate(announcement.createdAt)}</p>
                          </div>
                        </div>
                        <div className="relative group flex-shrink-0">
                          <button
                            className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                            </svg>
                          </button>
                          {/* Dropdown Menu - Admin Only */}
                          {canModerate && (
                            <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                              <button
                                onClick={() => openEditModal(announcement)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ open: true, announcement })}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                              <button
                                onClick={() => setReportModal({ open: true, announcement })}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors border-t border-gray-100"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0a9 9 0 1 1 0-18 9 9 0 0 1 0 18z" />
                                </svg>
                                Report
                              </button>
                            </div>
                          )}
                          {/* Report option for all users */}
                          {!canModerate && (
                            <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                              <button
                                onClick={() => setReportModal({ open: true, announcement })}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0a9 9 0 1 1 0-18 9 9 0 0 1 0 18z" />
                                </svg>
                                Report
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Priority and Target Tags */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priority?.toUpperCase() || 'NORMAL'}
                        </span>
                        {announcement.targetTags?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {announcement.targetTags.map((tag, idx) => (
                              <span key={idx} className="px-2 py-1 text-xs font-bold bg-purple-100 text-purple-700 rounded-full" title={tag}>
                                {getOrgAcronym(tag)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="px-4 py-3 cursor-pointer" onClick={() => setSelectedAnnouncement(announcement)}>
                      <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 hover:text-green-600 transition-colors">
                        {announcement.title}
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                        {announcement.content}
                      </p>
                    </div>
                    
                    {/* Media Gallery - Full Width */}
                    {announcement.media?.length > 0 && (
                      <div 
                        className="bg-gray-100 cursor-pointer"
                        onClick={() => setSelectedAnnouncement(announcement)}
                      >
                        {announcement.media.length === 1 ? (
                          <div className="w-full aspect-video overflow-hidden">
                            {announcement.media[0].type === 'image' ? (
                              <img src={announcement.media[0].url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-300">
                                <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1">
                            {announcement.media.slice(0, 4).map((media, idx) => (
                              <div key={idx} className="aspect-square overflow-hidden relative bg-gray-300">
                                {media.type === 'image' ? (
                                  <img src={media.url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                )}
                                {idx === 3 && announcement.media.length > 4 && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <p className="text-white font-bold text-xl">+{announcement.media.length - 4}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Engagement Stats & Action Bar - Facebook Style */}
                    <div className="px-4 py-2 border-t border-gray-100">
                      {/* Action Buttons */}
                      <div className="flex items-center justify-start gap-0">
                        {(() => {
                          const likeReactions = announcement.reactions?.['👍'] || [];
                          const likeCount = Array.isArray(likeReactions) ? likeReactions.length : 0;
                          const hasUserLiked = Array.isArray(likeReactions) && likeReactions.some(r => r.uid === user?.uid);
                          
                          return (
                            <button
                              onClick={() => handleToggleReaction(announcement.id, '👍')}
                              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all group ${
                                hasUserLiked 
                                  ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <span className="group-hover:scale-125 transition-transform">
                                {hasUserLiked ? '💚' : '👍'}
                              </span>
                              <span>{hasUserLiked ? 'Liked' : 'Like'}</span>
                              {likeCount > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                  hasUserLiked ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {likeCount}
                                </span>
                              )}
                            </button>
                          );
                        })()}
                        <button
                          onClick={() => setSelectedAnnouncement(announcement)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>Comment</span>
                          {announcement.comments?.length > 0 && (
                            <span className="text-xs text-gray-500">
                              ({announcement.comments.length})
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {/* Organizations Tab */}
      {!loading && !error && activeTab === 'organizations' && selectedOrganization === null && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Student Organizations</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {organizations.map((org) => (
              <button
                key={org.name}
                onClick={() => setSelectedOrganization(org.name)}
                className="flex flex-col items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-green-600 hover:shadow-lg transition-all cursor-pointer group bg-gradient-to-br from-white to-gray-50"
              >
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-gray-200 group-hover:border-green-600 group-hover:shadow-md transition-all">
                  <img 
                    src={org.logo} 
                    alt={org.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <p className="text-sm font-semibold text-gray-900 text-center line-clamp-3">{org.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && activeTab === 'organizations' && selectedOrganization !== null && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setSelectedOrganization(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm"
            >
              ← Back to Organizations
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Announcements from {selectedOrganization}</h2>
          </div>
          {(() => {
            const orgAnnouncements = announcements.filter(a => a.targetTags?.includes(selectedOrganization))
            if (orgAnnouncements.length === 0) {
              return (
                <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No Announcements</h3>
                  <p className="text-gray-600">This organization hasn't posted any announcements yet.</p>
                </div>
              )
            }
            return (
              <div className="space-y-4 w-full">
                {orgAnnouncements.map((announcement, idx) => (
                  <div
                    key={announcement.id}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {announcement.authorName?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900">{announcement.authorName}</p>
                            <p className="text-xs text-gray-500">{ROLE_DISPLAY_NAMES[announcement.authorRole]} • {formatDate(announcement.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priority?.toUpperCase() || 'NORMAL'}
                        </span>
                      </div>
                    </div>
                    <div className="px-4 py-3 cursor-pointer" onClick={() => setSelectedAnnouncement(announcement)}>
                      <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 hover:text-green-600 transition-colors">
                        {announcement.title}
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                        {announcement.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
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
            <div className="space-y-4 max-w-2xl mx-auto">
              {pendingAnnouncements.map((announcement, idx) => (
                <div
                  key={announcement.id}
                  className="bg-white rounded-2xl border border-amber-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Header - Facebook Style */}
                  <div className="px-4 py-3 border-b border-amber-100">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {announcement.authorName?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900">{announcement.authorName}</p>
                          <p className="text-xs text-gray-500">{ROLE_DISPLAY_NAMES[announcement.authorRole]} • {formatDate(announcement.createdAt)}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-full flex-shrink-0">
                        🔍 PENDING
                      </span>
                    </div>
                    
                    {/* Priority Badge */}
                    <div>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide inline-block ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority?.toUpperCase() || 'NORMAL'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="px-4 py-3">
                    <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2">
                      {announcement.title}
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed mb-4">
                      {announcement.content}
                    </p>
                    
                    {/* Moderation Details Card */}
                    {announcement.moderationResult && (
                      <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4 mb-4">
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
                  </div>
                  
                  {/* Admin Actions */}
                  <div className="px-4 py-3 border-t border-amber-100 bg-amber-50 flex gap-2">
                    <button
                      onClick={() => handleReject(announcement.id)}
                      className="flex-1 px-4 py-2.5 text-sm font-bold text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-all"
                    >
                      ✗ Reject
                    </button>
                    <button
                      onClick={() => handleApprove(announcement.id)}
                      className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-all"
                    >
                      ✓ Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Create Announcement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">Create Announcement</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({ title: '', content: '', priority: PRIORITY_LEVELS.NORMAL, targetTags: [] })
                  setMediaFiles([])
                  setMediaPreview([])
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Post Creator Card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  {/* User Header */}
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {userProfile?.givenName?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{userProfile?.givenName} {userProfile?.lastName}</p>
                      <p className="text-xs text-gray-500">{ROLE_DISPLAY_NAMES[userProfile?.role]}</p>
                    </div>
                  </div>
                  
                  {/* Title Input */}
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="What's the announcement about?"
                    className="w-full px-0 py-2 text-2xl font-bold text-gray-900 placeholder-gray-400 bg-transparent border-0 focus:outline-none resize-none mb-3"
                    required
                  />
                  
                  {/* Main Content Input */}
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Share the details of your announcement..."
                    rows={5}
                    className="w-full px-0 py-3 text-base text-gray-900 placeholder-gray-500 bg-transparent border-0 focus:outline-none resize-none"
                    required
                  />
                  
                  {/* Media Previews */}
                  {mediaPreview.length > 0 && (
                    <div className="mt-4 -mx-6 px-6">
                      <div className="grid grid-cols-2 gap-3">
                        {mediaPreview.map((media, idx) => (
                          <div key={idx} className="relative group rounded-lg overflow-hidden bg-gray-100">
                            <div className="aspect-square">
                              {media.type === 'image' ? (
                                <img src={media.url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-400">
                                  <svg className="w-10 h-10 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeMedia(idx)}
                              className="absolute top-2 right-2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Action Bar */}
                  <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                    />
                    
                    {/* Icon Buttons */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-all group"
                    >
                      <svg className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                      </svg>
                      <span className="hidden sm:inline">Photo/Video</span>
                    </button>
                    
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-all bg-transparent border-0 cursor-pointer text-center"
                    >
                      <option value={PRIORITY_LEVELS.LOW}>📍 Low</option>
                      <option value={PRIORITY_LEVELS.NORMAL}>📌 Normal</option>
                      <option value={PRIORITY_LEVELS.URGENT}>🔴 Urgent</option>
                    </select>
                  </div>
                  
                  {/* Audience Targeting Note */}
                  {formData.targetTags.length === 0 ? (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <p className="text-xs text-blue-900"><span className="font-semibold">ℹ️ Note:</span> If you don't select a target audience, your announcement will reach all campus users.</p>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Targeting {formData.targetTags.length} organization{formData.targetTags.length !== 1 ? 's' : ''}:</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.targetTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-semibold hover:bg-green-200 transition-all flex items-center gap-1"
                          >
                            {tag}
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Moderation Notice */}
                  {!skipReviewQueue && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-900"><span className="font-semibold">⚠️ Content Review:</span> Your post will be reviewed before publishing.</p>
                    </div>
                  )}
                  
                  {/* Submit Button */}
                  <div className="flex gap-3 mt-4 pt-3 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false)
                        setFormData({ title: '', content: '', priority: PRIORITY_LEVELS.NORMAL, targetTags: [] })
                        setMediaFiles([])
                        setMediaPreview([])
                      }}
                      className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {skipReviewQueue ? 'Publishing...' : 'Submitting...'}
                        </>
                      ) : (
                        <>
                          {skipReviewQueue ? '✨ Publish' : '📤 Submit'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Organization Selector Modal - Collapsible */}
                {formData.targetTags.length !== undefined && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <p className="text-sm font-bold text-gray-900 mb-4">Select Target Audience (Optional)</p>
                    <div className="grid grid-cols-2 gap-2">
                      {organizations.map((org) => (
                        <button
                          key={org.name}
                          type="button"
                          onClick={() => toggleTag(org.name)}
                          className={`px-3 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 text-left ${
                            formData.targetTags.includes(org.name)
                              ? 'bg-green-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {org.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Old form hidden - keeping reference structure but replaced above */}
      {false && (
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
                    key={org.name}
                    type="button"
                    onClick={() => toggleTag(org.name)}
                    className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      formData.targetTags.includes(org.name)
                        ? 'bg-green-600 text-white shadow-md scale-105'
                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50'
                    }`}
                  >
                    {org.name}
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
      )}

      {/* Announcement Detail Modal - Facebook Style */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header - Compact Facebook Style */}
            <div className="sticky top-0 bg-green-600 text-white px-4 py-3 flex items-center justify-between z-10">
              <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${
                selectedAnnouncement.priority === PRIORITY_LEVELS.URGENT ? 'bg-red-500' :
                selectedAnnouncement.priority === PRIORITY_LEVELS.HIGH ? 'bg-orange-500' :
                selectedAnnouncement.priority === PRIORITY_LEVELS.NORMAL ? 'bg-blue-500' :
                'bg-gray-500'
              }`}>
                {selectedAnnouncement.priority?.toUpperCase() || 'NORMAL'}
              </span>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="divide-y divide-gray-200">
              {/* Post Header with Author */}
              <div className="px-4 py-3">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {selectedAnnouncement.authorName?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm">{selectedAnnouncement.authorName}</p>
                      <p className="text-xs text-gray-500">{ROLE_DISPLAY_NAMES[selectedAnnouncement.authorRole]}</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDate(selectedAnnouncement.createdAt)}
                </p>
              </div>
              
              {/* Content */}
              <div className="px-4 py-3">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{selectedAnnouncement.title}</h2>
                <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedAnnouncement.content}
                </div>
              </div>
              
              {/* Media Gallery - Full Width */}
              {selectedAnnouncement.media?.length > 0 && (
                <div className="bg-gray-100">
                  {selectedAnnouncement.media.length === 1 ? (
                    <div className="w-full max-h-96 overflow-hidden cursor-pointer" onClick={() => openMediaViewer(selectedAnnouncement.media[0], 0, selectedAnnouncement.media)}>
                      {selectedAnnouncement.media[0].type === 'image' ? (
                        <img src={selectedAnnouncement.media[0].url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full aspect-video flex items-center justify-center bg-gray-300">
                          <svg className="w-16 h-16 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1">
                      {selectedAnnouncement.media.map((media, idx) => (
                        <div 
                          key={idx} 
                          className="aspect-square overflow-hidden bg-gray-300 cursor-pointer group relative"
                          onClick={() => openMediaViewer(media, idx, selectedAnnouncement.media)}
                        >
                          {media.type === 'image' ? (
                            <img src={media.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-10 h-10 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          )}
                          {idx === 3 && selectedAnnouncement.media.length > 4 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center group-hover:bg-black/70 transition-colors">
                              <p className="text-white font-bold text-xl">+{selectedAnnouncement.media.length - 4}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Target Tags */}
              {selectedAnnouncement.targetTags?.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-xs font-bold text-gray-600 mb-2">👥 Targeted to {selectedAnnouncement.targetTags.length} organization{selectedAnnouncement.targetTags.length !== 1 ? 's' : ''}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAnnouncement.targetTags.map((tag, idx) => (
                      <span key={idx} className="px-2.5 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Comments Section */}
              <div className="px-4 py-3 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Comments ({comments.length})</h3>
                
                {/* Comment Input */}
                <form onSubmit={handleAddComment} className="mb-4">
                  <div className="flex gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {userProfile?.givenName?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Share your thoughts..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setCommentText('')}
                          className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingComment || !commentText.trim()}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all"
                        >
                          {submittingComment ? 'Posting...' : 'Post'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
                
                {/* Divider */}
                <div className="border-t border-gray-200 my-4"></div>
                
                {/* Comments List */}
                {loadingComments ? (
                  <div className="text-center py-8">
                    <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs text-gray-500">Loading comments...</p>
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-8">No comments yet. Be the first to share your thoughts!</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {comment.authorName?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-gray-100 rounded-lg px-3 py-2">
                            <p className="text-sm font-semibold text-gray-900">{comment.authorName}</p>
                            <p className="text-sm text-gray-700 mt-0.5">{comment.content}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(comment.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Admin Actions */}
              {canModerate && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => openEditModal(selectedAnnouncement)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirm({ open: true, announcement: selectedAnnouncement })
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
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
                      key={org.name}
                      type="button"
                      onClick={() => toggleEditTag(org.name)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        editFormData.targetTags.includes(org.name)
                          ? 'bg-primary text-white'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {org.name}
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

      {/* Report Modal */}
      {reportModal.open && reportModal.announcement && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0a9 9 0 1 1 0-18 9 9 0 0 1 0 18z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Report Announcement</h3>
                <p className="text-sm text-gray-600 mt-1">Help us keep the community safe</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border-l-4 border-orange-500">
              <p className="text-sm font-bold text-gray-900 line-clamp-2">{reportModal.announcement.title}</p>
              <p className="text-xs text-gray-500 mt-2">by {reportModal.announcement.authorName}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-900 mb-2">Reason for Report</label>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Please describe why you're reporting this announcement (minimum 10 characters)..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">{reportReason.length} characters</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setReportModal({ open: false, announcement: null })
                  setReportReason('')
                }}
                disabled={reportSubmitting}
                className="flex-1 px-4 py-3 text-sm font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={reportSubmitting || reportReason.trim().length < 10}
                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reportSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </span>
                ) : (
                  'Submit Report'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
