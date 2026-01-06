/**
 * Notification Service
 * 
 * Manages user notifications for schedule validation and other events.
 */

import { db, messaging } from '../config/firebase';
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
import { getToken, onMessage } from 'firebase/messaging';
import { NOTIFICATION_TYPES } from '../constants/scheduleConfig';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Send push notification to a specific user (uses their FCM tokens)
 * @param {string} userId - Target user ID
 * @param {Object} pushData - Push notification data {title, body, ...data}
 * @returns {Promise<void>}
 */
const sendPushToUser = async (userId, pushData) => {
  try {
    if (!userId || !pushData) return;
    
    // Get user document to fetch FCM tokens
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log(`User ${userId} not found`);
      return;
    }
    
    const userData = userSnap.data();
    const fcmTokens = userData.fcmTokens || {};
    const notificationPreferences = userData.notificationPreferences || {};
    
    // Filter tokens for active devices
    const activeTokens = Object.values(fcmTokens)
      .filter(t => t && t.token && !t.revoked)
      .map(t => t.token);
    
    if (activeTokens.length === 0) {
      console.log(`No active FCM tokens for user ${userId}`);
      return;
    }
    
    // Check if user has notifications enabled (optional preference check)
    // You can add type-specific checks here if needed
    
    console.log(`Sending push notification to ${activeTokens.length} devices for user ${userId}`);
    // Note: Actual sending happens via Cloud Functions in production
    // This logs intent for client-side tracking
  } catch (error) {
    console.error('Error sending push notification:', error);
    // Don't throw - push notifications are non-critical
  }
};

/**
 * Create a notification for a user and send push if enabled
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
    
    // Also send push notification alongside in-app notification
    await sendPushToUser(userId, {
      title: notification.title,
      body: notification.message,
      type: notification.type,
      ...notification.data
    });
    
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
// ROOM BOOKING NOTIFICATIONS
// ============================================

/**
 * Notify user when their room booking is confirmed
 * @param {string} userId - User ID of the person who booked
 * @param {Object} bookingInfo - Booking details
 * @returns {Promise<string>} Created notification ID
 */
export const notifyRoomBookingConfirmed = async (userId, bookingInfo) => {
  const notification = {
    type: 'room_booking_confirmed',
    title: 'Room Booking Confirmed',
    message: `Your booking for ${bookingInfo.roomName} on ${bookingInfo.day} (${bookingInfo.startTime} - ${bookingInfo.endTime}) has been confirmed.`,
    data: {
      bookingId: bookingInfo.bookingId,
      roomName: bookingInfo.roomName,
      roomId: bookingInfo.roomId,
      day: bookingInfo.day,
      startTime: bookingInfo.startTime,
      endTime: bookingInfo.endTime,
      purpose: bookingInfo.purpose
    }
  };
  
  return await createNotification(userId, notification);
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

/**
 * Notify admins when a new faculty request is submitted
 * @param {Object} requestInfo - Request information
 * @returns {Promise<Array>} Array of created notification IDs
 */
export const notifyAdminsNewFacultyRequest = async (requestInfo = {}) => {
  try {
    // Get all admin and super_admin users
    const usersRef = collection(db, 'users');
    const adminQuery = query(usersRef, where('role', 'in', ['admin', 'super_admin']));
    const adminSnapshot = await getDocs(adminQuery);
    
    if (adminSnapshot.empty) {
      console.log('No admins found to notify');
      return [];
    }
    
    const notification = {
      type: NOTIFICATION_TYPES.FACULTY_REQUEST_SUBMITTED,
      title: 'New Faculty Request',
      message: `${requestInfo.userName || 'A student'} has submitted a request to become a faculty member${requestInfo.department ? ` for ${requestInfo.department}` : ''}.`,
      data: {
        requestId: requestInfo.requestId || '',
        userId: requestInfo.userId || '',
        userName: requestInfo.userName || '',
        userEmail: requestInfo.userEmail || '',
        department: requestInfo.department || ''
      }
    };
    
    // Send notification to each admin
    const notificationPromises = adminSnapshot.docs.map(adminDoc => 
      createNotification(adminDoc.id, notification)
    );
    
    const results = await Promise.all(notificationPromises);
    console.log(`Notified ${results.length} admins about new faculty request`);
    return results;
  } catch (error) {
    console.error('Error notifying admins about faculty request:', error);
    // Don't throw - notification failure shouldn't block the request
    return [];
  }
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
  // Room booking notifications
  notifyRoomBookingConfirmed,
  // Faculty request notifications
  notifyFacultyRequestApproved,
  notifyFacultyRequestRejected,
  notifyAdminsNewFacultyRequest,
  // Welcome notification
  notifyWelcome
};

// ============================================
// PUSH NOTIFICATIONS (PWA)
// ============================================

// VAPID key - Get this from Firebase Console > Project Settings > Cloud Messaging
const VAPID_KEY = 'BBd3_uI8pU3s44K3aUxVsCEk-tQU72tWhWNCVHYrtzOYmFOup8sJ4KKDv3FT-7QDA1LvhxxUEeQMMX09zMCpwkM';

/**
 * Request notification permission from user
 * @returns {Promise<string>} Permission status
 */
export const requestPushNotificationPermission = async () => {
  try {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return 'unsupported';
    }

    if (!messaging) {
      console.log('Firebase Messaging not initialized');
      return 'unavailable';
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    throw error;
  }
};

/**
 * Get FCM token for the current device
 * @param {string} userId - User's UID
 * @returns {Promise<string|null>} FCM token or null
 */
export const getFCMToken = async (userId) => {
  try {
    if (!messaging) {
      console.log('Messaging not supported');
      return null;
    }

    // Register service worker with correct scope
    if ('serviceWorker' in navigator) {
      // First, check if service worker is already registered
      let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      
      if (!registration) {
        // Register the service worker
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        console.log('Service Worker registered:', registration.scope);
      } else {
        console.log('Service Worker already registered:', registration.scope);
      }
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('Service Worker ready');

      // Get FCM token with explicit VAPID key
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('FCM Token obtained:', token.substring(0, 20) + '...');
        
        // Save token to user profile
        await saveFCMToken(userId, token);
        
        return token;
      } else {
        console.log('No registration token available. Check VAPID key and permissions.');
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    // Provide more specific error info
    if (error.code === 'messaging/permission-blocked') {
      console.error('Notifications blocked by user');
    } else if (error.code === 'messaging/unsupported-browser') {
      console.error('Browser does not support messaging');
    }
    return null;
  }
};

/**
 * Save FCM token to user's Firestore document
 * @param {string} userId - User's UID
 * @param {string} token - FCM token
 */
export const saveFCMToken = async (userId, token) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('User document not found');
      return;
    }
    
    const existingTokens = userDoc.data().fcmTokens || {};
    
    // Check if token already exists (avoid duplicates)
    const tokenExists = Object.values(existingTokens).some(
      t => t && t.token === token && !t.revoked
    );
    
    if (tokenExists) {
      console.log('FCM token already saved, updating timestamp');
      // Update the existing token's timestamp
      for (const [key, value] of Object.entries(existingTokens)) {
        if (value && value.token === token) {
          await updateDoc(userRef, {
            [`fcmTokens.${key}.lastUpdated`]: new Date().toISOString(),
            notificationsEnabled: true
          });
          break;
        }
      }
    } else {
      // Create new token entry with domain info
      const deviceId = `web_${window.location.hostname}_${Date.now()}`;
      
      await updateDoc(userRef, {
        [`fcmTokens.${deviceId}`]: {
          token: token,
          lastUpdated: new Date().toISOString(),
          platform: 'web',
          domain: window.location.hostname,
          userAgent: navigator.userAgent.substring(0, 200),
          revoked: false
        },
        notificationsEnabled: true,
        lastTokenUpdate: new Date().toISOString()
      });
      
      console.log('New FCM token saved to Firestore for domain:', window.location.hostname);
    }
  } catch (error) {
    console.error('Error saving FCM token:', error);
    throw error;
  }
};

/**
 * Setup foreground message listener
 * @param {Function} callback - Callback function to handle message
 * @returns {Function} Unsubscribe function
 */
export const setupForegroundMessageListener = (callback) => {
  if (!messaging) return () => {};

  const unsubscribe = onMessage(messaging, async (payload) => {
    console.log('Message received in foreground:', payload);
    
    // Show notification even when app is in foreground
    // Use service worker notification for Safari compatibility
    if (Notification.permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(payload.notification?.title || 'UNISYNC', {
          body: payload.notification?.body || '',
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: payload.data?.type || 'general',
          data: payload.data,
          requireInteraction: false,
          silent: false
        });
      } catch (err) {
        // Fallback to native Notification API
        console.log('Using fallback notification:', err);
        new Notification(payload.notification?.title || 'UNISYNC', {
          body: payload.notification?.body || '',
          icon: '/pwa-192x192.png',
          tag: payload.data?.type || 'general'
        });
      }
    }
    
    // Call custom callback
    if (callback) callback(payload);
  });

  return unsubscribe;
};

/**
 * Update user's notification preferences
 * @param {string} userId - User's UID
 * @param {object} preferences - Notification preferences
 */
export const updatePushNotificationPreferences = async (userId, preferences) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      notificationPreferences: {
        announcements: preferences.announcements ?? true,
        roomBookings: preferences.roomBookings ?? true,
        facultyRequests: preferences.facultyRequests ?? true,
        scheduleUpdates: preferences.scheduleUpdates ?? true,
        systemAlerts: preferences.systemAlerts ?? true,
        comments: preferences.comments ?? true,
        reactions: preferences.reactions ?? true,
        ...preferences
      },
      lastPreferencesUpdate: new Date().toISOString()
    });
    
    console.log('Notification preferences updated');
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
};

/**
 * Check if notifications are supported and enabled
 * @returns {object} Notification status
 */
export const getPushNotificationStatus = () => {
  const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
  const permission = isSupported ? Notification.permission : 'unsupported';
  const isEnabled = permission === 'granted';
  const canRequest = permission === 'default';
  
  return {
    isSupported,
    permission,
    isEnabled,
    canRequest,
    hasMessaging: !!messaging
  };
};

/**
 * Send a test notification
 */
export const sendTestPushNotification = () => {
  if (Notification.permission === 'granted') {
    new Notification('Test Notification', {
      body: 'This is a test notification from UNISYNC',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png'
    });
  }
};

