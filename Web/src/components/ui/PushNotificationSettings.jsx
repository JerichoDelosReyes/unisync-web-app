/**
 * Push Notification Settings Component
 * Allows users to enable/disable push notifications and manage preferences
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  requestPushNotificationPermission,
  getFCMToken,
  updatePushNotificationPreferences,
  getPushNotificationStatus,
  sendTestPushNotification
} from '../../services/notificationService'

export default function PushNotificationSettings() {
  const { user, userProfile } = useAuth()
  const [status, setStatus] = useState(getPushNotificationStatus())
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState({
    announcements: true,
    roomBookings: true,
    facultyRequests: true,
    scheduleUpdates: true,
    systemAlerts: true,
    comments: true,
    reactions: true
  })
  const [saving, setSaving] = useState(false)

  // Load user preferences
  useEffect(() => {
    if (userProfile?.notificationPreferences) {
      setPreferences(userProfile.notificationPreferences)
    }
  }, [userProfile])

  // Enable push notifications
  const handleEnablePushNotifications = async () => {
    setLoading(true)
    try {
      // Request permission
      const permission = await requestPushNotificationPermission()
      
      if (permission === 'granted') {
        // Get FCM token
        const token = await getFCMToken(user.uid)
        
        if (token) {
          setStatus(getPushNotificationStatus())
          alert('Push notifications enabled successfully!')
        } else {
          alert('Failed to get notification token. Please try again.')
        }
      } else if (permission === 'denied') {
        alert('Notification permission denied. Please enable notifications in your browser settings.')
      }
    } catch (error) {
      console.error('Error enabling push notifications:', error)
      alert('Failed to enable push notifications. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Save preferences
  const handleSavePreferences = async () => {
    setSaving(true)
    try {
      await updatePushNotificationPreferences(user.uid, preferences)
      alert('Notification preferences saved!')
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert('Failed to save preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Test notification
  const handleTestNotification = () => {
    if (status.isEnabled) {
      sendTestPushNotification()
    } else {
      alert('Please enable notifications first.')
    }
  }

  if (!status.isSupported) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Push Notifications</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications on your device</p>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Notifications Not Supported</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Your browser doesn't support push notifications. Try using a modern browser like Chrome, Edge, or Firefox.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            status.isEnabled 
              ? 'bg-green-100 dark:bg-green-900/30' 
              : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            <svg className={`w-6 h-6 ${
              status.isEnabled 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-gray-400'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Push Notifications</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {status.isEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>

        {!status.isEnabled && status.canRequest && (
          <button
            onClick={handleEnablePushNotifications}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Enabling...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Enable Notifications
              </>
            )}
          </button>
        )}
      </div>

      {status.permission === 'denied' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Notifications Blocked</p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                You've blocked notifications. To enable them, click the lock icon in your browser's address bar and allow notifications.
              </p>
            </div>
          </div>
        </div>
      )}

      {status.isEnabled && (
        <>
          <div className="space-y-4 mb-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Notification Types
            </h4>

            {/* Announcements */}
            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Announcements</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">New announcements for your year/course</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.announcements}
                onChange={(e) => setPreferences({ ...preferences, announcements: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
            </label>

            {/* Room Bookings */}
            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Room Bookings</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Quick room booking confirmations</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.roomBookings}
                onChange={(e) => setPreferences({ ...preferences, roomBookings: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
            </label>

            {/* Faculty Requests */}
            {(userProfile?.role === 'admin' || userProfile?.role === 'super_admin') && (
              <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Faculty Requests</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">New faculty verification requests</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.facultyRequests}
                  onChange={(e) => setPreferences({ ...preferences, facultyRequests: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
              </label>
            )}

            {/* Comments & Reactions */}
            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Comments & Reactions</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">When someone replies or reacts</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.comments && preferences.reactions}
                onChange={(e) => setPreferences({ 
                  ...preferences, 
                  comments: e.target.checked,
                  reactions: e.target.checked 
                })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
            </label>

            {/* System Alerts */}
            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">System Alerts</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Important system updates</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.systemAlerts}
                onChange={(e) => setPreferences({ ...preferences, systemAlerts: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSavePreferences}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>

            <button
              onClick={handleTestNotification}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Test
            </button>
          </div>
        </>
      )}
    </div>
  )
}
