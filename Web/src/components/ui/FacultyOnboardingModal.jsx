import { useState, useEffect } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../config/firebase'
import {
  LightBulbIcon
} from '@heroicons/react/24/outline'
import {
  DEPARTMENTS,
  DEPARTMENT_CODES,
  DEPT_ORG_MAPPING,
  STUDENT_ORGS
} from '../../constants/targeting'
import ModalOverlay from './ModalOverlay'

/**
 * FacultyOnboardingModal
 * 
 * Shown to faculty members who haven't completed their profile setup.
 * Allows them to select their department and linked organizations.
 */
export default function FacultyOnboardingModal({ isOpen, userProfile, onComplete }) {
  const [step, setStep] = useState(1) // 1: Department, 2: Organizations
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedOrganizations, setSelectedOrganizations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Get available organizations for selected department
  const getAvailableOrgs = () => {
    if (!selectedDepartment) return []
    const orgCodes = DEPT_ORG_MAPPING[selectedDepartment] || []
    return STUDENT_ORGS.filter(org => orgCodes.includes(org.code))
  }
  
  const availableOrgs = getAvailableOrgs()
  
  // Toggle organization selection
  const toggleOrg = (orgCode) => {
    setSelectedOrganizations(prev => 
      prev.includes(orgCode)
        ? prev.filter(o => o !== orgCode)
        : [...prev, orgCode]
    )
  }
  
  // Handle next step
  const handleNext = () => {
    if (step === 1 && selectedDepartment) {
      // If department has linked orgs, go to step 2
      if (availableOrgs.length > 0) {
        setStep(2)
      } else {
        // No linked orgs, complete directly
        handleComplete()
      }
    }
  }
  
  // Handle back
  const handleBack = () => {
    if (step === 2) {
      setStep(1)
      setSelectedOrganizations([])
    }
  }
  
  // Handle completion
  const handleComplete = async () => {
    if (!selectedDepartment) {
      setError('Please select your department')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      // Build tags array
      const tags = [
        `dept:${DEPARTMENT_CODES[selectedDepartment]}`,
        ...selectedOrganizations.map(org => `org:${org}`)
      ]
      
      // Update user profile in Firestore
      await updateDoc(doc(db, 'users', userProfile.id), {
        department: selectedDepartment,
        departmentCode: DEPARTMENT_CODES[selectedDepartment],
        linkedOrganizations: selectedOrganizations,
        tags: tags,
        facultyOnboardingComplete: true,
        updatedAt: serverTimestamp()
      })
      
      // Call onComplete callback
      onComplete({
        department: selectedDepartment,
        departmentCode: DEPARTMENT_CODES[selectedDepartment],
        linkedOrganizations: selectedOrganizations,
        tags: tags
      })
    } catch (err) {
      console.error('Error saving faculty profile:', err)
      setError('Failed to save your profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <ModalOverlay closeOnBackdropClick={false}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-green-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">Welcome, Faculty!</h2>
              <p className="text-green-100 text-sm">Let's complete your profile setup</p>
            </div>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                step >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {step > 1 ? '✓' : '1'}
              </div>
              <span className="text-sm font-medium">Department</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-200 dark:bg-gray-700">
              <div className={`h-full bg-green-600 transition-all ${step >= 2 ? 'w-full' : 'w-0'}`}></div>
            </div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                step >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Organizations</span>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}
          
          {/* Step 1: Department Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Select Your Department
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  This will determine which organizations you can post announcements to.
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {DEPARTMENTS.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setSelectedDepartment(dept)}
                      className={`w-full px-4 py-3 text-left rounded-xl border-2 transition-all ${
                        selectedDepartment === dept
                          ? 'border-green-600 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-semibold text-sm ${selectedDepartment === dept ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>{dept}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Code: {DEPARTMENT_CODES[dept]} 
                            {DEPT_ORG_MAPPING[dept]?.length > 0 && (
                              <span className="ml-2">• Linked Orgs: {DEPT_ORG_MAPPING[dept].join(', ')}</span>
                            )}
                          </p>
                        </div>
                        {selectedDepartment === dept && (
                          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Organization Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Select Your Linked Organizations
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  These are the organizations under <span className="font-semibold">{DEPARTMENT_CODES[selectedDepartment]}</span>. 
                  Select the ones you're affiliated with.
                </p>
                
                {availableOrgs.length > 0 ? (
                  <div className="space-y-2">
                    {availableOrgs.map((org) => (
                      <button
                        key={org.code}
                        type="button"
                        onClick={() => toggleOrg(org.code)}
                        className={`w-full px-4 py-3 text-left rounded-xl border-2 transition-all ${
                          selectedOrganizations.includes(org.code)
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                            : 'border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-semibold text-sm ${selectedOrganizations.includes(org.code) ? 'text-orange-700 dark:text-orange-300' : 'text-gray-900 dark:text-white'}`}>{org.code}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{org.name}</p>
                          </div>
                          {selectedOrganizations.includes(org.code) && (
                            <svg className="w-5 h-5 text-orange-500 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      No specific organizations are linked to this department.
                    </p>
                  </div>
                )}
                
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-1">
                  <LightBulbIcon className="w-4 h-4" /> You can skip this if you don't want to be linked to any organization.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
          {step === 2 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white font-medium text-sm"
            >
              ← Back
            </button>
          ) : (
            <div></div>
          )}
          
          <button
            type="button"
            onClick={step === 1 ? handleNext : handleComplete}
            disabled={!selectedDepartment || loading}
            className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              selectedDepartment && !loading
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/30'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : step === 1 && availableOrgs.length > 0 ? (
              'Next →'
            ) : (
              'Complete Setup'
            )}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}
