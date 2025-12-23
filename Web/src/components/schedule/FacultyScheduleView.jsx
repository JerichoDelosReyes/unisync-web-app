import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getFacultySchedule } from '../../services/scheduleService'
import ProfessorClasses from './ProfessorClasses'

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const timeSlots = [
  '7:00', '8:00', '9:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
]

// Helper function to convert time string to row index
const getTimeIndex = (time) => {
  const hour = parseInt(time.split(':')[0])
  return hour - 7 // 7:00 is index 0
}

// Helper function to calculate duration in hours
const getDuration = (startTime, endTime) => {
  const startHour = parseInt(startTime.split(':')[0])
  const startMin = parseInt(startTime.split(':')[1] || '0')
  const endHour = parseInt(endTime.split(':')[0])
  const endMin = parseInt(endTime.split(':')[1] || '0')
  return (endHour + endMin/60) - (startHour + startMin/60)
}

// Color palette for schedule cards based on subject
const getSubjectColor = (subject, index) => {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-blue-600',
    'from-amber-500 to-orange-600',
    'from-green-500 to-emerald-600',
  ]
  // Use subject name hash to get consistent color
  const hash = subject.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

// Faculty Schedule Card Component
const FacultyScheduleCard = ({ schedule, onClick, style }) => {
  const colorClass = getSubjectColor(schedule.subject, schedule.id)
  
  return (
    <div
      onClick={() => onClick(schedule)}
      className={`absolute left-1 right-1 bg-gradient-to-br ${colorClass} rounded-lg shadow-lg cursor-pointer 
        hover:shadow-xl hover:scale-[1.02] transition-all duration-200 p-2 overflow-hidden group`}
      style={style}
    >
      {/* Decorative pattern */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500" />
      
      <div className="relative z-10">
        <h3 className="font-semibold text-white text-sm leading-tight mb-1 line-clamp-2">
          {schedule.subject}
        </h3>
        <div className="flex items-center gap-1 text-white/90 text-xs">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{schedule.startTime} - {schedule.endTime}</span>
        </div>
        <div className="flex items-center gap-1 text-white/80 text-xs mt-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{schedule.room}</span>
        </div>
        <div className="flex items-center gap-1 text-white/80 text-xs mt-0.5">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="truncate">{schedule.studentCount} student{schedule.studentCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {schedule.sections.slice(0, 2).map((section, idx) => (
            <span key={idx} className="inline-block px-1.5 py-0.5 bg-white/20 rounded text-white text-[10px] font-medium">
              {section}
            </span>
          ))}
          {schedule.sections.length > 2 && (
            <span className="inline-block px-1.5 py-0.5 bg-white/20 rounded text-white text-[10px] font-medium">
              +{schedule.sections.length - 2}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Schedule Detail Modal for Faculty
const FacultyScheduleDetailModal = ({ schedule, isOpen, onClose }) => {
  if (!isOpen || !schedule) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className={`bg-gradient-to-r ${getSubjectColor(schedule.subject, schedule.id)} px-6 py-6`}>
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h2 className="text-xl font-bold text-white mb-1">{schedule.subject}</h2>
              <p className="text-white/90 text-sm">{schedule.day}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Time & Room */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium uppercase tracking-wide">Time</span>
              </div>
              <p className="text-gray-900 font-semibold">{schedule.startTime} - {schedule.endTime}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs font-medium uppercase tracking-wide">Room</span>
              </div>
              <p className="text-gray-900 font-semibold">{schedule.room}</p>
            </div>
          </div>

          {/* Student Count */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{schedule.studentCount}</p>
                <p className="text-sm text-gray-600">Enrolled Student{schedule.studentCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Sections
            </h3>
            <div className="flex flex-wrap gap-2">
              {schedule.sections.map((section, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                >
                  {section}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Statistics Cards
const StatCard = ({ icon, label, value, color = 'primary' }) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

// Empty State for Faculty
const FacultyEmptyState = ({ pendingCount = 0, minimumStudents = 5 }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
        <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">No Validated Classes Yet</h2>
      <p className="text-gray-500 max-w-md mx-auto mb-4">
        Classes will appear here once at least <span className="font-semibold text-primary">{minimumStudents} students</span> have 
        assigned you as their professor for the same class slot.
      </p>
      
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto mb-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-left">
              <p className="text-amber-800 text-sm font-medium">
                {pendingCount} class{pendingCount !== 1 ? 'es' : ''} pending validation
              </p>
              <p className="text-amber-700 text-xs mt-1">
                These classes have students but haven't reached the {minimumStudents}-student threshold yet.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-blue-800 text-sm text-left">
            This validation ensures accuracy by requiring multiple students to confirm the same professor assignment.
            You'll be notified when a class becomes validated.
          </p>
        </div>
      </div>
    </div>
  )
}

// Main Faculty Schedule View Component
export default function FacultyScheduleView() {
  const { user, userProfile } = useAuth()
  const [scheduleData, setScheduleData] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [facultyInfo, setFacultyInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [error, setError] = useState(null)
  const [pendingClassesCount, setPendingClassesCount] = useState(0)
  const [minimumStudentsRequired, setMinimumStudentsRequired] = useState(5)
  // Tab state for switching between views
  const [activeTab, setActiveTab] = useState('schedule') // 'schedule' or 'claim'

  // Cell height for calendar view
  const cellHeight = 60

  // Load faculty schedule
  useEffect(() => {
    const loadFacultySchedule = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      
      try {
        const result = await getFacultySchedule(user.uid)
        setScheduleData(result.schedules)
        setStatistics(result.statistics)
        setFacultyInfo(result.facultyInfo)
        setPendingClassesCount(result.statistics?.pendingClassesCount || 0)
        setMinimumStudentsRequired(result.minimumStudentsRequired || 5)
      } catch (err) {
        console.error('Error loading faculty schedule:', err)
        setError('Failed to load schedule. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadFacultySchedule()
  }, [user])

  // Get schedules for a specific day
  const getSchedulesForDay = (day) => {
    return scheduleData.filter(schedule => schedule.day === day)
  }

  // Week navigation
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeek(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeek(newDate)
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date())
  }

  // Get week dates
  const getWeekDates = () => {
    const dates = []
    const startOfWeek = new Date(currentWeek)
    const dayOfWeek = startOfWeek.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    startOfWeek.setDate(startOfWeek.getDate() + diff)

    for (let i = 0; i < 6; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const weekDates = getWeekDates()
  const today = new Date()

  // Refresh function
  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const result = await getFacultySchedule(user.uid)
      setScheduleData(result.schedules)
      setStatistics(result.statistics)
      setFacultyInfo(result.facultyInfo)
      setPendingClassesCount(result.statistics?.pendingClassesCount || 0)
      setMinimumStudentsRequired(result.minimumStudentsRequired || 5)
    } catch (err) {
      console.error('Error refreshing schedule:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-800 font-medium mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Teaching Schedule</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your classes and claim schedule codes
          </p>
        </div>
        {activeTab === 'schedule' && (
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'schedule'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            My Schedule
          </span>
        </button>
        <button
          onClick={() => setActiveTab('claim')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'claim'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Claim Classes
          </span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'claim' ? (
        <ProfessorClasses />
      ) : (
        <>
          {/* Statistics */}
          {statistics && scheduleData.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                }
                label="Subjects"
            value={statistics.totalSubjects}
            color="primary"
          />
          <StatCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            label="Class Slots"
            value={statistics.totalClasses}
            color="blue"
          />
          <StatCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
            label="Sections"
            value={statistics.totalSections}
            color="purple"
          />
          <StatCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            label="Total Students"
            value={statistics.totalStudents}
            color="green"
          />
        </div>
      )}

      {/* Main Content */}
      {scheduleData.length === 0 ? (
        <FacultyEmptyState 
          pendingCount={pendingClassesCount} 
          minimumStudents={minimumStudentsRequired} 
        />
      ) : (
        <>
          {/* Week Navigation */}
          <div className="bg-white rounded-xl border border-gray-200 mb-6">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousWeek}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={goToCurrentWeek}
                  className="px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={goToNextWeek}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {weekDates[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[5]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </h2>
              <div className="w-[140px]"></div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Day Headers */}
                <div className="grid grid-cols-[80px_repeat(6,1fr)] border-b border-gray-100">
                  <div className="p-3 bg-gray-50"></div>
                  {days.map((day, index) => {
                    const date = weekDates[index]
                    const isToday = date && 
                      date.getDate() === today.getDate() && 
                      date.getMonth() === today.getMonth() && 
                      date.getFullYear() === today.getFullYear()
                    
                    return (
                      <div 
                        key={day} 
                        className={`p-3 text-center border-l border-gray-100 ${isToday ? 'bg-primary/5' : 'bg-gray-50'}`}
                      >
                        <p className={`text-xs font-medium uppercase tracking-wide ${isToday ? 'text-primary' : 'text-gray-500'}`}>
                          {day.substring(0, 3)}
                        </p>
                        <p className={`text-lg font-semibold ${isToday ? 'text-primary' : 'text-gray-900'}`}>
                          {date?.getDate()}
                        </p>
                      </div>
                    )
                  })}
                </div>

                {/* Time Grid */}
                <div className="grid grid-cols-[80px_repeat(6,1fr)]">
                  {/* Time Labels */}
                  <div className="bg-gray-50">
                    {timeSlots.map((time, index) => (
                      <div 
                        key={time} 
                        className="h-[60px] flex items-start justify-end pr-3 pt-1"
                      >
                        <span className="text-xs text-gray-400 font-medium">{time}</span>
                      </div>
                    ))}
                  </div>

                  {/* Day Columns */}
                  {days.map((day, dayIndex) => {
                    const date = weekDates[dayIndex]
                    const isToday = date && 
                      date.getDate() === today.getDate() && 
                      date.getMonth() === today.getMonth() && 
                      date.getFullYear() === today.getFullYear()

                    return (
                      <div 
                        key={day} 
                        className={`relative border-l border-gray-100 ${isToday ? 'bg-primary/[0.02]' : ''}`}
                      >
                        {/* Time slot lines */}
                        {timeSlots.map((time, index) => (
                          <div 
                            key={time}
                            className="h-[60px] border-b border-gray-50"
                          />
                        ))}

                        {/* Schedule Cards */}
                        {getSchedulesForDay(day).map((schedule) => {
                          const startIndex = getTimeIndex(schedule.startTime)
                          const duration = getDuration(schedule.startTime, schedule.endTime)
                          const top = startIndex * cellHeight
                          const height = duration * cellHeight - 4

                          return (
                            <FacultyScheduleCard
                              key={schedule.id}
                              schedule={schedule}
                              onClick={setSelectedSchedule}
                              style={{
                                top: `${top + 2}px`,
                                height: `${height}px`,
                              }}
                            />
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Subject List */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subjects Overview</h3>
            <div className="grid gap-3">
              {statistics?.subjects.map((subject, idx) => {
                const subjectSchedules = scheduleData.filter(s => s.subject === subject)
                const totalStudents = subjectSchedules.reduce((sum, s) => sum + s.studentCount, 0)
                const sections = [...new Set(subjectSchedules.flatMap(s => s.sections))]
                
                return (
                  <div 
                    key={idx}
                    className={`bg-gradient-to-r ${getSubjectColor(subject, idx)} rounded-xl p-4 text-white`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{subject}</h4>
                        <p className="text-white/80 text-sm mt-1">
                          {subjectSchedules.length} class slot{subjectSchedules.length !== 1 ? 's' : ''} • {totalStudents} student{totalStudents !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                        {sections.slice(0, 3).map((section, sIdx) => (
                          <span key={sIdx} className="px-2 py-0.5 bg-white/20 rounded text-xs">
                            {section}
                          </span>
                        ))}
                        {sections.length > 3 && (
                          <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
                            +{sections.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
      </>
      )}

      {/* Schedule Detail Modal */}
      <FacultyScheduleDetailModal
        schedule={selectedSchedule}
        isOpen={!!selectedSchedule}
        onClose={() => setSelectedSchedule(null)}
      />
    </div>
  )
}
