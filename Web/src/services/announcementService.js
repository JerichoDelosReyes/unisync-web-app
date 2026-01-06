/**
 * Announcement Service
 * 
 * Handles CRUD operations for announcements with:
 * - Media uploads (photos/videos) to Firebase Storage
 * - Tag-based visibility filtering with sophisticated audience targeting
 * - Moderation integration
 * - Priority levels
 */

import { db, storage } from '../config/firebase'
import { matchesTargetAudience } from '../constants/targeting'
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  increment,
  arrayUnion,
  arrayRemove,
  onSnapshot
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage'
import { moderateContent, addModerationFeedback } from './moderationService'
import { 
  notifyAnnouncementApproved, 
  notifyAnnouncementRejected,
  notifyUrgentAnnouncement,
  notifyAnnouncementReaction,
  notifyAnnouncementComment
} from './notificationService'

// Collection name
const COLLECTION_NAME = 'announcements'

// Announcement statuses
export const ANNOUNCEMENT_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived'
}

// Priority levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
}

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// Profanity warning threshold for auto-rejection
const PROFANITY_WARNING_THRESHOLD = 3

/**
 * Get user's profanity warning count
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Current warning count
 */
export const getUserProfanityWarnings = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)
    
    if (userSnap.exists()) {
      return userSnap.data().profanityWarningCount || 0
    }
    return 0
  } catch (error) {
    console.error('Error getting profanity warnings:', error)
    return 0
  }
}

/**
 * Increment user's profanity warning count
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Updated warning count
 */
export const incrementProfanityWarning = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      profanityWarningCount: increment(1),
      lastProfanityWarning: serverTimestamp()
    })
    
    // Return updated count
    const userSnap = await getDoc(userRef)
    return userSnap.data().profanityWarningCount || 1
  } catch (error) {
    console.error('Error incrementing profanity warning:', error)
    return 0
  }
}

/**
 * Check if user should be auto-rejected for profanity
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if user has reached warning threshold
 */
export const shouldAutoRejectForProfanity = async (userId) => {
  const warningCount = await getUserProfanityWarnings(userId)
  return warningCount >= PROFANITY_WARNING_THRESHOLD
}

/**
 * Validate a media file
 */
const validateMediaFile = (file) => {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)
  
  if (!isImage && !isVideo) {
    throw new Error(`Invalid file type: ${file.type}. Allowed: images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, MOV)`)
  }
  
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: 50MB`)
  }
  
  return { isImage, isVideo }
}

/**
 * Upload a media file to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} announcementId - The announcement ID for folder structure
 * @returns {Promise<object>} - { url, path, type, name, size }
 */
export const uploadMedia = async (file, announcementId) => {
  try {
    const { isImage, isVideo } = validateMediaFile(file)
    
    // Create unique filename
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `announcements/${announcementId}/${timestamp}_${safeName}`
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, filePath)
    const snapshot = await uploadBytes(storageRef, file)
    const url = await getDownloadURL(snapshot.ref)
    
    return {
      url,
      path: filePath,
      type: isImage ? 'image' : 'video',
      mimeType: file.type,
      name: file.name,
      size: file.size
    }
  } catch (error) {
    console.error('Error uploading media:', error)
    throw error
  }
}

/**
 * Upload multiple media files
 * @param {FileList|Array} files - Files to upload
 * @param {string} announcementId - The announcement ID
 * @returns {Promise<Array>} - Array of media objects
 */
export const uploadMultipleMedia = async (files, announcementId) => {
  const uploads = Array.from(files).map(file => uploadMedia(file, announcementId))
  return Promise.all(uploads)
}

/**
 * Delete a media file from Firebase Storage
 * @param {string} filePath - The storage path
 */
export const deleteMedia = async (filePath) => {
  try {
    const storageRef = ref(storage, filePath)
    await deleteObject(storageRef)
  } catch (error) {
    console.error('Error deleting media:', error)
    // Don't throw - file might already be deleted
  }
}

/**
 * Create a new announcement
 * @param {object} data - Announcement data
 * @param {Array} files - Media files to upload
 * @param {object} author - Author info { uid, name, role }
 * @param {boolean} skipReviewQueue - If true, force approve (for Admin+, Faculty who confirmed warning, Org Presidents)
 * @returns {Promise<object>} - Created announcement with moderation result
 */
export const createAnnouncement = async (data, files = [], author, skipReviewQueue = false) => {
  try {
    // Check if user has reached profanity warning threshold (auto-reject)
    const userWarnings = await getUserProfanityWarnings(author.uid)
    const isUserBlocked = userWarnings >= PROFANITY_WARNING_THRESHOLD
    
    // ALWAYS run moderation check - profanity should be caught for ALL users
    const result = moderateContent(data.title, data.content)
    
    const moderationResult = {
      approved: result.approved ?? true,
      status: result.status || 'approved',
      confidence: result.confidence ?? 1.0,
      category: result.category || 'safe',
      filterType: result.filterType || 'none',
      flaggedWords: result.flaggedWords || []
    }
    
    // Determine initial status based on moderation result and skipReviewQueue flag
    let status
    const hasProfanity = moderationResult.status === 'rejected' || moderationResult.filterType === 'profanity'
    
    // AUTO-REJECT: If user has 3+ profanity warnings, automatically reject any new announcements
    if (isUserBlocked) {
      status = ANNOUNCEMENT_STATUS.REJECTED
      moderationResult.autoRejected = true
      moderationResult.rejectionReason = `User has ${userWarnings} profanity warnings. Announcements are auto-rejected until reviewed by admin.`
    }
    // INCREMENT WARNING: If content has profanity, increment user's warning count
    else if (hasProfanity) {
      const newWarningCount = await incrementProfanityWarning(author.uid)
      moderationResult.profanityWarningNumber = newWarningCount
      
      // Check if this warning pushes them over the threshold
      if (newWarningCount >= PROFANITY_WARNING_THRESHOLD) {
        status = ANNOUNCEMENT_STATUS.REJECTED
        moderationResult.autoRejected = true
        moderationResult.rejectionReason = `This is warning ${newWarningCount}. Future announcements will be auto-rejected.`
      } else if (skipReviewQueue) {
        // Force approve - user has authority (Faculty/President confirmed warning)
        status = ANNOUNCEMENT_STATUS.APPROVED
        moderationResult.warningsRemaining = PROFANITY_WARNING_THRESHOLD - newWarningCount
      } else {
        // Route to pending review
        status = ANNOUNCEMENT_STATUS.PENDING_REVIEW
        moderationResult.requiresApproval = true
        moderationResult.approvalReason = `Content flagged for review (Warning ${newWarningCount}/${PROFANITY_WARNING_THRESHOLD})`
        moderationResult.warningsRemaining = PROFANITY_WARNING_THRESHOLD - newWarningCount
      }
    }
    // NEW ROLE-BASED LOGIC:
    // 1. skipReviewQueue = true: Force approve (Faculty/President confirmed warning, or Admin)
    // 2. skipReviewQueue = false + profanity: Route to pending review (Class Rep/non-President officers)
    // 3. No profanity: Approve
    else if (skipReviewQueue) {
      // Force approve - user has authority (Admin, Faculty who confirmed, Org President who confirmed)
      status = ANNOUNCEMENT_STATUS.APPROVED
    } else if (moderationResult.status === 'approved') {
      status = ANNOUNCEMENT_STATUS.APPROVED
    } else if (moderationResult.status === 'pending_review') {
      status = ANNOUNCEMENT_STATUS.PENDING_REVIEW
    } else {
      status = ANNOUNCEMENT_STATUS.APPROVED
    }
    
    // Create announcement document first (need ID for media upload)
    const announcementData = {
      title: data.title,
      content: data.content,
      priority: data.priority || PRIORITY_LEVELS.NORMAL,
      targetTags: data.targetTags || [], // Empty = campus-wide
      authorId: author.uid,
      authorName: author.name,
      authorRole: author.role,
      authorPhotoURL: author.photoURL || null,
      // Store the full author object with organization/section context
      author: {
        uid: author.uid,
        name: author.name,
        role: author.role,
        photoURL: author.photoURL || null,
        ...(author.organizationContext && { organizationContext: author.organizationContext }),
        ...(author.sectionContext && { sectionContext: author.sectionContext })
      },
      status,
      moderationResult: {
        confidence: moderationResult.confidence ?? 1.0,
        category: moderationResult.category || 'safe',
        filterType: moderationResult.filterType || 'none',
        flaggedWords: moderationResult.flaggedWords || [],
        requiresApproval: moderationResult.requiresApproval || false,
        approvalReason: moderationResult.approvalReason || null
      },
      media: [],
      viewCount: 0,
      reactions: {
        '👍': 0
      },
      scheduledAt: data.scheduledAt ? Timestamp.fromDate(new Date(data.scheduledAt)) : null,
      expiresAt: data.expiresAt ? Timestamp.fromDate(new Date(data.expiresAt)) : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), announcementData)
    const announcementId = docRef.id
    
    // Upload media files if any
    let mediaItems = []
    if (files && files.length > 0) {
      mediaItems = await uploadMultipleMedia(files, announcementId)
      
      // Update announcement with media
      await updateDoc(doc(db, COLLECTION_NAME, announcementId), {
        media: mediaItems,
        updatedAt: serverTimestamp()
      })
    }

    // Send urgent announcement notifications if approved and urgent
    if (status === ANNOUNCEMENT_STATUS.APPROVED && data.priority === PRIORITY_LEVELS.URGENT) {
      try {
        // Get all users to notify (for urgent announcements, notify everyone)
        const usersSnapshot = await getDocs(collection(db, 'users'))
        const userIds = usersSnapshot.docs
          .map(doc => doc.id)
          .filter(uid => uid !== author.uid) // Don't notify the author
        
        if (userIds.length > 0) {
          await notifyUrgentAnnouncement(userIds, {
            id: announcementId,
            title: data.title,
            authorName: author.name
          })
        }
      } catch (notifyError) {
        console.error('Error sending urgent announcement notifications:', notifyError)
        // Don't fail the announcement creation if notifications fail
      }
    }
    
    return {
      id: announcementId,
      ...announcementData,
      media: mediaItems,
      moderationResult
    }
  } catch (error) {
    console.error('Error creating announcement:', error)
    throw error
  }
}

/**
 * Get a single announcement by ID
 */
export const getAnnouncement = async (announcementId) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, announcementId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() }
    }
    return null
  } catch (error) {
    console.error('Error getting announcement:', error)
    throw error
  }
}

/**
 * Get announcements visible to a user based on their tags
 * @param {Array} userTags - User's tags
 * @param {object} options - { status, priority, limit, userId }
 */
export const getAnnouncementsForUser = async (userTags = [], options = {}) => {
  try {
    // Simple query - filter by status only
    // We sort client-side to avoid composite index issues
    const statusFilter = options.status || ANNOUNCEMENT_STATUS.APPROVED
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', statusFilter)
    )
    const querySnapshot = await getDocs(q)
    
    // Filter by tags on client side using sophisticated matching logic
    let announcements = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(announcement => {
        // Authors can always see their own announcements
        if (options.userId && announcement.authorId === options.userId) {
          return true
        }
        // Campus-wide announcements (no target tags) are visible to everyone
        if (!announcement.targetTags || announcement.targetTags.length === 0) {
          return true
        }
        // Use sophisticated matching logic for targeted announcements
        // This supports the new tag format: dept:DCS, program:CS, year:3, section:3-E, org:CSG
        return matchesTargetAudience(userTags, announcement.targetTags)
      })
    
    // Fetch comments count for each announcement
    announcements = await Promise.all(
      announcements.map(async (announcement) => {
        try {
          const commentsRef = collection(db, COLLECTION_NAME, announcement.id, 'comments')
          const commentsSnapshot = await getDocs(commentsRef)
          return {
            ...announcement,
            comments: commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          }
        } catch (error) {
          console.error('Error fetching comments for announcement:', announcement.id, error)
          return { ...announcement, comments: [] }
        }
      })
    )
    
    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 }
    announcements.sort((a, b) => {
      const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
      if (priorityDiff !== 0) return priorityDiff
      // Same priority: sort by date
      const dateA = a.createdAt?.toDate?.() || new Date(0)
      const dateB = b.createdAt?.toDate?.() || new Date(0)
      return dateB - dateA
    })
    
    return announcements
  } catch (error) {
    console.error('Error getting announcements:', error)
    throw error
  }
}

/**
 * Get all announcements (for admins)
 */
export const getAllAnnouncements = async (options = {}) => {
  try {
    let q
    
    // Simple query to avoid composite index requirements
    // Sort client-side instead
    if (options.status) {
      q = query(
        collection(db, COLLECTION_NAME),
        where('status', '==', options.status)
      )
    } else {
      q = query(collection(db, COLLECTION_NAME))
    }
    
    const querySnapshot = await getDocs(q)
    
    // Sort by createdAt client-side
    const announcements = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    announcements.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0)
      const dateB = b.createdAt?.toDate?.() || new Date(0)
      return dateB - dateA
    })
    
    // Apply limit if needed
    if (options.limit) {
      return announcements.slice(0, options.limit)
    }
    
    return announcements
  } catch (error) {
    console.error('Error getting all announcements:', error)
    throw error
  }
}

/**
 * Get pending announcements for moderation queue
 */
export const getPendingAnnouncements = async () => {
  return getAllAnnouncements({ status: ANNOUNCEMENT_STATUS.PENDING_REVIEW })
}

/**
 * Subscribe to pending announcements in real-time
 * @param {Function} callback - Called with array of pending announcements on each update
 * @param {Function} onError - Called if an error occurs
 * @returns {Function} Unsubscribe function
 */
export const subscribeToPendingAnnouncements = (callback, onError) => {
  try {
    // Simple query without orderBy to avoid composite index requirement
    // We'll sort client-side instead
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', ANNOUNCEMENT_STATUS.PENDING_REVIEW)
    )
    
    console.log('[AnnouncementService] Setting up pending announcements subscription...')
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('[AnnouncementService] Received snapshot with', snapshot.docs.length, 'pending announcements')
        const announcements = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        // Sort client-side by createdAt descending
        announcements.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0
          const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0
          return bTime - aTime
        })
        callback(announcements)
      },
      (error) => {
        console.error('[AnnouncementService] Error in pending announcements subscription:', error)
        if (onError) onError(error)
      }
    )
    
    return unsubscribe
  } catch (error) {
    console.error('[AnnouncementService] Error setting up pending announcements subscription:', error)
    if (onError) onError(error)
    return () => {} // Return empty unsubscribe function
  }
}

/**
 * Update an announcement
 */
export const updateAnnouncement = async (announcementId, data, newFiles = []) => {
  try {
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }
    
    // Upload new media if any
    if (newFiles && newFiles.length > 0) {
      const newMedia = await uploadMultipleMedia(newFiles, announcementId)
      const existingMedia = data.media || []
      updateData.media = [...existingMedia, ...newMedia]
    }
    
    await updateDoc(doc(db, COLLECTION_NAME, announcementId), updateData)
    
    return { id: announcementId, ...updateData }
  } catch (error) {
    console.error('Error updating announcement:', error)
    throw error
  }
}

/**
 * Approve a pending announcement
 * @param {string} announcementId - Announcement ID
 * @param {string} reviewerNote - Optional note from reviewer
 */
export const approveAnnouncement = async (announcementId, reviewerNote = '') => {
  try {
    // Get the announcement first
    const announcement = await getAnnouncement(announcementId)
    if (!announcement) throw new Error('Announcement not found')
    
    // Add feedback to improve the classifier
    addModerationFeedback(`${announcement.title} ${announcement.content}`, true)
    
    await updateDoc(doc(db, COLLECTION_NAME, announcementId), {
      status: ANNOUNCEMENT_STATUS.APPROVED,
      reviewerNote,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    // Notify the author that their announcement was approved
    try {
      await notifyAnnouncementApproved(announcement.authorId, {
        id: announcementId,
        title: announcement.title
      })
    } catch (notifyError) {
      console.error('Error sending approval notification:', notifyError)
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error approving announcement:', error)
    throw error
  }
}

/**
 * Reject a pending announcement
 * @param {string} announcementId - Announcement ID
 * @param {string} rejectionReason - Reason for rejection
 */
export const rejectAnnouncement = async (announcementId, rejectionReason = '') => {
  try {
    // Get the announcement first
    const announcement = await getAnnouncement(announcementId)
    if (!announcement) throw new Error('Announcement not found')
    
    // Add feedback to improve the classifier
    addModerationFeedback(`${announcement.title} ${announcement.content}`, false)
    
    await updateDoc(doc(db, COLLECTION_NAME, announcementId), {
      status: ANNOUNCEMENT_STATUS.REJECTED,
      rejectionReason,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    // Notify the author that their announcement was rejected
    try {
      await notifyAnnouncementRejected(announcement.authorId, {
        id: announcementId,
        title: announcement.title
      }, rejectionReason)
    } catch (notifyError) {
      console.error('Error sending rejection notification:', notifyError)
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error rejecting announcement:', error)
    throw error
  }
}

/**
 * Archive an announcement
 */
export const archiveAnnouncement = async (announcementId) => {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, announcementId), {
      status: ANNOUNCEMENT_STATUS.ARCHIVED,
      updatedAt: serverTimestamp()
    })
    return { success: true }
  } catch (error) {
    console.error('Error archiving announcement:', error)
    throw error
  }
}

/**
 * Delete an announcement and its media and comments permanently
 */
export const deleteAnnouncement = async (announcementId) => {
  try {
    // Get announcement to delete media
    const announcement = await getAnnouncement(announcementId)
    
    if (announcement?.media) {
      // Delete all media files from storage
      await Promise.all(announcement.media.map(m => deleteMedia(m.path)))
    }
    
    // Delete all comments in the subcollection
    const commentsRef = collection(db, COLLECTION_NAME, announcementId, 'comments')
    const commentsSnapshot = await getDocs(commentsRef)
    const deleteCommentsPromises = commentsSnapshot.docs.map(commentDoc => 
      deleteDoc(doc(db, COLLECTION_NAME, announcementId, 'comments', commentDoc.id))
    )
    await Promise.all(deleteCommentsPromises)
    
    // Delete the announcement document permanently
    await deleteDoc(doc(db, COLLECTION_NAME, announcementId))
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting announcement:', error)
    throw error
  }
}

/**
 * Remove a specific media item from an announcement
 */
export const removeMediaFromAnnouncement = async (announcementId, mediaPath) => {
  try {
    // Delete from storage
    await deleteMedia(mediaPath)
    
    // Update announcement
    const announcement = await getAnnouncement(announcementId)
    const updatedMedia = (announcement.media || []).filter(m => m.path !== mediaPath)
    
    await updateDoc(doc(db, COLLECTION_NAME, announcementId), {
      media: updatedMedia,
      updatedAt: serverTimestamp()
    })
    
    return { success: true }
  } catch (error) {
    console.error('Error removing media:', error)
    throw error
  }
}

/**
 * Increment view count
 */
export const incrementViewCount = async (announcementId) => {
  try {
    const announcement = await getAnnouncement(announcementId)
    if (announcement) {
      await updateDoc(doc(db, COLLECTION_NAME, announcementId), {
        viewCount: (announcement.viewCount || 0) + 1
      })
    }
  } catch (error) {
    console.error('Error incrementing view count:', error)
    // Don't throw - this is not critical
  }
}

// ==================== REACTIONS ====================

/**
 * Available reactions
 */
export const REACTIONS = {
  LIKE: '👍',
  LOVE: '❤️',
  HAHA: '😂',
  WOW: '😮',
  SAD: '😢',
  ANGRY: '😡'
}

/**
 * Toggle a reaction on an announcement
 * @param {string} announcementId - Announcement ID
 * @param {string} reactionType - One of REACTIONS keys
 * @param {object} user - User info { uid, name }
 */
export const toggleReaction = async (announcementId, reactionType, user) => {
  try {
    const announcementRef = doc(db, COLLECTION_NAME, announcementId)
    const announcement = await getAnnouncement(announcementId)
    
    if (!announcement) throw new Error('Announcement not found')
    
    // Get current reactions structure
    const reactions = announcement.reactions || {}
    const reactionKey = reactionType.toLowerCase()
    const currentReactionUsers = reactions[reactionKey] || []
    
    // Check if user already reacted with this type
    const existingReactionIndex = currentReactionUsers.findIndex(r => r.uid === user.uid)
    
    let updatedReactions = { ...reactions }
    let isAddingReaction = false
    
    if (existingReactionIndex >= 0) {
      // Remove reaction
      updatedReactions[reactionKey] = currentReactionUsers.filter(r => r.uid !== user.uid)
      // Clean up empty reaction types
      if (updatedReactions[reactionKey].length === 0) {
        delete updatedReactions[reactionKey]
      }
    } else {
      // Remove user from all other reactions first
      for (const key of Object.keys(updatedReactions)) {
        updatedReactions[key] = (updatedReactions[key] || []).filter(r => r.uid !== user.uid)
        // Clean up empty reaction types
        if (updatedReactions[key].length === 0) {
          delete updatedReactions[key]
        }
      }
      // Add new reaction
      updatedReactions[reactionKey] = [...(updatedReactions[reactionKey] || []), { 
        uid: user.uid, 
        name: user.displayName || user.name || 'Unknown' 
      }]
      isAddingReaction = true
    }
    
    await updateDoc(announcementRef, {
      reactions: updatedReactions,
      updatedAt: serverTimestamp()
    })

    // Notify announcement author about new reaction (only when adding, not removing)
    if (isAddingReaction && announcement.authorId !== user.uid) {
      try {
        await notifyAnnouncementReaction(announcement.authorId, {
          announcementId,
          announcementTitle: announcement.title,
          reactorId: user.uid,
          reactorName: user.displayName || user.name || 'Someone',
          reactionType: reactionKey,
          reactionEmoji: REACTIONS[reactionType.toUpperCase()] || '👍'
        })
      } catch (notifyError) {
        console.error('Error sending reaction notification:', notifyError)
      }
    }
    
    return {
      reactions: updatedReactions,
      success: true
    }
  } catch (error) {
    console.error('Error toggling reaction:', error)
    throw error
  }
}

/**
 * Get reaction counts for an announcement
 */
export const getReactionCounts = (reactions) => {
  const counts = {}
  let total = 0
  
  for (const [key, users] of Object.entries(reactions || {})) {
    counts[key] = users.length
    total += users.length
  }
  
  return { counts, total }
}

// ==================== COMMENTS ====================

/**
 * Comment statuses
 */
export const COMMENT_STATUS = {
  APPROVED: 'approved',
  PENDING_REVIEW: 'pending_review',
  REJECTED: 'rejected',
  DELETED: 'deleted'
}

/**
 * Add a comment to an announcement
 * @param {string} announcementId - Announcement ID
 * @param {string} content - Comment text
 * @param {object} author - Author info { uid, name, role }
 * @param {string} parentId - Parent comment ID for replies (optional)
 * @param {boolean} skipReviewQueue - Skip moderation queue for admins
 */
export const addComment = async (announcementId, content, author, parentId = null, skipReviewQueue = false) => {
  try {
    // Run moderation on comment
    const moderationResult = moderateContent('', content)
    
    // Determine status based on moderation
    let status
    if (moderationResult.status === 'rejected' || moderationResult.filterType === 'profanity') {
      status = COMMENT_STATUS.REJECTED
    } else if (moderationResult.status === 'approved' || skipReviewQueue) {
      status = COMMENT_STATUS.APPROVED
    } else {
      status = COMMENT_STATUS.PENDING_REVIEW
    }
    
    const commentData = {
      announcementId,
      content,
      authorId: author.uid,
      authorName: author.name,
      authorRole: author.role,
      authorPhotoURL: author.photoURL || null,
      parentId,
      status,
      moderationResult: {
        confidence: moderationResult.confidence ?? 1.0,
        category: moderationResult.category || 'safe',
        filterType: moderationResult.filterType || 'none',
        flaggedWords: moderationResult.flaggedWords || []
      },
      likes: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    const commentsRef = collection(db, COLLECTION_NAME, announcementId, 'comments')
    const docRef = await addDoc(commentsRef, commentData)
    
    // Update comment count on announcement
    await updateDoc(doc(db, COLLECTION_NAME, announcementId), {
      commentCount: increment(1),
      updatedAt: serverTimestamp()
    })

    // Notify announcement author about new comment (only if approved)
    if (status === COMMENT_STATUS.APPROVED) {
      try {
        const announcement = await getAnnouncement(announcementId)
        if (announcement && announcement.authorId !== author.uid) {
          await notifyAnnouncementComment(announcement.authorId, {
            announcementId,
            commentId: docRef.id,
            announcementTitle: announcement.title,
            commenterId: author.uid,
            commenterName: author.name,
            commentContent: content
          })
        }
      } catch (notifyError) {
        console.error('Error sending comment notification:', notifyError)
      }
    }
    
    return {
      id: docRef.id,
      ...commentData,
      status,
      moderationResult
    }
  } catch (error) {
    console.error('Error adding comment:', error)
    throw error
  }
}

/**
 * Get comments for an announcement
 * Fetches latest user profile data to ensure profile pictures are current
 * @param {string} announcementId - Announcement ID
 * @param {boolean} includeAll - Include pending/rejected (for admins)
 */
export const getComments = async (announcementId, includeAll = false) => {
  try {
    const commentsRef = collection(db, COLLECTION_NAME, announcementId, 'comments')
    
    let q
    if (includeAll) {
      q = query(commentsRef)
    } else {
      q = query(commentsRef, where('status', '==', COMMENT_STATUS.APPROVED))
    }
    
    const snapshot = await getDocs(q)
    const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    // Fetch latest user profiles to get current profile pictures
    const uniqueAuthorIds = [...new Set(comments.map(c => c.authorId).filter(Boolean))]
    const userProfiles = {}
    
    // Batch fetch user profiles
    for (const authorId of uniqueAuthorIds) {
      try {
        const userDoc = await getDoc(doc(db, 'users', authorId))
        if (userDoc.exists()) {
          userProfiles[authorId] = userDoc.data()
        }
      } catch (err) {
        console.warn(`Could not fetch profile for user ${authorId}:`, err)
      }
    }
    
    // Update comments with latest profile data
    const commentsWithCurrentProfiles = comments.map(comment => {
      const profile = userProfiles[comment.authorId]
      if (profile) {
        return {
          ...comment,
          authorPhotoURL: profile.photoURL || null,
          authorName: profile.displayName || `${profile.givenName || ''} ${profile.lastName || ''}`.trim() || comment.authorName
        }
      }
      return comment
    })
    
    // Sort by date client-side
    commentsWithCurrentProfiles.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0)
      const dateB = b.createdAt?.toDate?.() || new Date(0)
      return dateA - dateB
    })
    
    return commentsWithCurrentProfiles
  } catch (error) {
    console.error('Error getting comments:', error)
    throw error
  }
}

/**
 * Get all pending comments across all announcements
 */
export const getPendingComments = async () => {
  try {
    // We need to query across all announcements
    // This is a workaround since Firestore doesn't support collection group queries without index
    const announcementsSnapshot = await getDocs(collection(db, COLLECTION_NAME))
    
    const pendingComments = []
    
    for (const announcementDoc of announcementsSnapshot.docs) {
      const commentsRef = collection(db, COLLECTION_NAME, announcementDoc.id, 'comments')
      const q = query(commentsRef, where('status', '==', COMMENT_STATUS.PENDING_REVIEW))
      const commentsSnapshot = await getDocs(q)
      
      commentsSnapshot.docs.forEach(commentDoc => {
        pendingComments.push({
          id: commentDoc.id,
          ...commentDoc.data(),
          announcementId: announcementDoc.id,
          announcementTitle: announcementDoc.data().title
        })
      })
    }
    
    // Sort by date
    pendingComments.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0)
      const dateB = b.createdAt?.toDate?.() || new Date(0)
      return dateB - dateA
    })
    
    return pendingComments
  } catch (error) {
    console.error('Error getting pending comments:', error)
    throw error
  }
}

/**
 * Approve a comment
 */
export const approveComment = async (announcementId, commentId) => {
  try {
    const commentRef = doc(db, COLLECTION_NAME, announcementId, 'comments', commentId)
    await updateDoc(commentRef, {
      status: COMMENT_STATUS.APPROVED,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error approving comment:', error)
    throw error
  }
}

/**
 * Reject a comment
 */
export const rejectComment = async (announcementId, commentId, reason = '') => {
  try {
    const commentRef = doc(db, COLLECTION_NAME, announcementId, 'comments', commentId)
    await updateDoc(commentRef, {
      status: COMMENT_STATUS.REJECTED,
      rejectionReason: reason,
      updatedAt: serverTimestamp()
    })
    
    // Decrement comment count
    await updateDoc(doc(db, COLLECTION_NAME, announcementId), {
      commentCount: increment(-1)
    })
  } catch (error) {
    console.error('Error rejecting comment:', error)
    throw error
  }
}

/**
 * Delete a comment
 */
export const deleteComment = async (announcementId, commentId) => {
  try {
    const commentRef = doc(db, COLLECTION_NAME, announcementId, 'comments', commentId)
    await deleteDoc(commentRef)
    
    // Decrement comment count
    await updateDoc(doc(db, COLLECTION_NAME, announcementId), {
      commentCount: increment(-1)
    })
  } catch (error) {
    console.error('Error deleting comment:', error)
    throw error
  }
}

/**
 * Like/unlike a comment
 */
export const toggleCommentLike = async (announcementId, commentId, userId) => {
  try {
    const commentRef = doc(db, COLLECTION_NAME, announcementId, 'comments', commentId)
    const commentSnap = await getDoc(commentRef)
    
    if (!commentSnap.exists()) throw new Error('Comment not found')
    
    const comment = commentSnap.data()
    const likes = comment.likes || []
    
    if (likes.includes(userId)) {
      await updateDoc(commentRef, {
        likes: arrayRemove(userId)
      })
      return likes.filter(id => id !== userId)
    } else {
      await updateDoc(commentRef, {
        likes: arrayUnion(userId)
      })
      return [...likes, userId]
    }
  } catch (error) {
    console.error('Error toggling comment like:', error)
    throw error
  }
}

/**
 * Subscribe to real-time announcements updates
 * @param {Array} userTags - User's tags for filtering
 * @param {Function} callback - Callback function (announcements) => void
 * @param {Object} options - Options { userId, status }
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAnnouncements = (userTags = [], callback, options = {}) => {
  const statusFilter = options.status || ANNOUNCEMENT_STATUS.APPROVED
  const q = query(
    collection(db, COLLECTION_NAME),
    where('status', '==', statusFilter)
  )
  
  return onSnapshot(q, async (snapshot) => {
    try {
      // Filter by tags on client side
      let announcements = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(announcement => {
          // Authors can always see their own announcements
          if (options.userId && announcement.authorId === options.userId) {
            return true
          }
          // Campus-wide announcements (no target tags) are visible to everyone
          if (!announcement.targetTags || announcement.targetTags.length === 0) {
            return true
          }
          // Use sophisticated matching logic for targeted announcements
          return matchesTargetAudience(userTags, announcement.targetTags)
        })
      
      // Fetch comments count for each announcement
      announcements = await Promise.all(
        announcements.map(async (announcement) => {
          try {
            const commentsRef = collection(db, COLLECTION_NAME, announcement.id, 'comments')
            const commentsSnapshot = await getDocs(commentsRef)
            return {
              ...announcement,
              comments: commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            }
          } catch (error) {
            console.error('Error fetching comments for announcement:', announcement.id, error)
            return { ...announcement, comments: [] }
          }
        })
      )
      
      // Sort by priority
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 }
      announcements.sort((a, b) => {
        const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
        if (priorityDiff !== 0) return priorityDiff
        // Same priority: sort by date
        const dateA = a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || new Date(0)
        return dateB - dateA
      })
      
      callback(announcements)
    } catch (error) {
      console.error('Error in announcements subscription:', error)
    }
  }, (error) => {
    console.error('Announcements subscription error:', error)
  })
}

/**
 * Subscribe to real-time comments updates for an announcement
 * @param {string} announcementId - Announcement ID
 * @param {Function} callback - Callback function (comments) => void
 * @param {boolean} includeAll - Include pending/rejected comments (for admins)
 * @returns {Function} Unsubscribe function
 */
export const subscribeToComments = (announcementId, callback, includeAll = false) => {
  const commentsRef = collection(db, COLLECTION_NAME, announcementId, 'comments')
  
  let q
  if (includeAll) {
    q = query(commentsRef)
  } else {
    q = query(commentsRef, where('status', '==', COMMENT_STATUS.APPROVED))
  }
  
  return onSnapshot(q, async (snapshot) => {
    try {
      const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Fetch latest user profiles to get current profile pictures
      const uniqueAuthorIds = [...new Set(comments.map(c => c.authorId).filter(Boolean))]
      const userProfiles = {}
      
      // Batch fetch user profiles
      for (const authorId of uniqueAuthorIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', authorId))
          if (userDoc.exists()) {
            userProfiles[authorId] = userDoc.data()
          }
        } catch (err) {
          console.warn(`Could not fetch profile for user ${authorId}:`, err)
        }
      }
      
      // Update comments with latest profile data
      const commentsWithCurrentProfiles = comments.map(comment => {
        const profile = userProfiles[comment.authorId]
        if (profile) {
          return {
            ...comment,
            authorPhotoURL: profile.photoURL || null,
            authorName: profile.displayName || `${profile.givenName || ''} ${profile.lastName || ''}`.trim() || comment.authorName
          }
        }
        return comment
      })
      
      // Sort by date client-side
      commentsWithCurrentProfiles.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || new Date(0)
        return dateA - dateB
      })
      
      callback(commentsWithCurrentProfiles)
    } catch (error) {
      console.error('Error in comments subscription:', error)
    }
  }, (error) => {
    console.error('Comments subscription error:', error)
  })
}
