/**
 * Organization Service
 * 
 * Manages student organizations, officer positions, and tagging hierarchy.
 * 
 * Hierarchy:
 * 1. Admin → Tags Faculty as Adviser to an Organization
 * 2. Adviser/President → Tags Students to Officer Positions
 * 3. Officers → Can announce to their organization's audience
 * 
 * CSG (Central Student Government) can announce to ALL students
 * Other orgs (CSC, BITS, etc.) can only announce to their course students
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { getDocument, updateDocument } from './dbService'

// ============================================
// ORGANIZATION STRUCTURE CONSTANTS
// ============================================

/**
 * Executive officer positions (same for all organizations)
 */
export const EXECUTIVE_POSITIONS = [
  { id: 'president', title: 'President', canTagOfficers: true, priority: 1 },
  { id: 'vp_internal', title: 'Vice President for Internal Affairs', canTagOfficers: false, priority: 2 },
  { id: 'vp_external', title: 'Vice President for External Affairs', canTagOfficers: false, priority: 3 },
  { id: 'secretary_general', title: 'Secretary General', canTagOfficers: false, priority: 4 },
  { id: 'treasurer_general', title: 'Treasurer General', canTagOfficers: false, priority: 5 },
  { id: 'auditor', title: 'Auditor', canTagOfficers: false, priority: 6 },
  { id: 'pro', title: 'Public Relations Officer', canTagOfficers: false, priority: 7 }
]

/**
 * CSG-specific board member positions (SAP = Student Assembly Person)
 */
export const CSG_BOARD_POSITIONS = [
  { id: 'sap_ba', title: 'SAP Business Administration', priority: 10 },
  { id: 'sap_cs', title: 'SAP Computer Science', priority: 11 },
  { id: 'sap_ed', title: 'SAP Education', priority: 12 },
  { id: 'sap_ent', title: 'SAP Entrepreneurship', priority: 13 },
  { id: 'sap_hm', title: 'SAP Hospitality Management', priority: 14 },
  { id: 'sap_it', title: 'SAP Information Technology', priority: 15 },
  { id: 'sap_journalism', title: 'SAP Journalism', priority: 16 },
  { id: 'sap_oa', title: 'SAP Office Administration', priority: 17 },
  { id: 'sap_psych', title: 'SAP Psychology', priority: 18 },
  { id: 'gad_rep', title: 'GAD Representative', priority: 19 }
]

/**
 * Regular org SAP position (course-specific)
 */
export const getOrgSapPosition = (orgCode, courseName) => ({
  id: `sap_${orgCode.toLowerCase()}`,
  title: `SAP ${courseName}`,
  priority: 8
})

/**
 * Committee positions - assigned under respective parent officers
 * Each committee can have up to 5 members
 */
export const COMMITTEE_POSITIONS = [
  { 
    id: 'internal_affairs', 
    title: 'Internal Affairs Committee', 
    parentOfficerId: 'vp_internal',
    parentOfficerTitle: 'Vice President for Internal Affairs',
    maxMembers: 5 
  },
  { 
    id: 'external_affairs', 
    title: 'External Affairs Committee', 
    parentOfficerId: 'vp_external',
    parentOfficerTitle: 'Vice President for External Affairs',
    maxMembers: 5 
  },
  { 
    id: 'membership_dues', 
    title: 'Membership and Dues Committee', 
    parentOfficerId: 'treasurer_general',
    parentOfficerTitle: 'Treasurer General',
    maxMembers: 5 
  },
  { 
    id: 'secretariat', 
    title: 'Secretariat Committee', 
    parentOfficerId: 'secretary_general',
    parentOfficerTitle: 'Secretary General',
    maxMembers: 5 
  },
  { 
    id: 'publicity', 
    title: 'Publicity Committee', 
    parentOfficerId: 'pro',
    parentOfficerTitle: 'Public Relations Officer',
    maxMembers: 5 
  },
  { 
    id: 'multimedia', 
    title: 'Multimedia Committee', 
    parentOfficerId: 'pro',
    parentOfficerTitle: 'Public Relations Officer',
    maxMembers: 5 
  },
  { 
    id: 'finance_sponsorship', 
    title: 'Finance and Sponsorship Committee', 
    parentOfficerId: 'treasurer_general',
    parentOfficerTitle: 'Treasurer General',
    maxMembers: 5 
  },
  { 
    id: 'audits', 
    title: 'Audits Committee', 
    parentOfficerId: 'auditor',
    parentOfficerTitle: 'Auditor',
    maxMembers: 5 
  }
]

/**
 * Year Representative positions
 * Each year can have 1 representative
 */
export const YEAR_REP_POSITIONS = [
  { id: 'year_rep_1', title: '1st Year Representative', yearLevel: 1 },
  { id: 'year_rep_2', title: '2nd Year Representative', yearLevel: 2 },
  { id: 'year_rep_3', title: '3rd Year Representative', yearLevel: 3 },
  { id: 'year_rep_4', title: '4th Year Representative', yearLevel: 4 }
]

/**
 * All organizations with their configurations
 */
export const ORGANIZATIONS = {
  CSG: {
    code: 'CSG',
    name: 'Central Student Government',
    fullName: 'Central Student Government',
    category: 'governance',
    audienceType: 'all', // Can announce to ALL students
    maxAdvisers: 2,
    positions: [...EXECUTIVE_POSITIONS, ...CSG_BOARD_POSITIONS],
    description: 'The highest governing student body in CvSU Imus Campus'
  },
  CSC: {
    code: 'CSC',
    name: 'Computer Science Clique',
    fullName: 'Computer Science Clique',
    category: 'program',
    audienceType: 'course', // Can announce to CS students only
    audienceCourse: 'BS Computer Science',
    maxAdvisers: 1,
    positions: [...EXECUTIVE_POSITIONS, getOrgSapPosition('CSC', 'CS')],
    description: 'The official organization for Computer Science students'
  },
  BITS: {
    code: 'BITS',
    name: 'Builders of Innovative Technologist Society',
    fullName: 'Builders of Innovative Technologist Society',
    category: 'program',
    audienceType: 'course', // Can announce to IT students only
    audienceCourse: 'BS Information Technology',
    maxAdvisers: 1,
    positions: [...EXECUTIVE_POSITIONS, getOrgSapPosition('BITS', 'IT')],
    description: 'The official organization for Information Technology students'
  },
  BMS: {
    code: 'BMS',
    name: 'Business Management Society',
    fullName: 'Business Management Society',
    category: 'academic',
    audienceType: 'course',
    audienceCourse: 'BS Business Administration',
    maxAdvisers: 1,
    positions: [...EXECUTIVE_POSITIONS, getOrgSapPosition('BMS', 'BA')],
    description: 'The official organization for Business Administration students'
  },
  CC: {
    code: 'CC',
    name: 'Cavite Communicators',
    fullName: 'Cavite Communicators',
    category: 'media',
    audienceType: 'course',
    audienceCourse: 'BA Communication',
    maxAdvisers: 1,
    positions: [...EXECUTIVE_POSITIONS],
    description: 'Campus communication and media organization'
  },
  CHLS: {
    code: 'CHLS',
    name: 'Circle of Hospitality and Tourism Students',
    fullName: 'Circle of Hospitality and Tourism Students',
    category: 'academic',
    audienceType: 'course',
    audienceCourse: 'BS Hospitality Management',
    maxAdvisers: 1,
    positions: [...EXECUTIVE_POSITIONS, getOrgSapPosition('CHLS', 'HM')],
    description: 'The official organization for Hospitality Management students'
  },
  CYLE: {
    code: 'CYLE',
    name: 'Cavite Young Leaders for Entrepreneurship',
    fullName: 'Cavite Young Leaders for Entrepreneurship',
    category: 'academic',
    audienceType: 'course',
    audienceCourse: 'BS Entrepreneurship',
    maxAdvisers: 1,
    positions: [...EXECUTIVE_POSITIONS, getOrgSapPosition('CYLE', 'ENT')],
    description: 'The official organization for Entrepreneurship students'
  },
  EDGE: {
    code: 'EDGE',
    name: "Educators' Guild for Excellence",
    fullName: "Educators' Guild for Excellence",
    category: 'academic',
    audienceType: 'department',
    audienceDepartment: 'Teacher Education Department',
    maxAdvisers: 1,
    positions: [...EXECUTIVE_POSITIONS, getOrgSapPosition('EDGE', 'Education')],
    description: 'The official organization for Education students'
  },
  SMSP: {
    code: 'SMSP',
    name: 'Samahan ng mga Magaaral ng Sikolohiya',
    fullName: 'Samahan ng mga Magaaral ng Sikolohiya',
    category: 'academic',
    audienceType: 'course',
    audienceCourse: 'BS Psychology',
    maxAdvisers: 1,
    positions: [...EXECUTIVE_POSITIONS, getOrgSapPosition('SMSP', 'Psychology')],
    description: 'The official organization for Psychology students'
  },
  YOPA: {
    code: 'YOPA',
    name: 'Young Office Professional Advocates',
    fullName: 'Young Office Professional Advocates',
    category: 'academic',
    audienceType: 'course',
    audienceCourse: 'BS Office Administration',
    maxAdvisers: 1,
    positions: [...EXECUTIVE_POSITIONS, getOrgSapPosition('YOPA', 'OA')],
    description: 'The official organization for Office Administration students'
  },
  ST: {
    code: 'ST',
    name: 'Sinag-Tala',
    fullName: 'Sinag-Tala',
    category: 'media',
    audienceType: 'all', // Campus-wide literary publication
    maxAdvisers: 1,
    positions: [...EXECUTIVE_POSITIONS],
    description: 'Campus literary and arts publication'
  },
  TF: {
    code: 'TF',
    name: 'The Flare',
    fullName: 'The Flare',
    category: 'media',
    audienceType: 'all', // Campus-wide publication
    maxAdvisers: 1,
    positions: [...EXECUTIVE_POSITIONS],
    description: 'Official campus publication'
  },
  HS: {
    code: 'HS',
    name: 'Honor Society',
    fullName: 'Honor Society',
    category: 'honor',
    audienceType: 'all', // Can announce to all (honor students campus-wide)
    maxAdvisers: 1,
    positions: [...EXECUTIVE_POSITIONS],
    description: 'Organization for students with academic excellence'
  }
}

// Organization categories for display
export const ORG_CATEGORIES = {
  governance: { label: 'Student Government', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  program: { label: 'Program Organizations', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  academic: { label: 'Academic Organizations', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  media: { label: 'Media & Publications', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
  honor: { label: 'Honor Societies', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' }
}

// ============================================
// ORGANIZATION DATA OPERATIONS
// ============================================

/**
 * Get organization by code
 */
export const getOrganization = (orgCode) => {
  return ORGANIZATIONS[orgCode] || null
}

/**
 * Get all organizations
 */
export const getAllOrganizations = () => {
  return Object.values(ORGANIZATIONS)
}

/**
 * Get organizations by category
 */
export const getOrganizationsByCategory = (category) => {
  return Object.values(ORGANIZATIONS).filter(org => org.category === category)
}

/**
 * Get organization code by course name
 * Maps student courses to their corresponding organizations
 * @param {string} courseName - Course name (e.g., 'BS Computer Science', 'BSCS')
 * @returns {string|null} Organization code or null if no match
 */
export const getOrganizationByCourse = (courseName) => {
  if (!courseName) return null
  
  const normalizedCourse = courseName.toUpperCase().trim()
  
  // Direct mapping for abbreviations
  const courseAbbreviations = {
    'BSCS': 'CSC',
    'BSIT': 'BITS',
    'BSBA': 'BMS',
    'BSHM': 'CHLS',
    'BSENT': 'CYLE',
    'BSOA': 'YOPA',
    'BSPSY': 'SMSP',
    'BACOMM': 'CC',
    'BSED': 'EDGE',
    'BEED': 'EDGE'
  }
  
  // Check abbreviation first
  if (courseAbbreviations[normalizedCourse]) {
    return courseAbbreviations[normalizedCourse]
  }
  
  // Search by audienceCourse in ORGANIZATIONS
  for (const [code, org] of Object.entries(ORGANIZATIONS)) {
    if (org.audienceCourse) {
      const audienceNormalized = org.audienceCourse.toUpperCase()
      if (normalizedCourse === audienceNormalized || 
          normalizedCourse.includes(audienceNormalized) ||
          audienceNormalized.includes(normalizedCourse)) {
        return code
      }
    }
  }
  
  return null
}

/**
 * Get available positions for an organization
 */
export const getPositionsForOrg = (orgCode) => {
  const org = ORGANIZATIONS[orgCode]
  if (!org) return []
  return org.positions.sort((a, b) => a.priority - b.priority)
}

// ============================================
// FIRESTORE ORGANIZATION OFFICERS COLLECTION
// ============================================

/**
 * Create or update organization officers document
 * Structure: organizations/{orgCode} -> { officers: [...], advisers: [...], schoolYear: '2025-2026' }
 */
export const initializeOrganization = async (orgCode, schoolYear) => {
  const org = ORGANIZATIONS[orgCode]
  // Don't throw error for orgs not in static config - they may exist in Firestore

  const docRef = doc(db, 'organizations', orgCode)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) {
    // If org exists in static config, use that data
    if (org) {
      await setDoc(docRef, {
        code: orgCode,
        name: org.name,
        fullName: org.fullName,
        category: org.category,
        audienceType: org.audienceType,
        audienceCourse: org.audienceCourse || null,
        audienceDepartment: org.audienceDepartment || null,
        officers: [],
        advisers: [],
        committeeMembers: {},
        yearReps: [],
        schoolYear: schoolYear || getCurrentSchoolYear(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    } else {
      // For Firestore-only orgs, create minimal structure
      await setDoc(docRef, {
        code: orgCode,
        name: orgCode,
        officers: [],
        advisers: [],
        committeeMembers: {},
        yearReps: [],
        maxAdvisers: 2,
        schoolYear: schoolYear || getCurrentSchoolYear(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    }
  }

  return docRef
}

/**
 * Get current school year (e.g., "2025-2026")
 */
const getCurrentSchoolYear = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  // School year starts in August
  if (month >= 8) {
    return `${year}-${year + 1}`
  }
  return `${year - 1}-${year}`
}

/**
 * Get organization data from Firestore
 */
export const getOrganizationData = async (orgCode) => {
  const docRef = doc(db, 'organizations', orgCode)
  const docSnap = await getDoc(docRef)
  
  if (!docSnap.exists()) {
    // Initialize if doesn't exist
    await initializeOrganization(orgCode)
    const newSnap = await getDoc(docRef)
    return { id: newSnap.id, ...newSnap.data() }
  }
  
  const data = docSnap.data()
  
  // Ensure committeeMembers and yearReps fields exist (migration for existing orgs)
  if (!data.committeeMembers || !data.yearReps) {
    const updates = {}
    if (!data.committeeMembers) updates.committeeMembers = {}
    if (!data.yearReps) updates.yearReps = []
    
    await updateDoc(docRef, updates)
    return { id: docSnap.id, ...data, ...updates }
  }
  
  return { id: docSnap.id, ...data }
}

/**
 * Get all organizations data from Firestore
 * Falls back to static ORGANIZATIONS data if Firestore is empty
 */
export const getAllOrganizationsData = async () => {
  try {
    const orgsSnapshot = await getDocs(collection(db, 'organizations'))
    const orgsData = []
    
    orgsSnapshot.forEach(doc => {
      orgsData.push({ id: doc.id, ...doc.data() })
    })
    
    // Always include all orgs from static config (merge with Firestore data)
    for (const orgCode of Object.keys(ORGANIZATIONS)) {
      if (!orgsData.find(o => o.id === orgCode)) {
        const orgConfig = ORGANIZATIONS[orgCode]
        orgsData.push({
          id: orgCode,
          code: orgCode,
          name: orgConfig.name,
          fullName: orgConfig.fullName,
          category: orgConfig.category,
          audienceType: orgConfig.audienceType,
          audienceCourse: orgConfig.audienceCourse || null,
          audienceDepartment: orgConfig.audienceDepartment || null,
          maxAdvisers: orgConfig.maxAdvisers,
          positions: orgConfig.positions,
          description: orgConfig.description,
          officers: [],
          advisers: [],
          schoolYear: getCurrentSchoolYear()
        })
      }
    }
    
    return orgsData
  } catch (error) {
    console.error('Error fetching organizations from Firestore:', error)
    // Return static data as fallback
    return Object.entries(ORGANIZATIONS).map(([code, org]) => ({
      id: code,
      code: code,
      ...org,
      officers: [],
      advisers: [],
      schoolYear: getCurrentSchoolYear()
    }))
  }
}

// ============================================
// ADVISER MANAGEMENT (Admin Only)
// ============================================

/**
 * Tag a faculty as adviser to an organization
 * @param {string} orgCode - Organization code
 * @param {string} userId - Faculty user ID
 * @param {object} userInfo - { displayName, email }
 */
export const tagAdviser = async (orgCode, userId, userInfo) => {
  // Get org from static config OR Firestore
  const staticOrg = ORGANIZATIONS[orgCode]
  const orgData = await getOrganizationData(orgCode)
  
  // Use Firestore data if static config doesn't exist
  const orgName = staticOrg?.name || orgData?.name || orgCode
  const maxAdvisers = staticOrg?.maxAdvisers || orgData?.maxAdvisers || 2
  
  // Check max advisers
  if (orgData.advisers?.length >= maxAdvisers) {
    throw new Error(`${orgName} can only have ${maxAdvisers} adviser(s)`)
  }

  // Check if already an adviser
  if (orgData.advisers?.some(a => a.userId === userId)) {
    throw new Error('This faculty is already an adviser for this organization')
  }

  const adviserEntry = {
    userId,
    displayName: userInfo.displayName,
    email: userInfo.email,
    taggedAt: new Date().toISOString(),
    taggedBy: userInfo.taggedBy || null
  }

  // Update organization (use setDoc with merge for orgs not in Firestore yet)
  const docRef = doc(db, 'organizations', orgCode)
  await setDoc(docRef, {
    advisers: arrayUnion(adviserEntry),
    updatedAt: serverTimestamp()
  }, { merge: true })

  // Update user profile with adviser tag
  await updateDocument('users', userId, {
    [`adviserOf.${orgCode}`]: {
      orgCode,
      orgName: orgName,
      taggedAt: new Date().toISOString()
    }
  })

  return adviserEntry
}

/**
 * Remove adviser from organization
 */
export const removeAdviser = async (orgCode, userId) => {
  const orgData = await getOrganizationData(orgCode)
  const adviserEntry = orgData.advisers?.find(a => a.userId === userId)
  
  if (!adviserEntry) {
    throw new Error('Adviser not found')
  }

  const docRef = doc(db, 'organizations', orgCode)
  await updateDoc(docRef, {
    advisers: arrayRemove(adviserEntry),
    updatedAt: serverTimestamp()
  })

  // Remove from user profile
  const userDoc = await getDocument('users', userId)
  if (userDoc?.adviserOf) {
    const updatedAdviserOf = { ...userDoc.adviserOf }
    delete updatedAdviserOf[orgCode]
    await updateDocument('users', userId, { adviserOf: updatedAdviserOf })
  }
}

/**
 * Check if user is adviser of an organization
 */
export const isAdviserOf = async (userId, orgCode) => {
  const orgData = await getOrganizationData(orgCode)
  return orgData.advisers?.some(a => a.userId === userId) || false
}

/**
 * Get organizations where user is adviser
 */
export const getAdviserOrganizations = async (userId) => {
  const user = await getDocument('users', userId)
  return user?.adviserOf || {}
}

// ============================================
// OFFICER TAGGING (Adviser/President)
// ============================================

/**
 * Tag a student as officer in an organization
 * Can only be done by Adviser or President
 * 
 * @param {string} orgCode - Organization code
 * @param {string} userId - Student user ID
 * @param {string} positionId - Position ID (e.g., 'president', 'vp_internal')
 * @param {object} userInfo - { displayName, email }
 * @param {string} taggedByUserId - ID of user doing the tagging
 */
export const tagOfficer = async (orgCode, userId, positionId, userInfo, taggedByUserId) => {
  const staticOrg = ORGANIZATIONS[orgCode]
  const orgData = await getOrganizationData(orgCode)
  
  // Get org name from static config or Firestore
  const orgName = staticOrg?.name || orgData?.name || orgCode

  // Find position from static config or use default executive positions
  const positions = staticOrg?.positions || EXECUTIVE_POSITIONS
  const position = positions.find(p => p.id === positionId)
  if (!position) throw new Error(`Invalid position: ${positionId}`)

  // Check if position is already filled
  const existingOfficer = orgData.officers?.find(o => o.positionId === positionId)
  if (existingOfficer) {
    throw new Error(`${position.title} position is already filled by ${existingOfficer.displayName}`)
  }

  // Check if user is already an officer in this org
  const userExistingPosition = orgData.officers?.find(o => o.userId === userId)
  if (userExistingPosition) {
    throw new Error(`${userInfo.displayName} already holds the position of ${userExistingPosition.positionTitle}`)
  }

  const officerEntry = {
    userId,
    displayName: userInfo.displayName,
    email: userInfo.email,
    positionId,
    positionTitle: position.title,
    canTagOfficers: position.canTagOfficers || false,
    taggedAt: new Date().toISOString(),
    taggedBy: taggedByUserId
  }

  // Update organization
  const docRef = doc(db, 'organizations', orgCode)
  await setDoc(docRef, {
    officers: arrayUnion(officerEntry),
    updatedAt: serverTimestamp()
  }, { merge: true })

  // Build the org tag with position (e.g., "org:CSC:PRESIDENT")
  const orgTag = `org:${orgCode}:${position.title.toUpperCase().replace(/\s+/g, '_')}`

  // Update user profile with officer tag and add to tags array
  const userDocRef = doc(db, 'users', userId)
  await updateDoc(userDocRef, {
    [`officerOf.${orgCode}`]: {
      orgCode,
      orgName: orgName,
      positionId,
      positionTitle: position.title,
      canTagOfficers: position.canTagOfficers || false,
      taggedAt: new Date().toISOString()
    },
    tags: arrayUnion(orgTag),
    updatedAt: serverTimestamp()
  })

  return officerEntry
}

/**
 * Remove officer from organization
 */
export const removeOfficer = async (orgCode, userId) => {
  const orgData = await getOrganizationData(orgCode)
  const officerEntry = orgData.officers?.find(o => o.userId === userId)
  
  if (!officerEntry) {
    throw new Error('Officer not found')
  }

  const docRef = doc(db, 'organizations', orgCode)
  await updateDoc(docRef, {
    officers: arrayRemove(officerEntry),
    updatedAt: serverTimestamp()
  })

  // Remove from user profile and remove the org tag
  const userDoc = await getDocument('users', userId)
  if (userDoc) {
    const updatedOfficerOf = { ...(userDoc.officerOf || {}) }
    delete updatedOfficerOf[orgCode]
    
    // Remove the org tag from tags array (find and remove any tag starting with org:ORGCODE:)
    const updatedTags = (userDoc.tags || []).filter(tag => 
      !tag.startsWith(`org:${orgCode}:`)
    )
    
    const userDocRef = doc(db, 'users', userId)
    await updateDoc(userDocRef, {
      officerOf: updatedOfficerOf,
      tags: updatedTags,
      updatedAt: serverTimestamp()
    })
  }
}

/**
 * Check if user can tag officers in an organization
 * Returns true if user is Adviser or President
 */
export const canTagOfficers = async (userId, orgCode) => {
  const orgData = await getOrganizationData(orgCode)
  
  // Check if adviser
  if (orgData.advisers?.some(a => a.userId === userId)) {
    return true
  }
  
  // Check if president or position with tagging rights
  const officer = orgData.officers?.find(o => o.userId === userId)
  if (officer?.canTagOfficers) {
    return true
  }
  
  return false
}

/**
 * Check which committees a user can manage in an organization
 * Returns array of committee IDs the user can assign members to
 * - Adviser/President can manage all committees
 * - Officers can only manage their respective committees
 */
export const getManageableCommittees = async (userId, orgCode) => {
  const orgData = await getOrganizationData(orgCode)
  
  // Check if adviser - can manage all
  if (orgData.advisers?.some(a => a.userId === userId)) {
    return COMMITTEE_POSITIONS.map(c => c.id)
  }
  
  // Check if officer
  const officer = orgData.officers?.find(o => o.userId === userId)
  if (!officer) {
    return []
  }
  
  // President can manage all committees
  if (officer.canTagOfficers) {
    return COMMITTEE_POSITIONS.map(c => c.id)
  }
  
  // Other officers can only manage their respective committees
  const manageableCommittees = COMMITTEE_POSITIONS
    .filter(c => c.parentOfficerId === officer.positionId)
    .map(c => c.id)
  
  return manageableCommittees
}

/**
 * Check if user can tag year representatives
 * Only Adviser or President can tag year reps
 */
export const canTagYearReps = async (userId, orgCode) => {
  const orgData = await getOrganizationData(orgCode)
  
  // Check if adviser
  if (orgData.advisers?.some(a => a.userId === userId)) {
    return true
  }
  
  // Check if president (has tagging rights)
  const officer = orgData.officers?.find(o => o.userId === userId)
  if (officer?.canTagOfficers) {
    return true
  }
  
  return false
}

/**
 * Get user's officer positions
 */
export const getUserOfficerPositions = async (userId) => {
  const user = await getDocument('users', userId)
  return user?.officerOf || {}
}

// ============================================
// ANNOUNCEMENT PERMISSIONS
// ============================================

/**
 * Check if user can announce for an organization
 * Returns the organization's audience scope
 */
export const canAnnounceForOrg = async (userId, orgCode) => {
  const orgData = await getOrganizationData(orgCode)
  
  // Check if adviser
  const isAdviser = orgData.advisers?.some(a => a.userId === userId)
  
  // Check if officer
  const isOfficer = orgData.officers?.some(o => o.userId === userId)
  
  if (!isAdviser && !isOfficer) {
    return null // Cannot announce
  }
  
  const staticOrg = ORGANIZATIONS[orgCode]
  return {
    canAnnounce: true,
    audienceType: staticOrg?.audienceType || orgData?.audienceType || 'all',
    audienceCourse: staticOrg?.audienceCourse || orgData?.audienceCourse,
    audienceDepartment: staticOrg?.audienceDepartment || orgData?.audienceDepartment,
    orgName: staticOrg?.name || orgData?.name || orgCode,
    orgCode: orgCode
  }
}

/**
 * Get all organizations where user can make announcements
 */
export const getUserAnnouncementOrgs = async (userId) => {
  const user = await getDocument('users', userId)
  const orgs = []
  
  // Check adviser positions
  if (user?.adviserOf) {
    for (const orgCode of Object.keys(user.adviserOf)) {
      const staticOrg = ORGANIZATIONS[orgCode]
      const orgData = staticOrg ? null : await getOrganizationData(orgCode).catch(() => null)
      orgs.push({
        orgCode,
        orgName: staticOrg?.name || orgData?.name || orgCode,
        role: 'Adviser',
        audienceType: staticOrg?.audienceType || orgData?.audienceType || 'all',
        audienceCourse: staticOrg?.audienceCourse || orgData?.audienceCourse,
        audienceDepartment: staticOrg?.audienceDepartment || orgData?.audienceDepartment
      })
    }
  }
  
  // Check officer positions
  if (user?.officerOf) {
    for (const orgCode of Object.keys(user.officerOf)) {
      // Skip if already added as adviser
      if (orgs.some(o => o.orgCode === orgCode)) continue
      
      const staticOrg = ORGANIZATIONS[orgCode]
      const orgData = staticOrg ? null : await getOrganizationData(orgCode).catch(() => null)
      orgs.push({
        orgCode,
        orgName: staticOrg?.name || orgData?.name || orgCode,
        role: user.officerOf[orgCode].positionTitle,
        audienceType: staticOrg?.audienceType || orgData?.audienceType || 'all',
        audienceCourse: staticOrg?.audienceCourse || orgData?.audienceCourse,
        audienceDepartment: staticOrg?.audienceDepartment || orgData?.audienceDepartment
      })
    }
  }
  
  return orgs
}

/**
 * Get audience tags for an organization announcement
 * Used when creating announcement to auto-set target tags
 */
export const getOrgAudienceTags = async (orgCode) => {
  const staticOrg = ORGANIZATIONS[orgCode]
  const orgData = staticOrg ? null : await getOrganizationData(orgCode).catch(() => null)
  
  const audienceType = staticOrg?.audienceType || orgData?.audienceType || 'all'
  const audienceCourse = staticOrg?.audienceCourse || orgData?.audienceCourse
  const audienceDepartment = staticOrg?.audienceDepartment || orgData?.audienceDepartment
  
  const tags = [`org:${orgCode}`]
  
  if (audienceType === 'all') {
    // CSG announces to all - no specific course tag
    tags.push('audience:all')
  } else if (audienceType === 'course' && audienceCourse) {
    // Course-specific organization
    tags.push(`course:${audienceCourse}`)
  } else if (audienceType === 'department' && audienceDepartment) {
    // Department-specific organization
    tags.push(`dept:${audienceDepartment}`)
  }
  
  return tags
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get display badge for user's organization positions
 */
export const getUserOrgBadges = (user) => {
  const badges = []
  
  if (user?.adviserOf) {
    for (const orgCode of Object.keys(user.adviserOf)) {
      badges.push({
        type: 'adviser',
        orgCode,
        orgName: ORGANIZATIONS[orgCode]?.name || orgCode,
        label: `${ORGANIZATIONS[orgCode]?.name || orgCode} Adviser`,
        color: 'purple'
      })
    }
  }
  
  if (user?.officerOf) {
    for (const orgCode of Object.keys(user.officerOf)) {
      const position = user.officerOf[orgCode]
      badges.push({
        type: 'officer',
        orgCode,
        orgName: ORGANIZATIONS[orgCode]?.name || orgCode,
        positionTitle: position.positionTitle,
        label: `${position.positionTitle} - ${ORGANIZATIONS[orgCode]?.name || orgCode}`,
        color: position.canTagOfficers ? 'green' : 'blue'
      })
    }
  }
  
  return badges
}

/**
 * Search users for officer tagging
 * Only returns students who are not already officers in the organization
 */
export const searchStudentsForTagging = async (orgCode, searchTerm) => {
  // This would be implemented with a proper search
  // For now, return empty - UI should handle search differently
  return []
}

/**
 * Get organization officers list
 */
export const getOrganizationOfficers = async (orgCode) => {
  const orgData = await getOrganizationData(orgCode)
  const staticOrg = ORGANIZATIONS[orgCode]
  
  // Get positions from static config, Firestore org data, or use executive positions as fallback
  const positions = staticOrg?.positions || orgData?.positions || EXECUTIVE_POSITIONS
  
  // Sort officers by position priority
  const officers = (orgData.officers || []).sort((a, b) => {
    const posA = positions.find(p => p.id === a.positionId)
    const posB = positions.find(p => p.id === b.positionId)
    return (posA?.priority || 99) - (posB?.priority || 99)
  })
  
  return {
    officers,
    advisers: orgData.advisers || [],
    positions: positions,
    schoolYear: orgData.schoolYear
  }
}

/**
 * Get available (unfilled) positions for an organization
 */
export const getAvailablePositions = async (orgCode) => {
  const orgData = await getOrganizationData(orgCode)
  const staticOrg = ORGANIZATIONS[orgCode]
  
  // Get positions from static config, Firestore org data, or use executive positions as fallback
  const positions = staticOrg?.positions || orgData?.positions || EXECUTIVE_POSITIONS
  
  const filledPositionIds = (orgData.officers || []).map(o => o.positionId)
  return positions.filter(p => !filledPositionIds.includes(p.id))
}

/**
 * Create a new organization (Admin only)
 * @param {object} orgData - Organization data
 * @param {string} orgData.code - Unique organization code (e.g., "NEW_ORG")
 * @param {string} orgData.name - Short name
 * @param {string} orgData.fullName - Full organization name
 * @param {string} orgData.category - Category: 'program', 'academic', 'governance', 'media', 'honor'
 * @param {string} orgData.description - Description
 * @param {string} orgData.audienceType - 'all', 'course', 'department'
 * @param {string} orgData.audienceCourse - Course name if audienceType is 'course'
 * @param {string} orgData.audienceDepartment - Department name if audienceType is 'department'
 * @param {number} orgData.maxAdvisers - Maximum number of advisers (default: 2)
 * @param {string} orgData.photoURL - Organization profile photo URL
 */
export const createOrganization = async (orgData) => {
  const { code, name, fullName, category, description, audienceType, audienceCourse, audienceDepartment, maxAdvisers, photoURL } = orgData
  
  if (!code || !name) {
    throw new Error('Organization code and name are required')
  }
  
  // Check if org already exists
  const existingDoc = await getDoc(doc(db, 'organizations', code))
  if (existingDoc.exists()) {
    throw new Error(`Organization with code "${code}" already exists`)
  }
  
  // Also check static config
  if (ORGANIZATIONS[code]) {
    throw new Error(`Organization "${code}" is a system organization and cannot be created`)
  }
  
  const newOrg = {
    code,
    name,
    fullName: fullName || name,
    category: category || 'academic',
    description: description || '',
    audienceType: audienceType || 'all',
    audienceCourse: audienceCourse || null,
    audienceDepartment: audienceDepartment || null,
    maxAdvisers: maxAdvisers || 2,
    photoURL: photoURL || null,
    positions: EXECUTIVE_POSITIONS, // Include standard officer positions
    officers: [],
    advisers: [],
    schoolYear: getCurrentSchoolYear(),
    isCustom: true, // Flag to identify admin-created orgs
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
  
  const docRef = doc(db, 'organizations', code)
  await setDoc(docRef, newOrg)
  
  return { id: code, ...newOrg }
}

/**
 * Update organization details
 */
export const updateOrganization = async (orgCode, updates) => {
  const docRef = doc(db, 'organizations', orgCode)
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  })
}

/**
 * Delete an organization (only custom orgs, not static ones)
 */
export const deleteOrganization = async (orgCode) => {
  // Cannot delete static organizations
  if (ORGANIZATIONS[orgCode]) {
    throw new Error('Cannot delete system organizations')
  }
  
  const docRef = doc(db, 'organizations', orgCode)
  await deleteDoc(docRef)
}

// ============================================
// COMMITTEE MEMBER TAGGING
// ============================================

/**
 * Tag a student as committee member
 * @param {string} orgCode - Organization code
 * @param {string} userId - Student user ID
 * @param {string} committeeId - Committee ID (e.g., 'internal_affairs')
 * @param {object} userInfo - { displayName, email }
 * @param {string} taggedByUserId - ID of user doing the tagging
 */
export const tagCommitteeMember = async (orgCode, userId, committeeId, userInfo, taggedByUserId) => {
  const staticOrg = ORGANIZATIONS[orgCode]
  const orgData = await getOrganizationData(orgCode)
  const orgName = staticOrg?.name || orgData?.name || orgCode
  
  // Find committee
  const committee = COMMITTEE_POSITIONS.find(c => c.id === committeeId)
  if (!committee) throw new Error(`Invalid committee: ${committeeId}`)
  
  // Check if committee is full (max 5 members)
  const committeeMembers = orgData.committeeMembers?.[committeeId] || []
  if (committeeMembers.length >= committee.maxMembers) {
    throw new Error(`${committee.title} already has ${committee.maxMembers} members`)
  }
  
  // Check if user is already in this committee
  if (committeeMembers.some(m => m.userId === userId)) {
    throw new Error(`${userInfo.displayName} is already a member of ${committee.title}`)
  }
  
  // Check if user is already in another committee in this org
  const allCommittees = orgData.committeeMembers || {}
  for (const [cId, members] of Object.entries(allCommittees)) {
    if (members.some(m => m.userId === userId)) {
      const existingCommittee = COMMITTEE_POSITIONS.find(c => c.id === cId)
      throw new Error(`${userInfo.displayName} is already a member of ${existingCommittee?.title || cId}`)
    }
  }

  const memberEntry = {
    userId,
    displayName: userInfo.displayName,
    email: userInfo.email,
    taggedAt: new Date().toISOString(),
    taggedBy: taggedByUserId
  }

  // Update organization - add member to the committee array
  const docRef = doc(db, 'organizations', orgCode)
  const updatedCommitteeMembers = {
    ...orgData.committeeMembers,
    [committeeId]: [...committeeMembers, memberEntry]
  }
  
  await updateDoc(docRef, {
    committeeMembers: updatedCommitteeMembers,
    updatedAt: serverTimestamp()
  })

  // Build the committee tag (e.g., "org:CSC:COMMITTEE:INTERNAL_AFFAIRS")
  const committeeTag = `org:${orgCode}:COMMITTEE:${committeeId.toUpperCase()}`

  // Update user profile
  const userDocRef = doc(db, 'users', userId)
  await updateDoc(userDocRef, {
    [`committeeMemberOf.${orgCode}`]: {
      orgCode,
      orgName,
      committeeId,
      committeeTitle: committee.title,
      parentOfficerId: committee.parentOfficerId,
      taggedAt: new Date().toISOString()
    },
    tags: arrayUnion(committeeTag),
    updatedAt: serverTimestamp()
  })

  return memberEntry
}

/**
 * Remove committee member from organization
 */
export const removeCommitteeMember = async (orgCode, userId, committeeId) => {
  const orgData = await getOrganizationData(orgCode)
  const committeeMembers = orgData.committeeMembers?.[committeeId] || []
  const memberEntry = committeeMembers.find(m => m.userId === userId)
  
  if (!memberEntry) {
    throw new Error('Committee member not found')
  }

  // Update organization - remove member from the committee array
  const docRef = doc(db, 'organizations', orgCode)
  const updatedCommitteeMembers = {
    ...orgData.committeeMembers,
    [committeeId]: committeeMembers.filter(m => m.userId !== userId)
  }
  
  await updateDoc(docRef, {
    committeeMembers: updatedCommitteeMembers,
    updatedAt: serverTimestamp()
  })

  // Remove from user profile
  const userDoc = await getDocument('users', userId)
  if (userDoc) {
    const updatedCommitteeMemberOf = { ...(userDoc.committeeMemberOf || {}) }
    delete updatedCommitteeMemberOf[orgCode]
    
    // Remove the committee tag
    const updatedTags = (userDoc.tags || []).filter(tag => 
      !tag.startsWith(`org:${orgCode}:COMMITTEE:`)
    )
    
    const userDocRef = doc(db, 'users', userId)
    await updateDoc(userDocRef, {
      committeeMemberOf: updatedCommitteeMemberOf,
      tags: updatedTags,
      updatedAt: serverTimestamp()
    })
  }
}

/**
 * Get committee members for an organization
 */
export const getCommitteeMembers = async (orgCode) => {
  const orgData = await getOrganizationData(orgCode)
  return orgData.committeeMembers || {}
}

// ============================================
// YEAR REPRESENTATIVE TAGGING
// ============================================

/**
 * Tag a student as year representative
 * @param {string} orgCode - Organization code
 * @param {string} userId - Student user ID
 * @param {string} yearRepId - Year rep ID (e.g., 'year_rep_1')
 * @param {object} userInfo - { displayName, email }
 * @param {string} taggedByUserId - ID of user doing the tagging
 */
export const tagYearRep = async (orgCode, userId, yearRepId, userInfo, taggedByUserId) => {
  const staticOrg = ORGANIZATIONS[orgCode]
  const orgData = await getOrganizationData(orgCode)
  const orgName = staticOrg?.name || orgData?.name || orgCode
  
  // Find year rep position
  const yearRep = YEAR_REP_POSITIONS.find(y => y.id === yearRepId)
  if (!yearRep) throw new Error(`Invalid year representative position: ${yearRepId}`)
  
  // Check if position is already filled
  const existingRep = orgData.yearReps?.find(r => r.yearRepId === yearRepId)
  if (existingRep) {
    throw new Error(`${yearRep.title} is already filled by ${existingRep.displayName}`)
  }
  
  // Check if user is already a year rep for this org
  const userExistingRep = orgData.yearReps?.find(r => r.userId === userId)
  if (userExistingRep) {
    const existingPosition = YEAR_REP_POSITIONS.find(y => y.id === userExistingRep.yearRepId)
    throw new Error(`${userInfo.displayName} already holds the position of ${existingPosition?.title}`)
  }

  const repEntry = {
    userId,
    displayName: userInfo.displayName,
    email: userInfo.email,
    yearRepId,
    yearRepTitle: yearRep.title,
    yearLevel: yearRep.yearLevel,
    taggedAt: new Date().toISOString(),
    taggedBy: taggedByUserId
  }

  // Update organization - add year rep to array
  const docRef = doc(db, 'organizations', orgCode)
  await updateDoc(docRef, {
    yearReps: arrayUnion(repEntry),
    updatedAt: serverTimestamp()
  })

  // Build the year rep tag (e.g., "org:CSC:YEAR_REP:1ST")
  const yearRepTag = `org:${orgCode}:YEAR_REP:${yearRep.yearLevel}`

  // Update user profile
  const userDocRef = doc(db, 'users', userId)
  await updateDoc(userDocRef, {
    [`yearRepOf.${orgCode}`]: {
      orgCode,
      orgName,
      yearRepId,
      yearRepTitle: yearRep.title,
      yearLevel: yearRep.yearLevel,
      taggedAt: new Date().toISOString()
    },
    tags: arrayUnion(yearRepTag),
    updatedAt: serverTimestamp()
  })

  return repEntry
}

/**
 * Remove year representative from organization
 */
export const removeYearRep = async (orgCode, userId) => {
  const orgData = await getOrganizationData(orgCode)
  const repEntry = orgData.yearReps?.find(r => r.userId === userId)
  
  if (!repEntry) {
    throw new Error('Year representative not found')
  }

  const docRef = doc(db, 'organizations', orgCode)
  await updateDoc(docRef, {
    yearReps: arrayRemove(repEntry),
    updatedAt: serverTimestamp()
  })

  // Remove from user profile
  const userDoc = await getDocument('users', userId)
  if (userDoc) {
    const updatedYearRepOf = { ...(userDoc.yearRepOf || {}) }
    delete updatedYearRepOf[orgCode]
    
    // Remove the year rep tag
    const updatedTags = (userDoc.tags || []).filter(tag => 
      !tag.startsWith(`org:${orgCode}:YEAR_REP:`)
    )
    
    const userDocRef = doc(db, 'users', userId)
    await updateDoc(userDocRef, {
      yearRepOf: updatedYearRepOf,
      tags: updatedTags,
      updatedAt: serverTimestamp()
    })
  }
}

/**
 * Get year representatives for an organization
 */
export const getYearReps = async (orgCode) => {
  const orgData = await getOrganizationData(orgCode)
  return orgData.yearReps || []
}

/**
 * Get available year rep positions for an organization
 */
export const getAvailableYearRepPositions = async (orgCode) => {
  const orgData = await getOrganizationData(orgCode)
  const filledPositionIds = (orgData.yearReps || []).map(r => r.yearRepId)
  return YEAR_REP_POSITIONS.filter(p => !filledPositionIds.includes(p.id))
}

export default {
  ORGANIZATIONS,
  EXECUTIVE_POSITIONS,
  CSG_BOARD_POSITIONS,
  COMMITTEE_POSITIONS,
  YEAR_REP_POSITIONS,
  ORG_CATEGORIES,
  getOrganization,
  getAllOrganizations,
  getOrganizationsByCategory,
  getPositionsForOrg,
  initializeOrganization,
  getOrganizationData,
  getAllOrganizationsData,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  tagAdviser,
  removeAdviser,
  isAdviserOf,
  getAdviserOrganizations,
  tagOfficer,
  removeOfficer,
  canTagOfficers,
  getManageableCommittees,
  canTagYearReps,
  getUserOfficerPositions,
  canAnnounceForOrg,
  getUserAnnouncementOrgs,
  getOrgAudienceTags,
  getUserOrgBadges,
  getOrganizationOfficers,
  getAvailablePositions,
  tagCommitteeMember,
  removeCommitteeMember,
  getCommitteeMembers,
  tagYearRep,
  removeYearRep,
  getYearReps,
  getAvailableYearRepPositions
}
