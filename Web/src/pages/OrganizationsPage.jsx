/**
 * Organizations Management Page
 * 
 * Admin view to manage student organizations:
 * - View all organizations and their officers
 * - Tag faculty as advisers (Admin only)
 * - Tag students as officers (Adviser/President)
 */

import { useState, useEffect } from 'react'
import { useAuth, ROLES } from '../contexts/AuthContext'
import Toast from '../components/ui/Toast'
import ModalOverlay from '../components/ui/ModalOverlay'
import {
  ORGANIZATIONS,
  ORG_CATEGORIES,
  getAllOrganizationsData,
  getOrganizationData,
  getOrganizationOfficers,
  getAvailablePositions,
  tagAdviser,
  removeAdviser,
  tagOfficer,
  removeOfficer,
  canTagOfficers,
  getUserOrgBadges
} from '../services/organizationService'
import { getDocuments } from '../services/dbService'

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
  const [facultyList, setFacultyList] = useState([])
  const [studentList, setStudentList] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedPosition, setSelectedPosition] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Permission checks
  const isAdmin = hasMinRole(ROLES.ADMIN)
  const [canTagForSelectedOrg, setCanTagForSelectedOrg] = useState(false)
  
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
  }, [])

  // Fetch officers when org is selected
  useEffect(() => {
    const fetchOrgDetails = async () => {
      if (!selectedOrg) {
        setOrgOfficers(null)
        setCanTagForSelectedOrg(false)
        return
      }
      
      try {
        const officers = await getOrganizationOfficers(selectedOrg.code)
        setOrgOfficers(officers)
        
        const positions = await getAvailablePositions(selectedOrg.code)
        setAvailablePositions(positions)
        
        // Check if user can tag officers
        if (user) {
          const canTag = await canTagOfficers(user.uid, selectedOrg.code)
          setCanTagForSelectedOrg(canTag || isAdmin)
        }
      } catch (error) {
        console.error('Error fetching org details:', error)
      }
    }
    
    fetchOrgDetails()
  }, [selectedOrg, user, isAdmin])

  // Fetch faculty list for adviser modal
  useEffect(() => {
    const fetchFaculty = async () => {
      if (!showAdviserModal) return
      
      try {
        const users = await getDocuments('users')
        const faculty = users.filter(u => u.role === ROLES.FACULTY)
        setFacultyList(faculty)
      } catch (error) {
        console.error('Error fetching faculty:', error)
      }
    }
    
    fetchFaculty()
  }, [showAdviserModal])

  // Fetch student list for officer modal
  useEffect(() => {
    const fetchStudents = async () => {
      if (!showOfficerModal) return
      
      try {
        const users = await getDocuments('users')
        const students = users.filter(u => u.role === ROLES.STUDENT)
        setStudentList(students)
      } catch (error) {
        console.error('Error fetching students:', error)
      }
    }
    
    fetchStudents()
  }, [showOfficerModal])

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
  const orgsByCategory = Object.entries(ORG_CATEGORIES).map(([key, category]) => ({
    key,
    ...category,
    orgs: organizations.filter(org => {
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Student Organizations</h1>
        <p className="text-gray-600 mt-1">
          {isAdmin 
            ? 'Manage organization advisers and officers' 
            : 'View organization officers and make announcements'}
        </p>
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
                      <img 
                        src={ORG_LOGOS[org.id]} 
                        alt={org.name}
                        className="w-10 h-10 object-contain rounded-lg"
                      />
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
                <img 
                  src={ORG_LOGOS[selectedOrg.code]} 
                  alt={selectedOrg.name}
                  className="w-20 h-20 object-contain"
                />
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{selectedOrg.name}</h2>
                  <p className="text-gray-600">{selectedOrg.fullName}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ORG_CATEGORIES[selectedOrg.category]?.bgColor || 'bg-gray-100'
                    } ${ORG_CATEGORIES[selectedOrg.category]?.textColor || 'text-gray-800'}`}>
                      {ORG_CATEGORIES[selectedOrg.category]?.label || selectedOrg.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {selectedOrg.audienceType === 'all' 
                        ? '📢 Announces to all students' 
                        : `📢 Announces to ${selectedOrg.audienceCourse || selectedOrg.audienceDepartment || 'members'}`}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">School Year</p>
                  <p className="font-semibold text-gray-900">{orgOfficers?.schoolYear || '2025-2026'}</p>
                </div>
              </div>

              {/* Advisers Section */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <span className="text-purple-600">👨‍🏫</span>
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
                    <span className="text-blue-600">👥</span>
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
                            {officer && canTagForSelectedOrg && (
                              <button
                                onClick={() => handleRemoveOfficer(officer.userId)}
                                className="text-red-500 hover:text-red-600 ml-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
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
                              {officer && canTagForSelectedOrg && (
                                <button
                                  onClick={() => handleRemoveOfficer(officer.userId)}
                                  className="text-red-500 hover:text-red-600 ml-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-6xl mb-4">🏛️</div>
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Adviser to {selectedOrg?.name}</h3>
              <p className="text-sm text-gray-500 mt-1">Select a faculty member to tag as adviser</p>
            </div>
            
            <div className="p-6">
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
                    {searchTerm ? 'No faculty found' : 'Loading faculty...'}
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Tag Officer for {selectedOrg?.name}</h3>
              <p className="text-sm text-gray-500 mt-1">Select a student and position</p>
            </div>
            
            <div className="p-6 space-y-4">
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
                {searchTerm && filteredStudents.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No students found</p>
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
    </div>
  )
}
