/**
 * Report Service
 * 
 * Handles user reports for inappropriate announcements
 * Includes spam protection and admin review functionality
 */

import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  orderBy, 
  limit,
  getDoc,
  Timestamp,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore'
import { db } from '../config/firebase'

const REPORTS_COLLECTION = 'announcement_reports'

// Spam protection constants
const SPAM_LIMITS = {
  MAX_REPORTS_PER_HOUR: 5,           // Max reports a user can submit per hour
  MAX_REPORTS_PER_DAY: 15,           // Max reports a user can submit per day
  MAX_REPORTS_PER_ANNOUNCEMENT: 1,   // User can only report same announcement once
  COOLDOWN_MINUTES: 2                // Minimum time between reports (in minutes)
}

/**
 * Check if user is spamming reports
 * @param {string} userId - User ID to check
 * @param {string} announcementId - Announcement being reported
 * @returns {Promise<{canReport: boolean, reason: string|null}>}
 */
export const checkReportSpamProtection = async (userId, announcementId) => {
  try {
    const reportsRef = collection(db, REPORTS_COLLECTION)
    
    // Check if user already reported this announcement
    const duplicateQuery = query(
      reportsRef,
      where('reportedBy', '==', userId),
      where('announcementId', '==', announcementId)
    )
    const duplicateSnap = await getDocs(duplicateQuery)
    if (!duplicateSnap.empty) {
      return { 
        canReport: false, 
        reason: 'You have already reported this announcement. Our team is reviewing it.' 
      }
    }
    
    // Get user's reports in the last hour
    const oneHourAgo = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000))
    const hourlyQuery = query(
      reportsRef,
      where('reportedBy', '==', userId),
      where('createdAt', '>=', oneHourAgo)
    )
    const hourlySnap = await getDocs(hourlyQuery)
    if (hourlySnap.size >= SPAM_LIMITS.MAX_REPORTS_PER_HOUR) {
      return { 
        canReport: false, 
        reason: `You've reached the maximum of ${SPAM_LIMITS.MAX_REPORTS_PER_HOUR} reports per hour. Please try again later.` 
      }
    }
    
    // Get user's reports in the last 24 hours
    const oneDayAgo = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000))
    const dailyQuery = query(
      reportsRef,
      where('reportedBy', '==', userId),
      where('createdAt', '>=', oneDayAgo)
    )
    const dailySnap = await getDocs(dailyQuery)
    if (dailySnap.size >= SPAM_LIMITS.MAX_REPORTS_PER_DAY) {
      return { 
        canReport: false, 
        reason: `You've reached the maximum of ${SPAM_LIMITS.MAX_REPORTS_PER_DAY} reports per day. Please try again tomorrow.` 
      }
    }
    
    // Check cooldown (last report within X minutes)
    const cooldownTime = Timestamp.fromDate(new Date(Date.now() - SPAM_LIMITS.COOLDOWN_MINUTES * 60 * 1000))
    const cooldownQuery = query(
      reportsRef,
      where('reportedBy', '==', userId),
      where('createdAt', '>=', cooldownTime),
      limit(1)
    )
    const cooldownSnap = await getDocs(cooldownQuery)
    if (!cooldownSnap.empty) {
      return { 
        canReport: false, 
        reason: `Please wait ${SPAM_LIMITS.COOLDOWN_MINUTES} minutes between submitting reports.` 
      }
    }
    
    return { canReport: true, reason: null }
  } catch (error) {
    console.error('Error checking spam protection:', error)
    // Allow report if spam check fails (fail-open for user experience)
    return { canReport: true, reason: null }
  }
}

/**
 * Submit a report for an announcement
 * @param {string} announcementId - The ID of the announcement being reported
 * @param {string} reason - The reason for the report
 * @param {object} reporter - User info of the reporter
 * @returns {Promise<object>} - Report document
 */
export const reportAnnouncement = async (announcementId, reason, reporter) => {
  try {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Report reason is required')
    }

    if (reason.trim().length < 10) {
      throw new Error('Report reason must be at least 10 characters long')
    }
    
    // Check spam protection
    const spamCheck = await checkReportSpamProtection(reporter.uid, announcementId)
    if (!spamCheck.canReport) {
      throw new Error(spamCheck.reason)
    }

    const reportData = {
      announcementId,
      reason: reason.trim(),
      reportedBy: reporter.uid,
      reporterName: reporter.name,
      reporterEmail: reporter.email,
      status: 'pending', // pending, reviewed, dismissed, action_taken
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null
    }

    const docRef = await addDoc(
      collection(db, REPORTS_COLLECTION),
      reportData
    )

    return {
      id: docRef.id,
      ...reportData
    }
  } catch (error) {
    console.error('Error submitting report:', error)
    throw error
  }
}

/**
 * Get all reports for an announcement
 * @param {string} announcementId - The ID of the announcement
 * @returns {Promise<Array>} - Array of reports
 */
export const getAnnouncementReports = async (announcementId) => {
  try {
    const q = query(
      collection(db, REPORTS_COLLECTION),
      where('announcementId', '==', announcementId)
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error fetching reports:', error)
    throw error
  }
}

/**
 * Get all pending reports for admin review
 * @param {string} status - Filter by status (optional, defaults to 'pending')
 * @returns {Promise<Array>} - Array of reports with announcement details
 */
export const getAllReports = async (status = null) => {
  try {
    const reportsRef = collection(db, REPORTS_COLLECTION)
    let q
    
    if (status) {
      q = query(
        reportsRef,
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      )
    } else {
      q = query(reportsRef, orderBy('createdAt', 'desc'))
    }
    
    const querySnapshot = await getDocs(q)
    const reports = []
    
    for (const docSnap of querySnapshot.docs) {
      const reportData = { id: docSnap.id, ...docSnap.data() }
      
      // Fetch the associated announcement
      try {
        const announcementRef = doc(db, 'announcements', reportData.announcementId)
        const announcementSnap = await getDoc(announcementRef)
        if (announcementSnap.exists()) {
          reportData.announcement = { id: announcementSnap.id, ...announcementSnap.data() }
        } else {
          reportData.announcement = null // Announcement was deleted
        }
      } catch (err) {
        reportData.announcement = null
      }
      
      reports.push(reportData)
    }
    
    return reports
  } catch (error) {
    console.error('Error fetching all reports:', error)
    throw error
  }
}

/**
 * Get report statistics for dashboard
 * @returns {Promise<object>} - Report statistics
 */
export const getReportStats = async () => {
  try {
    const reportsRef = collection(db, REPORTS_COLLECTION)
    const allReports = await getDocs(reportsRef)
    
    let pending = 0
    let reviewed = 0
    let dismissed = 0
    let actionTaken = 0
    let todayCount = 0
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = Timestamp.fromDate(today)
    
    allReports.forEach(doc => {
      const data = doc.data()
      switch (data.status) {
        case 'pending': pending++; break
        case 'reviewed': reviewed++; break
        case 'dismissed': dismissed++; break
        case 'action_taken': actionTaken++; break
      }
      
      if (data.createdAt && data.createdAt.toDate() >= today) {
        todayCount++
      }
    })
    
    return {
      total: allReports.size,
      pending,
      reviewed,
      dismissed,
      actionTaken,
      todayCount
    }
  } catch (error) {
    console.error('Error getting report stats:', error)
    return { total: 0, pending: 0, reviewed: 0, dismissed: 0, actionTaken: 0, todayCount: 0 }
  }
}

/**
 * Update report status (admin action)
 * @param {string} reportId - Report ID
 * @param {string} status - New status
 * @param {object} reviewer - Admin/moderator who reviewed
 * @param {string} notes - Review notes (optional)
 */
export const updateReportStatus = async (reportId, status, reviewer, notes = null) => {
  try {
    const reportRef = doc(db, REPORTS_COLLECTION, reportId)
    await updateDoc(reportRef, {
      status,
      reviewedBy: {
        uid: reviewer.uid,
        name: reviewer.name,
        email: reviewer.email
      },
      reviewedAt: serverTimestamp(),
      reviewNotes: notes,
      updatedAt: serverTimestamp()
    })
    return true
  } catch (error) {
    console.error('Error updating report status:', error)
    throw error
  }
}

/**
 * Delete a report (admin only)
 * @param {string} reportId - Report ID to delete
 */
export const deleteReport = async (reportId) => {
  try {
    await deleteDoc(doc(db, REPORTS_COLLECTION, reportId))
    return true
  } catch (error) {
    console.error('Error deleting report:', error)
    throw error
  }
}

/**
 * Subscribe to reports in real-time
 * @param {string|null} status - Filter by status (null for all)
 * @param {function} onUpdate - Callback when reports update
 * @param {function} onError - Callback on error
 * @returns {function} - Unsubscribe function
 */
export const subscribeToReports = (status, onUpdate, onError) => {
  const reportsRef = collection(db, REPORTS_COLLECTION)
  
  // Simple query without orderBy to avoid composite index requirement
  let q
  if (status && status !== 'all') {
    q = query(reportsRef, where('status', '==', status))
  } else {
    q = query(reportsRef)
  }
  
  return onSnapshot(q, async (snapshot) => {
    try {
      const reports = []
      
      for (const docSnap of snapshot.docs) {
        const reportData = { id: docSnap.id, ...docSnap.data() }
        
        // Fetch the associated announcement
        try {
          const announcementRef = doc(db, 'announcements', reportData.announcementId)
          const announcementSnap = await getDoc(announcementRef)
          if (announcementSnap.exists()) {
            reportData.announcement = { id: announcementSnap.id, ...announcementSnap.data() }
          } else {
            reportData.announcement = null
          }
        } catch (err) {
          reportData.announcement = null
        }
        
        reports.push(reportData)
      }
      
      // Sort by createdAt descending (client-side to avoid index)
      reports.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || new Date(0)
        return dateB - dateA
      })
      
      onUpdate(reports)
    } catch (error) {
      console.error('Error processing reports:', error)
      if (onError) onError(error)
    }
  }, (error) => {
    console.error('Error subscribing to reports:', error)
    if (onError) onError(error)
  })
}

/**
 * Subscribe to report statistics in real-time
 * @param {function} onUpdate - Callback when stats update
 * @param {function} onError - Callback on error
 * @returns {function} - Unsubscribe function
 */
export const subscribeToReportStats = (onUpdate, onError) => {
  const reportsRef = collection(db, REPORTS_COLLECTION)
  
  return onSnapshot(reportsRef, (snapshot) => {
    try {
      let pending = 0
      let reviewed = 0
      let dismissed = 0
      let actionTaken = 0
      let todayCount = 0
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        switch (data.status) {
          case 'pending': pending++; break
          case 'reviewed': reviewed++; break
          case 'dismissed': dismissed++; break
          case 'action_taken': actionTaken++; break
        }
        
        if (data.createdAt && data.createdAt.toDate() >= today) {
          todayCount++
        }
      })
      
      onUpdate({
        total: snapshot.size,
        pending,
        reviewed,
        dismissed,
        actionTaken,
        todayCount
      })
    } catch (error) {
      console.error('Error processing report stats:', error)
      if (onError) onError(error)
    }
  }, (error) => {
    console.error('Error subscribing to report stats:', error)
    if (onError) onError(error)
  })
}
