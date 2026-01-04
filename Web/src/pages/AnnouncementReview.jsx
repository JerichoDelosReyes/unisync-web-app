/**
 * Announcement Review Page
 * 
 * Page for reviewing and approving/rejecting pending announcements.
 * Accessible to:
 * - Organization Presidents: Can review announcements from their org officers/members
 */

import { useState, useEffect } from 'react'
import { useAuth, ROLES, ROLE_DISPLAY_NAMES } from '../contexts/AuthContext'
import {
  subscribeToPendingAnnouncements,
  approveAnnouncement,
  rejectAnnouncement,
  ANNOUNCEMENT_STATUS,
  PRIORITY_LEVELS
} from '../services/announcementService'
import { createLog, LOG_CATEGORIES, LOG_ACTIONS } from '../services/logService'

// Import organization logos
import CSGLogo from '../assets/img/CSG-removebg-preview.png'
import BITSLogo from '../assets/img/BITS-removebg-preview.png'
import BMSLogo from '../assets/img/BMS-removebg-preview.png'
import CaviteCommLogo from '../assets/img/CAVITECOMMUNICATOR-removebg-preview.png'
import CHLSLogo from '../assets/img/CHTS-removebg-preview.png'
import CYLELogo from '../assets/img/CYLE-removebg-preview.png'
import CSCLogo from '../assets/img/CSC-removebg-preview.png'
import EDGELogo from '../assets/img/EDGE-removebg-preview.png'
import SikolohiyaLogo from '../assets/img/SIKOLOHIYA-removebg-preview.png'
import YOPALogo from '../assets/img/YOPA-removebg-preview.png'
import SinagTalaLogo from '../assets/img/SINAGTALA-removebg-preview.png'
import TheFlareLogo from '../assets/img/THE_FLARE-removebg-preview.png'
import HonorSocLogo from '../assets/img/HONORSOC-removebg-preview.png'

// Organization logo mapping
const ORG_LOGOS = {
  CSG: CSGLogo,
  BITS: BITSLogo,
  BMS: BMSLogo,
  CAVITECOMM: CaviteCommLogo,
  CHLS: CHLSLogo,
  CYLE: CYLELogo,
  CSC: CSCLogo,
  EDGE: EDGELogo,
  SIKOLOHIYA: SikolohiyaLogo,
  YOPA: YOPALogo,
  SINAGTALA: SinagTalaLogo,
  THEFLARE: TheFlareLogo,
  HONORSOC: HonorSocLogo
}

export default function AnnouncementReview() {
  const { user, userProfile, hasMinRole } = useAuth()
  
  const [pendingAnnouncements, setPendingAnnouncements] = useState([])
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState({ show: false, message: '', kind: 'info' })
  
  // Modal states
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [rejectModal, setRejectModal] = useState({ open: false, announcement: null })
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)
  
  // Check if user is an Org President
  const isOrgPresident = () => {
    if (!userProfile?.officerOf) return false
    return Object.values(userProfile.officerOf).some(org => org.canTagOfficers === true)
  }
  
  // Get the org codes where user is president
  const getPresidentOrgCodes = () => {
    if (!userProfile?.officerOf) return []
    return Object.entries(userProfile.officerOf)
      .filter(([_, org]) => org.canTagOfficers === true)
      .map(([code, _]) => code)
  }
  
  const isAdmin = hasMinRole(ROLES.ADMIN)
  const canReview = isOrgPresident() // Only Org Presidents can review
  
  // Show toast notification
  const showToast = (message, kind = 'info') => {
    setToast({ show: true, message, kind })
    setTimeout(() => setToast({ show: false, message: '', kind: 'info' }), 4000)
  }
  
  // Subscribe to pending announcements in real-time
  useEffect(() => {
    console.log('[AnnouncementReview] canReview:', canReview, 'isAdmin:', isAdmin, 'isOrgPresident:', isOrgPresident())
    
    if (!canReview) {
      console.log('[AnnouncementReview] User cannot review, skipping subscription')
      setLoading(false)
      return
    }
    
    setLoading(true)
    console.log('[AnnouncementReview] Setting up subscription...')
    
    const unsubscribe = subscribeToPendingAnnouncements(
      (announcements) => {
        console.log('[AnnouncementReview] Received', announcements.length, 'pending announcements:', announcements)
        setPendingAnnouncements(announcements)
        setLoading(false)
      },
      (error) => {
        console.error('[AnnouncementReview] Error subscribing to pending announcements:', error)
        setError('Failed to load pending announcements')
        showToast('Failed to load pending announcements', 'error')
        setLoading(false)
      }
    )
    
    // Cleanup subscription on unmount
    return () => {
      console.log('[AnnouncementReview] Cleaning up subscription')
      unsubscribe()
    }
  }, [canReview])
  
  // Filter announcements based on user's role
  useEffect(() => {
    console.log('[AnnouncementReview] Filtering', pendingAnnouncements.length, 'announcements')
    if (isOrgPresident()) {
      // Presidents only see their org's announcements
      const presidentOrgs = getPresidentOrgCodes()
      const filtered = pendingAnnouncements.filter(ann => {
        // Check if announcement is from their org
        const authorOrg = ann.author?.organizationContext?.orgCode
        return authorOrg && presidentOrgs.includes(authorOrg)
      })
      setFilteredAnnouncements(filtered)
    } else {
      setFilteredAnnouncements([])
    }
  }, [pendingAnnouncements, userProfile])
  
  // Handle approve
  const handleApprove = async (announcement) => {
    try {
      setProcessing(true)
      await approveAnnouncement(announcement.id, 'Approved by reviewer')
      
      // Log the action
      await createLog({
        category: LOG_CATEGORIES.ANNOUNCEMENTS,
        action: LOG_ACTIONS.ANNOUNCEMENT_APPROVE,
        performedBy: {
          uid: user.uid,
          email: user.email,
          name: `${userProfile.givenName} ${userProfile.lastName}`
        },
        details: {
          announcementId: announcement.id,
          title: announcement.title,
          authorId: announcement.authorId,
          authorName: announcement.authorName
        },
        description: `Approved announcement: "${announcement.title}" by ${announcement.authorName}`
      })
      
      showToast('Announcement approved successfully!', 'success')
      // No need to manually update state - real-time subscription handles it
      setSelectedAnnouncement(null)
    } catch (err) {
      console.error('Error approving announcement:', err)
      showToast('Failed to approve announcement', 'error')
    } finally {
      setProcessing(false)
    }
  }
  
  // Handle reject
  const handleReject = async () => {
    if (!rejectModal.announcement) return
    
    try {
      setProcessing(true)
      await rejectAnnouncement(rejectModal.announcement.id, rejectionReason)
      
      // Log the action
      await createLog({
        category: LOG_CATEGORIES.ANNOUNCEMENTS,
        action: LOG_ACTIONS.ANNOUNCEMENT_REJECT,
        performedBy: {
          uid: user.uid,
          email: user.email,
          name: `${userProfile.givenName} ${userProfile.lastName}`
        },
        details: {
          announcementId: rejectModal.announcement.id,
          title: rejectModal.announcement.title,
          authorId: rejectModal.announcement.authorId,
          authorName: rejectModal.announcement.authorName,
          rejectionReason
        },
        description: `Rejected announcement: "${rejectModal.announcement.title}" by ${rejectModal.announcement.authorName}`
      })
      
      showToast('Announcement rejected', 'info')
      // No need to manually update state - real-time subscription handles it
      setRejectModal({ open: false, announcement: null })
      setRejectionReason('')
      setSelectedAnnouncement(null)
    } catch (err) {
      console.error('Error rejecting announcement:', err)
      showToast('Failed to reject announcement', 'error')
    } finally {
      setProcessing(false)
    }
  }
  
  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }
  
  // Get priority badge color
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case PRIORITY_LEVELS.URGENT:
        return 'bg-red-100 text-red-700 border-red-200'
      case PRIORITY_LEVELS.HIGH:
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case PRIORITY_LEVELS.NORMAL:
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case PRIORITY_LEVELS.LOW:
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }
  
  // Get org logo
  const getOrgLogo = (orgCode) => {
    return ORG_LOGOS[orgCode?.toUpperCase()] || null
  }

  if (!canReview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to review announcements.</p>
          <p className="text-sm text-gray-500 mt-2">Only Admins and Organization Presidents can access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Announcement Review</h1>
            <p className="text-gray-600 text-sm">
              {isAdmin ? 'Review all pending announcements' : 'Review announcements from your organization'}
            </p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="mt-4 flex items-center gap-4">
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-2xl font-bold text-amber-600">{filteredAnnouncements.length}</span>
            <span className="text-sm text-amber-700 ml-2">Pending Review</span>
          </div>
          
          {isOrgPresident() && !isAdmin && (
            <div className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              <span className="font-medium">Your Orgs:</span> {getPresidentOrgCodes().join(', ')}
            </div>
          )}
        </div>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            <p className="text-gray-600">Loading pending announcements...</p>
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {!loading && filteredAnnouncements.length === 0 && (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">All Caught Up!</h2>
          <p className="text-gray-600">No announcements pending review.</p>
        </div>
      )}
      
      {/* Announcements List */}
      {!loading && filteredAnnouncements.length > 0 && (
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Author Avatar/Org Logo */}
                    <div className="flex-shrink-0">
                      {announcement.author?.organizationContext ? (
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                          {getOrgLogo(announcement.author.organizationContext.orgCode) ? (
                            <img 
                              src={getOrgLogo(announcement.author.organizationContext.orgCode)} 
                              alt={announcement.author.organizationContext.orgName}
                              className="w-10 h-10 object-contain"
                            />
                          ) : (
                            <span className="text-lg font-bold text-gray-600">
                              {announcement.author.organizationContext.orgCode?.charAt(0)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold">
                          {announcement.authorName?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    
                    {/* Author Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-lg truncate">{announcement.title}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-sm text-gray-700">{announcement.authorName}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {ROLE_DISPLAY_NAMES[announcement.authorRole] || announcement.authorRole}
                        </span>
                        {announcement.author?.organizationContext && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                              {announcement.author.organizationContext.orgName}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(announcement.createdAt)}</p>
                    </div>
                  </div>
                  
                  {/* Priority Badge */}
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getPriorityBadge(announcement.priority)}`}>
                    {announcement.priority?.toUpperCase() || 'NORMAL'}
                  </span>
                </div>
              </div>
              
              {/* Content Preview */}
              <div className="p-5 bg-gray-50">
                <p className="text-gray-700 text-sm whitespace-pre-wrap line-clamp-4">
                  {announcement.content}
                </p>
                
                {/* Flagged Words Warning */}
                {announcement.moderationResult?.flaggedWords?.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-xs font-semibold text-amber-800">Flagged Content:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {announcement.moderationResult.flaggedWords.map((item, idx) => (
                        <span key={idx} className="px-2 py-1 text-xs font-medium bg-amber-200 text-amber-900 rounded">
                          {typeof item === 'string' ? item : item.word}
                        </span>
                      ))}
                    </div>
                    {announcement.moderationResult.approvalReason && (
                      <p className="text-xs text-amber-700 mt-2">{announcement.moderationResult.approvalReason}</p>
                    )}
                  </div>
                )}
                
                {/* Media Preview */}
                {announcement.media?.length > 0 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto">
                    {announcement.media.slice(0, 4).map((media, idx) => (
                      <div key={idx} className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-200">
                        {media.type === 'image' ? (
                          <img src={media.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-300">
                            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                    {announcement.media.length > 4 && (
                      <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-600">+{announcement.media.length - 4}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedAnnouncement(announcement)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  View Full
                </button>
                <button
                  onClick={() => setRejectModal({ open: true, announcement })}
                  disabled={processing}
                  className="px-4 py-2 text-sm font-bold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(announcement)}
                  disabled={processing}
                  className="px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Approve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* View Full Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Announcement Details</h2>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedAnnouncement.title}</h3>
              
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-sm text-gray-700">{selectedAnnouncement.authorName}</span>
                <span className="text-gray-300">•</span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                  {ROLE_DISPLAY_NAMES[selectedAnnouncement.authorRole] || selectedAnnouncement.authorRole}
                </span>
                {selectedAnnouncement.author?.organizationContext && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                      {selectedAnnouncement.author.organizationContext.orgName}
                    </span>
                  </>
                )}
                <span className="text-gray-300">•</span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getPriorityBadge(selectedAnnouncement.priority)}`}>
                  {selectedAnnouncement.priority?.toUpperCase() || 'NORMAL'}
                </span>
              </div>
              
              <p className="text-xs text-gray-500 mb-6">{formatDate(selectedAnnouncement.createdAt)}</p>
              
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{selectedAnnouncement.content}</p>
              </div>
              
              {/* Flagged Words */}
              {selectedAnnouncement.moderationResult?.flaggedWords?.length > 0 && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-semibold text-amber-800">Content Flagged for Review</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedAnnouncement.moderationResult.flaggedWords.map((item, idx) => (
                      <span key={idx} className="px-3 py-1.5 text-sm font-medium bg-amber-200 text-amber-900 rounded-lg">
                        {typeof item === 'string' ? item : item.word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Media */}
              {selectedAnnouncement.media?.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Attached Media ({selectedAnnouncement.media.length})</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedAnnouncement.media.map((media, idx) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                        {media.type === 'image' ? (
                          <img src={media.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={media.url} className="w-full h-full object-cover" controls />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Target Tags */}
              {selectedAnnouncement.targetTags?.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Target Audience</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAnnouncement.targetTags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setRejectModal({ open: true, announcement: selectedAnnouncement })
                }}
                disabled={processing}
                className="px-5 py-2.5 text-sm font-bold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => handleApprove(selectedAnnouncement)}
                disabled={processing}
                className="px-5 py-2.5 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Reject Announcement</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Title:</strong> {rejectModal.announcement?.title}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Author:</strong> {rejectModal.announcement?.authorName}
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for Rejection (optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this announcement is being rejected..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows={3}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectModal({ open: false, announcement: null })
                  setRejectionReason('')
                }}
                className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg animate-in slide-in-from-bottom-5 ${
          toast.kind === 'success' ? 'bg-green-600 text-white' :
          toast.kind === 'error' ? 'bg-red-600 text-white' :
          'bg-gray-800 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {toast.kind === 'success' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.kind === 'error' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}
