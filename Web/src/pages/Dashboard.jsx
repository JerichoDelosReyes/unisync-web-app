import { useAuth, ROLE_DISPLAY_NAMES, ROLES } from '../contexts/AuthContext'

/**
 * Dashboard Page
 * 
 * Main landing page after login. Shows role-specific content.
 */
export default function Dashboard() {
  const { userProfile, hasMinRole } = useAuth()

  // Quick stats cards data
  const studentStats = [
    { label: 'New Announcements', value: '5', icon: '📢', color: 'bg-blue-50 text-blue-600' },
    { label: 'Upcoming Classes', value: '3', icon: '📚', color: 'bg-green-50 text-green-600' },
    { label: 'My Organizations', value: '2', icon: '👥', color: 'bg-purple-50 text-purple-600' },
    { label: 'Room Bookings', value: '1', icon: '🏫', color: 'bg-orange-50 text-orange-600' }
  ]

  const adminStats = [
    { label: 'Pending Moderation', value: '12', icon: '⚠️', color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Active Users', value: '2,547', icon: '👤', color: 'bg-blue-50 text-blue-600' },
    { label: 'Today\'s Announcements', value: '8', icon: '📢', color: 'bg-green-50 text-green-600' },
    { label: 'Room Conflicts', value: '2', icon: '🔴', color: 'bg-red-50 text-red-600' }
  ]

  const stats = hasMinRole(ROLES.ADMIN) ? adminStats : studentStats

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
      <div className="flex items-center gap-2">
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
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
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
          <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">View Schedule</span>
          </button>
          
          <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Announcements</span>
          </button>

          <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Find Room</span>
          </button>

          <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">AI Assistant</span>
          </button>
        </div>
      </div>

      {/* Recent Announcements Preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Announcements</h2>
          <a href="/announcements" className="text-sm text-primary hover:underline">View all</a>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((_, index) => (
            <div key={index} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900">Sample Announcement Title {index + 1}</h3>
                <p className="text-sm text-gray-500 truncate">This is a preview of the announcement content that will be shown here...</p>
                <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
