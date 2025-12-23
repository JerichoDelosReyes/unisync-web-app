/**
 * Faculty Requests Page
 * 
 * Admin-only page to view and manage faculty role requests.
 * Allows approving or rejecting requests with reasons.
 */

import { useState, useEffect } from 'react'
import { useAuth, ROLES } from '../contexts/AuthContext'
import { 
  getAllFacultyRequests, 
  approveFacultyRequest, 
  rejectFacultyRequest,
  REQUEST_STATUS 
} from '../services/facultyRequestService'

export default function FacultyRequests() {
  const { user } = useAuth()
  
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [actionModal, setActionModal] = useState({ show: false, type: null })
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  // Load requests
  useEffect(() => {
    loadRequests()
  }, [statusFilter])

  const loadRequests = async () => {
    setIsLoading(true)
    try {
      const status = statusFilter === 'all' ? null : statusFilter
      const data = await getAllFacultyRequests(status)
      setRequests(data)
    } catch (error) {
      console.error('Error loading faculty requests:', error)
      showToast('Failed to load requests', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000)
  }

  const handleApprove = async () => {
    if (!selectedRequest) return
    
    setIsProcessing(true)
    try {
      await approveFacultyRequest(selectedRequest.id, user.uid)
      showToast(`Approved faculty request for ${selectedRequest.userName}`)
      setActionModal({ show: false, type: null })
      setSelectedRequest(null)
      loadRequests()
    } catch (error) {
      console.error('Error approving request:', error)
      showToast(error.message || 'Failed to approve request', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return
    if (!rejectionReason.trim()) {
      showToast('Please provide a reason for rejection', 'error')
      return
    }
    
    setIsProcessing(true)
    try {
      await rejectFacultyRequest(selectedRequest.id, user.uid, rejectionReason)
      showToast(`Rejected faculty request for ${selectedRequest.userName}`)
      setActionModal({ show: false, type: null })
      setSelectedRequest(null)
      setRejectionReason('')
      loadRequests()
    } catch (error) {
      console.error('Error rejecting request:', error)
      showToast(error.message || 'Failed to reject request', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case REQUEST_STATUS.PENDING:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case REQUEST_STATUS.APPROVED:
        return 'bg-green-100 text-green-700 border-green-200'
      case REQUEST_STATUS.REJECTED:
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const pendingCount = requests.filter(r => r.status === REQUEST_STATUS.PENDING).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faculty Requests</h1>
          <p className="text-gray-600 mt-1">Review and manage faculty role requests from users.</p>
        </div>
        {statusFilter === 'pending' && pendingCount > 0 && (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
            {pendingCount} Pending
          </span>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 inline-flex gap-1">
        {[
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
          { value: 'all', label: 'All' }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center">
            <svg className="w-12 h-12 text-gray-300 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-500 mt-4">Loading requests...</p>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No Requests Found</h3>
          <p className="text-gray-500 mt-1">
            {statusFilter === 'pending' 
              ? 'There are no pending faculty requests at the moment.'
              : `No ${statusFilter} requests found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <div
              key={request.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Request Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {request.userName?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{request.userName}</h3>
                      <p className="text-sm text-gray-500">{request.userEmail}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusBadge(request.status)}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Department</p>
                      <p className="font-medium text-gray-900">{request.department}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Submitted</p>
                      <p className="font-medium text-gray-900">{formatDate(request.createdAt)}</p>
                    </div>
                    {request.reviewedAt && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Reviewed</p>
                        <p className="font-medium text-gray-900">{formatDate(request.reviewedAt)}</p>
                      </div>
                    )}
                  </div>

                  {/* ID Photo */}
                  {request.idPhotoUrl && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Faculty ID Photo</p>
                      <a 
                        href={request.idPhotoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img 
                          src={request.idPhotoUrl} 
                          alt="Faculty ID" 
                          className="h-40 object-contain bg-gray-100 rounded-lg border border-gray-200 hover:border-primary transition-colors cursor-pointer"
                        />
                      </a>
                      <p className="text-xs text-gray-500 mt-1">Click to view full size</p>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Additional Information</p>
                    <p className="text-gray-700 text-sm">{request.reason}</p>
                  </div>

                  {request.rejectionReason && (
                    <div className="bg-red-50 rounded-lg p-3 mt-3 border border-red-100">
                      <p className="text-xs text-red-600 uppercase tracking-wide mb-1">Rejection Reason</p>
                      <p className="text-red-700 text-sm">{request.rejectionReason}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {request.status === REQUEST_STATUS.PENDING && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setSelectedRequest(request)
                        setActionModal({ show: true, type: 'approve' })
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRequest(request)
                        setActionModal({ show: true, type: 'reject' })
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      {actionModal.show && actionModal.type === 'approve' && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-green-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Approve Faculty Request</h3>
                  <p className="text-green-100 text-sm">Confirm role upgrade</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                You are about to approve the faculty role request for:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="font-semibold text-gray-900">{selectedRequest.userName}</p>
                <p className="text-sm text-gray-500">{selectedRequest.userEmail}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Department: <span className="font-medium">{selectedRequest.department}</span>
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <strong>Note:</strong> This will immediately grant faculty role permissions to this user.
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setActionModal({ show: false, type: null })
                  setSelectedRequest(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Approve Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {actionModal.show && actionModal.type === 'reject' && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-red-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Reject Faculty Request</h3>
                  <p className="text-red-100 text-sm">Provide a reason for rejection</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                You are about to reject the faculty role request for:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="font-semibold text-gray-900">{selectedRequest.userName}</p>
                <p className="text-sm text-gray-500">{selectedRequest.userEmail}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Please explain why this request is being rejected..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors resize-none"
                />
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setActionModal({ show: false, type: null })
                  setSelectedRequest(null)
                  setRejectionReason('')
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Reject Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-in slide-in-from-bottom-4 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  )
}
