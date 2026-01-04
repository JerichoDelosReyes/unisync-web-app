/**
 * Faculty Role Request Service
 * 
 * Handles faculty role request workflow:
 * - Students can request faculty role
 * - Admins can view, approve, or reject requests
 * - Notifications sent on status changes
 */

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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { updateDocument } from './dbService'
import { notifyFacultyRequestApproved, notifyFacultyRequestRejected, notifyAdminsNewFacultyRequest } from './notificationService'

const FACULTY_REQUESTS_COLLECTION = 'faculty_role_requests'

/**
 * Request status constants
 */
export const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

/**
 * Submit a new faculty role request
 * @param {Object} requestData - Request data
 * @param {string} requestData.userId - User's UID
 * @param {string} requestData.userEmail - User's email
 * @param {string} requestData.userName - User's full name
 * @param {string} requestData.idPhotoUrl - URL of uploaded faculty ID photo
 * @param {string} requestData.department - Selected department
 * @param {string} requestData.reason - Reason for request
 * @returns {Promise<string>} Request document ID
 */
export async function submitFacultyRequest(requestData) {
  const { userId, userEmail, userName, idPhotoUrl, department, reason } = requestData
  
  // Check if user already has a pending request
  const existingRequest = await getUserPendingRequest(userId)
  if (existingRequest) {
    throw new Error('You already have a pending faculty role request.')
  }
  
  const requestDoc = {
    userId,
    userEmail,
    userName,
    idPhotoUrl: idPhotoUrl || null,
    department,
    reason: reason.trim(),
    status: REQUEST_STATUS.PENDING,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null
  }
  
  const docRef = await addDoc(collection(db, FACULTY_REQUESTS_COLLECTION), requestDoc)
  
  // Notify admins about the new faculty request
  await notifyAdminsNewFacultyRequest({
    requestId: docRef.id,
    userId,
    userEmail,
    userName,
    department
  })
  
  return docRef.id
}

/**
 * Get user's pending request if any
 * @param {string} userId - User's UID
 * @returns {Promise<Object|null>} Pending request or null
 */
export async function getUserPendingRequest(userId) {
  const q = query(
    collection(db, FACULTY_REQUESTS_COLLECTION),
    where('userId', '==', userId),
    where('status', '==', REQUEST_STATUS.PENDING)
  )
  
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() }
}

/**
 * Get user's request history
 * @param {string} userId - User's UID
 * @returns {Promise<Array>} List of requests
 */
export async function getUserRequestHistory(userId) {
  const q = query(
    collection(db, FACULTY_REQUESTS_COLLECTION),
    where('userId', '==', userId)
  )
  
  const snapshot = await getDocs(q)
  const results = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
    reviewedAt: doc.data().reviewedAt?.toDate()
  }))
  
  // Sort by createdAt descending (newest first)
  return results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

/**
 * Get all pending faculty requests (Admin only)
 * @returns {Promise<Array>} List of pending requests
 */
export async function getPendingFacultyRequests() {
  const q = query(
    collection(db, FACULTY_REQUESTS_COLLECTION),
    where('status', '==', REQUEST_STATUS.PENDING)
  )
  
  const snapshot = await getDocs(q)
  const results = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate()
  }))
  
  // Sort by createdAt ascending (oldest first - FIFO for review queue)
  return results.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
}

/**
 * Get all faculty requests with optional status filter (Admin only)
 * @param {string} [status] - Optional status filter
 * @returns {Promise<Array>} List of requests
 */
export async function getAllFacultyRequests(status = null) {
  let q
  
  // Query without orderBy to avoid needing composite index
  // We'll sort client-side instead
  if (status) {
    q = query(
      collection(db, FACULTY_REQUESTS_COLLECTION),
      where('status', '==', status)
    )
  } else {
    q = query(
      collection(db, FACULTY_REQUESTS_COLLECTION)
    )
  }
  
  const snapshot = await getDocs(q)
  const results = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
    reviewedAt: doc.data().reviewedAt?.toDate()
  }))
  
  // Sort by createdAt descending (newest first)
  return results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

/**
 * Approve a faculty request (Admin only)
 * Updates the request status and changes user role to faculty
 * @param {string} requestId - Request document ID
 * @param {string} reviewerId - Admin's UID who approved
 * @returns {Promise<void>}
 */
export async function approveFacultyRequest(requestId, reviewerId) {
  const requestRef = doc(db, FACULTY_REQUESTS_COLLECTION, requestId)
  const requestSnap = await getDoc(requestRef)
  
  if (!requestSnap.exists()) {
    throw new Error('Request not found.')
  }
  
  const requestData = requestSnap.data()
  
  if (requestData.status !== REQUEST_STATUS.PENDING) {
    throw new Error('This request has already been processed.')
  }
  
  // Update request status
  await updateDoc(requestRef, {
    status: REQUEST_STATUS.APPROVED,
    reviewedBy: reviewerId,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  
  // Update user role to faculty
  await updateDocument('users', requestData.userId, {
    role: 'faculty',
    facultyDepartment: requestData.department,
    facultyRequestApproved: true,
    facultyApprovedAt: serverTimestamp(),
    facultyApprovedBy: reviewerId
  })

  // Send notification to user
  try {
    await notifyFacultyRequestApproved(requestData.userId, {
      department: requestData.department
    })
  } catch (notifyError) {
    console.error('Error sending approval notification:', notifyError)
    // Don't fail the approval if notification fails
  }
}

/**
 * Reject a faculty request (Admin only)
 * @param {string} requestId - Request document ID
 * @param {string} reviewerId - Admin's UID who rejected
 * @param {string} reason - Reason for rejection
 * @returns {Promise<void>}
 */
export async function rejectFacultyRequest(requestId, reviewerId, reason) {
  const requestRef = doc(db, FACULTY_REQUESTS_COLLECTION, requestId)
  const requestSnap = await getDoc(requestRef)
  
  if (!requestSnap.exists()) {
    throw new Error('Request not found.')
  }
  
  const requestData = requestSnap.data()
  
  if (requestData.status !== REQUEST_STATUS.PENDING) {
    throw new Error('This request has already been processed.')
  }
  
  await updateDoc(requestRef, {
    status: REQUEST_STATUS.REJECTED,
    reviewedBy: reviewerId,
    reviewedAt: serverTimestamp(),
    rejectionReason: reason.trim(),
    updatedAt: serverTimestamp()
  })

  // Send notification to user
  try {
    await notifyFacultyRequestRejected(requestData.userId, reason.trim())
  } catch (notifyError) {
    console.error('Error sending rejection notification:', notifyError)
    // Don't fail the rejection if notification fails
  }
}

/**
 * Cancel a pending request (User only - can cancel their own)
 * @param {string} requestId - Request document ID
 * @param {string} userId - User's UID (for verification)
 * @returns {Promise<void>}
 */
export async function cancelFacultyRequest(requestId, userId) {
  const requestRef = doc(db, FACULTY_REQUESTS_COLLECTION, requestId)
  const requestSnap = await getDoc(requestRef)
  
  if (!requestSnap.exists()) {
    throw new Error('Request not found.')
  }
  
  const requestData = requestSnap.data()
  
  if (requestData.userId !== userId) {
    throw new Error('You can only cancel your own requests.')
  }
  
  if (requestData.status !== REQUEST_STATUS.PENDING) {
    throw new Error('Only pending requests can be cancelled.')
  }
  
  await deleteDoc(requestRef)
}

/**
 * Get count of pending faculty requests
 * @returns {Promise<number>} Number of pending requests
 */
export async function getPendingRequestCount() {
  const q = query(
    collection(db, FACULTY_REQUESTS_COLLECTION),
    where('status', '==', REQUEST_STATUS.PENDING)
  )
  
  const snapshot = await getDocs(q)
  return snapshot.size
}
