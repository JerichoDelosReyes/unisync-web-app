import { useState, useRef, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useAuth } from '../contexts/AuthContext'
import {
  saveStudentSchedule,
  getStudentSchedule,
  updateScheduleItem,
  deleteStudentSchedule,
  getProfessorNames,
  initializeProfessors
} from '../services/scheduleService'

// Set up PDF.js worker using CDN (more reliable for Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

/**
 * Schedule Page
 * 
 * Shows class schedules in a weekly calendar view with time slots.
 * Students can upload their registration form to automatically extract schedule.
 */

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const dayAbbreviations = {
  'M': 'Monday',
  'T': 'Tuesday', 
  'W': 'Wednesday',
  'TH': 'Thursday',
  'Th': 'Thursday',
  'F': 'Friday',
  'S': 'Saturday',
  'SAT': 'Saturday',
  'MON': 'Monday',
  'TUE': 'Tuesday',
  'WED': 'Wednesday',
  'THU': 'Thursday',
  'FRI': 'Friday',
}

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

// Convert 12-hour time to 24-hour format
const convertTo24Hour = (timeStr) => {
  if (!timeStr) return null
  
  // Already in 24-hour format
  if (!timeStr.toLowerCase().includes('am') && !timeStr.toLowerCase().includes('pm')) {
    const parts = timeStr.split(':')
    const hour = parseInt(parts[0])
    const min = parts[1] || '00'
    return `${hour}:${min.replace(/[^0-9]/g, '') || '00'}`
  }
  
  const isPM = timeStr.toLowerCase().includes('pm')
  const cleanTime = timeStr.replace(/[apmAPM\s]/g, '')
  const parts = cleanTime.split(':')
  let hour = parseInt(parts[0])
  const min = parts[1] || '00'
  
  if (isPM && hour !== 12) hour += 12
  if (!isPM && hour === 12) hour = 0
  
  return `${hour}:${min}`
}

// Parse schedule from PDF text - CvSU Registration Form format
const parseScheduleFromText = (text) => {
  const schedules = []
  
  // Try to extract section from the text (e.g., BSCS-3E)
  let section = 'N/A'
  const sectionMatch = text.match(/\b(BSIT|BSCS|BSIS|BSEMC)[-\s]*(\d[A-Z])\b/i)
  if (sectionMatch) {
    section = `${sectionMatch[1].toUpperCase()}-${sectionMatch[2].toUpperCase()}`
  }

  // CvSU Registration Form pattern:
  // [ID] [COURSE_CODE] [COURSE_NAME] [UNITS] [TIME1]-[TIME2] / [TIME3]-[TIME4] [DAY1] / [DAY2] [ROOM1] / [ROOM2]
  // Example: 202510768 MATH 3A LINEAR ALGEBRA 3 19:00-20:00 / 10:00-12:00 M / T TBA / TBA
  
  // Pattern to match course entries
  // Looking for: CODE + NAME + UNITS + TIME-TIME / TIME-TIME + DAY / DAY + ROOM
  const coursePattern = /(\d{9})\s+([A-Z]{2,4}\s+\d{1,3}[A-Z]?)\s+([A-Z][A-Z\s\d\(\)\.]+?)\s+(\d)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s*\/\s*(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s+([MTWTHFS]{1,2})\s*\/\s*([MTWTHFS]{1,2})\s+([A-Za-z0-9\-\/\.\s]+?)\s*\/\s*([A-Za-z0-9\-\/\.\s]+?)(?=\s+\d{9}|\s+Tuition|$)/gi
  
  let match
  while ((match = coursePattern.exec(text)) !== null) {
    const [, id, courseCode, courseName, units, time1Start, time1End, time2Start, time2End, day1, day2, room1, room2] = match
    
    const subjectName = `${courseCode.trim()} - ${courseName.trim()}`
    
    // First schedule entry (day1, time1, room1)
    const dayFull1 = dayAbbreviations[day1.toUpperCase()] || day1
    schedules.push({
      id: schedules.length + 1,
      subject: subjectName,
      room: room1.trim() || 'TBA',
      professor: 'TBA',
      section: section,
      day: dayFull1,
      startTime: time1Start,
      endTime: time1End,
    })
    
    // Second schedule entry (day2, time2, room2) - if different
    const dayFull2 = dayAbbreviations[day2.toUpperCase()] || day2
    schedules.push({
      id: schedules.length + 1,
      subject: subjectName,
      room: room2.trim() || 'TBA',
      professor: 'TBA',
      section: section,
      day: dayFull2,
      startTime: time2Start,
      endTime: time2End,
    })
  }

  // If the above pattern didn't match, try a simpler approach
  if (schedules.length === 0) {
    // Try to find time patterns and work backwards
    const simplePattern = /([A-Z]{2,4}\s+\d{1,3}[A-Z]?)\s+([A-Z][A-Z\s\d\(\)\.]+?)\s+\d\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/gi
    
    while ((match = simplePattern.exec(text)) !== null) {
      const [fullMatch, courseCode, courseName, startTime, endTime] = match
      
      // Look for day after this match
      const afterMatch = text.substring(match.index + fullMatch.length, match.index + fullMatch.length + 50)
      const dayMatch = afterMatch.match(/^\s*\/\s*\d{1,2}:\d{2}-\d{1,2}:\d{2}\s+([MTWTHFS]{1,2})/i)
      
      if (dayMatch) {
        const day = dayAbbreviations[dayMatch[1].toUpperCase()] || dayMatch[1]
        schedules.push({
          id: schedules.length + 1,
          subject: `${courseCode.trim()} - ${courseName.trim()}`,
          room: 'TBA',
          professor: 'TBA',
          section: section,
          day: day,
          startTime: startTime,
          endTime: endTime,
        })
      }
    }
  }

  return schedules
}

// Alternative parser specifically for CvSU format
const parseCvSURegistrationForm = (text) => {
  const schedules = []
  
  // Extract section
  let section = 'N/A'
  const sectionMatch = text.match(/\b(BSIT|BSCS|BSIS|BSEMC)[-\s]*(\d[A-Z])\b/i)
  if (sectionMatch) {
    section = `${sectionMatch[1].toUpperCase()}-${sectionMatch[2].toUpperCase()}`
  }

  // Split text and look for course patterns
  // Format: ID COURSE_CODE COURSE_NAME UNITS TIME-TIME / TIME-TIME DAY / DAY ROOM / ROOM
  
  // Find all course IDs (9 digits starting with 2025)
  const courseIds = text.match(/\b2025\d{5}\b/g) || []
  
  for (let i = 0; i < courseIds.length; i++) {
    const currentId = courseIds[i]
    const nextId = courseIds[i + 1]
    
    // Get text between this ID and next ID (or end keywords)
    const startIdx = text.indexOf(currentId) + currentId.length
    let endIdx = nextId ? text.indexOf(nextId) : text.indexOf('Tuition')
    if (endIdx === -1) endIdx = text.length
    
    const courseText = text.substring(startIdx, endIdx).trim()
    
    // Parse the course text
    // Pattern: COURSE_CODE COURSE_NAME UNITS TIME-TIME / TIME-TIME DAY / DAY ROOM / ROOM
    const courseMatch = courseText.match(/^([A-Z]{2,4}\s+\d{1,3}[A-Z]?)\s+(.+?)\s+(\d)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s*\/\s*(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s+([MTWTHFS]{1,2})\s*\/\s*([MTWTHFS]{1,2})\s+(.+?)\s*\/\s*(.+?)$/i)
    
    if (courseMatch) {
      const [, code, name, units, t1s, t1e, t2s, t2e, d1, d2, r1, r2] = courseMatch
      
      const subjectName = `${code.trim()} - ${name.trim()}`
      
      // Schedule 1
      schedules.push({
        id: schedules.length + 1,
        subject: subjectName,
        room: r1.trim() || 'TBA',
        professor: 'TBA',
        section: section,
        day: dayAbbreviations[d1.toUpperCase()] || d1,
        startTime: t1s,
        endTime: t1e,
      })
      
      // Schedule 2
      schedules.push({
        id: schedules.length + 1,
        subject: subjectName,
        room: r2.trim() || 'TBA',
        professor: 'TBA',
        section: section,
        day: dayAbbreviations[d2.toUpperCase()] || d2,
        startTime: t2s,
        endTime: t2e,
      })
    }
  }
  
  return schedules
}

// Main parser that tries multiple approaches
const parseRegistrationForm = (text) => {
  console.log('Parsing registration form...')
  
  // Clean up the text - normalize spaces
  const cleanText = text.replace(/\s+/g, ' ').trim()
  console.log('Clean text:', cleanText)
  
  const schedules = []
  
  // Extract section (e.g., BSCS-3E)
  let section = 'N/A'
  const sectionMatch = cleanText.match(/\b(BSIT|BSCS|BSIS|BSEMC)[-\s]*(\d[A-Z])\b/i)
  if (sectionMatch) {
    section = `${sectionMatch[1].toUpperCase()}-${sectionMatch[2].toUpperCase()}`
  }
  console.log('Section found:', section)

  // Find all course IDs (9 digits starting with 2025)
  const courseIdPattern = /2025\d{5}/g
  const courseIds = []
  let idMatch
  while ((idMatch = courseIdPattern.exec(cleanText)) !== null) {
    courseIds.push({ id: idMatch[0], index: idMatch.index })
  }
  console.log('Found course IDs:', courseIds)

  // Process each course segment
  for (let i = 0; i < courseIds.length; i++) {
    const currentId = courseIds[i]
    const nextId = courseIds[i + 1]
    
    // Extract the segment for this course
    const startIdx = currentId.index + 9 // Skip the 9-digit ID
    const endIdx = nextId ? nextId.index : cleanText.indexOf('Tuition')
    
    if (endIdx === -1 || endIdx <= startIdx) continue
    
    const segment = cleanText.substring(startIdx, endIdx).trim()
    console.log(`Course ${i + 1} segment:`, segment)
    
    // Parse the segment
    // Format: CODE NAME UNITS TIME-TIME / TIME-TIME DAY / DAY ROOM / ROOM
    // Room names can contain slashes like "CL3/RM. 7" or "RM. 9/CL3"
    
    // First extract course code and name
    const codeMatch = segment.match(/^([A-Z]{2,4}\s+\d{1,3}[A-Z]?)\s+(.+?)\s+(\d)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/)
    
    if (!codeMatch) {
      console.log('No code match for segment:', segment)
      continue
    }
    
    const [, code, name, units, time1Start, time1End] = codeMatch
    console.log('Code:', code, 'Name:', name)
    
    // Extract the rest after first time range
    const afterFirstTime = segment.substring(codeMatch[0].length).trim()
    console.log('After first time:', afterFirstTime)
    
    // Pattern: / TIME-TIME DAY / DAY ROOM_WITH_SLASHES / ROOM_WITH_SLASHES
    // The key is that days are single letters or TH, and they appear after times
    const restMatch = afterFirstTime.match(/^\/\s*(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s+(M|T|W|TH|F|S)\s*\/\s*(M|T|W|TH|F|S)\s+(.+)$/)
    
    if (!restMatch) {
      console.log('No rest match for:', afterFirstTime)
      continue
    }
    
    const [, time2Start, time2End, day1, day2, roomsPart] = restMatch
    console.log('Times:', time1Start, time1End, time2Start, time2End)
    console.log('Days:', day1, day2)
    console.log('Rooms part:', roomsPart)
    
    // Split rooms - find the " / " that separates the two rooms
    // Room names can be like "CL3/RM. 7" so we need to find " / " (with spaces)
    let room1 = 'TBA'
    let room2 = 'TBA'
    
    // Look for " / " pattern to split rooms
    const roomSplitMatch = roomsPart.match(/^(.+?)\s+\/\s+(.+?)$/)
    if (roomSplitMatch) {
      room1 = roomSplitMatch[1].trim()
      room2 = roomSplitMatch[2].trim()
    } else {
      // Maybe it's just one room or TBA
      room1 = roomsPart.trim()
      room2 = roomsPart.trim()
    }
    
    console.log('Room 1:', room1, 'Room 2:', room2)
    
    const subjectName = `${code.trim()} - ${name.trim()}`
    
    // Create schedule entries
    // Schedule 1: day1, time1, room1
    schedules.push({
      id: schedules.length + 1,
      subject: subjectName,
      room: room1 || 'TBA',
      professor: 'TBA',
      section: section,
      day: dayAbbreviations[day1.toUpperCase()] || day1,
      startTime: time1Start,
      endTime: time1End,
    })
    
    // Schedule 2: day2, time2, room2
    schedules.push({
      id: schedules.length + 1,
      subject: subjectName,
      room: room2 || 'TBA',
      professor: 'TBA',
      section: section,
      day: dayAbbreviations[day2.toUpperCase()] || day2,
      startTime: time2Start,
      endTime: time2End,
    })
  }

  console.log('Final extracted schedules:', schedules)
  return schedules
}

// Manual extraction as fallback
const extractScheduleManually = (text) => {
  const schedules = []
  
  // Extract section
  let section = 'N/A'
  const sectionMatch = text.match(/\b(BSIT|BSCS|BSIS|BSEMC)[-\s]*(\d[A-Z])\b/i)
  if (sectionMatch) {
    section = `${sectionMatch[1].toUpperCase()}-${sectionMatch[2].toUpperCase()}`
  }
  
  // Known course codes at CvSU
  const courseCodes = ['MATH', 'COSC', 'DCIT', 'GNED', 'ITEC', 'FILI', 'PHED', 'NSTP']
  
  for (const code of courseCodes) {
    // Find all occurrences of this course code
    const regex = new RegExp(`(${code}\\s+\\d{1,3}[A-Z]?)\\s+([A-Z][A-Z\\s\\d\\(\\)\\.]+?)\\s+(\\d)\\s+(\\d{1,2}:\\d{2})-(\\d{1,2}:\\d{2})\\s*/\\s*(\\d{1,2}:\\d{2})-(\\d{1,2}:\\d{2})\\s+([MTWTHFS]{1,2})\\s*/\\s*([MTWTHFS]{1,2})`, 'gi')
    
    let match
    while ((match = regex.exec(text)) !== null) {
      const [, courseCode, courseName, units, t1s, t1e, t2s, t2e, d1, d2] = match
      
      const subjectName = `${courseCode.trim()} - ${courseName.trim()}`
      
      // Find room info after the day
      const afterDays = text.substring(match.index + match[0].length, match.index + match[0].length + 100)
      const roomMatch = afterDays.match(/^\s*([A-Za-z0-9\-\/\.\s]+?)\s*\/\s*([A-Za-z0-9\-\/\.\s]+?)(?=\s+\d{9}|\s+[A-Z]{4}|\s+Tuition|$)/i)
      
      const room1 = roomMatch ? roomMatch[1].trim() : 'TBA'
      const room2 = roomMatch ? roomMatch[2].trim() : 'TBA'
      
      // Schedule 1
      schedules.push({
        id: schedules.length + 1,
        subject: subjectName,
        room: room1,
        professor: 'TBA',
        section: section,
        day: dayAbbreviations[d1.toUpperCase()] || d1,
        startTime: t1s,
        endTime: t1e,
      })
      
      // Schedule 2
      schedules.push({
        id: schedules.length + 1,
        subject: subjectName,
        room: room2,
        professor: 'TBA',
        section: section,
        day: dayAbbreviations[d2.toUpperCase()] || d2,
        startTime: t2s,
        endTime: t2e,
      })
    }
  }
  
  return schedules
}

// Parse day string like "M TH" or "MWF" into array of days
const parseDayString = (dayStr) => {
  const days = []
  const str = dayStr.toUpperCase().trim()
  
  // Handle space-separated days
  if (str.includes(' ')) {
    const parts = str.split(/\s+/)
    for (const part of parts) {
      if (dayAbbreviations[part]) {
        days.push(dayAbbreviations[part])
      }
    }
    return days
  }
  
  // Handle concatenated days like "MWF" or "TTH"
  let i = 0
  while (i < str.length) {
    // Check for two-letter abbreviations first
    if (i + 1 < str.length) {
      const twoChar = str.substring(i, i + 2)
      if (twoChar === 'TH') {
        days.push('Thursday')
        i += 2
        continue
      }
    }
    
    // Single character
    const char = str[i]
    if (dayAbbreviations[char]) {
      days.push(dayAbbreviations[char])
    }
    i++
  }
  
  return days
}

// Upload Modal Component
const UploadModal = ({ isOpen, onClose, onUpload, isProcessing }) => {
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0])
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Upload Registration Form</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isProcessing}
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-gray-600 text-sm mb-4">
          Upload your CvSU registration form (PDF) to automatically extract your class schedule.
        </p>

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 font-medium">Processing your registration form...</p>
            <p className="text-gray-500 text-sm mt-1">Extracting schedule data</p>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium mb-2">
              Drag and drop your registration form here
            </p>
            <p className="text-gray-500 text-sm mb-4">or</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-gray-400 text-xs mt-4">Supported format: PDF</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Default empty professors list - will be loaded from Firebase (faculty users)
const defaultProfessors = []

// Schedule Detail Modal Component
const ScheduleDetailModal = ({ schedule, isOpen, onClose, onUpdateProfessor, professors, isUpdating }) => {
  const [isEditingProfessor, setIsEditingProfessor] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsEditingProfessor(false)
      setSearchQuery('')
    }
  }, [isOpen])

  // Focus search input when editing
  useEffect(() => {
    if (isEditingProfessor && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isEditingProfessor])

  if (!isOpen || !schedule) return null

  // Filter professors based on search query
  const filteredProfessors = professors.filter(prof =>
    prof.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectProfessor = (professor) => {
    onUpdateProfessor(schedule.id, professor)
    setIsEditingProfessor(false)
    setSearchQuery('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading Overlay */}
        {isUpdating && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              <p className="text-sm text-gray-600 mt-2">Saving...</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{schedule.subject}</h2>
            <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              {schedule.section}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors -mr-2 -mt-2"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Details */}
        <div className="space-y-4">
          {/* Day */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Day</p>
              <p className="font-medium text-gray-900">{schedule.day}</p>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Time</p>
              <p className="font-medium text-gray-900">{schedule.startTime} - {schedule.endTime}</p>
            </div>
          </div>

          {/* Room */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Room</p>
              <p className="font-medium text-gray-900">{schedule.room}</p>
            </div>
          </div>

          {/* Professor - Editable */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Professor</p>
              {!isEditingProfessor ? (
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{schedule.professor}</p>
                  <button
                    onClick={() => setIsEditingProfessor(true)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Change professor"
                  >
                    <svg className="w-4 h-4 text-gray-400 hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="mt-1 space-y-2">
                  {/* Search Input */}
                  <div className="relative">
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search professor..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>

                  {/* Professor List */}
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {filteredProfessors.length > 0 ? (
                      filteredProfessors.map((prof, index) => (
                        <button
                          key={index}
                          onClick={() => handleSelectProfessor(prof)}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-primary/5 transition-colors ${
                            schedule.professor === prof ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700'
                          }`}
                        >
                          {prof}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-gray-500">
                        {professors.length === 0 
                          ? 'No faculty members found. Add faculty users in User Management.'
                          : 'No professors match your search'
                        }
                      </div>
                    )}
                  </div>

                  {/* Info text */}
                  <p className="text-xs text-gray-400 mt-2">
                    Professors are loaded from faculty users in the system.
                  </p>

                  {/* Cancel Button */}
                  <button
                    onClick={() => {
                      setIsEditingProfessor(false)
                      setSearchQuery('')
                    }}
                    className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Close Button */}
        {!isEditingProfessor && (
          <button
            onClick={onClose}
            className="w-full mt-6 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Close
          </button>
        )}
      </div>
    </div>
  )
}

// Schedule Card Component
const ScheduleCard = ({ schedule, style, onClick }) => {
  return (
    <div
      className="absolute left-1 right-1 bg-primary rounded-lg p-2 overflow-hidden cursor-pointer hover:bg-primary/90 hover:scale-[1.02] transition-all shadow-sm hover:shadow-md"
      style={style}
      onClick={() => onClick(schedule)}
    >
      <h4 className="font-semibold text-white text-sm truncate">{schedule.subject}</h4>
      <div className="flex items-center gap-1 text-white/80 text-xs mt-1">
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="truncate">{schedule.room}</span>
      </div>
      <div className="flex items-center gap-1 text-white/80 text-xs mt-0.5">
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="truncate">{schedule.professor}</span>
      </div>
      <div className="mt-2">
        <span className="inline-block px-2 py-0.5 bg-white/20 rounded text-white text-xs font-medium">
          {schedule.section}
        </span>
      </div>
    </div>
  )
}

// Empty State Component
const EmptyState = ({ onUploadClick }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
        <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">No Schedule Yet</h2>
      <p className="text-gray-500 max-w-md mx-auto mb-6">
        Upload your registration form to automatically import your class schedule for this semester.
      </p>
      <button
        onClick={onUploadClick}
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Registration Form
      </button>
    </div>
  )
}

export default function Schedule() {
  const { user, userProfile } = useAuth()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [scheduleData, setScheduleData] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [professors, setProfessors] = useState(defaultProfessors)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdatingProfessor, setIsUpdatingProfessor] = useState(false)

  // Load saved schedule and professors from Firebase on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // Load schedule from Firebase
        const savedSchedule = await getStudentSchedule(user.uid)
        if (savedSchedule && savedSchedule.length > 0) {
          setScheduleData(savedSchedule)
        }
        
        // Load professors (faculty users) from Firebase
        const professorsList = await getProfessorNames()
        if (professorsList && professorsList.length > 0) {
          setProfessors(professorsList)
        }
      } catch (error) {
        console.error('Error loading data from Firebase:', error)
        // Fallback to localStorage if Firebase fails
        const localSchedule = localStorage.getItem('studentSchedule')
        if (localSchedule) {
          try {
            setScheduleData(JSON.parse(localSchedule))
          } catch (e) {
            console.error('Error loading from localStorage:', e)
          }
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user])

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

  // Handle schedule card click
  const handleScheduleClick = (schedule) => {
    setSelectedSchedule(schedule)
  }

  // Handle professor update
  const handleUpdateProfessor = async (scheduleId, professor) => {
    if (!user) return
    
    setIsUpdatingProfessor(true)
    try {
      // Update the schedule in Firebase
      const updatedSchedules = await updateScheduleItem(user.uid, scheduleId, { professor })
      setScheduleData(updatedSchedules)
      
      // Update the selected schedule to reflect the change
      if (selectedSchedule && selectedSchedule.id === scheduleId) {
        setSelectedSchedule({ ...selectedSchedule, professor })
      }
    } catch (error) {
      console.error('Error updating professor:', error)
      alert('Failed to update professor. Please try again.')
    } finally {
      setIsUpdatingProfessor(false)
    }
  }

  // Handle PDF upload and parsing
  const handleFileUpload = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Please upload a PDF file')
      return
    }

    if (!user) {
      alert('Please log in to upload your schedule')
      return
    }

    setIsProcessing(true)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      
      let fullText = ''
      
      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map(item => item.str).join(' ')
        fullText += pageText + '\n'
      }

      console.log('Extracted PDF text:', fullText) // For debugging

      // Parse the schedule from extracted text using the new parser
      const extractedSchedule = parseRegistrationForm(fullText)
      
      if (extractedSchedule.length > 0) {
        // Save to Firebase
        await saveStudentSchedule(user.uid, extractedSchedule)
        setScheduleData(extractedSchedule)
        
        // Also keep localStorage as backup
        localStorage.setItem('studentSchedule', JSON.stringify(extractedSchedule))
        setUploadSuccess(true)
        setTimeout(() => setUploadSuccess(false), 3000)
      } else {
        alert('Could not extract schedule from the PDF. Please make sure you uploaded a valid registration form.')
      }
      
      setIsModalOpen(false)
    } catch (error) {
      console.error('Error processing PDF:', error)
      alert('Error processing the PDF file. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Clear schedule
  const handleClearSchedule = async () => {
    if (!user) return
    
    if (confirm('Are you sure you want to clear your schedule?')) {
      setIsSaving(true)
      try {
        await deleteStudentSchedule(user.uid)
        setScheduleData([])
        localStorage.removeItem('studentSchedule')
      } catch (error) {
        console.error('Error clearing schedule:', error)
        alert('Failed to clear schedule. Please try again.')
      } finally {
        setIsSaving(false)
      }
    }
  }

  // Get schedules for a specific day
  const getSchedulesForDay = (day) => {
    return scheduleData.filter(schedule => schedule.day === day)
  }

  const cellHeight = 60 // Height of each time slot cell in pixels

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your schedule...</p>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
              <p className="text-gray-600 mt-1">View your class schedule for this semester</p>
              {userProfile && (
                <p className="text-sm text-gray-500 mt-1">
                  Logged in as: {userProfile.firstName} {userProfile.lastName}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {scheduleData.length > 0 && (
                <button
                  onClick={handleClearSchedule}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Clearing...' : 'Clear Schedule'}
                </button>
              )}
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Registration Form
              </button>
            </div>
          </div>

      {/* Success Message */}
      {uploadSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-green-800 font-medium">Schedule successfully extracted from registration form!</p>
        </div>
      )}

      {scheduleData.length === 0 ? (
        <EmptyState onUploadClick={() => setIsModalOpen(true)} />
      ) : (
        <>
          {/* Week Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousWeek}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToCurrentWeek}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              This Week
            </button>
            <button
              onClick={goToNextWeek}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="ml-2 text-sm text-gray-500">
              {scheduleData.length} class{scheduleData.length !== 1 ? 'es' : ''} scheduled
            </span>
          </div>

          {/* Schedule Grid */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Header Row */}
                <div className="grid grid-cols-[80px_repeat(6,1fr)] border-b border-gray-200">
                  <div className="p-3 text-sm font-semibold text-gray-600 bg-gray-50 border-r border-gray-200">
                    Time
                  </div>
                  {days.map((day) => (
                    <div
                      key={day}
                      className="p-3 text-sm font-semibold text-gray-600 bg-gray-50 text-center border-r border-gray-200 last:border-r-0"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Time Slots Grid */}
                <div className="grid grid-cols-[80px_repeat(6,1fr)]">
                  {/* Time Column */}
                  <div className="border-r border-gray-200">
                    {timeSlots.map((time) => (
                      <div
                        key={time}
                        className="h-[60px] px-3 flex items-start pt-1 text-sm text-gray-500 border-b border-gray-100"
                      >
                        {time}
                      </div>
                    ))}
                  </div>

                  {/* Day Columns */}
                  {days.map((day) => (
                    <div key={day} className="relative border-r border-gray-200 last:border-r-0">
                      {/* Time slot backgrounds */}
                      {timeSlots.map((time) => (
                        <div
                          key={`${day}-${time}`}
                          className="h-[60px] border-b border-gray-100"
                        />
                      ))}

                      {/* Schedule Cards */}
                      {getSchedulesForDay(day).map((schedule) => {
                        const startIndex = getTimeIndex(schedule.startTime)
                        const duration = getDuration(schedule.startTime, schedule.endTime)
                        const top = startIndex * cellHeight
                        const height = duration * cellHeight - 4 // -4 for margin

                        return (
                          <ScheduleCard
                            key={schedule.id}
                            schedule={schedule}
                            onClick={handleScheduleClick}
                            style={{
                              top: `${top + 2}px`,
                              height: `${height}px`,
                            }}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleFileUpload}
        isProcessing={isProcessing}
      />

      {/* Schedule Detail Modal */}
      <ScheduleDetailModal
        schedule={selectedSchedule}
        isOpen={!!selectedSchedule}
        onClose={() => setSelectedSchedule(null)}
        onUpdateProfessor={handleUpdateProfessor}
        professors={professors}
        isUpdating={isUpdatingProfessor}
      />
    </div>
  )
}
