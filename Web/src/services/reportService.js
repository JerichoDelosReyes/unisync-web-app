/**
 * Report Service
 * 
 * Handles user reports for inappropriate announcements
 */

import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'

const REPORTS_COLLECTION = 'announcement_reports'

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

    const reportData = {
      announcementId,
      reason: reason.trim(),
      reportedBy: reporter.uid,
      reporterName: reporter.name,
      reporterEmail: reporter.email,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
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
