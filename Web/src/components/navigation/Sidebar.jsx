import { NavLink, useLocation } from 'react-router-dom'
import { useAuth, ROLES, ROLE_DISPLAY_NAMES } from '../../contexts/AuthContext'
import logo from '../../assets/cvsu-logo.png'

/**
 * Sidebar Navigation Component
 * 
 * Role-aware navigation that only shows menu items the user is authorized to see.
 * Follows UNISYNC ruleset for role-based visibility.
 */

// Navigation items with role requirements
const navigationItems = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    minRole: null // Everyone can see
  },
  {
    name: 'Announcements',
    path: '/announcements',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    minRole: null // Everyone can see
  },
  {
    name: 'Review Announcements',
    path: '/announcement-review',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    minRole: null, // Custom check for Admin or Org President
    requiresReviewAccess: true // New flag for review access
  },
  {
    name: 'Schedule',
    path: '/schedule',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    minRole: null, // Everyone can see
    excludeRoles: [ROLES.ADMIN, ROLES.SUPER_ADMIN] // But not admins
  },
  {
    name: 'Rooms',
    path: '/rooms',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    minRole: null, // Everyone can see
    excludeRoles: [ROLES.ADMIN, ROLES.SUPER_ADMIN] // But not admins
  },
  {
    name: 'Org. Management',
    path: '/organizations',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    minRole: null, // Access controlled by custom check
    requiresOrgRole: true // Custom flag to check adviser/officer status
  },
  {
    name: 'User Management',
    path: '/users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    minRole: ROLES.FACULTY // Faculty and above
  },
  {
    name: 'Faculty Requests',
    path: '/faculty-requests',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    minRole: ROLES.ADMIN // Admin and above only
  },
  {
    name: 'Logs',
    path: '/logs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-6 4h6a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    minRole: ROLES.SUPER_ADMIN // Super Admin only
  },
  {
    name: 'System Settings',
    path: '/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    minRole: ROLES.SUPER_ADMIN // Super Admin only
  },
  {
    name: 'Schedule Archives',
    path: '/archives',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    minRole: ROLES.SUPER_ADMIN // Super Admin only
  }
]

export default function Sidebar({ isOpen, onClose }) {
  const { userProfile, hasMinRole } = useAuth()
  const location = useLocation()

  // Check if user can manage organizations (is adviser or any officer)
  const canManageOrgs = () => {
    // Admin always has access
    if (hasMinRole(ROLES.ADMIN)) return true
    
    // Check if user is an adviser
    if (userProfile?.adviserOf && Object.keys(userProfile.adviserOf).length > 0) {
      return true
    }
    
    // Check if user is ANY officer (not just president)
    if (userProfile?.officerOf && Object.keys(userProfile.officerOf).length > 0) {
      return true
    }
    
    return false
  }

  // Check if user can review announcements (Admin or Org President)
  const canReviewAnnouncements = () => {
    // Admin always has access
    if (hasMinRole(ROLES.ADMIN)) return true
    
    // Check if user is an Org President (has canTagOfficers = true)
    if (userProfile?.officerOf) {
      return Object.values(userProfile.officerOf).some(org => org.canTagOfficers === true)
    }
    
    return false
  }

  // Filter navigation items based on user role
  const visibleNavItems = navigationItems.filter(item => {
    // Check if user's role is excluded
    if (item.excludeRoles && item.excludeRoles.includes(userProfile?.role)) {
      return false
    }
    
    // Check for organization management access
    if (item.requiresOrgRole) {
      return canManageOrgs()
    }
    
    // Check for announcement review access (Admin or Org President)
    if (item.requiresReviewAccess) {
      return canReviewAnnouncements()
    }
    
    if (!item.minRole) return true
    return hasMinRole(item.minRole)
  })

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
            <img src={logo} alt="CvSU" className="h-10 w-auto" />
            <div>
              <h1 className="text-lg font-bold text-primary">UNISYNC</h1>
              <p className="text-[10px] text-gray-500 leading-tight">CvSU Imus Campus</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <ul className="space-y-1">
              {visibleNavItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-colors duration-150
                      ${isActive 
                        ? 'bg-primary text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    {item.icon}
                    {item.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* User Info at Bottom */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold text-sm">
                  {userProfile?.givenName?.[0]}{userProfile?.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userProfile?.displayName || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {ROLE_DISPLAY_NAMES[userProfile?.role] || 'Student'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
