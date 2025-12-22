/**
 * Announcement Service
 * 
 * Handles CRUD operations for announcements with:
 * - Media uploads (photos/videos) to Firebase Storage
 * - Tag-based visibility filtering
 * - Moderation integration
 * - Priority levels
 */

import { db, storage } from '../config/firebase'
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
  arrayRemove
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage'
import { moderateContent, addModerationFeedback } from './moderationService'

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
 * @param {boolean} skipReviewQueue - If true, auto-approve if profanity check passes (for Admin+)
 * @returns {Promise<object>} - Created announcement with moderation result
 */
export const createAnnouncement = async (data, files = [], author, skipReviewQueue = false) => {
  try {
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
    
    // Determine initial status based on moderation result and user role
    let status
    
    // If profanity/severe content detected, ALWAYS reject regardless of role
    if (moderationResult.status === 'rejected' || moderationResult.filterType === 'profanity') {
      status = ANNOUNCEMENT_STATUS.REJECTED
    }
    // If moderation says approved OR user is admin (skips review queue)
    else if (moderationResult.status === 'approved' || skipReviewQueue) {
      status = ANNOUNCEMENT_STATUS.APPROVED
    }
    // Otherwise needs review
    else if (moderationResult.status === 'pending_review') {
      status = ANNOUNCEMENT_STATUS.PENDING_REVIEW
    }
    else {
      status = ANNOUNCEMENT_STATUS.PENDING_REVIEW
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
      status,
      moderationResult: {
        confidence: moderationResult.confidence ?? 1.0,
        category: moderationResult.category || 'safe',
        filterType: moderationResult.filterType || 'none',
        flaggedWords: moderationResult.flaggedWords || []
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
    
    // Filter by tags on client side (Firestore doesn't support array-contains-any with empty array check)
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
        // Check if user has any matching tag
        return announcement.targetTags.some(tag => userTags.includes(tag))
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
 * Delete an announcement and its media
 */
export const deleteAnnouncement = async (announcementId) => {
  try {
    // Get announcement to delete media
    const announcement = await getAnnouncement(announcementId)
    
    if (announcement?.media) {
      // Delete all media files
      await Promise.all(announcement.media.map(m => deleteMedia(m.path)))
    }
    
    // Delete the document
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
    }
    
    await updateDoc(announcementRef, {
      reactions: updatedReactions,
      updatedAt: serverTimestamp()
    })
    
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
    
    // Sort by date client-side
    comments.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0)
      const dateB = b.createdAt?.toDate?.() || new Date(0)
      return dateA - dateB
    })
    
    return comments
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
