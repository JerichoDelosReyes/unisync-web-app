/**
 * Profile Tagging Service
 * 
 * Provides backend logic for linking users to Departments, Organizations,
 * Programs, Year Levels, and Sections.
 * 
 * Tag Format: `type:value` (e.g., "dept:DCS", "org:CSC", "year:3", "section:A")
 */

import { updateDocument, getDocument, getDocuments } from './dbService'
import { 
  DEPARTMENTS, 
  DEPARTMENT_CODES, 
  DEPT_ORG_MAPPING, 
  PROGRAMS_BY_DEPARTMENT,
  STUDENT_ORGS,
  YEAR_LEVELS 
} from '../constants/targeting'
import { getOrganizationByCourse } from './organizationService'

/**
 * Tag types used in the system
 */
export const TAG_TYPES = {
  DEPARTMENT: 'dept',
  PROGRAM: 'program',
  ORGANIZATION: 'org',
  YEAR: 'year',
  SECTION: 'section',
  COLLEGE: 'college'
}

/**
 * Parse a tag into its type and value
 * @param {string} tag - The tag to parse (e.g., "dept:DCS")
 * @returns {object} { type, value } or null if invalid
 */
export const parseTag = (tag) => {
  if (!tag || typeof tag !== 'string') return null
  
  const colonIndex = tag.indexOf(':')
  if (colonIndex === -1) {
    // Legacy tag without prefix - try to categorize
    return { type: 'legacy', value: tag }
  }
  
  const type = tag.substring(0, colonIndex)
  const value = tag.substring(colonIndex + 1)
  
  return { type, value }
}

/**
 * Build a tag from type and value
 * @param {string} type - Tag type (dept, org, year, etc.)
 * @param {string} value - Tag value
 * @returns {string} Formatted tag
 */
export const buildTag = (type, value) => {
  if (!type || !value) return null
  return `${type}:${value.toString().toUpperCase()}`
}

/**
 * Get user's tags by type
 * @param {array} tags - User's tag array
 * @param {string} type - Tag type to filter
 * @returns {array} Array of tag values for the specified type
 */
export const getTagsByType = (tags = [], type) => {
  return tags
    .map(parseTag)
    .filter(parsed => parsed && parsed.type === type)
    .map(parsed => parsed.value)
}

/**
 * Link a user to a department
 * @param {string} userId - User's ID
 * @param {string} departmentName - Full department name
 * @returns {Promise<object>} Updated user data
 */
export const linkUserToDepartment = async (userId, departmentName) => {
  if (!userId || !departmentName) {
    throw new Error('User ID and department name are required')
  }
  
  // Validate department
  if (!DEPARTMENTS.includes(departmentName)) {
    throw new Error(`Invalid department: ${departmentName}`)
  }
  
  const deptCode = DEPARTMENT_CODES[departmentName]
  const newTag = buildTag(TAG_TYPES.DEPARTMENT, deptCode)
  
  // Get current user data
  const user = await getDocument('users', userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  // Remove existing department tags and add new one
  const existingTags = (user.tags || []).filter(tag => !tag.startsWith('dept:'))
  const updatedTags = [...existingTags, newTag]
  
  // Update user
  await updateDocument('users', userId, {
    department: departmentName,
    departmentCode: deptCode,
    tags: updatedTags,
    updatedAt: new Date()
  })
  
  return { ...user, department: departmentName, departmentCode: deptCode, tags: updatedTags }
}

/**
 * Link a user to an organization
 * @param {string} userId - User's ID
 * @param {string} orgCode - Organization code (e.g., "CSC", "BITS")
 * @param {string} position - Optional position in the organization
 * @returns {Promise<object>} Updated user data
 */
export const linkUserToOrganization = async (userId, orgCode, position = null) => {
  if (!userId || !orgCode) {
    throw new Error('User ID and organization code are required')
  }
  
  // Validate organization
  const org = STUDENT_ORGS.find(o => o.code === orgCode)
  if (!org) {
    throw new Error(`Invalid organization code: ${orgCode}`)
  }
  
  // Build tag with optional position
  const tagValue = position ? `${orgCode}:${position}` : orgCode
  const newTag = buildTag(TAG_TYPES.ORGANIZATION, tagValue)
  
  // Get current user data
  const user = await getDocument('users', userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  // Check if org already linked
  const existingOrgTags = getTagsByType(user.tags || [], TAG_TYPES.ORGANIZATION)
  const alreadyLinked = existingOrgTags.some(val => val.startsWith(orgCode))
  
  if (alreadyLinked) {
    // Update the tag if position is different
    const updatedTags = (user.tags || []).map(tag => {
      const parsed = parseTag(tag)
      if (parsed?.type === TAG_TYPES.ORGANIZATION && parsed.value.startsWith(orgCode)) {
        return newTag
      }
      return tag
    })
    
    await updateDocument('users', userId, {
      tags: updatedTags,
      updatedAt: new Date()
    })
    
    return { ...user, tags: updatedTags }
  }
  
  // Add new organization tag
  const updatedTags = [...(user.tags || []), newTag]
  
  // Update linked organizations array
  const linkedOrganizations = user.linkedOrganizations || []
  if (!linkedOrganizations.includes(orgCode)) {
    linkedOrganizations.push(orgCode)
  }
  
  await updateDocument('users', userId, {
    tags: updatedTags,
    linkedOrganizations,
    updatedAt: new Date()
  })
  
  return { ...user, tags: updatedTags, linkedOrganizations }
}

/**
 * Unlink a user from an organization
 * @param {string} userId - User's ID
 * @param {string} orgCode - Organization code to remove
 * @returns {Promise<object>} Updated user data
 */
export const unlinkUserFromOrganization = async (userId, orgCode) => {
  if (!userId || !orgCode) {
    throw new Error('User ID and organization code are required')
  }
  
  const user = await getDocument('users', userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  // Remove organization tag
  const updatedTags = (user.tags || []).filter(tag => {
    const parsed = parseTag(tag)
    return !(parsed?.type === TAG_TYPES.ORGANIZATION && parsed.value.startsWith(orgCode))
  })
  
  // Remove from linked organizations array
  const linkedOrganizations = (user.linkedOrganizations || []).filter(o => o !== orgCode)
  
  await updateDocument('users', userId, {
    tags: updatedTags,
    linkedOrganizations,
    updatedAt: new Date()
  })
  
  return { ...user, tags: updatedTags, linkedOrganizations }
}

/**
 * Set user's year level
 * @param {string} userId - User's ID
 * @param {string} yearLevel - Year level (1, 2, 3, or 4)
 * @returns {Promise<object>} Updated user data
 */
export const setUserYearLevel = async (userId, yearLevel) => {
  if (!userId || !yearLevel) {
    throw new Error('User ID and year level are required')
  }
  
  // Validate year level
  const validYears = YEAR_LEVELS.map(y => y.value)
  if (!validYears.includes(yearLevel.toString())) {
    throw new Error(`Invalid year level: ${yearLevel}`)
  }
  
  const user = await getDocument('users', userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  // Remove existing year tags and add new one
  const existingTags = (user.tags || []).filter(tag => !tag.startsWith('year:'))
  const newTag = buildTag(TAG_TYPES.YEAR, yearLevel)
  const updatedTags = [...existingTags, newTag]
  
  await updateDocument('users', userId, {
    yearLevel: parseInt(yearLevel),
    tags: updatedTags,
    updatedAt: new Date()
  })
  
  return { ...user, yearLevel: parseInt(yearLevel), tags: updatedTags }
}

/**
 * Set user's section
 * @param {string} userId - User's ID
 * @param {string} section - Section identifier (e.g., "A", "B", "1A")
 * @returns {Promise<object>} Updated user data
 */
export const setUserSection = async (userId, section) => {
  if (!userId || !section) {
    throw new Error('User ID and section are required')
  }
  
  const user = await getDocument('users', userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  // Remove existing section tags and add new one
  const existingTags = (user.tags || []).filter(tag => !tag.startsWith('section:'))
  const newTag = buildTag(TAG_TYPES.SECTION, section.toUpperCase())
  const updatedTags = [...existingTags, newTag]
  
  await updateDocument('users', userId, {
    section: section.toUpperCase(),
    tags: updatedTags,
    updatedAt: new Date()
  })
  
  return { ...user, section: section.toUpperCase(), tags: updatedTags }
}

/**
 * Set user's program
 * @param {string} userId - User's ID
 * @param {string} programCode - Program code (e.g., "CS", "IT", "HM")
 * @returns {Promise<object>} Updated user data
 */
export const setUserProgram = async (userId, programCode) => {
  if (!userId || !programCode) {
    throw new Error('User ID and program code are required')
  }
  
  const user = await getDocument('users', userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  // Remove existing program tags and add new one
  const existingTags = (user.tags || []).filter(tag => !tag.startsWith('program:'))
  const newTag = buildTag(TAG_TYPES.PROGRAM, programCode.toUpperCase())
  const updatedTags = [...existingTags, newTag]
  
  await updateDocument('users', userId, {
    program: programCode.toUpperCase(),
    tags: updatedTags,
    updatedAt: new Date()
  })
  
  return { ...user, program: programCode.toUpperCase(), tags: updatedTags }
}

/**
 * Build a complete user profile with proper tags
 * Links user to department, program, year, section, and organizations
 * @param {string} userId - User's ID
 * @param {object} profileData - Profile data
 * @returns {Promise<object>} Updated user data
 */
export const updateUserProfileTags = async (userId, profileData) => {
  if (!userId) {
    throw new Error('User ID is required')
  }
  
  const user = await getDocument('users', userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  const updates = {
    updatedAt: new Date()
  }
  
  let tags = []
  
  // Handle department
  if (profileData.department) {
    const deptCode = DEPARTMENT_CODES[profileData.department]
    if (deptCode) {
      tags.push(buildTag(TAG_TYPES.DEPARTMENT, deptCode))
      updates.department = profileData.department
      updates.departmentCode = deptCode
    }
  }
  
  // Handle program/course
  if (profileData.program) {
    tags.push(buildTag(TAG_TYPES.PROGRAM, profileData.program.toUpperCase()))
    updates.program = profileData.program.toUpperCase()
  }
  
  // Auto-add organization tag based on course
  // Students are automatically members of their course organization
  const courseValue = profileData.course || profileData.program
  if (courseValue) {
    const orgCode = getOrganizationByCourse(courseValue)
    if (orgCode) {
      tags.push(buildTag(TAG_TYPES.ORGANIZATION, orgCode))
      updates.courseOrganization = orgCode // Track which org they're auto-enrolled in
    }
  }
  
  // Handle year level
  if (profileData.yearLevel) {
    tags.push(buildTag(TAG_TYPES.YEAR, profileData.yearLevel.toString()))
    updates.yearLevel = parseInt(profileData.yearLevel)
  }
  
  // Handle section
  if (profileData.section) {
    tags.push(buildTag(TAG_TYPES.SECTION, profileData.section.toUpperCase()))
    updates.section = profileData.section.toUpperCase()
  }
  
  // Handle organizations
  if (profileData.organizations && Array.isArray(profileData.organizations)) {
    profileData.organizations.forEach(org => {
      if (typeof org === 'string') {
        tags.push(buildTag(TAG_TYPES.ORGANIZATION, org.toUpperCase()))
      } else if (org.code) {
        const tagValue = org.position ? `${org.code}:${org.position}` : org.code
        tags.push(buildTag(TAG_TYPES.ORGANIZATION, tagValue.toUpperCase()))
      }
    })
    updates.linkedOrganizations = profileData.organizations.map(o => 
      typeof o === 'string' ? o : o.code
    )
  }
  
  // Filter null values and update
  updates.tags = tags.filter(Boolean)
  
  await updateDocument('users', userId, updates)
  
  return { ...user, ...updates }
}

/**
 * Get suggested organizations based on user's department
 * Implements the "Lance Rule" - faculty should only see orgs linked to their department
 * @param {string} departmentName - Department name
 * @returns {array} Array of organization objects
 */
export const getSuggestedOrganizations = (departmentName) => {
  const linkedOrgCodes = DEPT_ORG_MAPPING[departmentName] || []
  return STUDENT_ORGS.filter(org => linkedOrgCodes.includes(org.code))
}

/**
 * Get available programs for a department
 * @param {string} departmentName - Department name
 * @returns {array} Array of program objects
 */
export const getAvailablePrograms = (departmentName) => {
  return PROGRAMS_BY_DEPARTMENT[departmentName] || []
}

/**
 * Check if a user can be a class rep for a given section
 * User must have matching department, program, year, and section tags
 * @param {object} user - User object with tags
 * @param {string} section - Section to check
 * @returns {boolean} True if user can be class rep for this section
 */
export const canBeClassRep = (user, section) => {
  if (!user || !section) return false
  
  const userTags = user.tags || []
  const sectionTag = buildTag(TAG_TYPES.SECTION, section.toUpperCase())
  
  // User must have the section tag
  return userTags.includes(sectionTag)
}

/**
 * Validate that a user's tags are consistent
 * @param {array} tags - User's tags array
 * @returns {object} { valid: boolean, errors: array }
 */
export const validateUserTags = (tags = []) => {
  const errors = []
  
  const deptTags = getTagsByType(tags, TAG_TYPES.DEPARTMENT)
  const programTags = getTagsByType(tags, TAG_TYPES.PROGRAM)
  const yearTags = getTagsByType(tags, TAG_TYPES.YEAR)
  const sectionTags = getTagsByType(tags, TAG_TYPES.SECTION)
  
  // Check for duplicate departments
  if (deptTags.length > 1) {
    errors.push('User has multiple department tags')
  }
  
  // Check for duplicate programs
  if (programTags.length > 1) {
    errors.push('User has multiple program tags')
  }
  
  // Check for duplicate year levels
  if (yearTags.length > 1) {
    errors.push('User has multiple year level tags')
  }
  
  // Check for duplicate sections
  if (sectionTags.length > 1) {
    errors.push('User has multiple section tags')
  }
  
  // Validate year level values
  yearTags.forEach(year => {
    if (!['1', '2', '3', '4'].includes(year)) {
      errors.push(`Invalid year level: ${year}`)
    }
  })
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get a formatted display name for a tag
 * @param {string} tag - The tag to format
 * @returns {string} Human-readable tag name
 */
export const getTagDisplayName = (tag) => {
  const parsed = parseTag(tag)
  if (!parsed) return tag
  
  const { type, value } = parsed
  
  switch (type) {
    case TAG_TYPES.DEPARTMENT: {
      // Find full department name
      const fullName = Object.entries(DEPARTMENT_CODES).find(([_, code]) => code === value)?.[0]
      return fullName || value
    }
    case TAG_TYPES.ORGANIZATION: {
      const org = STUDENT_ORGS.find(o => o.code === value.split(':')[0])
      return org?.name || value
    }
    case TAG_TYPES.YEAR:
      return `Year ${value}`
    case TAG_TYPES.SECTION:
      return `Section ${value}`
    case TAG_TYPES.PROGRAM:
      return value
    default:
      return value
  }
}
