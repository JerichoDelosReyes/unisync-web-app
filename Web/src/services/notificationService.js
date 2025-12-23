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
  serverTimestamp
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
    let q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    if (options.unreadOnly) {
      q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('read', '==', false),
        orderBy('createdAt', 'desc')
      );
    }
    
    if (options.limit) {
      q = query(q, limit(options.limit));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
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

export default {
  createNotification,
  notifyScheduleValidated,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  hasValidationNotification
};
