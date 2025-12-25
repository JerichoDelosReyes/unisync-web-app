import { useState, useEffect } from 'react'
import { useAuth, ROLES } from '../../contexts/AuthContext'
import {
  DEPARTMENTS,
  DEPARTMENT_CODES,
  DCS_TARGET_ORGS,
  YEAR_LEVELS,
  STUDENT_ORGS,
  ORG_CATEGORIES,
  DEPT_ORG_MAPPING,
  getOrgsForDepartment,
  PROGRAMS_BY_DEPARTMENT,
  buildTargetTags,
  getDefaultTargeting
} from '../../constants/targeting'

/**
 * AudienceSelector Component
 * 
 * Sophisticated audience targeting for announcements based on user roles.
 * - Faculty: Can select Orgs, Year Levels, and specific Sections
 * - Org Officers: Automatically targets their organization
 * - Admins: Full access to all targeting options
 */
export default function AudienceSelector({ value = [], onChange, userProfile }) {
  const { hasMinRole } = useAuth()
  
  // Determine user's role and restrictions
  const isFaculty = userProfile?.role === 'faculty' || userProfile?.role === 'instructor'
  const isOrgOfficer = userProfile?.role === 'org_officer' || userProfile?.role === 'organization_officer'
  const isClassRep = userProfile?.role === 'class_rep'
  const isAdmin = hasMinRole(ROLES.ADMIN)
  
  // Get faculty's department from their profile/tags
  const getFacultyDepartment = () => {
    if (!userProfile?.tags) return null
    // Check for department tag
    for (const tag of userProfile.tags) {
      // Check direct department name
      const matchedDept = DEPARTMENTS.find(dept => 
        tag.includes(dept) || tag.includes(DEPARTMENT_CODES[dept])
      )
      if (matchedDept) return matchedDept
    }
    // Also check department field directly
    if (userProfile.department) {
      return DEPARTMENTS.find(d => d === userProfile.department || DEPARTMENT_CODES[d] === userProfile.department)
    }
    return null
  }
  
  const facultyDepartment = isFaculty ? getFacultyDepartment() : null
  
  // Get available orgs based on role
  const getAvailableOrgs = () => {
    if (isAdmin) {
      // Admin sees all organizations
      return STUDENT_ORGS
    }
    if (isFaculty && facultyDepartment) {
      // Faculty only sees orgs linked to their department
      const allowedOrgCodes = getOrgsForDepartment(facultyDepartment)
      return STUDENT_ORGS.filter(org => allowedOrgCodes.includes(org.code))
    }
    // Default: show all
    return STUDENT_ORGS
  }
  
  const availableOrgs = getAvailableOrgs()
  
  // Get default targeting based on role
  const defaultTargeting = getDefaultTargeting(userProfile)
  
  // Local state for selections
  const [selections, setSelections] = useState({
    targetType: 'all', // 'all', 'department', 'custom'
    departments: [],
    programs: [], // CSC, BITS
    orgs: defaultTargeting.orgs || [],
    yearLevels: [],
    section: ''
  })
  
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Initialize from value prop
  useEffect(() => {
    if (value && value.length > 0) {
      // Parse existing tags
      const parsed = {
        targetType: 'custom',
        departments: [],
        programs: [],
        orgs: [],
        yearLevels: [],
        section: ''
      }
      
      value.forEach(tag => {
        if (tag.startsWith('dept:')) {
          parsed.departments.push(tag.replace('dept:', ''))
        } else if (tag.startsWith('program:')) {
          parsed.programs.push(tag.replace('program:', ''))
        } else if (tag.startsWith('org:')) {
          parsed.orgs.push(tag.replace('org:', ''))
        } else if (tag.startsWith('year:')) {
          parsed.yearLevels.push(tag.replace('year:', ''))
        } else if (tag.startsWith('section:')) {
          parsed.section = tag.replace('section:', '')
        } else {
          // Legacy format - organization names
          parsed.orgs.push(tag)
        }
      })
      
      setSelections(parsed)
      if (parsed.departments.length > 0 || parsed.programs.length > 0 || 
          parsed.orgs.length > 0 || parsed.yearLevels.length > 0 || parsed.section) {
        setIsExpanded(true)
      }
    }
  }, [])
  
  // Lock org officers to their org
  useEffect(() => {
    if (isOrgOfficer && defaultTargeting.locked) {
      setSelections(prev => ({
        ...prev,
        orgs: defaultTargeting.orgs || [],
        targetType: 'custom'
      }))
      setIsExpanded(true)
    }
  }, [isOrgOfficer, defaultTargeting])

  // Lock Class Reps to their section only
  useEffect(() => {
    if (isClassRep && userProfile?.section) {
      setSelections(prev => ({
        ...prev,
        section: userProfile.section.toUpperCase(),
        targetType: 'custom'
      }))
      setIsExpanded(true)
    }
  }, [isClassRep, userProfile?.section])
  
  // Update parent when selections change
  useEffect(() => {
    if (selections.targetType === 'all') {
      onChange([])
    } else {
      const tags = buildTargetTags(selections)
      onChange(tags)
    }
  }, [selections])
  
  // Toggle program/org selection
  const toggleProgram = (code) => {
    setSelections(prev => ({
      ...prev,
      programs: prev.programs.includes(code)
        ? prev.programs.filter(p => p !== code)
        : [...prev.programs, code]
    }))
  }
  
  // Toggle department selection
  const toggleDepartment = (dept) => {
    setSelections(prev => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter(d => d !== dept)
        : [...prev.departments, dept]
    }))
  }
  
  // Toggle year level
  const toggleYearLevel = (year) => {
    setSelections(prev => ({
      ...prev,
      yearLevels: prev.yearLevels.includes(year)
        ? prev.yearLevels.filter(y => y !== year)
        : [...prev.yearLevels, year]
    }))
  }
  
  // Toggle org selection
  const toggleOrg = (orgCode) => {
    if (isOrgOfficer && defaultTargeting.locked) return // Can't change if locked
    
    setSelections(prev => ({
      ...prev,
      orgs: prev.orgs.includes(orgCode)
        ? prev.orgs.filter(o => o !== orgCode)
        : [...prev.orgs, orgCode]
    }))
  }
  
  // Handle section input
  const handleSectionChange = (e) => {
    // Class Reps cannot change their section
    if (isClassRep) return
    
    setSelections(prev => ({
      ...prev,
      section: e.target.value.toUpperCase()
    }))
  }
  
  // Handle target type change
  const handleTargetTypeChange = (type) => {
    if (isOrgOfficer && defaultTargeting.locked) return
    // Class Reps cannot change to 'all' - must target their section
    if (isClassRep) return
    
    setSelections(prev => ({
      ...prev,
      targetType: type,
      ...(type === 'all' ? { departments: [], programs: [], orgs: [], yearLevels: [], section: '' } : {})
    }))
    setIsExpanded(type !== 'all')
  }
  
  // Get summary text
  const getSummaryText = () => {
    // Class Reps always target their section only
    if (isClassRep && userProfile?.section) {
      return `🎓 Section ${userProfile.section.toUpperCase()} Only`
    }
    
    if (selections.targetType === 'all' && !defaultTargeting.locked) {
      return '📢 Campus-Wide (All Students & Faculty)'
    }
    
    const parts = []
    
    if (selections.programs.length > 0) {
      parts.push(selections.programs.join(', '))
    }
    
    if (selections.orgs.length > 0) {
      parts.push(selections.orgs.join(', '))
    }
    
    if (selections.yearLevels.length > 0) {
      const yearLabels = selections.yearLevels.map(y => 
        YEAR_LEVELS.find(yl => yl.value === y)?.label || `Year ${y}`
      )
      parts.push(yearLabels.join(', '))
    }
    
    if (selections.section) {
      parts.push(`Section ${selections.section}`)
    }
    
    return parts.length > 0 ? `🎯 ${parts.join(' • ')}` : '📢 Campus-Wide'
  }
  
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => !defaultTargeting.locked && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Target Audience</p>
            <p className="text-xs text-gray-500">{getSummaryText()}</p>
          </div>
        </div>
        {!defaultTargeting.locked && (
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 py-4 border-t border-gray-200 space-y-4">
          {/* Org Officer Notice */}
          {isOrgOfficer && defaultTargeting.locked && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">🔒 Organization Officer Mode:</span> {defaultTargeting.message}
              </p>
            </div>
          )}
          
          {/* Class Representative Notice - Only show section */}
          {isClassRep && userProfile?.section && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-green-800">🔒 Class Representative Mode</span>
              </div>
              <p className="text-xs text-green-700 mb-2">
                Your announcements will only be visible to students in your section.
              </p>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 text-sm font-bold bg-green-600 text-white rounded-lg">
                  📍 Section: {userProfile.section.toUpperCase()}
                </span>
              </div>
            </div>
          )}
          
          {/* Target Type Selector - Hidden for Class Reps */}
          {!defaultTargeting.locked && !isClassRep && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTargetTypeChange('all')}
                className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                  selections.targetType === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                📢 Campus-Wide
              </button>
              <button
                type="button"
                onClick={() => handleTargetTypeChange('custom')}
                className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                  selections.targetType === 'custom'
                    ? 'bg-green-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                🎯 Specific Audience
              </button>
            </div>
          )}
          
          {/* Custom Targeting Options - Hidden for Class Reps who only target their section */}
          {(selections.targetType === 'custom' || defaultTargeting.locked) && !isClassRep && (
            <div className="space-y-4">
              {/* Faculty Department Notice (Locked) */}
              {isFaculty && facultyDepartment && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-blue-800">🔒 Your Department:</span>
                    <span className="px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded">
                      {DEPARTMENT_CODES[facultyDepartment]}
                    </span>
                  </div>
                  <p className="text-xs text-blue-700">
                    {facultyDepartment}
                  </p>
                </div>
              )}
              
              {/* Department Selection (for Admin only) */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Target Departments
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DEPARTMENTS.map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => toggleDepartment(dept)}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          selections.departments.includes(dept)
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                        title={dept}
                      >
                        {DEPARTMENT_CODES[dept]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Select specific departments or leave empty for all
                  </p>
                </div>
              )}
              
              {/* Year Level Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Year Level
                </label>
                <div className="flex flex-wrap gap-2">
                  {YEAR_LEVELS.map((year) => (
                    <button
                      key={year.value}
                      type="button"
                      onClick={() => toggleYearLevel(year.value)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                        selections.yearLevels.includes(year.value)
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {year.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Specific Section Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  {isClassRep ? 'Your Section (Locked)' : 'Specific Section (Optional)'}
                </label>
                <input
                  type="text"
                  value={selections.section}
                  onChange={handleSectionChange}
                  placeholder="e.g., 3-E, 3-1, 4-A"
                  className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${isClassRep ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  maxLength={10}
                  disabled={isClassRep}
                  readOnly={isClassRep}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isClassRep 
                    ? 'As a Class Representative, your announcements are automatically targeted to your section.'
                    : 'Leave empty to target all sections in selected year levels'
                  }
                </p>
              </div>
              
              {/* Student Organizations (for targeting org members) */}
              {!isOrgOfficer && availableOrgs.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Student Organizations
                    {isFaculty && facultyDepartment && (
                      <span className="ml-2 text-gray-400 font-normal">
                        (Linked to {DEPARTMENT_CODES[facultyDepartment]})
                      </span>
                    )}
                  </label>
                  <div className="space-y-3">
                    {/* Group organizations by category */}
                    {Object.entries(ORG_CATEGORIES).map(([categoryKey, category]) => {
                      const orgsInCategory = availableOrgs.filter(org => org.category === categoryKey)
                      if (orgsInCategory.length === 0) return null
                      
                      return (
                        <div key={categoryKey}>
                          <p className="text-xs text-gray-500 mb-1.5">{category.label}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {orgsInCategory.map((org) => (
                              <button
                                key={org.code}
                                type="button"
                                onClick={() => toggleOrg(org.code)}
                                title={org.name}
                                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                                  selections.orgs.includes(org.code)
                                    ? 'bg-orange-600 text-white shadow-sm'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                              >
                                {org.code}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              
              {/* Locked Org Display */}
              {isOrgOfficer && defaultTargeting.locked && selections.orgs.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Target Organization
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selections.orgs.map((org) => (
                      <span
                        key={org}
                        className="px-3 py-2 text-xs font-semibold bg-orange-100 text-orange-700 rounded-lg"
                      >
                        🔒 {org}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Targeting Summary */}
          {(selections.targetType === 'custom' || defaultTargeting.locked) && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-semibold text-green-800 mb-1">📋 Targeting Summary:</p>
              <p className="text-xs text-green-700">
                {getTargetingSummary(selections)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Generate a human-readable targeting summary
 */
function getTargetingSummary(selections) {
  const parts = []
  
  if (selections.departments.length > 0) {
    const deptCodes = selections.departments.map(d => DEPARTMENT_CODES[d] || d)
    parts.push(`Depts: ${deptCodes.join(', ')}`)
  }
  
  if (selections.programs.length > 0) {
    const programNames = selections.programs.map(p => {
      const org = DCS_TARGET_ORGS.find(o => o.code === p)
      return org ? `${org.program} (${org.name})` : p
    })
    parts.push(`Programs: ${programNames.join(', ')}`)
  }
  
  if (selections.yearLevels.length > 0) {
    const yearLabels = selections.yearLevels.map(y => {
      const level = YEAR_LEVELS.find(yl => yl.value === y)
      return level?.label || `Year ${y}`
    })
    parts.push(`Years: ${yearLabels.join(', ')}`)
  }
  
  if (selections.section) {
    parts.push(`Section: ${selections.section}`)
  }
  
  if (selections.orgs.length > 0) {
    parts.push(`Orgs: ${selections.orgs.join(', ')}`)
  }
  
  if (parts.length === 0) {
    return 'All students in your department will see this announcement.'
  }
  
  return parts.join(' • ')
}
