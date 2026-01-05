import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth, ROLES, ROLE_DISPLAY_NAMES, ROLE_HIERARCHY } from '../contexts/AuthContext'
import { getDocuments, updateDocument, addDocument } from '../services/dbService'
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import { auth } from '../config/firebase'
import { ALLOWED_DOMAIN } from '../services/authService'
import { DEPARTMENTS, DEPARTMENT_CODES, DEPT_ORG_MAPPING, STUDENT_ORGS, YEAR_LEVELS } from '../constants/targeting'
import { createLog, LOG_CATEGORIES, LOG_ACTIONS } from '../services/logService'
import { tagOfficer, removeOfficer, EXECUTIVE_POSITIONS } from '../services/organizationService'
import { updateRolePositionTags } from '../services/profileTaggingService'

/**
 * Get pastel tag color based on tag type
 * Returns Tailwind classes for pastel pill design
 */
const getTagColor = (tag) => {
  if (tag.startsWith('dept:')) return 'bg-blue-100 text-blue-800'
  if (tag.startsWith('program:')) return 'bg-purple-100 text-purple-800'
  if (tag.startsWith('org:')) return 'bg-orange-100 text-orange-800'
  if (tag.startsWith('year:')) return 'bg-green-100 text-green-800'
  if (tag.startsWith('section:')) return 'bg-pink-100 text-pink-800'
  if (tag.startsWith('college:')) return 'bg-indigo-100 text-indigo-800'
  if (tag.startsWith('position:')) return 'bg-cyan-100 text-cyan-800'
  return 'bg-gray-100 text-gray-800'
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
    
    // Shorten committee names
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
    
    // Shorten position names
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
  
  // College tags: college:X → X
  if (tag.startsWith('college:')) {
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
  
  // Tags management
  const [tagModalUser, setTagModalUser] = useState(null)
  const [newTag, setNewTag] = useState('')
  const [selectedOrg, setSelectedOrg] = useState('')
  const [selectedPosition, setSelectedPosition] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedYearLevel, setSelectedYearLevel] = useState('')
  const [savingTags, setSavingTags] = useState(false)
  
  // Faculty department/org management
  const [facultyDepartment, setFacultyDepartment] = useState('')
  const [facultyOrgs, setFacultyOrgs] = useState([])
  const [savingFacultyInfo, setSavingFacultyInfo] = useState(false)
  
  // Organization options - CvSU Imus Campus Organizations
  const organizations = [
    'Central Student Government',
    'Builders of Innovative Technologist Society',
    'Business Management Society',
    'Cavite Communicators',
    'Circle of Hospitality and Tourism Students',
    'Cavite Young Leaders for Entrepreneurship',
    'Computer Science Clique',
    'Educators\' Guild for Excellence',
    'Samahan ng mga Magaaral ng Sikolohiya',
    'Young Office Professional Advocates',
    'Sinag-Tala',
    'The Flare',
    'Honor Society'
  ]
  
  // Position options - use EXECUTIVE_POSITIONS from organization service
  const positions = EXECUTIVE_POSITIONS.map(p => p.title)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const usersPerPage = 10
  
  // Add User Modal
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUser, setNewUser] = useState({
    givenName: '',
    lastName: '',
    email: '',
    password: '',
    role: ROLES.STUDENT
  })
  const [addingUser, setAddingUser] = useState(false)
  const [addUserError, setAddUserError] = useState('')
  
  const assignableRoles = getAssignableRoles()

  // Show toast notification
  const showToast = (message, kind = 'info') => {
    setToast({ show: true, message, kind })
    setTimeout(() => setToast({ show: false, message: '', kind: 'info' }), 3000)
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

    // Hide SUPER_ADMIN users from non-SUPER_ADMIN users
    if (userProfile?.role !== ROLES.SUPER_ADMIN) {
      result = result.filter(user => user.role !== ROLES.SUPER_ADMIN)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(user => 
        user.givenName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        `${user.givenName} ${user.lastName}`.toLowerCase().includes(query)
      )
    }

    if (roleFilter) {
      result = result.filter(user => user.role === roleFilter)
    }

    setFilteredUsers(result)
    setCurrentPage(1)
  }, [searchQuery, roleFilter, users, userProfile])

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

  // Check if current user can change a specific user's role
  const canChangeUserRole = (targetUser) => {
    if (!userProfile || !targetUser) return false
    if (targetUser.id === userProfile.id) return false
    const myLevel = ROLE_HIERARCHY[userProfile.role] || 0
    const targetLevel = ROLE_HIERARCHY[targetUser.role] || 0
    return myLevel > targetLevel
  }

  // Handle role change
  const handleRoleChange = async (userId, newRole) => {
    try {
      setUpdatingUserId(userId)
      console.log(`🔄 Updating user ${userId} role to ${newRole}`)
      
      // Find the target user for logging
      const targetUser = users.find(u => u.id === userId)
      const oldRole = targetUser?.role
      
      await updateDocument('users', userId, { role: newRole })
      
      // Update position tags based on role (e.g., add position:CLASS_REP tag for class_rep)
      const updatedUser = await updateRolePositionTags(userId, newRole, targetUser)
      
      // Log the role change
      await createLog({
        category: LOG_CATEGORIES.USER_MANAGEMENT,
        action: LOG_ACTIONS.ROLE_CHANGE,
        performedBy: {
          uid: userProfile.id,
          email: userProfile.email,
          name: `${userProfile.givenName} ${userProfile.lastName}`
        },
        targetUser: targetUser ? {
          uid: targetUser.id,
          email: targetUser.email,
          name: `${targetUser.givenName} ${targetUser.lastName}`
        } : null,
        details: {
          oldRole,
          newRole,
          oldRoleLabel: ROLE_DISPLAY_NAMES[oldRole],
          newRoleLabel: ROLE_DISPLAY_NAMES[newRole]
        },
        description: `Changed role from ${ROLE_DISPLAY_NAMES[oldRole]} to ${ROLE_DISPLAY_NAMES[newRole]}`
      })
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, role: newRole, tags: updatedUser.tags } : user
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

  // Handle adding a tag
  const handleAddTag = async (tagParam = null) => {
    const tagToAdd = tagParam ? tagParam.trim().toUpperCase() : newTag.trim().toUpperCase()
    
    if (!tagToAdd || !tagModalUser) return
    
    const currentTags = tagModalUser.tags || []
    
    if (currentTags.includes(tagToAdd)) {
      showToast('Tag already exists', 'error')
      return
    }
    
    try {
      setSavingTags(true)
      const updatedTags = [...currentTags, tagToAdd]
      
      await updateDocument('users', tagModalUser.id, { tags: updatedTags })
      
      // Log the tag addition
      await createLog({
        category: LOG_CATEGORIES.USER_MANAGEMENT,
        action: LOG_ACTIONS.TAG_ADD,
        performedBy: {
          uid: userProfile.id,
          email: userProfile.email,
          name: `${userProfile.givenName} ${userProfile.lastName}`
        },
        targetUser: {
          uid: tagModalUser.id,
          email: tagModalUser.email,
          name: `${tagModalUser.givenName} ${tagModalUser.lastName}`
        },
        details: { tag: tagToAdd },
        description: `Added tag "${tagToAdd}"`
      })
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === tagModalUser.id ? { ...user, tags: updatedTags } : user
        )
      )
      
      setTagModalUser(prev => ({ ...prev, tags: updatedTags }))
      setNewTag('')
      showToast(`Tag "${tagToAdd}" added`, 'success')
    } catch (err) {
      console.error('❌ Error adding tag:', err)
      showToast('Failed to add tag', 'error')
    } finally {
      setSavingTags(false)
    }
  }

  // Handle removing a tag
  const handleRemoveTag = async (tagToRemove) => {
    if (!tagModalUser) return
    
    try {
      setSavingTags(true)
      const updatedTags = (tagModalUser.tags || []).filter(tag => tag !== tagToRemove)
      
      await updateDocument('users', tagModalUser.id, { tags: updatedTags })
      
      // Log the tag removal
      await createLog({
        category: LOG_CATEGORIES.USER_MANAGEMENT,
        action: LOG_ACTIONS.TAG_REMOVE,
        performedBy: {
          uid: userProfile.id,
          email: userProfile.email,
          name: `${userProfile.givenName} ${userProfile.lastName}`
        },
        targetUser: {
          uid: tagModalUser.id,
          email: tagModalUser.email,
          name: `${tagModalUser.givenName} ${tagModalUser.lastName}`
        },
        details: { tag: tagToRemove },
        description: `Removed tag "${tagToRemove}"`
      })
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === tagModalUser.id ? { ...user, tags: updatedTags } : user
        )
      )
      
      setTagModalUser(prev => ({ ...prev, tags: updatedTags }))
      showToast(`Tag "${tagToRemove}" removed`, 'success')
    } catch (err) {
      console.error('❌ Error removing tag:', err)
      showToast('Failed to remove tag', 'error')
    } finally {
      setSavingTags(false)
    }
  }

  // Handle saving faculty department and organizations
  const handleSaveFacultyInfo = async () => {
    if (!tagModalUser || !facultyDepartment) return
    
    try {
      setSavingFacultyInfo(true)
      
      // Build tags array
      const deptCode = DEPARTMENT_CODES[facultyDepartment]
      const newTags = [
        `dept:${deptCode}`,
        ...facultyOrgs.map(org => `org:${org}`)
      ]
      
      // Merge with existing non-faculty tags (remove old dept/org tags first)
      const existingTags = (tagModalUser.tags || []).filter(tag => 
        !tag.startsWith('dept:') && !tag.startsWith('org:')
      )
      const updatedTags = [...existingTags, ...newTags]
      
      // Update Firestore
      await updateDocument('users', tagModalUser.id, {
        department: facultyDepartment,
        departmentCode: deptCode,
        linkedOrganizations: facultyOrgs,
        tags: updatedTags,
        facultyOnboardingComplete: true
      })
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === tagModalUser.id 
            ? { 
                ...user, 
                department: facultyDepartment,
                departmentCode: deptCode,
                linkedOrganizations: facultyOrgs,
                tags: updatedTags,
                facultyOnboardingComplete: true
              } 
            : user
        )
      )
      
      setTagModalUser(prev => ({ 
        ...prev, 
        department: facultyDepartment,
        departmentCode: deptCode,
        linkedOrganizations: facultyOrgs,
        tags: updatedTags,
        facultyOnboardingComplete: true
      }))
      
      showToast('Faculty department and organizations updated', 'success')
    } catch (err) {
      console.error('❌ Error saving faculty info:', err)
      showToast('Failed to save faculty information', 'error')
    } finally {
      setSavingFacultyInfo(false)
    }
  }

  // Get available organizations for selected department
  const getAvailableOrgsForDept = (dept) => {
    if (!dept) return []
    const orgCodes = DEPT_ORG_MAPPING[dept] || []
    return STUDENT_ORGS.filter(org => orgCodes.includes(org.code))
  }

  // Toggle faculty org selection
  const toggleFacultyOrg = (orgCode) => {
    setFacultyOrgs(prev => 
      prev.includes(orgCode)
        ? prev.filter(o => o !== orgCode)
        : [...prev, orgCode]
    )
  }

  // Handle adding a new user
  const handleAddUser = async (e) => {
    e.preventDefault()
    setAddUserError('')
    
    // Validate email domain
    const domain = newUser.email.split('@')[1]?.toLowerCase()
    if (domain !== ALLOWED_DOMAIN) {
      setAddUserError(`Only @${ALLOWED_DOMAIN} email addresses are allowed`)
      return
    }
    
    // Validate password
    if (newUser.password.length < 8) {
      setAddUserError('Password must be at least 8 characters')
      return
    }
    
    // Validate names
    if (!newUser.givenName.trim() || !newUser.lastName.trim()) {
      setAddUserError('First name and last name are required')
      return
    }
    
    try {
      setAddingUser(true)
      
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUser.email,
        newUser.password
      )
      
      const user = userCredential.user
      
      // Send email verification
      await sendEmailVerification(user)
      
      // Create user document in Firestore
      const userData = {
        givenName: newUser.givenName.trim(),
        lastName: newUser.lastName.trim(),
        email: newUser.email.toLowerCase(),
        role: newUser.role,
        emailVerified: false,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      // Use the Firebase Auth UID as the document ID
      await addDocument('users', { ...userData, uid: user.uid })
      
      // Add to local state
      const newUserData = {
        id: user.uid,
        ...userData
      }
      setUsers(prev => [newUserData, ...prev])
      
      // Log the user creation
      await createLog({
        category: LOG_CATEGORIES.USER_MANAGEMENT,
        action: LOG_ACTIONS.USER_CREATE,
        performedBy: {
          uid: userProfile.id,
          email: userProfile.email,
          name: `${userProfile.givenName} ${userProfile.lastName}`
        },
        targetUser: {
          uid: user.uid,
          email: userData.email,
          name: `${userData.givenName} ${userData.lastName}`
        },
        details: {
          role: newUser.role,
          roleLabel: ROLE_DISPLAY_NAMES[newUser.role]
        },
        description: `Created new user with role ${ROLE_DISPLAY_NAMES[newUser.role]}`
      })
      
      // Reset form and close modal
      setNewUser({
        givenName: '',
        lastName: '',
        email: '',
        password: '',
        role: ROLES.STUDENT
      })
      setShowAddUserModal(false)
      showToast(`User ${newUser.email} created successfully. Verification email sent.`, 'success')
      
    } catch (err) {
      console.error('❌ Error adding user:', err)
      if (err.code === 'auth/email-already-in-use') {
        setAddUserError('This email is already registered')
      } else if (err.code === 'auth/invalid-email') {
        setAddUserError('Invalid email address')
      } else if (err.code === 'auth/weak-password') {
        setAddUserError('Password is too weak')
      } else {
        setAddUserError(err.message || 'Failed to create user')
      }
    } finally {
      setAddingUser(false)
    }
  }

  // Reset add user form
  const resetAddUserForm = () => {
    setNewUser({
      givenName: '',
      lastName: '',
      email: '',
      password: '',
      role: ROLES.STUDENT
    })
    setAddUserError('')
    setShowAddUserModal(false)
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[10000] px-4 py-3 rounded-lg shadow-lg transition-all ${
          toast.kind === 'success' ? 'bg-green-500 text-white' :
          toast.kind === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage users and assign roles.</p>
        </div>
        <button 
          onClick={() => setShowAddUserModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add User</span>
        </button>
      </div>

      {/* Role Assignment Info */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Your Role: {ROLE_DISPLAY_NAMES[userProfile?.role]}</p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              You can assign the following roles: {' '}
              {assignableRoles.length > 0 
                ? assignableRoles.map(r => ROLE_DISPLAY_NAMES[r]).join(', ')
                : 'None (you cannot assign roles)'}
            </p>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-3">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Roles</option>
            {Object.entries(ROLE_DISPLAY_NAMES).map(([key, name]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="px-6 py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="px-6 py-12 text-center">
            <svg className="w-12 h-12 text-red-400 dark:text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredUsers.length === 0 && (
          <div className="px-6 py-12 text-center">
            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || roleFilter ? 'No users found matching your criteria.' : 'No users found.'}
            </p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && filteredUsers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">User</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">Email</th>
                  <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">Role</th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">Tags</th>
                  <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">Created</th>
                  <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {currentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-semibold text-xs">{getInitials(user)}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-none">
                          {user.givenName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="truncate block max-w-[150px] sm:max-w-none">{user.email}</span>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4">
                      {canChangeUserRole(user) ? (
                        <div className="relative">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            disabled={updatingUserId === user.id}
                            className={`text-xs font-medium rounded-lg px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none pr-8 ${updatingUserId === user.id ? 'opacity-50' : ''}`}
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1rem' }}
                          >
                            <option value={user.role}>{ROLE_DISPLAY_NAMES[user.role]}</option>
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
                    <td className="hidden md:table-cell px-6 py-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {(user.tags || []).slice(0, 2).map((tag, idx) => (
                          <span key={idx} className={`px-2 py-0.5 text-xs rounded-full ${getTagColor(tag)}`}>
                            {formatTagDisplay(tag)}
                          </span>
                        ))}
                        {(user.tags || []).length > 2 && (
                          <span className="relative group">
                            <span className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                              +{user.tags.length - 2}
                            </span>
                            {/* Tooltip showing remaining tags */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-150">
                              <div className="bg-gray-800 text-white text-xs rounded-lg py-2 px-3 shadow-lg whitespace-nowrap">
                                {user.tags.slice(2).map((tag, idx) => (
                                  <div key={idx} className="py-0.5">{formatTagDisplay(tag)}</div>
                                ))}
                              </div>
                              {/* Arrow */}
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setTagModalUser(user)
                            // Reset section and year level states
                            setSelectedSection('')
                            setSelectedYearLevel('')
                            // Initialize faculty state if user is faculty
                            if (user.role === ROLES.FACULTY || user.role === 'faculty') {
                              setFacultyDepartment(user.department || '')
                              setFacultyOrgs(user.linkedOrganizations || [])
                            } else {
                              setFacultyDepartment('')
                              setFacultyOrgs([])
                            }
                          }}
                          className="p-1 text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="View tags"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs ${user.emailVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.emailVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                        {user.emailVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && filteredUsers.length > 0 && (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
              Showing {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">←</span>
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">→</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tags Modal */}
      {tagModalUser && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ 
            position: 'fixed',
            top: '-50px',
            left: 0,
            right: 0,
            bottom: '-50px',
            paddingTop: '50px',
            paddingBottom: '50px'
          }}
        >
          {/* Backdrop */}
          <div 
            className="absolute bg-black/40 backdrop-blur-sm"
            style={{ top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={() => {
              setTagModalUser(null)
              setNewTag('')
              setSelectedOrg('')
              setSelectedPosition('')
              setFacultyDepartment('')
              setFacultyOrgs([])
            }}
          />
          
          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold">View Tags</h3>
                <p className="text-sm text-white/80">
                  Tags for {tagModalUser.givenName} {tagModalUser.lastName}
                  {tagModalUser.role === ROLES.FACULTY || tagModalUser.role === 'faculty' ? ' (Faculty)' : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  setTagModalUser(null)
                  setNewTag('')
                  setSelectedOrg('')
                  setSelectedPosition('')
                  setFacultyDepartment('')
                  setFacultyOrgs([])
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto">
            {/* Faculty Department & Organization Section */}
            {(tagModalUser.role === ROLES.FACULTY || tagModalUser.role === 'faculty') && (
              <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h4 className="font-semibold text-purple-900 dark:text-purple-300">Faculty Department & Organizations</h4>
                </div>
                
                {/* Department Selection */}
                <div className="mb-3">
                  <label className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1.5 block">Department</label>
                  <select
                    value={facultyDepartment}
                    onChange={(e) => {
                      setFacultyDepartment(e.target.value)
                      setFacultyOrgs([]) // Reset orgs when department changes
                    }}
                    className="w-full px-3 py-2 text-sm border border-purple-200 dark:border-purple-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {DEPARTMENT_CODES[dept]} - {dept}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Linked Organizations */}
                {facultyDepartment && getAvailableOrgsForDept(facultyDepartment).length > 0 && (
                  <div className="mb-3">
                    <label className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1.5 block">
                      Linked Organizations (for {DEPARTMENT_CODES[facultyDepartment]})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {getAvailableOrgsForDept(facultyDepartment).map((org) => (
                        <button
                          key={org.code}
                          type="button"
                          onClick={() => toggleFacultyOrg(org.code)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            facultyOrgs.includes(org.code)
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-white dark:bg-gray-700 border border-purple-200 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50'
                          }`}
                        >
                          {org.code}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Current Faculty Info Display */}
                {tagModalUser.department && (
                  <div className="mb-3 p-2 bg-white dark:bg-gray-700 rounded-lg border border-purple-100 dark:border-purple-700">
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      <span className="font-medium">Current:</span> {tagModalUser.departmentCode || DEPARTMENT_CODES[tagModalUser.department]}
                      {tagModalUser.linkedOrganizations?.length > 0 && (
                        <span> → {tagModalUser.linkedOrganizations.join(', ')}</span>
                      )}
                    </p>
                  </div>
                )}
                
                {/* Save Button */}
                <button
                  onClick={handleSaveFacultyInfo}
                  disabled={!facultyDepartment || savingFacultyInfo}
                  className={`w-full px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    facultyDepartment && !savingFacultyInfo
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {savingFacultyInfo ? 'Saving...' : 'Save Faculty Department & Orgs'}
                </button>
              </div>
            )}
            
            {/* Current Tags */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Current Tags</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Tags are automatically assigned through organization tagging in the Organizations page</p>
              <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {(tagModalUser.tags || []).length === 0 ? (
                  <span className="text-sm text-gray-400 dark:text-gray-500">No tags yet</span>
                ) : (
                  (tagModalUser.tags || []).map((tag, idx) => (
                    <span 
                      key={idx} 
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getTagColor(tag)}`}
                    >
                      {formatTagDisplay(tag)}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        disabled={savingTags}
                        className="hover:text-red-600 disabled:opacity-50"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ 
            position: 'fixed',
            top: '-50px',
            left: 0,
            right: 0,
            bottom: '-50px',
            paddingTop: '50px',
            paddingBottom: '50px'
          }}
        >
          <div 
            className="absolute bg-black/40 backdrop-blur-sm" 
            style={{ top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={resetAddUserForm}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold">Add New User</h3>
              </div>
              <button
                onClick={resetAddUserForm}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto">
            {/* Error Message */}
            {addUserError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {addUserError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">First Name</label>
                  <input
                    type="text"
                    value={newUser.givenName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, givenName: e.target.value }))}
                    placeholder="John"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Last Name</label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Email Address</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={`user@${ALLOWED_DOMAIN}`}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {assignableRoles.map(role => (
                    <option key={role} value={role}>{ROLE_DISPLAY_NAMES[role]}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">You can only assign roles below your level</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetAddUserForm}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addingUser ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </span>
                  ) : (
                    'Create User'
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
