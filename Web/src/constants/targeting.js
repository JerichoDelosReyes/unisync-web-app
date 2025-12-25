/**
 * Audience Targeting Constants for UNISYNC
 * 
 * These constants define the available options for targeting announcements
 * and mapping departments to facilities.
 */

// Department list - exact values for selection
export const DEPARTMENTS = [
  "Department Of Biological And Physical Sciences",
  "Department Of Computer Studies", // Target Audience for CSC and BITS orgs
  "Department Of Hospitality Management",
  "Department Of Languages And Mass Communication",
  "Department Of Management",
  "Department Of Physical Education", // Likely to book Gym/Courts
  "Department Of Social Sciences And Humanities",
  "Teacher Education Department"
]

// Short codes for departments
export const DEPARTMENT_CODES = {
  "Department Of Biological And Physical Sciences": "DBPS",
  "Department Of Computer Studies": "DCS",
  "Department Of Hospitality Management": "DHM",
  "Department Of Languages And Mass Communication": "DLMC",
  "Department Of Management": "DM",
  "Department Of Physical Education": "DPE",
  "Department Of Social Sciences And Humanities": "DSSH",
  "Teacher Education Department": "TED"
}

// Programs under Department of Computer Studies
export const DCS_PROGRAMS = [
  { code: "CS", name: "Computer Science", org: "CSC" }, // Computer Science Clique
  { code: "IT", name: "Information Technology", org: "BITS" } // Builders of Innovative Technologist Society
]

// All programs mapped to departments
export const PROGRAMS_BY_DEPARTMENT = {
  "Department Of Computer Studies": [
    { code: "CS", name: "Computer Science" },
    { code: "IT", name: "Information Technology" }
  ],
  "Department Of Hospitality Management": [
    { code: "HM", name: "Hospitality Management" },
    { code: "TM", name: "Tourism Management" }
  ],
  "Department Of Management": [
    { code: "BA", name: "Business Administration" },
    { code: "ENT", name: "Entrepreneurship" }
  ],
  "Teacher Education Department": [
    { code: "BEED", name: "Bachelor of Elementary Education" },
    { code: "BSED", name: "Bachelor of Secondary Education" }
  ],
  "Department Of Languages And Mass Communication": [
    { code: "COMM", name: "Communication" }
  ],
  "Department Of Biological And Physical Sciences": [
    { code: "BIO", name: "Biology" }
  ],
  "Department Of Social Sciences And Humanities": [
    { code: "PSYCH", name: "Psychology" }
  ],
  "Department Of Physical Education": [
    { code: "PE", name: "Physical Education" }
  ]
}

// Year levels
export const YEAR_LEVELS = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" }
]

// Academic organizations mapped to programs
export const ACADEMIC_ORGS = {
  "CS": { code: "CSC", name: "Computer Science Clique" },
  "IT": { code: "BITS", name: "Builders of Innovative Technologist Society" }
}

// Student organizations grouped by category
export const STUDENT_ORGS = [
  // Program Organizations (DCS)
  { code: "CSC", name: "Computer Science Clique", category: "program" },
  { code: "BITS", name: "Builders of Innovative Technologist Society", category: "program" },
  // Student Government
  { code: "CSG", name: "Central Student Government", category: "governance" },
  // Academic Organizations
  { code: "BMS", name: "Business Management Society", category: "academic" },
  { code: "CHLS", name: "Circle of Hospitality and Tourism Students", category: "academic" },
  { code: "CYLE", name: "Cavite Young Leaders for Entrepreneurship", category: "academic" },
  { code: "EDGE", name: "Educators' Guild for Excellence", category: "academic" },
  { code: "SMSP", name: "Samahan ng mga Magaaral ng Sikolohiya", category: "academic" },
  { code: "YOPA", name: "Young Office Professional Advocates", category: "academic" },
  // Media & Publications
  { code: "CC", name: "Cavite Communicators", category: "media" },
  { code: "ST", name: "Sinag-Tala", category: "media" },
  { code: "TF", name: "The Flare", category: "media" },
  // Honor Society
  { code: "HS", name: "Honor Society", category: "honor" }
]

// Organization categories for display
export const ORG_CATEGORIES = {
  program: { label: "Program Organizations", color: "blue" },
  governance: { label: "Student Government", color: "green" },
  academic: { label: "Academic Organizations", color: "purple" },
  media: { label: "Media & Publications", color: "orange" },
  honor: { label: "Honor Societies", color: "yellow" }
}

// Department to Organization Mapping (The "Lance Rule")
// Maps each department to their linked student organizations
export const DEPT_ORG_MAPPING = {
  "Department Of Computer Studies": ["CSC", "BITS"],
  "Department Of Management": ["BMS", "CYLE", "YOPA"],
  "Department Of Languages And Mass Communication": ["CC", "TF"],
  "Department Of Social Sciences And Humanities": ["SMSP"],
  "Teacher Education Department": ["EDGE"],
  "Department Of Hospitality Management": ["CHLS"],
  "Department Of Biological And Physical Sciences": [],
  "Department Of Physical Education": []
}

// Get organizations available for a department
export const getOrgsForDepartment = (departmentName) => {
  // Only return department-linked organizations (no CSG/HS for faculty)
  const deptOrgs = DEPT_ORG_MAPPING[departmentName] || []
  return deptOrgs
}

// All orgs combined for DCS faculty selection
export const DCS_TARGET_ORGS = [
  { code: "CSC", name: "Computer Science Clique", program: "CS" },
  { code: "BITS", name: "Builders of Innovative Technologist Society", program: "IT" }
]

// Faculty positions
export const FACULTY_POSITIONS = [
  "Instructor",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
  "Department Chair",
  "Dean",
  "Program Head"
]

// Facility/Building mapping by department (for Best-Fit Algorithm)
export const DEPARTMENT_FACILITY_MAPPING = {
  "Department Of Computer Studies": {
    priority: ["Old Building"], // Computer Labs
    description: "Priority booking for Computer Labs in Old Building"
  },
  "Department Of Physical Education": {
    priority: ["Stage and Gymnasium"],
    description: "Priority booking for Gym and Sports Facilities"
  },
  "Department Of Hospitality Management": {
    priority: ["HM Laboratory", "Old Building"],
    description: "Priority booking for HM Labs and Kitchen facilities"
  },
  // All other departments get general access
  "default": {
    priority: ["New Building"],
    description: "General access to Lecture Rooms in New Building"
  }
}

// Target audience types
export const TARGET_TYPES = {
  ALL_CAMPUS: "all_campus",
  DEPARTMENT: "department",
  PROGRAM: "program",
  YEAR_LEVEL: "year_level",
  SECTION: "section",
  ORGANIZATION: "organization",
  CUSTOM: "custom"
}

/**
 * Build target tags array based on selections
 * @param {object} selections - The audience selections
 * @returns {array} Array of target tags
 */
export const buildTargetTags = (selections) => {
  const tags = []
  
  // Add department tags
  if (selections.departments?.length > 0) {
    selections.departments.forEach(dept => {
      tags.push(`dept:${DEPARTMENT_CODES[dept] || dept}`)
    })
  }
  
  // Add program/org tags (CSC, BITS, etc.)
  if (selections.programs?.length > 0) {
    selections.programs.forEach(prog => {
      tags.push(`program:${prog}`)
    })
  }
  
  // Add organization tags
  if (selections.orgs?.length > 0) {
    selections.orgs.forEach(org => {
      tags.push(`org:${org}`)
    })
  }
  
  // Add year level tags
  if (selections.yearLevels?.length > 0) {
    selections.yearLevels.forEach(year => {
      tags.push(`year:${year}`)
    })
  }
  
  // Add section tag
  if (selections.section?.trim()) {
    tags.push(`section:${selections.section.trim().toUpperCase()}`)
  }
  
  return tags
}

/**
 * Check if a user's tags match announcement target tags
 * @param {array} userTags - User's profile tags
 * @param {array} targetTags - Announcement's target tags
 * @returns {boolean} True if user should see the announcement
 */
export const matchesTargetAudience = (userTags = [], targetTags = []) => {
  // No target tags means campus-wide (everyone sees it)
  if (!targetTags || targetTags.length === 0) {
    return true
  }
  
  // No user tags means they can only see campus-wide announcements
  if (!userTags || userTags.length === 0) {
    return false
  }
  
  // Normalize tags for comparison
  const normalizedUserTags = userTags.map(t => t.toLowerCase().trim())
  const normalizedTargetTags = targetTags.map(t => t.toLowerCase().trim())
  
  // Group target tags by type
  const targetGroups = {
    dept: [],
    program: [],
    org: [],
    year: [],
    section: []
  }
  
  // Also keep a flat list of target values for legacy matching
  const targetValues = []
  
  normalizedTargetTags.forEach(tag => {
    if (tag.includes(':')) {
      const [type, value] = tag.split(':')
      if (targetGroups[type]) {
        targetGroups[type].push(value)
      }
      targetValues.push(value)
    } else {
      // Legacy format - add to org group
      targetGroups.org.push(tag)
      targetValues.push(tag)
    }
  })
  
  // Group user tags by type
  const userGroups = {
    dept: [],
    program: [],
    org: [],
    year: [],
    section: []
  }
  
  // Also keep a flat list of user values for legacy matching
  const userValues = []
  
  normalizedUserTags.forEach(tag => {
    if (tag.includes(':')) {
      const [type, value] = tag.split(':')
      if (userGroups[type]) {
        userGroups[type].push(value)
      }
      userValues.push(value)
    } else {
      // Legacy tags without prefix - try to categorize
      userValues.push(tag)
      if (['1', '2', '3', '4'].includes(tag)) {
        userGroups.year.push(tag)
      } else if (['cs', 'it', 'bscs', 'bsit'].includes(tag)) {
        userGroups.program.push(tag)
      } else {
        // Could be org, dept code, or other
        userGroups.org.push(tag)
        // Also check if it's a department code
        const deptCode = tag.toUpperCase()
        const deptEntry = Object.entries(DEPARTMENT_CODES).find(([, code]) => code === deptCode)
        if (deptEntry) {
          userGroups.dept.push(deptCode.toLowerCase())
        }
      }
    }
  })
  
  // Check each target group - ALL specified groups must have at least one match
  // This means: if announcement targets org:CSC AND year:3, user must match BOTH
  let matchesAllGroups = true
  let hasAnyTargetGroup = false
  
  for (const [groupType, groupValues] of Object.entries(targetGroups)) {
    if (groupValues.length > 0) {
      hasAnyTargetGroup = true
      // This group has requirements - user must match at least one value in this group
      const hasMatch = groupValues.some(targetVal => {
        // Check exact match in user's group
        if (userGroups[groupType].includes(targetVal)) {
          return true
        }
        // Also check if target value appears anywhere in user's values (legacy support)
        if (userValues.includes(targetVal)) {
          return true
        }
        // Check partial match for organization codes
        if (groupType === 'org') {
          return userValues.some(uv => uv.includes(targetVal) || targetVal.includes(uv))
        }
        return false
      })
      
      if (!hasMatch) {
        matchesAllGroups = false
        break
      }
    }
  }
  
  // If no target groups were found (shouldn't happen), do a simple value intersection check
  if (!hasAnyTargetGroup) {
    return targetValues.some(tv => userValues.includes(tv))
  }
  
  return matchesAllGroups
}

/**
 * Get default targeting based on user role
 * @param {object} userProfile - The user's profile
 * @returns {object} Default audience selection
 */
export const getDefaultTargeting = (userProfile) => {
  const role = userProfile?.role
  const tags = userProfile?.tags || []
  
  // Organization officers can only target their org members
  if (role === 'org_officer' || role === 'organization_officer') {
    const orgTags = tags.filter(t => t.startsWith('org:') || STUDENT_ORGS.some(o => o.code === t || o.name === t))
    return {
      locked: true,
      orgs: orgTags.map(t => t.replace('org:', '')),
      message: 'As an organization officer, announcements will be visible to your organization members only.'
    }
  }
  
  // Faculty defaults to their department
  if (role === 'faculty' || role === 'instructor') {
    const deptTag = tags.find(t => t.startsWith('dept:'))
    return {
      locked: false,
      departments: deptTag ? [deptTag.replace('dept:', '')] : [],
      message: 'Select your target audience. Leave empty for department-wide announcement.'
    }
  }
  
  // Default - no restrictions
  return {
    locked: false,
    message: 'Select target audience or leave empty for campus-wide announcement.'
  }
}
