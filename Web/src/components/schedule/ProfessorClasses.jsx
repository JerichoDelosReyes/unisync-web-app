import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  claimScheduleCode,
  unclaimScheduleCode,
  subscribeToProfessorClasses
} from '../../services/classSectionService'
import ModalOverlay from '../ui/ModalOverlay'

/**
 * ProfessorClasses Component
 * 
 * Allows professors to:
 * 1. View their claimed classes
 * 2. Add new class by entering a Schedule Code
 * 3. Remove classes they've claimed
 * 
 * Uses the Schedule Code Matchmaking system where the schedule code
 * is the link between students and professors.
 */
const ProfessorClasses = () => {
  const { user, userProfile } = useAuth()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [scheduleCode, setScheduleCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sectionFilter, setSectionFilter] = useState('all') // New: section filter state

  // Subscribe to professor's classes in real-time
  useEffect(() => {
    if (!user?.uid) return

    const unsubscribe = subscribeToProfessorClasses(user.uid, (claimedClasses) => {
      setClasses(claimedClasses)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user?.uid])

  // Get unique sections from classes for filter dropdown
  const uniqueSections = [...new Set(classes.filter(c => c.section).map(c => c.section))].sort()

  // Filter classes based on selected section
  const filteredClasses = sectionFilter === 'all' 
    ? classes 
    : classes.filter(c => c.section === sectionFilter)

  const handleAddClass = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setAdding(true)

    try {
      const professorInfo = {
        uid: user.uid,
        name: userProfile?.displayName || `${userProfile?.givenName || ''} ${userProfile?.lastName || ''}`.trim() || 'Unknown Professor',
        email: user.email,
        department: userProfile?.department || ''
      }

      await claimScheduleCode(scheduleCode, professorInfo)
      setSuccess(`Successfully claimed schedule code ${scheduleCode}`)
      setScheduleCode('')
      setShowAddModal(false)
    } catch (err) {
      setError(err.message || 'Failed to claim schedule code')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveClass = async (code) => {
    if (!window.confirm(`Are you sure you want to unclaim schedule code ${code}?`)) {
      return
    }

    try {
      await unclaimScheduleCode(code, user.uid)
      setSuccess(`Unclaimed schedule code ${code}`)
    } catch (err) {
      setError(err.message || 'Failed to unclaim schedule code')
    }
  }

  // Format time for display
  const formatTime = (time) => {
    if (!time) return '--:--'
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes || '00'} ${ampm}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">My Classes</h2>
          <p className="text-sm text-gray-500 mt-1">
            Claim schedule codes to link your classes with students
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Section Filter */}
          {uniqueSections.length > 0 && (
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer appearance-none pr-8 bg-no-repeat bg-[length:16px] bg-[right_8px_center]"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
            >
              <option value="all">All Sections ({classes.length})</option>
              {uniqueSections.map(section => (
                <option key={section} value={section}>
                  {section} ({classes.filter(c => c.section === section).length})
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Class
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Classes List */}
      {classes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Yet</h3>
          <p className="text-gray-500 mb-4">
            Click "Add Class" to claim a schedule code and link it to your profile.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Add Your First Class
          </button>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes for "{sectionFilter}"</h3>
          <p className="text-gray-500 mb-4">
            No classes match the selected section filter.
          </p>
          <button
            onClick={() => setSectionFilter('all')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Show All Classes
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((classItem) => (
            <div
              key={classItem.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-lg mb-2">
                    {classItem.id}
                  </span>
                  <h3 className="font-semibold text-gray-900">
                    {classItem.subject || 'Subject TBA'}
                  </h3>
                </div>
                <button
                  onClick={() => handleRemoveClass(classItem.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Unclaim this class"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="space-y-2 text-sm">
                {classItem.day && classItem.startTime && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{classItem.day} {formatTime(classItem.startTime)} - {formatTime(classItem.endTime)}</span>
                  </div>
                )}
                
                {classItem.room && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{classItem.room}</span>
                  </div>
                )}

                {classItem.section && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{classItem.section}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  <span>{classItem.studentCount || 0} student{classItem.studentCount !== 1 ? 's' : ''} enrolled</span>
                </div>
              </div>

              {!classItem.subject && (
                <div className="mt-3 px-3 py-2 bg-yellow-50 text-yellow-700 text-xs rounded-lg">
                  ⏳ Waiting for student enrollment...
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Class Modal */}
      {showAddModal && (
        <ModalOverlay onClose={() => {
          setShowAddModal(false)
          setScheduleCode('')
          setError('')
        }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Add New Class</h3>
                <p className="text-sm text-white/80 mt-0.5">
                  Enter the 9-digit schedule code from the student registration form
                </p>
              </div>
              <button onClick={() => { setShowAddModal(false); setScheduleCode(''); setError(''); }} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddClass} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Code
                </label>
                <input
                  type="text"
                  value={scheduleCode}
                  onChange={(e) => setScheduleCode(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="e.g., 202510765"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-lg tracking-wider font-mono"
                  maxLength={9}
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  This is the 9-digit code that appears on student registration forms (e.g., 202510765)
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setScheduleCode('')
                    setError('')
                  }}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding || scheduleCode.length !== 9}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adding ? 'Claiming...' : 'Claim Class'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

export default ProfessorClasses
