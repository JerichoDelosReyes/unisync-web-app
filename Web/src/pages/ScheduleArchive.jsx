/**
 * Schedule Archive Page
 * 
 * Super Admin only - View, manage, and export archived schedules from past semesters.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  getArchiveHistory, 
  getArchiveById, 
  deleteArchive 
} from '../services/scheduleService'

export default function ScheduleArchive() {
  const { user } = useAuth()
  
  // State
  const [archives, setArchives] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedArchive, setSelectedArchive] = useState(null)
  const [archiveDetails, setArchiveDetails] = useState(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [archiveToDelete, setArchiveToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSection, setFilterSection] = useState('')
  
  // Load archives on mount
  useEffect(() => {
    loadArchives()
  }, [])
  
  const loadArchives = async () => {
    setIsLoading(true)
    try {
      const history = await getArchiveHistory()
      setArchives(history)
    } catch (error) {
      console.error('Error loading archives:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Load archive details
  const handleViewArchive = async (archive) => {
    setSelectedArchive(archive)
    setIsLoadingDetails(true)
    try {
      const details = await getArchiveById(archive.id)
      setArchiveDetails(details)
    } catch (error) {
      console.error('Error loading archive details:', error)
    } finally {
      setIsLoadingDetails(false)
    }
  }
  
  // Close details view
  const handleCloseDetails = () => {
    setSelectedArchive(null)
    setArchiveDetails(null)
    setSearchQuery('')
    setFilterSection('')
  }
  
  // Delete archive
  const handleDeleteArchive = async () => {
    if (!archiveToDelete) return
    
    setIsDeleting(true)
    try {
      await deleteArchive(archiveToDelete.id)
      setArchives(archives.filter(a => a.id !== archiveToDelete.id))
      setShowDeleteModal(false)
      setArchiveToDelete(null)
      
      // If we're viewing this archive, close the details
      if (selectedArchive?.id === archiveToDelete.id) {
        handleCloseDetails()
      }
    } catch (error) {
      console.error('Error deleting archive:', error)
      alert('Failed to delete archive. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }
  
  // Export archive to JSON
  const handleExportArchive = (archive, details) => {
    const exportData = {
      archiveInfo: {
        semester: archive.semester,
        schoolYear: archive.schoolYear,
        archivedAt: archive.archivedAt?.toISOString(),
        totalStudents: archive.totalStudents
      },
      schedules: details?.schedules || []
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `schedule_archive_${archive.schoolYear}_${archive.semester.replace(/\s+/g, '_')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  // Export to CSV
  const handleExportCSV = (archive, details) => {
    if (!details?.schedules) return
    
    const headers = ['Student ID', 'Course', 'Year Level', 'Section', 'Subject', 'Day', 'Time', 'Room', 'Professor']
    const rows = []
    
    details.schedules.forEach(student => {
      student.schedules?.forEach(schedule => {
        rows.push([
          student.userId,
          student.course || '',
          student.yearLevel || '',
          student.section || '',
          schedule.subject || '',
          schedule.day || '',
          `${schedule.startTime || ''}-${schedule.endTime || ''}`,
          schedule.room || '',
          schedule.professor || ''
        ])
      })
    })
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `schedule_archive_${archive.schoolYear}_${archive.semester.replace(/\s+/g, '_')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  // Filter schedules in details view
  const getFilteredSchedules = () => {
    if (!archiveDetails?.schedules) return []
    
    return archiveDetails.schedules.filter(student => {
      const matchesSearch = !searchQuery || 
        student.userId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.course?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.section?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesSection = !filterSection || student.section === filterSection
      
      return matchesSearch && matchesSection
    })
  }
  
  // Get unique sections from archive
  const getUniqueSections = () => {
    if (!archiveDetails?.schedules) return []
    const sections = new Set()
    archiveDetails.schedules.forEach(s => {
      if (s.section) sections.add(s.section)
    })
    return Array.from(sections).sort()
  }
  
  const filteredSchedules = getFilteredSchedules()
  const uniqueSections = getUniqueSections()

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Archives</h1>
          <p className="text-gray-600 mt-1">View and manage archived schedules from past semesters.</p>
        </div>
        {selectedArchive && (
          <button
            onClick={handleCloseDetails}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Archives
          </button>
        )}
      </div>

      {/* Archive Details View */}
      {selectedArchive ? (
        <div className="space-y-6">
          {/* Archive Info Header */}
          <div className="bg-indigo-600 rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedArchive.semester}</h2>
                <p className="text-indigo-100 text-lg">School Year {selectedArchive.schoolYear}</p>
                <p className="text-indigo-200 text-sm mt-2">
                  Archived on {selectedArchive.archivedAt?.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportArchive(selectedArchive, archiveDetails)}
                  disabled={isLoadingDetails}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export JSON
                </button>
                <button
                  onClick={() => handleExportCSV(selectedArchive, archiveDetails)}
                  disabled={isLoadingDetails}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-3xl font-bold">{selectedArchive.totalStudents}</p>
                <p className="text-indigo-200 text-sm">Total Students</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-3xl font-bold">{uniqueSections.length}</p>
                <p className="text-indigo-200 text-sm">Sections</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-3xl font-bold">
                  {archiveDetails?.schedules?.reduce((sum, s) => sum + (s.schedules?.length || 0), 0) || 0}
                </p>
                <p className="text-indigo-200 text-sm">Total Classes</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search by student ID, course, section..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Section</label>
                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All Sections</option>
                  {uniqueSections.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Student Schedules List */}
          {isLoadingDetails ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-500 mt-4">Loading archive data...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900">
                  Student Schedules ({filteredSchedules.length} of {archiveDetails?.schedules?.length || 0})
                </h3>
              </div>
              
              {filteredSchedules.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  No schedules found matching your filters.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                  {filteredSchedules.map((student, idx) => (
                    <StudentScheduleCard key={idx} student={student} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Archive List View */
        <>
          {archives.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Archives Yet</h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Schedule archives will appear here after you perform an end-of-semester reset from System Settings.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {archives.map((archive) => (
                <div
                  key={archive.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {archive.semester} - {archive.schoolYear}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {archive.totalStudents} students • Archived {archive.archivedAt?.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewArchive(archive)}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </button>
                      <button
                        onClick={() => {
                          setArchiveToDelete(archive)
                          setShowDeleteModal(true)
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Archive"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && archiveToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-red-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Delete Archive</h3>
                  <p className="text-red-100 text-sm">This action cannot be undone</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to permanently delete the archive for:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="font-semibold text-gray-900">{archiveToDelete.semester} - {archiveToDelete.schoolYear}</p>
                <p className="text-sm text-gray-500">{archiveToDelete.totalStudents} student schedules</p>
              </div>
              <p className="text-sm text-red-600">
                This will permanently remove all archived schedule data for this semester.
              </p>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setArchiveToDelete(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteArchive}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete Archive'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Student Schedule Card Component
function StudentScheduleCard({ student }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">{student.section || 'Unknown Section'}</p>
            <p className="text-sm text-gray-500">
              {student.course} • {student.yearLevel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
            {student.schedules?.length || 0} classes
          </span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {isExpanded && student.schedules && (
        <div className="mt-4 ml-13 space-y-2">
          <div className="grid gap-2">
            {student.schedules.map((schedule, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{schedule.subject}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {schedule.day} • {schedule.startTime} - {schedule.endTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-600">{schedule.room || 'TBA'}</p>
                    <p className="text-gray-500 text-xs">{schedule.professor || 'TBA'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
