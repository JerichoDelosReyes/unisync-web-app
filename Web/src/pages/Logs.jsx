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
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10
  
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
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex)
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, selectedAction, dateRange, searchQuery])
  
  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      }
    }
    
    return pages
  }
  
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">System Logs</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Monitor all system activity and user actions.</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total?.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Logs</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.today?.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Today</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats[LOG_CATEGORIES.USER_MANAGEMENT]?.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">User Actions</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats[LOG_CATEGORIES.MODERATION]?.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Moderation</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col gap-4">
          {/* Search - Full Width on Mobile */}
          <div className="w-full">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by user or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
          
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setSelectedAction('')
              }}
              className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Actions</option>
              {getActionsForCategory(selectedCategory).map(([key, value]) => (
                <option key={key} value={value}>{ACTION_LABELS[value] || value}</option>
              ))}
            </select>
            
            {/* Date Range */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="hidden sm:block text-gray-400 dark:text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            {/* Clear Filters */}
            {(selectedCategory || selectedAction || dateRange.start || dateRange.end || searchQuery) && (
              <button
                onClick={clearFilters}
                className="w-full sm:w-auto px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading logs...</p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No logs found</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
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
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Timestamp
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Category
                    </th>
                    <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Action
                    </th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Performed By
                    </th>
                    <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Target User
                    </th>
                    <th className="hidden xl:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${CATEGORY_COLORS[log.category] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>
                          {CATEGORY_LABELS[log.category] || log.category}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {ACTION_LABELS[log.action] || log.action}
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium">
                            {log.performedBy?.name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{log.performedBy?.name || 'System'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{log.performedBy?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                        {log.targetUser ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{log.targetUser.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{log.targetUser.email}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="hidden xl:table-cell px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                        <div className="truncate" title={JSON.stringify(log.details)}>
                          {log.description || '—'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} logs
                </div>
                <div className="flex items-center gap-1 flex-wrap justify-center">
                  {/* Previous Button */}
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  {/* Page Numbers */}
                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => page !== '...' && goToPage(page)}
                      disabled={page === '...'}
                      className={`min-w-[40px] px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        page === currentPage
                          ? 'bg-primary text-white'
                          : page === '...'
                          ? 'text-gray-400 dark:text-gray-500 cursor-default'
                          : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  {/* Next Button */}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            
            {/* Load More for fetching additional data from server */}
            {hasMore && currentPage === totalPages && (
              <div className="px-6 py-4 border-t border-gray-200 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      Loading more...
                    </span>
                  ) : (
                    'Load More Logs'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        Page {currentPage} of {totalPages || 1} • {filteredLogs.length} logs loaded • Logs are retained indefinitely
      </div>
    </div>
  )
}
