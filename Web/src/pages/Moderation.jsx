/**
 * Moderation Page
 * 
 * Visible only to Super Admin and Admin.
 * Shows reported announcements, moderation logs, and action controls.
 * 
 * WHO REVIEWS REPORTS:
 * - Super Admin: Full access to all reports, can take any action
 * - Admin: Can review and take action on reports
 * - Department Heads: Can view reports related to their department (future)
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  subscribeToReports, 
  subscribeToReportStats, 
  updateReportStatus,
  deleteReport 
} from '../services/reportService'
import { deleteAnnouncement } from '../services/announcementService'
import Toast from '../components/ui/Toast'

export default function Moderation() {
  const { user, userProfile } = useAuth()
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, reviewed: 0, dismissed: 0, actionTaken: 0, todayCount: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [selectedReport, setSelectedReport] = useState(null)
  const [actionModal, setActionModal] = useState({ open: false, report: null })
  const [reviewNotes, setReviewNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  // Subscribe to real-time reports updates
  useEffect(() => {
    setLoading(true)
    
    const unsubscribeReports = subscribeToReports(
      activeTab === 'all' ? null : activeTab,
      (reportsData) => {
        setReports(reportsData)
        setLoading(false)
      },
      (error) => {
        console.error('Error loading reports:', error)
        showToast('Failed to load reports', 'error')
        setLoading(false)
      }
    )
    
    return () => unsubscribeReports()
  }, [activeTab])

  // Subscribe to real-time stats updates
  useEffect(() => {
    const unsubscribeStats = subscribeToReportStats(
      (statsData) => {
        setStats(statsData)
      },
      (error) => {
        console.error('Error loading stats:', error)
      }
    )
    
    return () => unsubscribeStats()
  }, [])

  // Handle report actions
  const handleAction = async (action) => {
    if (!actionModal.report) return
    
    setProcessing(true)
    try {
      const reviewer = {
        uid: user.uid,
        name: `${userProfile?.givenName} ${userProfile?.lastName}`,
        email: user.email
      }

      if (action === 'dismiss') {
        await updateReportStatus(actionModal.report.id, 'dismissed', reviewer, reviewNotes)
        showToast('Report dismissed', 'success')
      } else if (action === 'warn') {
        await updateReportStatus(actionModal.report.id, 'reviewed', reviewer, reviewNotes || 'Warning issued to author')
        showToast('Report reviewed, warning noted', 'success')
      } else if (action === 'delete_announcement') {
        // Delete the announcement and update report
        if (actionModal.report.announcement) {
          await deleteAnnouncement(actionModal.report.announcementId)
        }
        await updateReportStatus(actionModal.report.id, 'action_taken', reviewer, reviewNotes || 'Announcement deleted')
        showToast('Announcement deleted and report resolved', 'success')
      } else if (action === 'delete_report') {
        await deleteReport(actionModal.report.id)
        showToast('Report deleted', 'success')
      }

      setActionModal({ open: false, report: null })
      setReviewNotes('')
      // Real-time updates will automatically refresh the data
    } catch (error) {
      console.error('Error processing action:', error)
      showToast('Failed to process action', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      reviewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      dismissed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      action_taken: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    }
    const labels = {
      pending: 'Pending',
      reviewed: 'Reviewed',
      dismissed: 'Dismissed',
      action_taken: 'Action Taken'
    }
    return (
      <span className={`px-2 py-1 text-xs font-bold rounded-full ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Moderation</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Review reported announcements and take appropriate actions.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Reports</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reviewed</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.reviewed}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Dismissed</p>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">{stats.dismissed}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Action Taken</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.actionTaken}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Today</p>
          <p className="text-2xl font-bold text-primary mt-1">{stats.todayCount}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'pending', label: 'Pending', count: stats.pending },
          { id: 'reviewed', label: 'Reviewed', count: stats.reviewed },
          { id: 'dismissed', label: 'Dismissed', count: stats.dismissed },
          { id: 'action_taken', label: 'Action Taken', count: stats.actionTaken },
          { id: 'all', label: 'All', count: stats.total }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-4">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Reports Found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {activeTab === 'pending' ? 'All caught up! No pending reports to review.' : `No ${activeTab.replace('_', ' ')} reports.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {reports.map(report => (
              <div 
                key={report.id} 
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(report.status)}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(report.createdAt)}
                      </span>
                    </div>
                    
                    {/* Reported Announcement */}
                    <div className="mb-2">
                      {report.announcement ? (
                        <p className="font-medium text-gray-900 dark:text-white line-clamp-1">
                          📢 {report.announcement.title}
                        </p>
                      ) : (
                        <p className="font-medium text-gray-400 dark:text-gray-500 italic">
                          [Announcement Deleted]
                        </p>
                      )}
                    </div>
                    
                    {/* Report Reason */}
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      <span className="font-medium text-orange-600 dark:text-orange-400">Reason:</span> {report.reason}
                    </p>
                    
                    {/* Reporter Info */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Reported by: {report.reporterName} ({report.reporterEmail})
                    </p>
                    
                    {/* Review Info (if reviewed) */}
                    {report.reviewedBy && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                        <p className="text-gray-600 dark:text-gray-300">
                          <span className="font-medium">Reviewed by:</span> {report.reviewedBy.name}
                        </p>
                        {report.reviewNotes && (
                          <p className="text-gray-500 dark:text-gray-400 mt-1">
                            <span className="font-medium">Notes:</span> {report.reviewNotes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  {report.status === 'pending' && (
                    <div className="flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActionModal({ open: true, report })
                        }}
                        className="px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                      >
                        Review
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Expanded View */}
                {selectedReport?.id === report.id && report.announcement && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                      {report.announcement.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                      {report.announcement.content}
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>By: {report.announcement.authorName}</span>
                      <span>•</span>
                      <span>Posted: {formatDate(report.announcement.createdAt)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-blue-900 dark:text-blue-100">Report Review Guidelines</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
              <li>• <strong>Dismiss:</strong> Report is invalid or content doesn't violate policies</li>
              <li>• <strong>Review:</strong> Content is borderline, issue warning to author</li>
              <li>• <strong>Delete:</strong> Content clearly violates policies, remove announcement</li>
              <li>• Reports are only visible to Super Admin and Admin roles</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {actionModal.open && actionModal.report && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => {
            setActionModal({ open: false, report: null })
            setReviewNotes('')
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Review Report</h3>
            
            {/* Report Summary */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {actionModal.report.announcement?.title || '[Deleted Announcement]'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Reported for: {actionModal.report.reason}
              </p>
            </div>
            
            {/* Review Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Review Notes (Optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes about your decision..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleAction('dismiss')}
                disabled={processing}
                className="px-4 py-2.5 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Dismiss Report
              </button>
              <button
                onClick={() => handleAction('warn')}
                disabled={processing}
                className="px-4 py-2.5 text-sm font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors disabled:opacity-50"
              >
                Issue Warning
              </button>
              {actionModal.report.announcement && (
                <button
                  onClick={() => handleAction('delete_announcement')}
                  disabled={processing}
                  className="px-4 py-2.5 text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 col-span-2"
                >
                  🗑️ Delete Announcement & Resolve
                </button>
              )}
            </div>
            
            <button
              onClick={() => {
                setActionModal({ open: false, report: null })
                setReviewNotes('')
              }}
              disabled={processing}
              className="w-full mt-3 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
