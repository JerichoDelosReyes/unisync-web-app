/**
 * Organizations Management Page
 * 
 * Admin view to manage student organizations:
 * - View all organizations and their officers
 * - Tag faculty as advisers (Admin only)
 * - Tag students as officers (Adviser/President)
 */

import { useState, useEffect, useRef } from 'react'
import { useAuth, ROLES } from '../contexts/AuthContext'
import Toast from '../components/ui/Toast'
import ModalOverlay from '../components/ui/ModalOverlay'
import {
  MegaphoneIcon,
  UserIcon,
  UserGroupIcon,
  BuildingLibraryIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../config/firebase'
import {
  ORGANIZATIONS,
  ORG_CATEGORIES,
  COMMITTEE_POSITIONS,
  YEAR_REP_POSITIONS,
  getAllOrganizationsData,
  getOrganizationData,
  getOrganizationOfficers,
  getAvailablePositions,
  tagAdviser,
  removeAdviser,
  tagOfficer,
  removeOfficer,
  canTagOfficers,
  getManageableCommittees,
  canTagYearReps,
  getUserOrgBadges,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  tagCommitteeMember,
  removeCommitteeMember,
  getCommitteeMembers,
  tagYearRep,
  removeYearRep,
  getYearReps,
  getAvailableYearRepPositions
} from '../services/organizationService'
import { getDocuments } from '../services/dbService'
import { DEPT_ORG_MAPPING } from '../constants/targeting'

// Import organization logos
import CSGLogo from '../assets/img/CSG-removebg-preview.png'
import BITSLogo from '../assets/img/BITS-removebg-preview.png'
import BMSLogo from '../assets/img/BMS-removebg-preview.png'
import CaviteCommLogo from '../assets/img/CAVITECOMMUNICATOR-removebg-preview.png'
import CHLSLogo from '../assets/img/CHTS-removebg-preview.png'
import CYLELogo from '../assets/img/CYLE-removebg-preview.png'
import CSCLogo from '../assets/img/CSC-removebg-preview.png'
import EDGELogo from '../assets/img/EDGE-removebg-preview.png'
import SikolohiyaLogo from '../assets/img/SIKOLOHIYA-removebg-preview (1).png'
import YOPALogo from '../assets/img/YOPA-removebg-preview.png'
import SinagTalaLogo from '../assets/img/SINAGTALA-removebg-preview.png'
import TheFlareLogo from '../assets/img/THE_FLARE-removebg-preview (1).png'
import HonorSocLogo from '../assets/img/HONORSOC-removebg-preview.png'

const ORG_LOGOS = {
  CSG: CSGLogo,
  BITS: BITSLogo,
  BMS: BMSLogo,
  CC: CaviteCommLogo,
  CHLS: CHLSLogo,
  CYLE: CYLELogo,
  CSC: CSCLogo,
  EDGE: EDGELogo,
  SMSP: SikolohiyaLogo,
  YOPA: YOPALogo,
  ST: SinagTalaLogo,
  TF: TheFlareLogo,
  HS: HonorSocLogo
}

export default function OrganizationsPage() {
  const { user, userProfile, hasMinRole } = useAuth()
  
  // Refs
  const orgPhotoInputRef = useRef(null)
  
  // State
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState([])
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [orgOfficers, setOrgOfficers] = useState(null)
  const [availablePositions, setAvailablePositions] = useState([])
  const [toast, setToast] = useState({ show: false, message: '', kind: 'info' })
  
  // Modal states
  const [showAdviserModal, setShowAdviserModal] = useState(false)
  const [showOfficerModal, setShowOfficerModal] = useState(false)
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false)
  const [showCommitteeModal, setShowCommitteeModal] = useState(false)
  const [showYearRepModal, setShowYearRepModal] = useState(false)
  const [facultyList, setFacultyList] = useState([])
  const [studentList, setStudentList] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedPosition, setSelectedPosition] = useState('')
  const [selectedCommittee, setSelectedCommittee] = useState('')
  const [selectedYearRep, setSelectedYearRep] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Committee and Year Rep data
  const [committeeMembers, setCommitteeMembers] = useState({})
  const [yearReps, setYearReps] = useState([])
  const [availableYearRepPositions, setAvailableYearRepPositions] = useState([])
  const [manageableCommitteeIds, setManageableCommitteeIds] = useState([])
  const [canManageYearReps, setCanManageYearReps] = useState(false)
  
  // Create organization form state
  const [newOrgData, setNewOrgData] = useState({
    code: '',
    name: '',
    fullName: '',
    category: 'academic',
    description: '',
    audienceType: 'all',
    audienceCourse: '',
    audienceDepartment: '',
    maxAdvisers: 2
  })
  const [orgPhotoFile, setOrgPhotoFile] = useState(null)
  const [orgPhotoPreview, setOrgPhotoPreview] = useState(null)
  const [uploadingOrgPhoto, setUploadingOrgPhoto] = useState(false)
  
  // Permission checks
  const isAdmin = hasMinRole(ROLES.ADMIN)
  const isFaculty = userProfile?.role === ROLES.FACULTY
  const [canTagForSelectedOrg, setCanTagForSelectedOrg] = useState(false)
  
  // Check if user is an adviser (faculty with adviserOf)
  const isAdviser = isFaculty && userProfile?.adviserOf && Object.keys(userProfile.adviserOf).length > 0
  const adviserOrgCodes = isAdviser ? Object.keys(userProfile.adviserOf) : []
  
  // Check if user is a president with tagging rights
  const isPresidentWithTagging = userProfile?.officerOf && 
    Object.values(userProfile.officerOf).some(pos => pos.canTagOfficers)
  const presidentOrgCodes = isPresidentWithTagging 
    ? Object.entries(userProfile.officerOf)
        .filter(([_, pos]) => pos.canTagOfficers)
        .map(([code, _]) => code)
    : []
  
  // Check if user is just an officer (not admin, not adviser, not president with tagging rights)
  const isOnlyOfficer = !isAdmin && !isAdviser && !isPresidentWithTagging && 
    userProfile?.officerOf && Object.keys(userProfile.officerOf).length > 0
  
  // Get user's allowed organization codes based on role
  // Admins see all orgs, others see only their assigned orgs
  const getUserAllowedOrgCodes = () => {
    if (isAdmin) return null // null means all orgs
    const codes = new Set()
    adviserOrgCodes.forEach(code => codes.add(code))
    presidentOrgCodes.forEach(code => codes.add(code))
    if (userProfile?.officerOf) {
      Object.keys(userProfile.officerOf).forEach(code => codes.add(code))
    }
    return Array.from(codes)
  }
  
  const allowedOrgCodes = getUserAllowedOrgCodes()
  
  const showToast = (message, kind = 'info') => {
    setToast({ show: true, message, kind })
    setTimeout(() => setToast({ show: false, message: '', kind: 'info' }), 4000)
  }

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true)
        const orgsData = await getAllOrganizationsData()
        console.log('Fetched organizations:', orgsData)
        setOrganizations(orgsData)
        
        // Auto-select the user's org if they only have access to one organization
        if (allowedOrgCodes && allowedOrgCodes.length === 1 && orgsData.length > 0) {
          const userOrg = orgsData.find(o => o.id === allowedOrgCodes[0])
          if (userOrg) {
            const orgConfig = ORGANIZATIONS[userOrg.id]
            setSelectedOrg({ ...orgConfig, ...userOrg })
          }
        }
      } catch (error) {
        console.error('Error fetching organizations:', error)
        // Fallback to static data if Firestore fails
        const staticOrgs = Object.entries(ORGANIZATIONS).map(([code, org]) => ({
          id: code,
          ...org,
          officers: [],
          advisers: []
        }))
        setOrganizations(staticOrgs)
        showToast('Using offline data', 'info')
      } finally {
        setLoading(false)
      }
    }
    
    fetchOrganizations()
  }, [allowedOrgCodes?.join(',')])

  // Fetch officers when org is selected
  useEffect(() => {
    const fetchOrgDetails = async () => {
      if (!selectedOrg) {
        setOrgOfficers(null)
        setCanTagForSelectedOrg(false)
        setManageableCommitteeIds([])
        setCanManageYearReps(false)
        return
      }
      
      try {
        const officers = await getOrganizationOfficers(selectedOrg.code)
        setOrgOfficers(officers)
        
        const positions = await getAvailablePositions(selectedOrg.code)
        setAvailablePositions(positions)
        
        // Fetch committee members
        const members = await getCommitteeMembers(selectedOrg.code)
        setCommitteeMembers(members)
        
        // Fetch year reps
        const reps = await getYearReps(selectedOrg.code)
        setYearReps(reps)
        
        // Fetch available year rep positions
        const availableYearReps = await getAvailableYearRepPositions(selectedOrg.code)
        setAvailableYearRepPositions(availableYearReps)
        
        // Check permissions for current user
        if (user) {
          // Check if user can tag officers (Adviser or President only, NOT Admin)
          const canTag = await canTagOfficers(user.uid, selectedOrg.code)
          setCanTagForSelectedOrg(canTag)
          
          // Check which committees user can manage
          const manageableCommittees = await getManageableCommittees(user.uid, selectedOrg.code)
          setManageableCommitteeIds(manageableCommittees)
          
          // Check if user can tag year reps (Adviser or President only)
          const canYearRep = await canTagYearReps(user.uid, selectedOrg.code)
          setCanManageYearReps(canYearRep)
        }
      } catch (error) {
        console.error('Error fetching org details:', error)
      }
    }
    
    fetchOrgDetails()
  }, [selectedOrg, user, isAdmin])

  // Fetch faculty list for adviser modal - filtered by org's department
  useEffect(() => {
    const fetchFaculty = async () => {
      if (!showAdviserModal || !selectedOrg) return
      
      try {
        const users = await getDocuments('users')
        let faculty = users.filter(u => u.role === ROLES.FACULTY)
        
        // Filter faculty by department based on selected org
        // Find which department this org belongs to
        const orgDepartment = Object.entries(DEPT_ORG_MAPPING).find(
          ([dept, orgs]) => orgs.includes(selectedOrg.code)
        )?.[0]
        
        // CSG, ST, TF, HS are campus-wide - show all faculty
        const campusWideOrgs = ['CSG', 'ST', 'TF', 'HS']
        
        if (orgDepartment && !campusWideOrgs.includes(selectedOrg.code)) {
          // Filter faculty by department
          faculty = faculty.filter(f => 
            f.department === orgDepartment ||
            f.tags?.some(tag => tag.includes(orgDepartment))
          )
        }
        
        setFacultyList(faculty)
      } catch (error) {
        console.error('Error fetching faculty:', error)
      }
    }
    
    fetchFaculty()
  }, [showAdviserModal, selectedOrg])

  // Fetch student list for officer/committee/year rep modal - filtered by org's course
  useEffect(() => {
    const fetchStudents = async () => {
      if ((!showOfficerModal && !showCommitteeModal && !showYearRepModal) || !selectedOrg) return
      
      try {
        const users = await getDocuments('users')
        let students = users.filter(u => u.role === ROLES.STUDENT)
        
        // Filter students by course based on selected org
        const orgConfig = ORGANIZATIONS[selectedOrg.code]
        
        // CSG, ST, TF, HS are campus-wide - show all students
        const campusWideOrgs = ['CSG', 'ST', 'TF', 'HS']
        
        if (!campusWideOrgs.includes(selectedOrg.code)) {
          if (orgConfig?.audienceType === 'course' && orgConfig?.audienceCourse) {
            // Filter by course (e.g., 'BS Computer Science')
            students = students.filter(s => 
              s.course === orgConfig.audienceCourse ||
              s.course?.toLowerCase().includes(orgConfig.audienceCourse.toLowerCase()) ||
              orgConfig.audienceCourse.toLowerCase().includes(s.course?.toLowerCase() || '')
            )
          } else if (orgConfig?.audienceType === 'department' && orgConfig?.audienceDepartment) {
            // Filter by department (e.g., 'Teacher Education Department')
            students = students.filter(s => 
              s.department === orgConfig.audienceDepartment ||
              s.tags?.some(tag => tag.includes(orgConfig.audienceDepartment))
            )
          }
        }
        
        setStudentList(students)
      } catch (error) {
        console.error('Error fetching students:', error)
      }
    }
    
    fetchStudents()
  }, [showOfficerModal, showCommitteeModal, showYearRepModal, selectedOrg])

  // Handle adding adviser
  const handleAddAdviser = async () => {
    if (!selectedUser || !selectedOrg) return
    
    setSubmitting(true)
    try {
      await tagAdviser(selectedOrg.code, selectedUser.uid, {
        displayName: selectedUser.displayName,
        email: selectedUser.email,
        taggedBy: user.uid
      })
      
      showToast(`${selectedUser.displayName} added as adviser to ${selectedOrg.name}`, 'success')
      
      // Refresh org data
      const officers = await getOrganizationOfficers(selectedOrg.code)
      setOrgOfficers(officers)
      
      // Update organizations list
      const orgsData = await getAllOrganizationsData()
      setOrganizations(orgsData)
      
      setShowAdviserModal(false)
      setSelectedUser(null)
      setSearchTerm('')
    } catch (error) {
      console.error('Error adding adviser:', error)
      showToast(error.message || 'Failed to add adviser', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle removing adviser
  const handleRemoveAdviser = async (adviserUserId) => {
    if (!selectedOrg) return
    
    if (!confirm('Are you sure you want to remove this adviser?')) return
    
    try {
      await removeAdviser(selectedOrg.code, adviserUserId)
      showToast('Adviser removed', 'success')
      
      // Refresh org data
      const officers = await getOrganizationOfficers(selectedOrg.code)
      setOrgOfficers(officers)
      
      const orgsData = await getAllOrganizationsData()
      setOrganizations(orgsData)
    } catch (error) {
      console.error('Error removing adviser:', error)
      showToast(error.message || 'Failed to remove adviser', 'error')
    }
  }

  // Handle adding officer
  const handleAddOfficer = async () => {
    if (!selectedUser || !selectedOrg || !selectedPosition) return
    
    setSubmitting(true)
    try {
      await tagOfficer(
        selectedOrg.code, 
        selectedUser.uid, 
        selectedPosition,
        {
          displayName: selectedUser.displayName,
          email: selectedUser.email
        },
        user.uid
      )
      
      const position = availablePositions.find(p => p.id === selectedPosition)
      showToast(`${selectedUser.displayName} tagged as ${position?.title}`, 'success')
      
      // Refresh org data
      const officers = await getOrganizationOfficers(selectedOrg.code)
      setOrgOfficers(officers)
      
      const positions = await getAvailablePositions(selectedOrg.code)
      setAvailablePositions(positions)
      
      setShowOfficerModal(false)
      setSelectedUser(null)
      setSelectedPosition('')
      setSearchTerm('')
    } catch (error) {
      console.error('Error adding officer:', error)
      showToast(error.message || 'Failed to add officer', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle removing officer
  const handleRemoveOfficer = async (officerUserId) => {
    if (!selectedOrg) return
    
    if (!confirm('Are you sure you want to remove this officer?')) return
    
    try {
      await removeOfficer(selectedOrg.code, officerUserId)
      showToast('Officer removed', 'success')
      
      // Refresh org data
      const officers = await getOrganizationOfficers(selectedOrg.code)
      setOrgOfficers(officers)
      
      const positions = await getAvailablePositions(selectedOrg.code)
      setAvailablePositions(positions)
    } catch (error) {
      console.error('Error removing officer:', error)
      showToast(error.message || 'Failed to remove officer', 'error')
    }
  }

  // Handle adding committee member
  const handleAddCommitteeMember = async () => {
    if (!selectedUser || !selectedOrg || !selectedCommittee) return
    
    setSubmitting(true)
    try {
      await tagCommitteeMember(
        selectedOrg.code, 
        selectedUser.uid, 
        selectedCommittee,
        {
          displayName: selectedUser.displayName,
          email: selectedUser.email
        },
        user.uid
      )
      
      const committee = COMMITTEE_POSITIONS.find(c => c.id === selectedCommittee)
      showToast(`${selectedUser.displayName} added to ${committee?.title}`, 'success')
      
      // Refresh committee members
      const members = await getCommitteeMembers(selectedOrg.code)
      setCommitteeMembers(members)
      
      setShowCommitteeModal(false)
      setSelectedUser(null)
      setSelectedCommittee('')
      setSearchTerm('')
    } catch (error) {
      console.error('Error adding committee member:', error)
      showToast(error.message || 'Failed to add committee member', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle removing committee member
  const handleRemoveCommitteeMember = async (userId, committeeId) => {
    if (!selectedOrg) return
    
    if (!confirm('Are you sure you want to remove this committee member?')) return
    
    try {
      await removeCommitteeMember(selectedOrg.code, userId, committeeId)
      showToast('Committee member removed', 'success')
      
      // Refresh committee members
      const members = await getCommitteeMembers(selectedOrg.code)
      setCommitteeMembers(members)
    } catch (error) {
      console.error('Error removing committee member:', error)
      showToast(error.message || 'Failed to remove committee member', 'error')
    }
  }

  // Handle adding year rep
  const handleAddYearRep = async () => {
    if (!selectedUser || !selectedOrg || !selectedYearRep) return
    
    setSubmitting(true)
    try {
      await tagYearRep(
        selectedOrg.code, 
        selectedUser.uid, 
        selectedYearRep,
        {
          displayName: selectedUser.displayName,
          email: selectedUser.email
        },
        user.uid
      )
      
      const yearRep = YEAR_REP_POSITIONS.find(y => y.id === selectedYearRep)
      showToast(`${selectedUser.displayName} tagged as ${yearRep?.title}`, 'success')
      
      // Refresh year reps
      const reps = await getYearReps(selectedOrg.code)
      setYearReps(reps)
      
      const availableYearReps = await getAvailableYearRepPositions(selectedOrg.code)
      setAvailableYearRepPositions(availableYearReps)
      
      setShowYearRepModal(false)
      setSelectedUser(null)
      setSelectedYearRep('')
      setSearchTerm('')
    } catch (error) {
      console.error('Error adding year rep:', error)
      showToast(error.message || 'Failed to add year representative', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle removing year rep
  const handleRemoveYearRep = async (userId) => {
    if (!selectedOrg) return
    
    if (!confirm('Are you sure you want to remove this year representative?')) return
    
    try {
      await removeYearRep(selectedOrg.code, userId)
      showToast('Year representative removed', 'success')
      
      // Refresh year reps
      const reps = await getYearReps(selectedOrg.code)
      setYearReps(reps)
      
      const availableYearReps = await getAvailableYearRepPositions(selectedOrg.code)
      setAvailableYearRepPositions(availableYearReps)
    } catch (error) {
      console.error('Error removing year rep:', error)
      showToast(error.message || 'Failed to remove year representative', 'error')
    }
  }

  // Handle organization photo selection
  const handleOrgPhotoSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error')
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error')
      return
    }
    
    setOrgPhotoFile(file)
    setOrgPhotoPreview(URL.createObjectURL(file))
  }

  // Handle creating organization
  const handleCreateOrganization = async () => {
    if (!newOrgData.code || !newOrgData.name) {
      showToast('Organization code and name are required', 'error')
      return
    }
    
    // Validate code format (uppercase, no spaces)
    const codeRegex = /^[A-Z0-9_]+$/
    if (!codeRegex.test(newOrgData.code.toUpperCase())) {
      showToast('Code must contain only letters, numbers, and underscores', 'error')
      return
    }
    
    setSubmitting(true)
    try {
      let photoURL = null
      
      // Upload photo if provided
      if (orgPhotoFile) {
        setUploadingOrgPhoto(true)
        const fileExtension = orgPhotoFile.name.split('.').pop()
        const storageRef = ref(storage, `organizations/${newOrgData.code.toUpperCase()}/logo.${fileExtension}`)
        await uploadBytes(storageRef, orgPhotoFile)
        photoURL = await getDownloadURL(storageRef)
        setUploadingOrgPhoto(false)
      }
      
      // Create the organization
      await createOrganization({
        ...newOrgData,
        code: newOrgData.code.toUpperCase(),
        photoURL
      })
      
      showToast(`Organization "${newOrgData.name}" created successfully!`, 'success')
      
      // Refresh organizations list
      const orgsData = await getAllOrganizationsData()
      setOrganizations(orgsData)
      
      // Reset form
      setShowCreateOrgModal(false)
      setNewOrgData({
        code: '',
        name: '',
        fullName: '',
        category: 'academic',
        description: '',
        audienceType: 'all',
        audienceCourse: '',
        audienceDepartment: '',
        maxAdvisers: 2
      })
      setOrgPhotoFile(null)
      setOrgPhotoPreview(null)
    } catch (error) {
      console.error('Error creating organization:', error)
      showToast(error.message || 'Failed to create organization', 'error')
    } finally {
      setSubmitting(false)
      setUploadingOrgPhoto(false)
    }
  }

  // Handle deleting organization
  const handleDeleteOrganization = async () => {
    if (!selectedOrg) return
    
    // Cannot delete system organizations
    if (ORGANIZATIONS[selectedOrg.code]) {
      showToast('Cannot delete system organizations', 'error')
      return
    }
    
    if (!confirm(`Are you sure you want to delete "${selectedOrg.name}"? This action cannot be undone. All advisers and officers will be removed.`)) {
      return
    }
    
    setSubmitting(true)
    try {
      await deleteOrganization(selectedOrg.code)
      
      showToast(`Organization "${selectedOrg.name}" deleted successfully`, 'success')
      
      // Refresh organizations list
      const orgsData = await getAllOrganizationsData()
      setOrganizations(orgsData)
      
      // Clear selection
      setSelectedOrg(null)
      setOrgOfficers(null)
    } catch (error) {
      console.error('Error deleting organization:', error)
      showToast(error.message || 'Failed to delete organization', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter users by search term
  const filteredFaculty = facultyList.filter(f => 
    f.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const filteredStudents = studentList.filter(s => 
    s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentId?.includes(searchTerm)
  )

  // Group organizations by category
  // Non-admin users only see organizations they're assigned to (adviser, president, officer)
  const filteredOrganizations = allowedOrgCodes 
    ? organizations.filter(org => allowedOrgCodes.includes(org.id))
    : organizations // Admin sees all
    
  const orgsByCategory = Object.entries(ORG_CATEGORIES).map(([key, category]) => ({
    key,
    ...category,
    orgs: filteredOrganizations.filter(org => {
      const orgCategory = org.category || ORGANIZATIONS[org.id]?.category
      return orgCategory === key
    })
  })).filter(cat => cat.orgs.length > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Toast */}
      {toast.show && (
        <Toast 
          message={toast.message} 
          kind={toast.kind} 
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Organizations</h1>
          <p className="text-gray-600 mt-1">
            {isAdmin 
              ? 'Manage organization advisers' 
              : isAdviser || isPresidentWithTagging
                ? 'Manage your organization officers'
                : 'View your organization details'}
          </p>
        </div>
        
        {/* Create Organization Button (Admin only) */}
        {isAdmin && (
          <button
            onClick={() => setShowCreateOrgModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Organization
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organizations List */}
        <div className="lg:col-span-1 space-y-4">
          {orgsByCategory.map(category => (
            <div key={category.key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className={`px-4 py-2 ${category.bgColor} border-b`}>
                <h3 className={`font-semibold ${category.textColor}`}>{category.label}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {category.orgs.map(org => {
                  const orgConfig = ORGANIZATIONS[org.id]
                  const adviserCount = org.advisers?.length || 0
                  const officerCount = org.officers?.length || 0
                  
                  return (
                    <button
                      key={org.id}
                      onClick={() => setSelectedOrg({ ...orgConfig, ...org })}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${
                        selectedOrg?.code === org.id ? 'bg-primary/5 border-l-4 border-primary' : ''
                      }`}
                    >
                      {/* Organization Logo - use uploaded photo or static logo */}
                      {org.photoURL ? (
                        <img 
                          src={org.photoURL} 
                          alt={org.name}
                          className="w-10 h-10 object-cover rounded-lg"
                        />
                      ) : ORG_LOGOS[org.id] ? (
                        <img 
                          src={ORG_LOGOS[org.id]} 
                          alt={org.name}
                          className="w-10 h-10 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-500">{org.id?.substring(0, 2)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{org.id}</p>
                        <p className="text-xs text-gray-500 truncate">{orgConfig?.name || org.name}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-purple-600">{adviserCount} adviser{adviserCount !== 1 ? 's' : ''}</p>
                        <p className="text-blue-600">{officerCount} officer{officerCount !== 1 ? 's' : ''}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Organization Details */}
        <div className="lg:col-span-2">
          {selectedOrg ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Org Header */}
              <div className="p-6 border-b border-gray-200 flex items-center gap-4">
                {/* Organization Logo - use uploaded photo or static logo */}
                {selectedOrg.photoURL ? (
                  <img 
                    src={selectedOrg.photoURL} 
                    alt={selectedOrg.name}
                    className="w-20 h-20 object-cover rounded-xl"
                  />
                ) : ORG_LOGOS[selectedOrg.code] ? (
                  <img 
                    src={ORG_LOGOS[selectedOrg.code]} 
                    alt={selectedOrg.name}
                    className="w-20 h-20 object-contain"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-200 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-500">{selectedOrg.code?.substring(0, 2)}</span>
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{selectedOrg.name}</h2>
                  <p className="text-gray-600">{selectedOrg.fullName}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ORG_CATEGORIES[selectedOrg.category]?.bgColor || 'bg-gray-100'
                    } ${ORG_CATEGORIES[selectedOrg.category]?.textColor || 'text-gray-800'}`}>
                      {ORG_CATEGORIES[selectedOrg.category]?.label || selectedOrg.category}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <MegaphoneIcon className="w-3.5 h-3.5" />
                      {selectedOrg.audienceType === 'all' 
                        ? 'Announces to all students' 
                        : `Announces to ${selectedOrg.audienceCourse || selectedOrg.audienceDepartment || 'members'}`}
                    </span>
                    {selectedOrg.isCustom && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Custom
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div>
                    <p className="text-sm text-gray-500">School Year</p>
                    <p className="font-semibold text-gray-900">{orgOfficers?.schoolYear || '2025-2026'}</p>
                  </div>
                  {/* Delete button for custom organizations (Admin only) */}
                  {isAdmin && selectedOrg.isCustom && (
                    <button
                      onClick={handleDeleteOrganization}
                      disabled={submitting}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      🗑️ Delete Org
                    </button>
                  )}
                </div>
              </div>

              {/* Advisers Section */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-purple-600" />
                    Advisers
                    <span className="text-sm text-gray-500 font-normal">
                      ({orgOfficers?.advisers?.length || 0}/{selectedOrg.maxAdvisers})
                    </span>
                  </h3>
                  {isAdmin && (orgOfficers?.advisers?.length || 0) < selectedOrg.maxAdvisers && (
                    <button
                      onClick={() => setShowAdviserModal(true)}
                      className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      + Add Adviser
                    </button>
                  )}
                </div>
                
                {orgOfficers?.advisers?.length > 0 ? (
                  <div className="space-y-2">
                    {orgOfficers.advisers.map(adviser => (
                      <div key={adviser.userId} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center text-purple-700 font-semibold">
                            {adviser.displayName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{adviser.displayName}</p>
                            <p className="text-sm text-gray-500">{adviser.email}</p>
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleRemoveAdviser(adviser.userId)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">No advisers assigned yet</p>
                )}
              </div>

              {/* Officers Section */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <UserGroupIcon className="w-5 h-5 text-blue-600" />
                    Officers
                    <span className="text-sm text-gray-500 font-normal">
                      ({orgOfficers?.officers?.length || 0}/{selectedOrg.positions?.length || 0} positions filled)
                    </span>
                  </h3>
                  {canTagForSelectedOrg && availablePositions.length > 0 && (
                    <button
                      onClick={() => setShowOfficerModal(true)}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      + Tag Officer
                    </button>
                  )}
                </div>

                {/* Executive Officers */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Executive Officers</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedOrg.positions?.filter(p => p.priority <= 7).map(position => {
                      const officer = orgOfficers?.officers?.find(o => o.positionId === position.id)
                      
                      return (
                        <div 
                          key={position.id}
                          className={`p-3 rounded-lg border ${
                            officer ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 border-dashed'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-500 uppercase">{position.title}</p>
                              {officer ? (
                                <p className="font-medium text-gray-900 truncate">{officer.displayName}</p>
                              ) : (
                                <p className="text-gray-400 italic text-sm">Vacant</p>
                              )}
                            </div>
                            {/* Only show remove button if user can tag AND is not removing themselves */}
                            {officer && canTagForSelectedOrg && officer.userId !== user?.uid && (
                              <button
                                onClick={() => handleRemoveOfficer(officer.userId)}
                                className="text-red-500 hover:text-red-600 ml-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                            {/* Show indicator if this is the current user */}
                            {officer && officer.userId === user?.uid && (
                              <span className="text-xs text-blue-600 font-medium ml-2">You</span>
                            )}
                          </div>
                          {position.canTagOfficers && officer && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 mt-1">
                              ✓ Can tag officers
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Board Members / SAP (if applicable) */}
                {selectedOrg.positions?.some(p => p.priority > 7) && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {selectedOrg.code === 'CSG' ? 'Board Members' : 'Representatives'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedOrg.positions?.filter(p => p.priority > 7).map(position => {
                        const officer = orgOfficers?.officers?.find(o => o.positionId === position.id)
                        
                        return (
                          <div 
                            key={position.id}
                            className={`p-3 rounded-lg border ${
                              officer ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 border-dashed'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-500 uppercase">{position.title}</p>
                                {officer ? (
                                  <p className="font-medium text-gray-900 truncate">{officer.displayName}</p>
                                ) : (
                                  <p className="text-gray-400 italic text-sm">Vacant</p>
                                )}
                              </div>
                              {/* Only show remove button if user can tag AND is not removing themselves */}
                              {officer && canTagForSelectedOrg && officer.userId !== user?.uid && (
                                <button
                                  onClick={() => handleRemoveOfficer(officer.userId)}
                                  className="text-red-500 hover:text-red-600 ml-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                              {/* Show indicator if this is the current user */}
                              {officer && officer.userId === user?.uid && (
                                <span className="text-xs text-blue-600 font-medium ml-2">You</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Committees Section */}
              <div className="p-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <UserGroupIcon className="w-5 h-5 text-orange-600" />
                    Committees
                    <span className="text-sm text-gray-500 font-normal">
                      ({Object.values(committeeMembers).flat().length} members)
                    </span>
                  </h3>
                  {manageableCommitteeIds.length > 0 && (
                    <button
                      onClick={() => setShowCommitteeModal(true)}
                      className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      + Add Committee Member
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {COMMITTEE_POSITIONS.map(committee => {
                    const members = committeeMembers[committee.id] || []
                    const parentOfficer = orgOfficers?.officers?.find(o => o.positionId === committee.parentOfficerId)
                    
                    return (
                      <div key={committee.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{committee.title}</p>
                            <p className="text-xs text-gray-500">
                              Under: {parentOfficer?.displayName || committee.parentOfficerTitle}
                            </p>
                          </div>
                          <span className="text-xs text-orange-600 font-medium">
                            {members.length}/{committee.maxMembers}
                          </span>
                        </div>
                        <div className="p-3">
                          {members.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {members.map(member => (
                                <div 
                                  key={member.userId}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full"
                                >
                                  <span className="text-sm text-gray-900">{member.displayName}</span>
                                  {manageableCommitteeIds.includes(committee.id) && (
                                    <button
                                      onClick={() => handleRemoveCommitteeMember(member.userId, committee.id)}
                                      className="text-red-500 hover:text-red-600"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No members yet</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Year Representatives Section */}
              <div className="p-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-teal-600" />
                    Year Representatives
                    <span className="text-sm text-gray-500 font-normal">
                      ({yearReps.length}/{YEAR_REP_POSITIONS.length} positions filled)
                    </span>
                  </h3>
                  {canManageYearReps && availableYearRepPositions.length > 0 && (
                    <button
                      onClick={() => setShowYearRepModal(true)}
                      className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      + Tag Year Rep
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {YEAR_REP_POSITIONS.map(position => {
                    const rep = yearReps.find(r => r.yearRepId === position.id)
                    
                    return (
                      <div 
                        key={position.id}
                        className={`p-3 rounded-lg border ${
                          rep ? 'bg-teal-50 border-teal-200' : 'bg-gray-50 border-gray-200 border-dashed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-500 uppercase">{position.title}</p>
                            {rep ? (
                              <p className="font-medium text-gray-900 truncate">{rep.displayName}</p>
                            ) : (
                              <p className="text-gray-400 italic text-sm">Vacant</p>
                            )}
                          </div>
                          {rep && canManageYearReps && rep.userId !== user?.uid && (
                            <button
                              onClick={() => handleRemoveYearRep(rep.userId)}
                              className="text-red-500 hover:text-red-600 ml-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                          {rep && rep.userId === user?.uid && (
                            <span className="text-xs text-teal-600 font-medium ml-2">You</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <BuildingLibraryIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select an Organization</h3>
              <p className="text-gray-500">
                Choose an organization from the list to view its officers and advisers
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Adviser Modal */}
      {showAdviserModal && (
        <ModalOverlay onClose={() => setShowAdviserModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Add Adviser to {selectedOrg?.name}</h3>
                <p className="text-sm text-white/80 mt-0.5">Select a faculty member to tag as adviser</p>
              </div>
              <button onClick={() => setShowAdviserModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {/* Course/Department Filter Notice */}
              {selectedOrg && !['CSG', 'ST', 'TF', 'HS'].includes(selectedOrg.code) && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-xs text-purple-800 flex items-center gap-1">
                    <LockClosedIcon className="w-3.5 h-3.5" />
                    <span className="font-semibold">Filtered by: </span>
                    {Object.entries(DEPT_ORG_MAPPING).find(([, orgs]) => orgs.includes(selectedOrg.code))?.[0] || 'Related Department'}
                  </p>
                </div>
              )}
              
              <input
                type="text"
                placeholder="Search faculty by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              
              <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
                {filteredFaculty.length > 0 ? (
                  filteredFaculty.map(faculty => (
                    <button
                      key={faculty.uid}
                      onClick={() => setSelectedUser(faculty)}
                      className={`w-full p-3 text-left rounded-lg border transition-colors ${
                        selectedUser?.uid === faculty.uid 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{faculty.displayName}</p>
                      <p className="text-sm text-gray-500">{faculty.email}</p>
                      {faculty.department && (
                        <p className="text-xs text-gray-400 mt-1">{faculty.department}</p>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    {searchTerm ? 'No faculty found matching your search' : facultyList.length === 0 ? 'No faculty available for this organization' : 'Loading faculty...'}
                  </p>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAdviserModal(false)
                  setSelectedUser(null)
                  setSearchTerm('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAdviser}
                disabled={!selectedUser || submitting}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Adding...' : 'Add Adviser'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Add Officer Modal */}
      {showOfficerModal && (
        <ModalOverlay onClose={() => setShowOfficerModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Tag Officer for {selectedOrg?.name}</h3>
                <p className="text-sm text-white/80 mt-0.5">Select a student and position</p>
              </div>
              <button onClick={() => setShowOfficerModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Course Filter Notice */}
              {selectedOrg && !['CSG', 'ST', 'TF', 'HS'].includes(selectedOrg.code) && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800 flex items-center gap-1">
                    <LockClosedIcon className="w-3.5 h-3.5" />
                    <span className="font-semibold">Filtered by: </span>
                    {ORGANIZATIONS[selectedOrg.code]?.audienceCourse || ORGANIZATIONS[selectedOrg.code]?.audienceDepartment || 'Related Course'}
                  </p>
                </div>
              )}
              
              {/* Position Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select position...</option>
                  {availablePositions.map(position => (
                    <option key={position.id} value={position.id}>
                      {position.title}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Student Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
                <input
                  type="text"
                  placeholder="Search by name, email, or student ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="max-h-48 overflow-y-auto space-y-2">
                {filteredStudents.slice(0, 20).map(student => (
                  <button
                    key={student.uid}
                    onClick={() => setSelectedUser(student)}
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      selectedUser?.uid === student.uid 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{student.displayName}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{student.studentId || 'No ID'}</span>
                      <span>•</span>
                      <span>{student.course || 'No course'}</span>
                    </div>
                  </button>
                ))}
                {filteredStudents.length > 20 && (
                  <p className="text-center text-sm text-gray-500 py-2">
                    Showing 20 of {filteredStudents.length} results. Refine your search.
                  </p>
                )}
                {filteredStudents.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    {searchTerm ? 'No students found matching your search' : studentList.length === 0 ? 'No students available for this organization' : 'Search for a student...'}
                  </p>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowOfficerModal(false)
                  setSelectedUser(null)
                  setSelectedPosition('')
                  setSearchTerm('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddOfficer}
                disabled={!selectedUser || !selectedPosition || submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Tagging...' : 'Tag Officer'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Create Organization Modal */}
      {showCreateOrgModal && (
        <ModalOverlay onClose={() => !submitting && setShowCreateOrgModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Create New Organization</h3>
                <p className="text-white/80 text-sm mt-0.5">Add a new student organization to the system</p>
              </div>
              <button onClick={() => !submitting && setShowCreateOrgModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors" disabled={submitting}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Organization Photo */}
              <div className="flex flex-col items-center">
                <input
                  type="file"
                  ref={orgPhotoInputRef}
                  onChange={handleOrgPhotoSelect}
                  accept="image/*"
                  className="hidden"
                />
                <div 
                  onClick={() => orgPhotoInputRef.current?.click()}
                  className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors overflow-hidden"
                >
                  {orgPhotoPreview ? (
                    <img src={orgPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Click to upload logo (optional)</p>
              </div>

              {/* Code and Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newOrgData.code}
                    onChange={(e) => setNewOrgData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g., CSC"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Short Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newOrgData.name}
                    onChange={(e) => setNewOrgData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Computer Science Clique"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newOrgData.fullName}
                  onChange={(e) => setNewOrgData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="e.g., Computer Science Clique"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newOrgData.category}
                  onChange={(e) => setNewOrgData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {Object.entries(ORG_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newOrgData.description}
                  onChange={(e) => setNewOrgData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the organization..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                />
              </div>

              {/* Audience Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Audience Type</label>
                <select
                  value={newOrgData.audienceType}
                  onChange={(e) => setNewOrgData(prev => ({ ...prev, audienceType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">All Students (Campus-wide)</option>
                  <option value="course">Specific Course</option>
                  <option value="department">Specific Department</option>
                </select>
              </div>

              {/* Audience Course (if course type) */}
              {newOrgData.audienceType === 'course' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Course</label>
                  <input
                    type="text"
                    value={newOrgData.audienceCourse}
                    onChange={(e) => setNewOrgData(prev => ({ ...prev, audienceCourse: e.target.value }))}
                    placeholder="e.g., BS Computer Science"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              )}

              {/* Audience Department (if department type) */}
              {newOrgData.audienceType === 'department' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Department</label>
                  <input
                    type="text"
                    value={newOrgData.audienceDepartment}
                    onChange={(e) => setNewOrgData(prev => ({ ...prev, audienceDepartment: e.target.value }))}
                    placeholder="e.g., Department of Computer Studies"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              )}

              {/* Max Advisers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Advisers</label>
                <input
                  type="number"
                  value={newOrgData.maxAdvisers}
                  onChange={(e) => setNewOrgData(prev => ({ ...prev, maxAdvisers: parseInt(e.target.value) || 1 }))}
                  min={1}
                  max={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateOrgModal(false)
                  setNewOrgData({
                    code: '',
                    name: '',
                    fullName: '',
                    category: 'academic',
                    description: '',
                    audienceType: 'all',
                    audienceCourse: '',
                    audienceDepartment: '',
                    maxAdvisers: 2
                  })
                  setOrgPhotoFile(null)
                  setOrgPhotoPreview(null)
                }}
                disabled={submitting}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrganization}
                disabled={!newOrgData.code || !newOrgData.name || submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (uploadingOrgPhoto ? 'Uploading Photo...' : 'Creating...') : 'Create Organization'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Add Committee Member Modal */}
      {showCommitteeModal && (
        <ModalOverlay onClose={() => setShowCommitteeModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Add Committee Member</h3>
                <p className="text-sm text-white/80 mt-0.5">{selectedOrg?.name}</p>
              </div>
              <button onClick={() => setShowCommitteeModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Committee Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Committee</label>
                <select
                  value={selectedCommittee}
                  onChange={(e) => setSelectedCommittee(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Select committee...</option>
                  {COMMITTEE_POSITIONS.filter(c => {
                    // Only show committees the user can manage
                    if (!manageableCommitteeIds.includes(c.id)) return false
                    const members = committeeMembers[c.id] || []
                    return members.length < c.maxMembers
                  }).map(committee => {
                    const parentOfficer = orgOfficers?.officers?.find(o => o.positionId === committee.parentOfficerId)
                    const members = committeeMembers[committee.id] || []
                    return (
                      <option key={committee.id} value={committee.id}>
                        {committee.title} ({members.length}/{committee.maxMembers}) - Under {parentOfficer?.displayName || committee.parentOfficerTitle}
                      </option>
                    )
                  })}
                </select>
              </div>
              
              {/* Selected committee info */}
              {selectedCommittee && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs text-orange-800">
                    <span className="font-semibold">Parent Officer: </span>
                    {(() => {
                      const committee = COMMITTEE_POSITIONS.find(c => c.id === selectedCommittee)
                      const parentOfficer = orgOfficers?.officers?.find(o => o.positionId === committee?.parentOfficerId)
                      return parentOfficer?.displayName || committee?.parentOfficerTitle
                    })()}
                  </p>
                </div>
              )}
              
              {/* Student Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
                <input
                  type="text"
                  placeholder="Search by name, email, or student ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <div className="max-h-48 overflow-y-auto space-y-2">
                {filteredStudents.slice(0, 20).map(student => (
                  <button
                    key={student.uid}
                    onClick={() => setSelectedUser(student)}
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      selectedUser?.uid === student.uid 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{student.displayName}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{student.studentId || 'No ID'}</span>
                      <span>•</span>
                      <span>{student.course || 'No course'}</span>
                    </div>
                  </button>
                ))}
                {filteredStudents.length > 20 && (
                  <p className="text-center text-sm text-gray-500 py-2">
                    Showing 20 of {filteredStudents.length} results. Refine your search.
                  </p>
                )}
                {filteredStudents.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    {searchTerm ? 'No students found matching your search' : 'Search for a student...'}
                  </p>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCommitteeModal(false)
                  setSelectedUser(null)
                  setSelectedCommittee('')
                  setSearchTerm('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCommitteeMember}
                disabled={!selectedUser || !selectedCommittee || submitting}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Add Year Representative Modal */}
      {showYearRepModal && (
        <ModalOverlay onClose={() => setShowYearRepModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Tag Year Representative</h3>
                <p className="text-sm text-white/80 mt-0.5">{selectedOrg?.name}</p>
              </div>
              <button onClick={() => setShowYearRepModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Year Rep Position Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year Level</label>
                <select
                  value={selectedYearRep}
                  onChange={(e) => setSelectedYearRep(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Select year level...</option>
                  {availableYearRepPositions.map(position => (
                    <option key={position.id} value={position.id}>
                      {position.title}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Student Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
                <input
                  type="text"
                  placeholder="Search by name, email, or student ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              
              <div className="max-h-48 overflow-y-auto space-y-2">
                {filteredStudents.slice(0, 20).map(student => (
                  <button
                    key={student.uid}
                    onClick={() => setSelectedUser(student)}
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      selectedUser?.uid === student.uid 
                        ? 'border-teal-500 bg-teal-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{student.displayName}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{student.studentId || 'No ID'}</span>
                      <span>•</span>
                      <span>{student.course || 'No course'}</span>
                    </div>
                  </button>
                ))}
                {filteredStudents.length > 20 && (
                  <p className="text-center text-sm text-gray-500 py-2">
                    Showing 20 of {filteredStudents.length} results. Refine your search.
                  </p>
                )}
                {filteredStudents.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    {searchTerm ? 'No students found matching your search' : 'Search for a student...'}
                  </p>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowYearRepModal(false)
                  setSelectedUser(null)
                  setSelectedYearRep('')
                  setSearchTerm('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddYearRep}
                disabled={!selectedUser || !selectedYearRep || submitting}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Tagging...' : 'Tag Year Rep'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
