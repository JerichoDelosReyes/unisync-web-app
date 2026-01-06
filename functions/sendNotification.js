/**
 * Cloud Function to send FCM push notifications
 * Deploy with: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Map notification type to user preference key
 */
function mapNotificationTypeToPreference(type) {
  const mapping = {
    'new_comment': 'comments',
    'new_reaction': 'reactions',
    'new_announcement': 'announcements',
    'urgent_announcement': 'announcements',
    'room_booking_confirmed': 'roomBookings',
    'faculty_request_new': 'facultyRequests',
    'schedule_validated': 'scheduleUpdates',
    'system_alert': 'systemAlerts',
  };
  return mapping[type] || null;
}

/**
 * Check if notification is urgent (requires interaction)
 */
function isUrgent(type) {
  return type === 'urgent_announcement' || type === 'system_alert';
}

/**
 * Get notification link for web push
 */
function getNotificationLink(notification) {
  const baseUrl = process.env.APP_URL || 'https://unisync-imus.web.app';
  const data = notification.data || {};

  if (data.announcementId) {
    return `${baseUrl}/announcements`;
  }
  if (data.scheduleId) {
    return `${baseUrl}/schedule`;
  }
  if (data.roomId) {
    return `${baseUrl}/rooms`;
  }

  return baseUrl;
}

/**
 * Revoke an invalid token
 */
async function revokeToken(userRef, token) {
  try {
    // Find the token key and mark as revoked
    const userSnap = await userRef.get();
    const fcmTokens = userSnap.data().fcmTokens || {};

    for (const [key, value] of Object.entries(fcmTokens)) {
      if (value.token === token) {
        await userRef.update({
          [`fcmTokens.${key}.revoked`]: true,
          [`fcmTokens.${key}.revokedAt`]: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Token revoked: ${key}`);
        break;
      }
    }
  } catch (error) {
    console.error('Error revoking token:', error);
  }
}

/**
 * Send push notification to a user via their FCM tokens
 * Triggered when a notification document is created in Firestore
 */
exports.sendPushNotification = functions
  .region('us-central1')
  .firestore.document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    try {
      const notification = snap.data();
      const userId = notification.userId;
      const notificationId = snap.id;

      console.log(`Processing notification ${notificationId} for user ${userId}`);

      // Get user document to fetch FCM tokens
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        console.log(`User ${userId} not found`);
        return null;
      }

      const userData = userSnap.data();
      const fcmTokens = userData.fcmTokens || {};
      const notificationPreferences = userData.notificationPreferences || {};

      // Filter active tokens
      const activeTokens = Object.values(fcmTokens)
        .filter(t => t && t.token && !t.revoked)
        .map(t => t.token);

      if (activeTokens.length === 0) {
        console.log(`No active FCM tokens for user ${userId}`);
        return null;
      }

      // Check if user has notifications enabled for this type
      const notificationType = notification.type || 'general';
      const preferenceKey = mapNotificationTypeToPreference(notificationType);
      
      // Default to enabled if no preference set
      if (preferenceKey && notificationPreferences[preferenceKey] === false) {
        console.log(`User ${userId} has disabled ${notificationType} notifications`);
        return null;
      }

      // Prepare push notification payload
      const pushPayload = {
        notification: {
          title: notification.title || 'UNISYNC',
          body: notification.message || '',
        },
        webpush: {
          notification: {
            title: notification.title || 'UNISYNC',
            body: notification.message || '',
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            requireInteraction: isUrgent(notificationType),
          },
          fcmOptions: {
            link: getNotificationLink(notification),
          },
          data: {
            type: notificationType,
            ...(notification.data || {}),
          },
        },
        data: {
          type: notificationType,
          ...(notification.data || {}),
        },
      };

      // Send to all active tokens
      const sendPromises = activeTokens.map(token =>
        messaging.send({
          ...pushPayload,
          token,
        }).catch(error => {
          console.error(`Failed to send to token ${token}:`, error);
          // Mark token as revoked if invalid
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/mismatched-credential') {
            return revokeToken(userRef, token);
          }
          return Promise.reject(error);
        })
      );

      const results = await Promise.allSettled(sendPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`Push notification sent to ${successful} devices (${failed} failed) for user ${userId}`);

      // Update notification with push status
      await snap.ref.update({
        pushSent: true,
        pushSentAt: admin.firestore.FieldValue.serverTimestamp(),
        devicesNotified: successful,
      });

      return { success: true, devicesNotified: successful, failed };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }
  });
