/**
 * Notification Service
 * 
 * Manages user notifications for schedule validation and other events.
 */

import { db } from '../config/firebase';
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
  onSnapshot
} from 'firebase/firestore';
import { NOTIFICATION_TYPES } from '../constants/scheduleConfig';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Create a notification for a user
 * @param {string} userId - User ID to notify
 * @param {Object} notification - Notification data
 * @returns {Promise<string>} Created notification ID
 */
export const createNotification = async (userId, notification) => {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    
    const notificationData = {
      userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      read: false,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(notificationsRef, notificationData);
    console.log('Notification created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Notify faculty when their class is validated (reaches student threshold)
 * @param {string} facultyUserId - Faculty user ID
 * @param {Object} classInfo - Information about the validated class
 * @returns {Promise<string>} Created notification ID
 */
export const notifyScheduleValidated = async (facultyUserId, classInfo) => {
  const notification = {
    type: NOTIFICATION_TYPES.SCHEDULE_VALIDATED,
    title: 'Class Schedule Validated',
    message: `Your ${classInfo.subject} class on ${classInfo.day} at ${classInfo.startTime} - ${classInfo.endTime} is now active with ${classInfo.studentCount} enrolled students.`,
    data: {
      subject: classInfo.subject,
      day: classInfo.day,
      startTime: classInfo.startTime,
      endTime: classInfo.endTime,
      room: classInfo.room,
      studentCount: classInfo.studentCount,
      sections: classInfo.sections
    }
  };
  
  return await createNotification(facultyUserId, notification);
};

/**
 * Get all notifications for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, unreadOnly)
 * @returns {Promise<Array>} Array of notifications
 */
export const getUserNotifications = async (userId, options = {}) => {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    
    // Simple query without orderBy to avoid index requirement
    // We'll sort client-side
    let q = query(
      notificationsRef,
      where('userId', '==', userId)
    );
    
    if (options.unreadOnly) {
      q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('read', '==', false)
      );
    }
    
    const querySnapshot = await getDocs(q);
    let notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));
    
    // Sort by createdAt descending (newest first) client-side
    notifications.sort((a, b) => {
      const dateA = a.createdAt || new Date(0);
      const dateB = b.createdAt || new Date(0);
      return dateB - dateA;
    });
    
    // Apply limit if specified
    if (options.limit && notifications.length > options.limit) {
      notifications = notifications.slice(0, options.limit);
    }
    
    return notifications;
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
};

/**
 * Subscribe to real-time notifications for a user
 * @param {string} userId - User ID
 * @param {Function} callback - Callback function called with notifications array
 * @param {Object} options - Query options (limit)
 * @returns {Function} Unsubscribe function
 */
export const subscribeToNotifications = (userId, callback, options = {}) => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
  const q = query(
    notificationsRef,
    where('userId', '==', userId)
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    let notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    // Sort by createdAt descending (newest first) client-side
    notifications.sort((a, b) => {
      const dateA = a.createdAt || new Date(0);
      const dateB = b.createdAt || new Date(0);
      return dateB - dateA;
    });

    // Apply limit if specified
    if (options.limit && notifications.length > options.limit) {
      notifications = notifications.slice(0, options.limit);
    }

    callback(notifications);
  }, (error) => {
    console.error('Error subscribing to notifications:', error);
    callback([]);
  });

  return unsubscribe;
};

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<void>}
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const notifications = await getUserNotifications(userId, { unreadOnly: true });
    const updatePromises = notifications.map(n => markNotificationAsRead(n.id));
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @returns {Promise<void>}
 */
export const deleteNotification = async (notificationId) => {
  try {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await deleteDoc(notificationRef);
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Get unread notification count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Unread count
 */
export const getUnreadNotificationCount = async (userId) => {
  try {
    const notifications = await getUserNotifications(userId, { unreadOnly: true });
    return notifications.length;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

/**
 * Check if a schedule validation notification already exists for a class
 * (To avoid duplicate notifications)
 * @param {string} facultyUserId - Faculty user ID
 * @param {string} classKey - Unique class identifier (subject-day-startTime-endTime)
 * @returns {Promise<boolean>} True if notification exists
 */
export const hasValidationNotification = async (facultyUserId, classKey) => {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
      notificationsRef,
      where('userId', '==', facultyUserId),
      where('type', '==', NOTIFICATION_TYPES.SCHEDULE_VALIDATED),
      where('data.classKey', '==', classKey)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking validation notification:', error);
    return false;
  }
};

// ============================================
// ANNOUNCEMENT NOTIFICATIONS
// ============================================

/**
 * Notify users about a new announcement
 * @param {Array} userIds - Array of user IDs to notify
 * @param {Object} announcementInfo - Announcement details
 * @returns {Promise<Array>} Array of created notification IDs
 */
export const notifyNewAnnouncement = async (userIds, announcementInfo) => {
  const notification = {
    type: NOTIFICATION_TYPES.NEW_ANNOUNCEMENT,
    title: 'New Announcement',
    message: `${announcementInfo.authorName} posted: "${announcementInfo.title}"`,
    data: {
      announcementId: announcementInfo.id,
      title: announcementInfo.title,
      authorName: announcementInfo.authorName,
      priority: announcementInfo.priority
    }
  };
  
  const results = await Promise.allSettled(
    userIds.map(userId => createNotification(userId, notification))
  );
  
  return results.filter(r => r.status === 'fulfilled').map(r => r.value);
};

/**
 * Notify author when their announcement is approved
 * @param {string} authorUserId - Author's user ID
 * @param {Object} announcementInfo - Announcement details
 * @returns {Promise<string>} Created notification ID
 */
export const notifyAnnouncementApproved = async (authorUserId, announcementInfo) => {
  const notification = {
    type: NOTIFICATION_TYPES.ANNOUNCEMENT_APPROVED,
    title: 'Announcement Approved',
    message: `Your announcement "${announcementInfo.title}" has been approved and is now visible.`,
    data: {
      announcementId: announcementInfo.id,
      title: announcementInfo.title
    }
  };
  
  return await createNotification(authorUserId, notification);
};

/**
 * Notify author when their announcement is rejected
 * @param {string} authorUserId - Author's user ID
 * @param {Object} announcementInfo - Announcement details
 * @param {string} reason - Rejection reason
 * @returns {Promise<string>} Created notification ID
 */
export const notifyAnnouncementRejected = async (authorUserId, announcementInfo, reason = '') => {
  const notification = {
    type: NOTIFICATION_TYPES.ANNOUNCEMENT_REJECTED,
    title: 'Announcement Rejected',
    message: `Your announcement "${announcementInfo.title}" was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    data: {
      announcementId: announcementInfo.id,
      title: announcementInfo.title,
      reason
    }
  };
  
  return await createNotification(authorUserId, notification);
};

/**
 * Notify users about an urgent announcement
 * @param {Array} userIds - Array of user IDs to notify
 * @param {Object} announcementInfo - Announcement details
 * @returns {Promise<Array>} Array of created notification IDs
 */
export const notifyUrgentAnnouncement = async (userIds, announcementInfo) => {
  const notification = {
    type: NOTIFICATION_TYPES.URGENT_ANNOUNCEMENT,
    title: '🚨 Urgent Announcement',
    message: `${announcementInfo.authorName}: "${announcementInfo.title}"`,
    data: {
      announcementId: announcementInfo.id,
      title: announcementInfo.title,
      authorName: announcementInfo.authorName,
      priority: 'urgent'
    }
  };
  
  const results = await Promise.allSettled(
    userIds.map(userId => createNotification(userId, notification))
  );
  
  return results.filter(r => r.status === 'fulfilled').map(r => r.value);
};

/**
 * Notify author when someone reacts to their announcement
 * @param {string} authorUserId - Author's user ID
 * @param {Object} reactionInfo - Reaction details
 * @returns {Promise<string|null>} Created notification ID or null if self-reaction
 */
export const notifyAnnouncementReaction = async (authorUserId, reactionInfo) => {
  // Don't notify if user reacts to their own post
  if (reactionInfo.reactorId === authorUserId) {
    return null;
  }
  
  const notification = {
    type: NOTIFICATION_TYPES.ANNOUNCEMENT_REACTION,
    title: 'New Reaction',
    message: `${reactionInfo.reactorName} reacted ${reactionInfo.reactionEmoji} to your announcement "${reactionInfo.announcementTitle}"`,
    data: {
      announcementId: reactionInfo.announcementId,
      title: reactionInfo.announcementTitle,
      reactorId: reactionInfo.reactorId,
      reactorName: reactionInfo.reactorName,
      reactionType: reactionInfo.reactionType,
      reactionEmoji: reactionInfo.reactionEmoji
    }
  };
  
  return await createNotification(authorUserId, notification);
};

/**
 * Notify author when someone comments on their announcement
 * @param {string} authorUserId - Author's user ID
 * @param {Object} commentInfo - Comment details
 * @returns {Promise<string|null>} Created notification ID or null if self-comment
 */
export const notifyAnnouncementComment = async (authorUserId, commentInfo) => {
  // Don't notify if user comments on their own post
  if (commentInfo.commenterId === authorUserId) {
    return null;
  }
  
  const notification = {
    type: NOTIFICATION_TYPES.ANNOUNCEMENT_COMMENT,
    title: 'New Comment',
    message: `${commentInfo.commenterName} commented on your announcement "${commentInfo.announcementTitle}"`,
    data: {
      announcementId: commentInfo.announcementId,
      commentId: commentInfo.commentId,
      title: commentInfo.announcementTitle,
      commenterId: commentInfo.commenterId,
      commenterName: commentInfo.commenterName,
      commentPreview: commentInfo.commentContent?.substring(0, 100) || ''
    }
  };
  
  return await createNotification(authorUserId, notification);
};

// ============================================
// SCHEDULE CODE NOTIFICATIONS
// ============================================

/**
 * Notify faculty when a student enrolls in their class
 * @param {string} facultyUserId - Faculty user ID
 * @param {Object} enrollmentInfo - Enrollment details
 * @returns {Promise<string>} Created notification ID
 */
export const notifyNewStudentEnrolled = async (facultyUserId, enrollmentInfo) => {
  const notification = {
    type: NOTIFICATION_TYPES.NEW_STUDENT_ENROLLED,
    title: 'New Student Enrolled',
    message: `A new student enrolled in your ${enrollmentInfo.subject} class (${enrollmentInfo.section}). Total: ${enrollmentInfo.studentCount} students.`,
    data: {
      scheduleCode: enrollmentInfo.scheduleCode,
      subject: enrollmentInfo.subject,
      section: enrollmentInfo.section,
      studentCount: enrollmentInfo.studentCount
    }
  };
  
  return await createNotification(facultyUserId, notification);
};

/**
 * Notify students when a professor claims their schedule code
 * @param {Array} studentIds - Array of student user IDs
 * @param {Object} claimInfo - Claim details
 * @returns {Promise<Array>} Array of created notification IDs
 */
export const notifyScheduleCodeClaimed = async (studentIds, claimInfo) => {
  const notification = {
    type: NOTIFICATION_TYPES.SCHEDULE_CODE_CLAIMED,
    title: 'Professor Assigned',
    message: `${claimInfo.professorName} is now assigned to your ${claimInfo.subject} class.`,
    data: {
      scheduleCode: claimInfo.scheduleCode,
      subject: claimInfo.subject,
      professorName: claimInfo.professorName,
      day: claimInfo.day,
      time: `${claimInfo.startTime} - ${claimInfo.endTime}`
    }
  };
  
  const results = await Promise.allSettled(
    studentIds.map(userId => createNotification(userId, notification))
  );
  
  return results.filter(r => r.status === 'fulfilled').map(r => r.value);
};

// ============================================
// FACULTY REQUEST NOTIFICATIONS
// ============================================

/**
 * Notify user when their faculty request is approved
 * @param {string} userId - User ID
 * @param {Object} requestInfo - Request details
 * @returns {Promise<string>} Created notification ID
 */
export const notifyFacultyRequestApproved = async (userId, requestInfo = {}) => {
  const notification = {
    type: NOTIFICATION_TYPES.FACULTY_REQUEST_APPROVED,
    title: 'Faculty Request Approved',
    message: 'Congratulations! Your faculty account request has been approved. You now have access to faculty features.',
    data: {
      department: requestInfo.department || ''
    }
  };
  
  return await createNotification(userId, notification);
};

/**
 * Notify user when their faculty request is rejected
 * @param {string} userId - User ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<string>} Created notification ID
 */
export const notifyFacultyRequestRejected = async (userId, reason = '') => {
  const notification = {
    type: NOTIFICATION_TYPES.FACULTY_REQUEST_REJECTED,
    title: 'Faculty Request Rejected',
    message: `Your faculty account request was not approved.${reason ? ` Reason: ${reason}` : ''}`,
    data: {
      reason
    }
  };
  
  return await createNotification(userId, notification);
};

// ============================================
// WELCOME NOTIFICATION
// ============================================

/**
 * Send welcome notification to new users
 * @param {string} userId - User ID
 * @param {string} userName - User's name
 * @returns {Promise<string>} Created notification ID
 */
export const notifyWelcome = async (userId, userName) => {
  const notification = {
    type: NOTIFICATION_TYPES.WELCOME,
    title: 'Welcome to UNISYNC!',
    message: `Hi ${userName}! Welcome to UNISYNC - your campus schedule management system. Start by uploading your class schedule.`,
    data: {}
  };
  
  return await createNotification(userId, notification);
};

export default {
  createNotification,
  notifyScheduleValidated,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  hasValidationNotification,
  // Announcement notifications
  notifyNewAnnouncement,
  notifyUrgentAnnouncement,
  notifyAnnouncementApproved,
  notifyAnnouncementRejected,
  notifyAnnouncementReaction,
  notifyAnnouncementComment,
  // Schedule notifications
  notifyNewStudentEnrolled,
  notifyScheduleCodeClaimed,
  // Faculty request notifications
  notifyFacultyRequestApproved,
  notifyFacultyRequestRejected,
  // Welcome notification
  notifyWelcome
};
