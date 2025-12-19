import { useState, useEffect } from 'react'
import { useAuth, ROLES, ROLE_DISPLAY_NAMES, ROLE_HIERARCHY } from '../contexts/AuthContext'
import { getDocuments, updateDocument } from '../services/dbService'

/**
 * User Management Page
 * 
 * Visible only to Super Admin, Admin, and Faculty.
 * Features paginated user tables with role management.
 */
export default function UserManagement() {
  const { userProfile, getAssignableRoles } = useAuth()
  
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [updatingUserId, setUpdatingUserId] = useState(null)
  const [toast, setToast] = useState({ show: false, message: '', kind: 'info' })
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const usersPerPage = 10
  
  const assignableRoles = getAssignableRoles()

  // Show toast notification
  const showToast = (message, kind = 'info') => {
    setToast({ show: true, message, kind })
    setTimeout(() => setToast({ show: false, message: '', kind: 'info' }), 3000)
  }

  // Check if current user can change a specific user's role
  const canChangeUserRole = (targetUser) => {
    if (!userProfile || !targetUser) return false
    // Can't change your own role
    if (targetUser.id === userProfile.id) return false
    // Can only change roles of users with lower hierarchy
    const myLevel = ROLE_HIERARCHY[userProfile.role] || 0
    const targetLevel = ROLE_HIERARCHY[targetUser.role] || 0
    return myLevel > targetLevel
  }

  // Handle role change
  const handleRoleChange = async (userId, newRole) => {
    try {
      setUpdatingUserId(userId)
      console.log(`🔄 Updating user ${userId} role to ${newRole}`)
      
      await updateDocument('users', userId, { role: newRole })
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        )
      )
      
      showToast(`Role updated to ${ROLE_DISPLAY_NAMES[newRole]}`, 'success')
      console.log('✅ Role updated successfully')
    } catch (err) {
      console.error('❌ Error updating role:', err)
      showToast('Failed to update role. Please try again.', 'error')
    } finally {
      setUpdatingUserId(null)
    }
  }

  // Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('🔍 Fetching users from Firestore...')
        const usersData = await getDocuments('users')
        console.log('✅ Users fetched:', usersData)
        setUsers(usersData)
        setFilteredUsers(usersData)
      } catch (err) {
        console.error('❌ Error fetching users:', err)
        console.error('Error code:', err.code)
        console.error('Error message:', err.message)
        
        // Provide more specific error messages
        if (err.code === 'permission-denied') {
          setError('Permission denied. Please check Firestore security rules.')
        } else if (err.code === 'unavailable') {
          setError('Service unavailable. Please check your internet connection.')
        } else {
          setError(`Failed to load users: ${err.message}`)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  // Filter users based on search and role filter
  useEffect(() => {
    let result = users

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(user => 
        user.givenName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        `${user.givenName} ${user.lastName}`.toLowerCase().includes(query)
      )
    }

    // Filter by role
    if (roleFilter) {
      result = result.filter(user => user.role === roleFilter)
    }

    setFilteredUsers(result)
    setCurrentPage(1) // Reset to first page when filters change
  }, [searchQuery, roleFilter, users])

  // Get current page users
  const indexOfLastUser = currentPage * usersPerPage
  const indexOfFirstUser = indexOfLastUser - usersPerPage
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser)
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)

  // Get user initials for avatar
  const getInitials = (user) => {
    const first = user.givenName?.charAt(0) || ''
    const last = user.lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || 'U'
  }

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case ROLES.SUPER_ADMIN:
        return 'bg-red-100 text-red-700'
      case ROLES.ADMIN:
        return 'bg-orange-100 text-orange-700'
      case ROLES.FACULTY:
        return 'bg-purple-100 text-purple-700'
      case ROLES.YEAR_REP:
        return 'bg-blue-100 text-blue-700'
      case ROLES.CLASS_REP:
        return 'bg-cyan-100 text-cyan-700'
      case ROLES.STUDENT:
      default:
        return 'bg-primary/10 text-primary'
    }
  }

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all ${
          toast.kind === 'success' ? 'bg-green-500 text-white' :
          toast.kind === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage users and assign roles.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
          + Add User
        </button>
      </div>

      {/* Role Assignment Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900">Your Role: {ROLE_DISPLAY_NAMES[userProfile?.role]}</p>
            <p className="text-sm text-blue-700 mt-1">
              You can assign the following roles: {' '}
              {assignableRoles.length > 0 
                ? assignableRoles.map(r => ROLE_DISPLAY_NAMES[r]).join(', ')
                : 'None (you cannot assign roles)'}
            </p>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Roles</option>
              {Object.entries(ROLE_DISPLAY_NAMES).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="px-6 py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading users...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="px-6 py-12 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredUsers.length === 0 && (
          <div className="px-6 py-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500">
              {searchQuery || roleFilter ? 'No users found matching your criteria.' : 'No users found.'}
            </p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && filteredUsers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-semibold text-xs">{getInitials(user)}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {user.givenName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4">
                      {canChangeUserRole(user) ? (
                        <div className="relative">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            disabled={updatingUserId === user.id}
                            className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${getRoleBadgeColor(user.role)} ${updatingUserId === user.id ? 'opacity-50' : ''}`}
                          >
                            {/* Current role always shown */}
                            <option value={user.role}>{ROLE_DISPLAY_NAMES[user.role]}</option>
                            {/* Assignable roles (excluding current) */}
                            {assignableRoles
                              .filter(role => role !== user.role)
                              .map(role => (
                                <option key={role} value={role}>
                                  {ROLE_DISPLAY_NAMES[role]}
                                </option>
                              ))
                            }
                          </select>
                          {updatingUserId === user.id && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 mr-6">
                              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {ROLE_DISPLAY_NAMES[user.role] || user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs ${user.emailVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.emailVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                        {user.emailVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-sm text-primary hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && filteredUsers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
