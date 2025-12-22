import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, ROLE_DISPLAY_NAMES, ROLES } from '../contexts/AuthContext'
import { getAnnouncementsForUser, getPendingAnnouncements, PRIORITY_LEVELS } from '../services/announcementService'

/**
 * Dashboard Page
 * 
 * Main landing page after login. Shows role-specific content with real data.
 */
export default function Dashboard() {
  const { user, userProfile, hasMinRole } = useAuth()
  const navigate = useNavigate()
  
  const [announcements, setAnnouncements] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Fetch real announcement data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        const userTags = userProfile?.tags || []
        const data = await getAnnouncementsForUser(userTags, { userId: user?.uid })
        setAnnouncements(data)
        
        // Fetch pending count if user can moderate
        if (hasMinRole(ROLES.ADMIN)) {
          const pending = await getPendingAnnouncements()
          setPendingCount(pending.length)
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (userProfile) {
      fetchData()
    }
  }, [userProfile, user, hasMinRole])

  // Calculate stats from real data
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const todayAnnouncements = announcements.filter(a => {
    const createdAt = a.createdAt?.toDate?.() || new Date(0)
    return createdAt >= today
  })
  
  const urgentAnnouncements = announcements.filter(a => 
    a.priority === PRIORITY_LEVELS.URGENT || a.priority === PRIORITY_LEVELS.HIGH
  )

  // Get user's organization count from tags
  const userOrgsCount = userProfile?.tags?.length || 0

  // Dynamic stats based on real data
  const studentStats = [
    { label: 'Total Announcements', value: announcements.length.toString(), icon: '📢', color: 'bg-blue-50 text-blue-600' },
    { label: 'Today\'s Posts', value: todayAnnouncements.length.toString(), icon: '📅', color: 'bg-green-50 text-green-600' },
    { label: 'My Organizations', value: userOrgsCount.toString(), icon: '👥', color: 'bg-purple-50 text-purple-600' },
    { label: 'Important', value: urgentAnnouncements.length.toString(), icon: '⚡', color: 'bg-orange-50 text-orange-600' }
  ]

  const adminStats = [
    { label: 'Pending Moderation', value: pendingCount.toString(), icon: '⚠️', color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Total Announcements', value: announcements.length.toString(), icon: '📢', color: 'bg-blue-50 text-blue-600' },
    { label: 'Today\'s Posts', value: todayAnnouncements.length.toString(), icon: '📅', color: 'bg-green-50 text-green-600' },
    { label: 'Urgent/High Priority', value: urgentAnnouncements.length.toString(), icon: '🔴', color: 'bg-red-50 text-red-600' }
  ]

  const stats = hasMinRole(ROLES.ADMIN) ? adminStats : studentStats

  // Format date for display
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now'
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString()
  }

  // Get priority color
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case PRIORITY_LEVELS.URGENT:
        return 'bg-red-100 text-red-700'
      case PRIORITY_LEVELS.HIGH:
        return 'bg-orange-100 text-orange-700'
      case PRIORITY_LEVELS.NORMAL:
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome to UNISYNC, {userProfile?.givenName}. Here's what's happening today.
        </p>
      </div>

      {/* Role Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full">
          {ROLE_DISPLAY_NAMES[userProfile?.role] || 'Student'}
        </span>
        {userProfile?.tags?.length > 0 && (
          userProfile.tags.map((tag, index) => (
            <span key={index} className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-700 rounded-full">
              {tag}
            </span>
          ))
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {loading ? (
                    <span className="inline-block w-8 h-6 bg-gray-200 rounded animate-pulse"></span>
                  ) : (
                    stat.value
                  )}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center text-xl`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button 
            onClick={() => navigate('/announcements')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Announcements</span>
          </button>

          <button 
            onClick={() => navigate('/schedule')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">View Schedule</span>
          </button>

          <button 
            onClick={() => navigate('/rooms')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Find Room</span>
          </button>

          <button 
            onClick={() => navigate('/profile')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">My Profile</span>
          </button>
        </div>
      </div>

      {/* Recent Announcements Preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Announcements</h2>
          <button 
            onClick={() => navigate('/announcements')}
            className="text-sm text-primary hover:underline"
          >
            View all
          </button>
        </div>
        
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((_, index) => (
              <div key={index} className="flex items-start gap-4 p-3 rounded-lg animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-gray-200 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <p className="text-gray-500">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.slice(0, 5).map((announcement) => (
              <div 
                key={announcement.id} 
                onClick={() => navigate('/announcements')}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {announcement.priority === PRIORITY_LEVELS.URGENT ? (
                    <span className="text-lg">🔴</span>
                  ) : announcement.priority === PRIORITY_LEVELS.HIGH ? (
                    <span className="text-lg">🟠</span>
                  ) : (
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{announcement.title}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${getPriorityBadge(announcement.priority)}`}>
                      {announcement.priority?.toUpperCase() || 'NORMAL'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{announcement.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400">{formatTimeAgo(announcement.createdAt)}</p>
                    <span className="text-xs text-gray-300">•</span>
                    <p className="text-xs text-gray-400">by {announcement.authorName}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
