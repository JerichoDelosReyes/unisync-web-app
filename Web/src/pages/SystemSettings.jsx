/**
 * System Settings Page
 * 
 * Visible only to Super Admin.
 * Contains system-wide configuration options.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  getSemesterSettings,
  updateSemesterSettings 
} from '../services/systemSettingsService'
import { 
  archiveAndResetSchedules, 
  getArchiveHistory,
  getAllSchedules 
} from '../services/scheduleService'
import { createLog, LOG_CATEGORIES, LOG_ACTIONS } from '../services/logService'
import PushNotificationSettings from '../components/ui/PushNotificationSettings'

export default function SystemSettings() {
  const { user, userProfile } = useAuth()
  
  // Semester Settings State
  const [semesterSettings, setSemesterSettings] = useState({
    currentSemester: '1st Semester',
    currentSchoolYear: ''
  })
  const [isLoadingSemesterSettings, setIsLoadingSemesterSettings] = useState(true)
  const [isSavingSemesterSettings, setIsSavingSemesterSettings] = useState(false)
  const [semesterSettingsMessage, setSemesterSettingsMessage] = useState(null)
  
  // Reset/Archive State
  const [showResetModal, setShowResetModal] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetResult, setResetResult] = useState(null)
  const [currentScheduleCount, setCurrentScheduleCount] = useState(0)
  const [archiveHistory, setArchiveHistory] = useState([])
  const [isLoadingArchives, setIsLoadingArchives] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  
  // Load all settings on mount
  useEffect(() => {
    const loadAllSettings = async () => {
      // Load semester settings
      setIsLoadingSemesterSettings(true)
      try {
        const semester = await getSemesterSettings()
        setSemesterSettings({
          currentSemester: semester.currentSemester,
          currentSchoolYear: semester.currentSchoolYear
        })
      } catch (error) {
        console.error('Error loading semester settings:', error)
      } finally {
        setIsLoadingSemesterSettings(false)
      }
      
      // Load current schedule count
      try {
        const schedules = await getAllSchedules()
        setCurrentScheduleCount(schedules.length)
      } catch (error) {
        console.error('Error loading schedule count:', error)
      }
      
      // Load archive history
      loadArchiveHistory()
    }
    
    loadAllSettings()
  }, [])
  
  const loadArchiveHistory = async () => {
    setIsLoadingArchives(true)
    try {
      const history = await getArchiveHistory()
      setArchiveHistory(history)
    } catch (error) {
      console.error('Error loading archive history:', error)
    } finally {
      setIsLoadingArchives(false)
    }
  }
  
  // Handle semester settings save
  const handleSaveSemesterSettings = async () => {
    setIsSavingSemesterSettings(true)
    setSemesterSettingsMessage(null)
    
    try {
      await updateSemesterSettings(semesterSettings, user.uid)
      
      // Log the semester update
      await createLog({
        category: LOG_CATEGORIES.SYSTEM,
        action: LOG_ACTIONS.SEMESTER_UPDATE,
        performedBy: {
          uid: user.uid,
          email: user.email,
          name: userProfile ? `${userProfile.givenName} ${userProfile.lastName}` : 'Admin'
        },
        details: {
          semester: semesterSettings.currentSemester,
          schoolYear: semesterSettings.currentSchoolYear
        },
        description: `Updated semester to ${semesterSettings.currentSemester} ${semesterSettings.currentSchoolYear}`
      })
      
      setSemesterSettingsMessage({ type: 'success', text: 'Semester settings saved successfully!' })
    } catch (error) {
      console.error('Error saving semester settings:', error)
      setSemesterSettingsMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setIsSavingSemesterSettings(false)
      setTimeout(() => setSemesterSettingsMessage(null), 3000)
    }
  }
  
  // Handle archive and reset
  const handleArchiveAndReset = async () => {
    if (confirmText !== 'RESET') return
    
    setIsResetting(true)
    setResetResult(null)
    
    try {
      const result = await archiveAndResetSchedules(
        semesterSettings.currentSemester,
        semesterSettings.currentSchoolYear,
        user.uid
      )
      
      // Log the schedule reset
      await createLog({
        category: LOG_CATEGORIES.SCHEDULE,
        action: LOG_ACTIONS.SCHEDULE_RESET,
        performedBy: {
          uid: user.uid,
          email: user.email,
          name: userProfile ? `${userProfile.givenName} ${userProfile.lastName}` : 'Admin'
        },
        details: {
          semester: semesterSettings.currentSemester,
          schoolYear: semesterSettings.currentSchoolYear,
          archivedCount: result.archive?.schedulesArchived || 0,
          deletedCount: result.reset?.schedulesDeleted || 0
        },
        description: `Archived ${result.archive?.schedulesArchived || 0} and deleted ${result.reset?.schedulesDeleted || 0} schedules for ${semesterSettings.currentSemester} ${semesterSettings.currentSchoolYear}`
      })
      
      setResetResult({ type: 'success', ...result })
      setCurrentScheduleCount(0)
      loadArchiveHistory()
    } catch (error) {
      console.error('Error during archive and reset:', error)
      setResetResult({ type: 'error', message: 'Failed to reset schedules. Please try again.' })
    } finally {
      setIsResetting(false)
    }
  }
  
  const closeResetModal = () => {
    setShowResetModal(false)
    setConfirmText('')
    setResetResult(null)
  }
  
  // Generate school year options
  const currentYear = new Date().getFullYear()
  const schoolYearOptions = []
  for (let i = -2; i <= 2; i++) {
    const startYear = currentYear + i
    schoolYearOptions.push(`${startYear}-${startYear + 1}`)
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Configure system-wide settings and preferences.</p>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Super Admin Access Only</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Changes made here will affect the entire system. Proceed with caution.
            </p>
          </div>
        </div>
      </div>

      {/* Push Notification Settings */}
      <PushNotificationSettings />

      {/* Semester Management Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Semester Management</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Set the current semester and manage schedule resets</p>
          </div>
        </div>
        
        {isLoadingSemesterSettings ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded-lg"></div>
            <div className="h-10 bg-gray-200 rounded-lg"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Semester Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-800 dark:text-gray-200">Current Academic Period</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Semester
                </label>
                <select
                  value={semesterSettings.currentSemester}
                  onChange={(e) => setSemesterSettings({
                    ...semesterSettings,
                    currentSemester: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="Summer">Summer</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  School Year
                </label>
                <select
                  value={semesterSettings.currentSchoolYear}
                  onChange={(e) => setSemesterSettings({
                    ...semesterSettings,
                    currentSchoolYear: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {schoolYearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              {semesterSettingsMessage && (
                <div className={`rounded-lg p-3 ${
                  semesterSettingsMessage.type === 'success' 
                    ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' 
                    : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {semesterSettingsMessage.type === 'success' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className="text-sm">{semesterSettingsMessage.text}</span>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleSaveSemesterSettings}
                disabled={isSavingSemesterSettings}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSavingSemesterSettings ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Semester Settings
                  </>
                )}
              </button>
            </div>
            
            {/* Schedule Reset */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-800 dark:text-gray-200">End of Semester Reset</h3>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current Schedules</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{currentScheduleCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Archives Created</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{archiveHistory.length}</span>
                </div>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">Archive & Reset Schedules</p>
                    <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                      This will archive all current student and faculty schedules, then clear them for the new semester.
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowResetModal(true)}
                disabled={currentScheduleCount === 0}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Archive & Reset All Schedules
              </button>
            </div>
          </div>
        )}
        
        {/* Archive History */}
        {archiveHistory.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-4">Archive History</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {archiveHistory.map((archive) => (
                <div key={archive.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {archive.semester} - {archive.schoolYear}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {archive.totalSchedules} schedules • {archive.archivedAt?.toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-xs rounded-full">
                    Archived
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* General Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">General Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">System Name</label>
            <input
              type="text"
              defaultValue="UNISYNC"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campus</label>
            <input
              type="text"
              defaultValue="CvSU Imus Campus"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allowed Email Domain</label>
            <input
              type="text"
              defaultValue="cvsu.edu.ph"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
              disabled
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This cannot be changed for security reasons.</p>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={closeResetModal}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-red-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Archive & Reset Schedules</h3>
                  <p className="text-red-100 text-sm">This action cannot be undone</p>
                </div>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              {resetResult ? (
                <div className={`rounded-lg p-4 ${
                  resetResult.type === 'success' 
                    ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700' 
                    : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'
                }`}>
                  {resetResult.type === 'success' ? (
                    <div className="text-center">
                      <svg className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <h4 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">Reset Complete!</h4>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        Archived {resetResult.archive?.schedulesArchived || 0} schedules.<br />
                        Deleted {resetResult.reset?.schedulesDeleted || 0} schedules.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <h4 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Reset Failed</h4>
                      <p className="text-sm text-red-700 dark:text-red-400">{resetResult.message}</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentScheduleCount}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Schedules to Archive</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {semesterSettings.currentSemester}<br />
                          {semesterSettings.currentSchoolYear}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Current Period</p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    This will:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Archive all {currentScheduleCount} current schedules
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete all student schedules
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clear all faculty teaching schedules
                    </li>
                  </ul>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type <span className="font-bold text-red-600 dark:text-red-400">RESET</span> to confirm
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="Type RESET"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800 focus:border-red-400 dark:focus:border-red-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex gap-3">
              <button
                onClick={closeResetModal}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                {resetResult ? 'Close' : 'Cancel'}
              </button>
              {!resetResult && (
                <button
                  onClick={handleArchiveAndReset}
                  disabled={confirmText !== 'RESET' || isResetting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Archive & Reset'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
