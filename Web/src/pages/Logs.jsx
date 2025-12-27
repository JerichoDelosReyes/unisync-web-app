/**
 * System Logs Page
 * 
 * Visible only to Super Admin.
 * Displays all system activity logs with filtering and pagination.
 */

import { useState, useEffect } from 'react'
import { useAuth, ROLES } from '../contexts/AuthContext'
import { 
  getLogs, 
  getLogStats,
  subscribeToLogs,
  LOG_CATEGORIES, 
  LOG_ACTIONS,
  ACTION_LABELS,
  CATEGORY_LABELS,
  CATEGORY_COLORS
} from '../services/logService'

export default function Logs() {
  const { userProfile } = useAuth()
  
  // State
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, today: 0 })
  const [lastDoc, setLastDoc] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [searchQuery, setSearchQuery] = useState('')
  
  // Real-time subscription for logs
  useEffect(() => {
    setLoading(true)
    
    const options = {
      pageSize: 50
    }
    
    if (selectedCategory) options.category = selectedCategory
    if (selectedAction) options.action = selectedAction
    if (dateRange.start) options.startDate = new Date(dateRange.start)
    if (dateRange.end) {
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999)
      options.endDate = endDate
    }
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToLogs(options, ({ logs: newLogs, hasMore: more, error }) => {
      if (error) {
        console.error('Error in logs subscription:', error)
      }
      setLogs(newLogs)
      setHasMore(more)
      setLoading(false)
    })
    
    // Cleanup subscription on unmount or filter change
    return () => unsubscribe()
  }, [selectedCategory, selectedAction, dateRange])
  
  // Load stats (not real-time, refresh periodically)
  useEffect(() => {
    loadStats()
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])
  
  const loadStats = async () => {
    try {
      const statsData = await getLogStats()
      setStats(statsData)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }
  
  const loadMoreLogs = async () => {
    if (!hasMore || loadingMore) return
    
    setLoadingMore(true)
    try {
      const options = {
        pageSize: 50,
        lastDoc
      }
      
      if (selectedCategory) options.category = selectedCategory
      if (selectedAction) options.action = selectedAction
      if (dateRange.start) options.startDate = new Date(dateRange.start)
      if (dateRange.end) {
        const endDate = new Date(dateRange.end)
        endDate.setHours(23, 59, 59, 999)
        options.endDate = endDate
      }
      
      const result = await getLogs(options)
      setLogs(prev => [...prev, ...result.logs])
      setLastDoc(result.lastDoc)
      setHasMore(result.hasMore)
    } catch (error) {
      console.error('Error loading more logs:', error)
    } finally {
      setLoadingMore(false)
    }
  }
  
  const handleLoadMore = () => {
    loadMoreLogs()
  }
  
  const clearFilters = () => {
    setSelectedCategory('')
    setSelectedAction('')
    setDateRange({ start: '', end: '' })
    setSearchQuery('')
  }
  
  // Get filtered actions based on selected category
  const getActionsForCategory = (category) => {
    if (!category) return Object.entries(LOG_ACTIONS)
    
    const categoryActions = {
      [LOG_CATEGORIES.AUTH]: ['LOGIN', 'LOGOUT', 'LOGIN_FAILED'],
      [LOG_CATEGORIES.USER_MANAGEMENT]: ['ROLE_CHANGE', 'TAG_ADD', 'TAG_REMOVE'],
      [LOG_CATEGORIES.ANNOUNCEMENTS]: ['ANNOUNCEMENT_CREATE', 'ANNOUNCEMENT_APPROVE', 'ANNOUNCEMENT_REJECT', 'ANNOUNCEMENT_DELETE', 'ANNOUNCEMENT_EDIT'],
      [LOG_CATEGORIES.MODERATION]: ['COMMENT_APPROVE', 'COMMENT_REJECT', 'REPORT_RESOLVE'],
      [LOG_CATEGORIES.SCHEDULE]: ['SCHEDULE_ARCHIVE', 'SCHEDULE_RESET'],
      [LOG_CATEGORIES.SYSTEM]: ['SETTINGS_UPDATE', 'SEMESTER_UPDATE'],
      [LOG_CATEGORIES.FACULTY_REQUESTS]: ['FACULTY_REQUEST_APPROVE', 'FACULTY_REQUEST_REJECT', 'FACULTY_REQUEST_SUBMIT']
    }
    
    const actions = categoryActions[category] || []
    return actions.map(key => [key, LOG_ACTIONS[key]])
  }
  
  // Filter logs by search query (client-side)
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      log.performedBy?.name?.toLowerCase().includes(query) ||
      log.performedBy?.email?.toLowerCase().includes(query) ||
      log.targetUser?.name?.toLowerCase().includes(query) ||
      log.targetUser?.email?.toLowerCase().includes(query) ||
      log.description?.toLowerCase().includes(query)
    )
  })
  
  // Format timestamp
  const formatTimestamp = (date) => {
    if (!date) return 'Unknown'
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }
  
  // Check access
  if (userProfile?.role !== ROLES.SUPER_ADMIN) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">Only Super Admins can view system logs.</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
        <p className="text-gray-600 mt-1">Monitor all system activity and user actions.</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total?.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-500">Total Logs</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.today?.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-500">Today</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats[LOG_CATEGORIES.USER_MANAGEMENT]?.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-500">User Actions</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats[LOG_CATEGORIES.MODERATION]?.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-500">Moderation</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by user or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              setSelectedAction('')
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Categories</option>
            {Object.entries(LOG_CATEGORIES).map(([key, value]) => (
              <option key={key} value={value}>{CATEGORY_LABELS[value]}</option>
            ))}
          </select>
          
          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Actions</option>
            {getActionsForCategory(selectedCategory).map(([key, value]) => (
              <option key={key} value={value}>{ACTION_LABELS[value] || value}</option>
            ))}
          </select>
          
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          {/* Clear Filters */}
          {(selectedCategory || selectedAction || dateRange.start || dateRange.end || searchQuery) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
      
      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading logs...</p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">No logs found</h3>
              <p className="text-gray-500 mt-1">
                {selectedCategory || selectedAction || dateRange.start 
                  ? 'Try adjusting your filters.' 
                  : 'System logs will appear here as actions are performed.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performed By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${CATEGORY_COLORS[log.category] || 'bg-gray-100 text-gray-800'}`}>
                          {CATEGORY_LABELS[log.category] || log.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ACTION_LABELS[log.action] || log.action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium">
                            {log.performedBy?.name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{log.performedBy?.name || 'System'}</p>
                            <p className="text-xs text-gray-500">{log.performedBy?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.targetUser ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">{log.targetUser.name}</p>
                            <p className="text-xs text-gray-500">{log.targetUser.email}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                        <div className="truncate" title={JSON.stringify(log.details)}>
                          {log.description || '—'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Load More */}
            {hasMore && (
              <div className="px-6 py-4 border-t border-gray-200 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </span>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="text-center text-sm text-gray-500">
        Showing {filteredLogs.length} of {logs.length} logs loaded • Logs are retained indefinitely
      </div>
    </div>
  )
}
