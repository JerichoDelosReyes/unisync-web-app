import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, ROLE_DISPLAY_NAMES, ROLES } from '../contexts/AuthContext'
import { getAnnouncementsForUser, getPendingAnnouncements, PRIORITY_LEVELS } from '../services/announcementService'
import { getUserPendingRequest, getUserRequestHistory } from '../services/facultyRequestService'
import FacultyOnboardingModal from '../components/ui/FacultyOnboardingModal'
import FacultyRequestModal from '../components/ui/FacultyRequestModal'

/**
 * Get pastel tag color based on tag type
 * Returns Tailwind classes for pastel pill design
 */
const getTagColor = (tag) => {
  if (tag.startsWith('dept:')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
  if (tag.startsWith('program:')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
  if (tag.startsWith('org:')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
  if (tag.startsWith('year:')) return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
  if (tag.startsWith('section:')) return 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300'
  if (tag.startsWith('college:')) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

/**
 * Format tag for display with shortened, readable names
 * Examples:
 * - org:CSC:COMMITTEE:INTERNAL_AFFAIRS → CSC:CMTE:INTERNAL
 * - org:CSC:YEAR_REP:1 → CSC:YR_REP:1ST
 * - dept:DCS → DCS
 * - year:3 → 3rd Year
 */
const formatTagDisplay = (tag) => {
  if (!tag) return ''
  
  // Committee tags: org:CODE:COMMITTEE:NAME → CODE:CMTE:SHORT_NAME
  if (tag.includes(':COMMITTEE:')) {
    const parts = tag.split(':')
    const orgCode = parts[1] || ''
    const committeeFull = parts[3] || ''
    
    const committeeShortNames = {
      'INTERNAL_AFFAIRS': 'INTERNAL',
      'EXTERNAL_AFFAIRS': 'EXTERNAL',
      'MEMBERSHIP_DUES': 'MEMBERSHIP',
      'SECRETARIAT': 'SECRETARIAT',
      'PUBLICITY': 'PUBLICITY',
      'MULTIMEDIA': 'MULTIMEDIA',
      'FINANCE_SPONSORSHIP': 'FINANCE',
      'AUDITS': 'AUDITS'
    }
    
    const shortName = committeeShortNames[committeeFull] || committeeFull
    return `${orgCode}:CMTE:${shortName}`
  }
  
  // Year Rep tags: org:CODE:YEAR_REP:N → CODE:YR_REP:Nth
  if (tag.includes(':YEAR_REP:')) {
    const parts = tag.split(':')
    const orgCode = parts[1] || ''
    const yearNum = parts[3] || ''
    
    const yearSuffix = { '1': '1ST', '2': '2ND', '3': '3RD', '4': '4TH' }
    return `${orgCode}:YR_REP:${yearSuffix[yearNum] || yearNum}`
  }
  
  // Officer tags: org:CODE:OFFICER:POSITION → CODE:POSITION
  if (tag.includes(':OFFICER:')) {
    const parts = tag.split(':')
    const orgCode = parts[1] || ''
    const position = parts[3] || ''
    
    const positionShortNames = {
      'PRESIDENT': 'PRES',
      'VICE_PRESIDENT': 'VP',
      'VP_INTERNAL': 'VP_INT',
      'VP_EXTERNAL': 'VP_EXT',
      'SECRETARY': 'SEC',
      'SECRETARY_GENERAL': 'SEC_GEN',
      'TREASURER': 'TREAS',
      'TREASURER_GENERAL': 'TREAS_GEN',
      'AUDITOR': 'AUD',
      'PRO': 'PRO',
      'ADVISER': 'ADV'
    }
    
    const shortPos = positionShortNames[position] || position
    return `${orgCode}:${shortPos}`
  }
  
  // Year level tags: year:N → Nth Year
  if (tag.startsWith('year:')) {
    const year = tag.split(':')[1]
    const ordinals = { '1': '1st', '2': '2nd', '3': '3rd', '4': '4th' }
    return `${ordinals[year] || year} Year`
  }
  
  // Section tags: section:X → Section X
  if (tag.startsWith('section:')) {
    return `Section ${tag.split(':')[1]}`
  }
  
  // Department tags: dept:X → X
  if (tag.startsWith('dept:')) {
    return tag.split(':')[1]
  }
  
  // Program tags: program:X → X
  if (tag.startsWith('program:')) {
    return tag.split(':')[1]
  }
  
  // Simple org tags: org:CODE → CODE
  if (tag.startsWith('org:') && tag.split(':').length === 2) {
    return tag.split(':')[1]
  }
  
  // Default: remove first prefix
  const colonIndex = tag.indexOf(':')
  if (colonIndex !== -1) {
    return tag.substring(colonIndex + 1)
  }
  return tag
}

/**
 * Dashboard Page
 * 
 * Main landing page after login. Shows role-specific content with real data.
 */
export default function Dashboard() {
  const { user, userProfile, hasMinRole, refreshProfile } = useAuth()
  const navigate = useNavigate()
  
  const [announcements, setAnnouncements] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showFacultyOnboarding, setShowFacultyOnboarding] = useState(false)
  const [showFacultyRequestModal, setShowFacultyRequestModal] = useState(false)
  const [pendingFacultyRequest, setPendingFacultyRequest] = useState(null)
  const [facultyRequestHistory, setFacultyRequestHistory] = useState([])
  const [facultyCardDismissed, setFacultyCardDismissed] = useState(() => {
    // Check localStorage on init
    return localStorage.getItem('facultyRequestCardDismissed') === 'true'
  })

  // Function to dismiss faculty request card
  const dismissFacultyCard = () => {
    localStorage.setItem('facultyRequestCardDismissed', 'true')
    setFacultyCardDismissed(true)
  }

  // Check if faculty needs onboarding
  useEffect(() => {
    if (userProfile) {
      const isFaculty = userProfile.role === 'faculty' || userProfile.role === ROLES.FACULTY
      const needsOnboarding = !userProfile.facultyOnboardingComplete && !userProfile.department
      
      if (isFaculty && needsOnboarding) {
        setShowFacultyOnboarding(true)
      }
    }
  }, [userProfile])

  // Handle faculty onboarding completion
  const handleFacultyOnboardingComplete = async (data) => {
    console.log('Faculty onboarding complete:', data)
    setShowFacultyOnboarding(false)
    
    // Refresh user profile to get updated data
    if (refreshProfile) {
      await refreshProfile()
    }
  }

  // Check for pending faculty request
  useEffect(() => {
    const checkFacultyRequest = async () => {
      if (!user || !userProfile) return
      
      // Only check for students and class reps
      const canRequest = userProfile.role === ROLES.STUDENT || userProfile.role === ROLES.CLASS_REP
      if (!canRequest) return
      
      try {
        const pending = await getUserPendingRequest(user.uid)
        setPendingFacultyRequest(pending)
        
        const history = await getUserRequestHistory(user.uid)
        setFacultyRequestHistory(history)
      } catch (error) {
        console.error('Error checking faculty request:', error)
      }
    }
    
    checkFacultyRequest()
  }, [user, userProfile])

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

  // Minimalist SVG icons for stats
  const StatIcons = {
    announcement: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    calendar: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    users: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    bolt: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    priority: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  // Dynamic stats based on real data with navigation links
  const studentStats = [
    { label: 'Total Announcements', value: announcements.length.toString(), icon: StatIcons.announcement, color: 'bg-blue-50 text-blue-600', link: '/announcements' },
    { label: 'Today\'s Posts', value: todayAnnouncements.length.toString(), icon: StatIcons.calendar, color: 'bg-green-50 text-green-600', link: '/announcements' },
    { label: 'My Organizations', value: userOrgsCount.toString(), icon: StatIcons.users, color: 'bg-purple-50 text-purple-600', link: '/organizations' },
    { label: 'Important', value: urgentAnnouncements.length.toString(), icon: StatIcons.bolt, color: 'bg-orange-50 text-orange-600', link: '/announcements' }
  ]

  const adminStats = [
    { label: 'Pending Moderation', value: pendingCount.toString(), icon: StatIcons.warning, color: 'bg-yellow-50 text-yellow-600', link: '/moderation' },
    { label: 'Total Announcements', value: announcements.length.toString(), icon: StatIcons.announcement, color: 'bg-blue-50 text-blue-600', link: '/announcements' },
    { label: 'Today\'s Posts', value: todayAnnouncements.length.toString(), icon: StatIcons.calendar, color: 'bg-green-50 text-green-600', link: '/announcements' },
    { label: 'Urgent/High Priority', value: urgentAnnouncements.length.toString(), icon: StatIcons.priority, color: 'bg-red-50 text-red-600', link: '/announcements' }
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
        return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
      case PRIORITY_LEVELS.HIGH:
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400'
      case PRIORITY_LEVELS.NORMAL:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Welcome to UNISYNC, {userProfile?.givenName}. Here's what's happening today.
        </p>
      </div>

      {/* Role Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-3 py-1 text-sm font-medium bg-primary/10 dark:bg-primary/20 text-primary rounded-full">
          {ROLE_DISPLAY_NAMES[userProfile?.role] || 'Student'}
        </span>
        {userProfile?.tags?.length > 0 && (
          userProfile.tags.map((tag, index) => (
            <span key={index} className={`px-3 py-1 text-sm font-medium rounded-full ${getTagColor(tag)}`}>
              {formatTagDisplay(tag)}
            </span>
          ))
        )}
      </div>

      {/* Stats Cards - Clickable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div 
            key={index} 
            onClick={() => navigate(stat.link)}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md hover:border-primary/50 dark:hover:border-primary/50 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {loading ? (
                    <span className="inline-block w-8 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
                  ) : (
                    stat.value
                  )}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${stat.color} dark:opacity-90 flex items-center justify-center text-xl`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Faculty Role Request Card - Only for students/class reps, hidden if dismissed */}
      {(userProfile?.role === ROLES.STUDENT || userProfile?.role === ROLES.CLASS_REP) && !facultyCardDismissed && (
        <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800 p-4 sm:p-6 relative">
          {/* Dismiss/Close Button */}
          <button
            onClick={dismissFacultyCard}
            className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-colors z-10"
            title="Don't show again"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pr-8 sm:pr-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Faculty Role Verification</h3>
                {pendingFacultyRequest ? (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 rounded-full text-sm font-medium">
                      <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                      Request Pending
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Your faculty role request is being reviewed. You'll be notified once it's processed.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Submitted: {pendingFacultyRequest.createdAt?.toDate?.().toLocaleDateString() || 'Recently'}
                    </p>
                  </div>
                ) : facultyRequestHistory.find(r => r.status === 'rejected') ? (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
                      Previous Request Rejected
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {facultyRequestHistory.find(r => r.status === 'rejected')?.rejectionReason || 'Your previous request was not approved.'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">You can submit a new request with updated information.</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Are you a faculty member? Request verification to access faculty features like viewing your class schedules.
                  </p>
                )}
              </div>
            </div>
            {!pendingFacultyRequest && (
              <button
                onClick={() => setShowFacultyRequestModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex-shrink-0 text-center"
              >
                Request Faculty Role
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recent Announcements Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Announcements</h2>
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
                <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.slice(0, 5).map((announcement) => (
              <div 
                key={announcement.id} 
                onClick={() => navigate('/announcements', { state: { selectedAnnouncementId: announcement.id } })}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                  {announcement.priority === PRIORITY_LEVELS.URGENT ? (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : announcement.priority === PRIORITY_LEVELS.HIGH ? (
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{announcement.title}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${getPriorityBadge(announcement.priority)}`}>
                      {announcement.priority?.toUpperCase() || 'NORMAL'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{announcement.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatTimeAgo(announcement.createdAt)}</p>
                    <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                    <p className="text-xs text-gray-400 dark:text-gray-500">by {announcement.authorName}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Faculty Onboarding Modal */}
      <FacultyOnboardingModal
        isOpen={showFacultyOnboarding}
        userProfile={userProfile}
        onComplete={handleFacultyOnboardingComplete}
      />

      {/* Faculty Request Modal */}
      {showFacultyRequestModal && (
        <FacultyRequestModal
          user={user}
          userProfile={userProfile}
          onClose={() => setShowFacultyRequestModal(false)}
          onSuccess={async () => {
            const pending = await getUserPendingRequest(user.uid)
            setPendingFacultyRequest(pending)
          }}
        />
      )}
    </div>
  )
}
