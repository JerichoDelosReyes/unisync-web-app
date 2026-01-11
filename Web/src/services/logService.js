/**
 * System Logging Service
 * 
 * Provides centralized logging for all system actions.
 * Logs are stored in Firestore and viewable by Super Admin only.
 */

import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  Timestamp,
  getCountFromServer,
  onSnapshot
} from 'firebase/firestore'
import { db } from '../config/firebase'

// Log categories
export const LOG_CATEGORIES = {
  AUTH: 'auth',
  ANNOUNCEMENTS: 'announcements',
  SCHEDULE: 'schedule',
  SYSTEM: 'system',
  FACULTY_REQUESTS: 'faculty_requests'
}

// Action types by category
export const LOG_ACTIONS = {
  // Auth actions
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  REGISTER: 'register',
  
  // Announcement actions
  ANNOUNCEMENT_CREATE: 'announcement_create',
  ANNOUNCEMENT_APPROVE: 'announcement_approve',
  ANNOUNCEMENT_REJECT: 'announcement_reject',
  ANNOUNCEMENT_DELETE: 'announcement_delete',
  ANNOUNCEMENT_EDIT: 'announcement_edit',
  
  // Schedule actions
  SCHEDULE_ARCHIVE: 'schedule_archive',
  SCHEDULE_RESET: 'schedule_reset',
  SCHEDULE_UPLOAD: 'schedule_upload',
  
  // System actions
  SETTINGS_UPDATE: 'settings_update',
  SEMESTER_UPDATE: 'semester_update',
  
  // Faculty request actions
  FACULTY_REQUEST_APPROVE: 'faculty_request_approve',
  FACULTY_REQUEST_REJECT: 'faculty_request_reject',
  FACULTY_REQUEST_SUBMIT: 'faculty_request_submit'
}

// Human-readable action labels
export const ACTION_LABELS = {
  [LOG_ACTIONS.LOGIN]: 'User Login',
  [LOG_ACTIONS.LOGOUT]: 'User Logout',
  [LOG_ACTIONS.LOGIN_FAILED]: 'Login Failed',
  [LOG_ACTIONS.REGISTER]: 'User Registered',
  [LOG_ACTIONS.ANNOUNCEMENT_CREATE]: 'Announcement Created',
  [LOG_ACTIONS.ANNOUNCEMENT_APPROVE]: 'Announcement Approved',
  [LOG_ACTIONS.ANNOUNCEMENT_REJECT]: 'Announcement Rejected',
  [LOG_ACTIONS.ANNOUNCEMENT_DELETE]: 'Announcement Deleted',
  [LOG_ACTIONS.ANNOUNCEMENT_EDIT]: 'Announcement Edited',
  [LOG_ACTIONS.SCHEDULE_ARCHIVE]: 'Schedules Archived',
  [LOG_ACTIONS.SCHEDULE_RESET]: 'Schedules Reset',
  [LOG_ACTIONS.SCHEDULE_UPLOAD]: 'Registration Form Uploaded',
  [LOG_ACTIONS.SETTINGS_UPDATE]: 'Settings Updated',
  [LOG_ACTIONS.SEMESTER_UPDATE]: 'Semester Updated',
  [LOG_ACTIONS.FACULTY_REQUEST_APPROVE]: 'Faculty Request Approved',
  [LOG_ACTIONS.FACULTY_REQUEST_REJECT]: 'Faculty Request Rejected',
  [LOG_ACTIONS.FACULTY_REQUEST_SUBMIT]: 'Faculty Request Submitted'
}

// Category labels
export const CATEGORY_LABELS = {
  [LOG_CATEGORIES.AUTH]: 'Authentication',
  [LOG_CATEGORIES.ANNOUNCEMENTS]: 'Announcements',
  [LOG_CATEGORIES.SCHEDULE]: 'Schedule',
  [LOG_CATEGORIES.SYSTEM]: 'System',
  [LOG_CATEGORIES.FACULTY_REQUESTS]: 'Faculty Requests'
}

// Category colors for UI
export const CATEGORY_COLORS = {
  [LOG_CATEGORIES.AUTH]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  [LOG_CATEGORIES.ANNOUNCEMENTS]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  [LOG_CATEGORIES.SCHEDULE]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
  [LOG_CATEGORIES.SYSTEM]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  [LOG_CATEGORIES.FACULTY_REQUESTS]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
}

/**
 * Create a new system log entry
 * 
 * @param {Object} params - Log parameters
 * @param {string} params.category - Log category (from LOG_CATEGORIES)
 * @param {string} params.action - Action type (from LOG_ACTIONS)
 * @param {Object} params.performedBy - User who performed the action { uid, email, name }
 * @param {Object} params.targetUser - Target user if applicable { uid, email, name }
 * @param {Object} params.details - Additional details about the action
 * @param {string} params.description - Human-readable description
 * @returns {Promise<string>} - The created log ID
 */
export const createLog = async ({
  category,
  action,
  performedBy,
  targetUser = null,
  details = {},
  description = ''
}) => {
  try {
    const logEntry = {
      category,
      action,
      performedBy: {
        uid: performedBy?.uid || 'system',
        email: performedBy?.email || 'system@unisync.app',
        name: performedBy?.name || 'System'
      },
      targetUser: targetUser ? {
        uid: targetUser.uid || null,
        email: targetUser.email || null,
        name: targetUser.name || null
      } : null,
      details,
      description: description || ACTION_LABELS[action] || action,
      timestamp: Timestamp.now(),
      createdAt: new Date().toISOString()
    }

    const docRef = await addDoc(collection(db, 'system_logs'), logEntry)
    return docRef.id
  } catch (error) {
    console.error('Error creating log entry:', error)
    // Don't throw - logging should never break the main operation
    return null
  }
}

/**
 * Get system logs with optional filtering and pagination
 * 
 * @param {Object} options - Query options
 * @param {string} options.category - Filter by category
 * @param {string} options.action - Filter by action
 * @param {Date} options.startDate - Filter from date
 * @param {Date} options.endDate - Filter to date
 * @param {string} options.performedByUid - Filter by user who performed
 * @param {number} options.pageSize - Number of logs per page (default 50)
 * @param {Object} options.lastDoc - Last document for pagination
 * @returns {Promise<{logs: Array, lastDoc: Object, hasMore: boolean}>}
 */
export const getLogs = async (options = {}) => {
  try {
    const {
      category,
      action,
      startDate,
      endDate,
      performedByUid,
      pageSize = 50,
      lastDoc
    } = options

    const constraints = []

    // Add filters - order matters for Firestore
    if (category) {
      constraints.push(where('category', '==', category))
    }

    if (action) {
      constraints.push(where('action', '==', action))
    }

    if (performedByUid) {
      constraints.push(where('performedBy.uid', '==', performedByUid))
    }

    if (startDate) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(startDate)))
    }

    if (endDate) {
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(endDate)))
    }

    // Always order by timestamp descending (after all where clauses)
    constraints.push(orderBy('timestamp', 'desc'))

    // Pagination
    if (lastDoc) {
      constraints.push(startAfter(lastDoc))
    }

    constraints.push(limit(pageSize + 1)) // Get one extra to check if there are more

    const q = query(collection(db, 'system_logs'), ...constraints)
    const snapshot = await getDocs(q)

    const logs = []
    let newLastDoc = null
    let hasMore = false

    snapshot.docs.forEach((doc, index) => {
      if (index < pageSize) {
        logs.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().createdAt)
        })
        newLastDoc = doc
      } else {
        hasMore = true
      }
    })

    return { logs, lastDoc: newLastDoc, hasMore }
  } catch (error) {
    console.error('Error fetching logs:', error)
    return { logs: [], lastDoc: null, hasMore: false }
  }
}

/**
 * Get log statistics for dashboard
 * 
 * @returns {Promise<Object>} - Stats by category
 */
export const getLogStats = async () => {
  try {
    const stats = {}
    
    // Get counts for each category
    for (const category of Object.values(LOG_CATEGORIES)) {
      const q = query(
        collection(db, 'system_logs'),
        where('category', '==', category)
      )
      const snapshot = await getCountFromServer(q)
      stats[category] = snapshot.data().count
    }

    // Get total count
    const totalQuery = query(collection(db, 'system_logs'))
    const totalSnapshot = await getCountFromServer(totalQuery)
    stats.total = totalSnapshot.data().count

    // Get today's count
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayQuery = query(
      collection(db, 'system_logs'),
      where('timestamp', '>=', Timestamp.fromDate(today))
    )
    const todaySnapshot = await getCountFromServer(todayQuery)
    stats.today = todaySnapshot.data().count

    return stats
  } catch (error) {
    console.error('Error fetching log stats:', error)
    return { total: 0, today: 0 }
  }
}

/**
 * Get recent logs (quick access for dashboard widgets)
 * 
 * @param {number} count - Number of recent logs to fetch
 * @returns {Promise<Array>} - Recent log entries
 */
export const getRecentLogs = async (count = 10) => {
  try {
    const q = query(
      collection(db, 'system_logs'),
      orderBy('timestamp', 'desc'),
      limit(count)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().createdAt)
    }))
  } catch (error) {
    console.error('Error fetching recent logs:', error)
    return []
  }
}

/**
 * Subscribe to real-time log updates
 * 
 * @param {Object} options - Query options (same as getLogs)
 * @param {function} callback - Callback function receiving { logs, hasMore }
 * @returns {function} - Unsubscribe function
 */
export const subscribeToLogs = (options = {}, callback) => {
  const {
    category,
    action,
    startDate,
    endDate,
    pageSize = 50
  } = options

  try {
    const constraints = []

    // Add filters
    if (category) {
      constraints.push(where('category', '==', category))
    }

    if (action) {
      constraints.push(where('action', '==', action))
    }

    if (startDate) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(startDate)))
    }

    if (endDate) {
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(endDate)))
    }

    // Always order by timestamp descending (must be last before limit)
    constraints.push(orderBy('timestamp', 'desc'))
    constraints.push(limit(pageSize + 1))

    const q = query(collection(db, 'system_logs'), ...constraints)

    // Return the unsubscribe function
    return onSnapshot(q, (snapshot) => {
      const logs = []
      let hasMore = false

      snapshot.docs.forEach((doc, index) => {
        if (index < pageSize) {
          logs.push({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().createdAt)
          })
        } else {
          hasMore = true
        }
      })

      callback({ logs, hasMore })
    }, (error) => {
      console.error('Error in logs subscription:', error)
      callback({ logs: [], hasMore: false, error })
    })
  } catch (error) {
    console.error('Error creating logs query:', error)
    callback({ logs: [], hasMore: false, error })
    return () => {} // Return dummy unsubscribe
  }
}
