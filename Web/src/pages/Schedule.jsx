import { useState, useRef, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useAuth, ROLES } from '../contexts/AuthContext'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import {
  saveStudentSchedule,
  getStudentSchedule,
  deleteStudentSchedule
} from '../services/scheduleService'
import {
  updateClassSectionFromStudent,
  removeStudentFromClassSection,
  subscribeToScheduleCodes
} from '../services/classSectionService'
import { getSemesterSettings } from '../services/systemSettingsService'
import { updateRoomStatus, subscribeToRooms, isScheduleSlotVacant, isRoomCurrentlyVacant, addRoomOccupancy, removeUserOccupancies } from '../services/roomService'
import FacultyScheduleView from '../components/schedule/FacultyScheduleView'
import ModalOverlay from '../components/ui/ModalOverlay'

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

// Helper function to get year suffix (1st, 2nd, 3rd, 4th)
const getYearSuffix = (year) => {
  const num = parseInt(year)
  if (num === 1) return 'st'
  if (num === 2) return 'nd'
  if (num === 3) return 'rd'
  return 'th'
}

/**
 * Normalize room name to a consistent format
 * Handles variations like:
 * - A-304, A304 → A-304 (building-room format)
 * - RM.101, RM101, Room 101, Room101 → RM.101
 * - CL3/RM. 7 → CL3/RM.7 (composite room names)
 * - TBA, N/A → TBA
 * @param {string} room - Raw room name from PDF
 * @returns {string} Normalized room name
 */
const normalizeRoomName = (room) => {
  if (!room || typeof room !== 'string') return 'TBA'
  
  let normalized = room.trim().toUpperCase()
  
  // Handle TBA/NA variations
  if (normalized === 'TBA' || normalized === 'N/A' || normalized === 'NA' || normalized === '') {
    return 'TBA'
  }
  
  // Handle composite room names with slashes (e.g., "CL3/RM. 7")
  if (normalized.includes('/')) {
    const parts = normalized.split('/')
    return parts.map(part => normalizeRoomName(part.trim())).join('/')
  }
  
  // Pattern: Building letter followed by optional dash and room number (A-304, A304)
  // Normalize to A-304 format
  const buildingRoomPattern = /^([A-Z])[\-\s]?(\d{3,4})$/
  const buildingMatch = normalized.match(buildingRoomPattern)
  if (buildingMatch) {
    return `${buildingMatch[1]}-${buildingMatch[2]}`
  }
  
  // Pattern: RM./RM/Room followed by number (RM.101, RM101, Room 101, ROOM101)
  // Normalize to RM.101 format
  const roomPattern = /^(?:RM\.?|ROOM)\s*(\d+)$/
  const roomMatch = normalized.match(roomPattern)
  if (roomMatch) {
    return `RM.${roomMatch[1]}`
  }
  
  // Pattern: CL (Computer Lab) followed by number (CL3, CL 3)
  const clPattern = /^CL\s*(\d+)$/
  const clMatch = normalized.match(clPattern)
  if (clMatch) {
    return `CL${clMatch[1]}`
  }
  
  // Return as-is if no pattern matched (but uppercase)
  return normalized
}

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
      room: normalizeRoomName(room1),
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
      room: normalizeRoomName(room2),
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
        room: normalizeRoomName(r1),
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
        room: normalizeRoomName(r2),
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

// Helper function to parse student name from registration form format
// Format: "DELA CRUZ, JUAN MIGUEL B." -> { lastName: "Dela Cruz", givenName: "Juan Miguel", middleName: "B", suffix: "" }
// Or: "DELA CRUZ, JUAN MIGUEL JR." -> { lastName: "Dela Cruz", givenName: "Juan Miguel", middleName: "", suffix: "Jr." }
const parseStudentName = (fullName) => {
  if (!fullName) return { lastName: '', givenName: '', middleName: '', suffix: '' }
  
  // Common suffixes to detect (at end of name)
  const suffixPatterns = /\b(JR\.?|SR\.?|III|IV|II|V)$/i
  // Middle initial pattern (single letter followed by optional period)
  const middleInitialPattern = /\b([A-Z])\.?$/i
  
  // Convert to title case helper
  const toTitleCase = (str) => str.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
  
  // Check if name is in "LAST, FIRST MIDDLE" format (has comma)
  if (fullName.includes(',')) {
    const [lastName, rest] = fullName.split(',').map(s => s.trim())
    let givenName = rest || ''
    let middleName = ''
    let suffix = ''
    
    // First check for suffix at end (JR., SR., III, etc.)
    const suffixMatch = givenName.match(suffixPatterns)
    if (suffixMatch) {
      suffix = suffixMatch[1].replace('.', '')
      suffix = suffix.charAt(0).toUpperCase() + suffix.slice(1).toLowerCase()
      if (suffix === 'Jr' || suffix === 'Sr') suffix += '.'
      givenName = givenName.replace(suffixPatterns, '').trim()
    }
    
    // Then check for middle initial at end (B., M., etc.)
    const middleMatch = givenName.match(middleInitialPattern)
    if (middleMatch) {
      middleName = middleMatch[1].toUpperCase()
      givenName = givenName.replace(middleInitialPattern, '').trim()
    }
    
    return {
      lastName: toTitleCase(lastName),
      givenName: toTitleCase(givenName),
      middleName: middleName, // Just the initial letter (e.g., "G" for Gabales)
      suffix: suffix
    }
  }
  
  // No comma - name is in "FIRST MIDDLE LAST" or "FIRST MIDDLE. LAST" format
  // Example: "SOFRONIO A. BARRIENTOS" -> firstName=SOFRONIO, middle=A, lastName=BARRIENTOS
  const parts = fullName.trim().split(/\s+/)
  
  if (parts.length >= 2) {
    let suffix = ''
    let middleName = ''
    let givenName = ''
    let lastName = ''
    
    // Check for suffix at the end
    const lastPart = parts[parts.length - 1]
    if (suffixPatterns.test(lastPart)) {
      suffix = lastPart.replace('.', '')
      suffix = suffix.charAt(0).toUpperCase() + suffix.slice(1).toLowerCase()
      if (suffix === 'Jr' || suffix === 'Sr') suffix += '.'
      parts.pop()
    }
    
    if (parts.length >= 3) {
      // Format: FIRSTNAME MIDDLE LASTNAME or FIRSTNAME M. LASTNAME
      // First part is given name, last part is last name, middle parts are middle name/initial
      givenName = parts[0]
      lastName = parts[parts.length - 1]
      
      // Everything in between is middle name
      const middleParts = parts.slice(1, -1)
      if (middleParts.length > 0) {
        // Check if it's just an initial (single letter with optional period)
        const middleStr = middleParts.join(' ').replace('.', '')
        if (middleStr.length === 1) {
          middleName = middleStr.toUpperCase()
        } else {
          middleName = middleStr.toUpperCase()
        }
      }
    } else if (parts.length === 2) {
      // Just FIRSTNAME LASTNAME
      givenName = parts[0]
      lastName = parts[1]
    }
    
    return {
      lastName: toTitleCase(lastName),
      givenName: toTitleCase(givenName),
      middleName: middleName,
      suffix: suffix
    }
  }
  
  return { lastName: fullName, givenName: '', middleName: '', suffix: '' }
}

// Main parser that tries multiple approaches
const parseRegistrationForm = (text) => {
  console.log('Parsing registration form...')
  
  // Clean up the text - normalize spaces
  const cleanText = text.replace(/\s+/g, ' ').trim()
  console.log('Clean text:', cleanText)
  
  // Debug: Log portion around "Student Name" to help identify format
  const studentNameIndex = cleanText.toLowerCase().indexOf('student name')
  if (studentNameIndex !== -1) {
    console.log('Text around Student Name:', cleanText.substring(studentNameIndex, studentNameIndex + 150))
  }
  
  // Debug: Find all uppercase words that look like names (LASTNAME, FIRSTNAME format)
  const potentialNames = cleanText.match(/[A-Z]{2,}(?:\s+[A-Z]+)*,\s*[A-Z]{2,}(?:\s+[A-Z\.]+)*/g)
  console.log('Potential names found in PDF:', potentialNames)
  
  const schedules = []
  
  // Extract student info from registration form
  const studentInfo = {
    semester: '',
    schoolYear: '',
    course: '',
    yearLevel: '',
    section: '',
    studentId: '',
    studentName: '',
    // Parsed name components
    givenName: '',
    middleName: '',
    lastName: '',
    suffix: ''
  }
  
  // Extract Student Number (e.g., "Student Number: 202221022" or "Student No.: 202221022")
  const studentIdPatterns = [
    /Student\s*(?:Number|No\.?)\s*:?\s*(\d{9,12})/i,    // Student Number: 202221022
    /(?:Student\s*)?ID\s*(?:Number|No\.?)?\s*:?\s*(\d{9,12})/i,  // ID Number: 202221022
    /(?:^|\s)(\d{9})(?:\s|$)/,  // 9-digit number standalone (common student ID format)
  ]
  
  for (const pattern of studentIdPatterns) {
    const studentIdMatch = cleanText.match(pattern)
    if (studentIdMatch) {
      studentInfo.studentId = studentIdMatch[1]
      console.log('Student ID found:', studentInfo.studentId)
      break
    }
  }
  
  // Extract Student Name (e.g., "Student Name: SOFRONIO A. BARRIENTOS" or "Student Name: DELA CRUZ, JUAN")
  // CvSU registration forms can have name in different formats:
  // Format 1: FIRSTNAME MIDDLE. LASTNAME (e.g., "SOFRONIO A. BARRIENTOS")
  // Format 2: LASTNAME, FIRSTNAME MIDDLE (e.g., "BARRIENTOS, SOFRONIO A.")
  const studentNamePatterns = [
    // Pattern 1: Student Name followed by text until next field label (Course, Date, Semester, etc.)
    /Student\s*Name\s*:?\s*([A-Z][A-Z\s\.,'-]+?)(?=\s+(?:Course|Date|Semester|Encoder|Major|Address|Section|College|Department|Year)[\s:]+)/i,
    // Pattern 2: Student Name with comma format (LASTNAME, FIRSTNAME)
    /Student\s*Name\s*:?\s*([A-Z][A-Z\s\.,'-]+,\s*[A-Z][A-Z\s\.,'-]*)/i,
    // Pattern 3: Name: followed by name until next field
    /(?:^|\s)Name\s*:?\s*([A-Z][A-Z\s\.,'-]+?)(?=\s+(?:Course|Date|Semester|Encoder|Major|Address|Section)[\s:]+)/i,
    // Pattern 4: Fallback - any name after "Student Name" label
    /Student\s*Name\s*:?\s*([A-Z][A-Z\s\.'-]{3,})/i,
  ]
  
  for (const pattern of studentNamePatterns) {
    const nameMatch = cleanText.match(pattern)
    if (nameMatch) {
      // Clean up the name - remove extra spaces and trailing periods/commas
      let extractedName = nameMatch[1].trim().replace(/[\.,]+$/, '').trim()
      
      // Don't accept names that are too short or don't look like names
      if (extractedName.length < 3) continue
      
      // Skip if it looks like it captured the next field label
      if (/^(Course|Date|Semester|Encoder|Major|Address|Section)$/i.test(extractedName)) continue
      
      studentInfo.studentName = extractedName
      console.log('Student Name found:', studentInfo.studentName)
      
      // Parse the name into components (givenName, middleName, lastName, suffix)
      const parsedName = parseStudentName(studentInfo.studentName)
      studentInfo.givenName = parsedName.givenName
      studentInfo.middleName = parsedName.middleName
      studentInfo.lastName = parsedName.lastName
      studentInfo.suffix = parsedName.suffix
      console.log('Parsed name:', parsedName)
      break
    }
  }
  
  // If no name found with patterns above, try to find name near Student Number
  if (!studentInfo.studentName && studentInfo.studentId) {
    // Look for name pattern before or after the student ID
    const nameNearIdPatterns = [
      // Name appearing before or after student ID
      new RegExp(`([A-Z]{2,}(?:\\s+[A-Z]+)*,\\s*[A-Z]{2,}(?:\\s+[A-Z\\.]+)*)\\s*(?:Student\\s*(?:Number|No|ID))?\\s*:?\\s*${studentInfo.studentId}`, 'i'),
      new RegExp(`${studentInfo.studentId}\\s*([A-Z]{2,}(?:\\s+[A-Z]+)*,\\s*[A-Z]{2,}(?:\\s+[A-Z\\.]+)*)`, 'i'),
    ]
    
    for (const pattern of nameNearIdPatterns) {
      const nameMatch = cleanText.match(pattern)
      if (nameMatch) {
        let extractedName = nameMatch[1].trim().replace(/[\.,]+$/, '').trim()
        if (extractedName.length >= 3) {
          studentInfo.studentName = extractedName
          console.log('Student Name found near ID:', studentInfo.studentName)
          
          const parsedName = parseStudentName(studentInfo.studentName)
          studentInfo.givenName = parsedName.givenName
          studentInfo.middleName = parsedName.middleName
          studentInfo.lastName = parsedName.lastName
          studentInfo.suffix = parsedName.suffix
          console.log('Parsed name:', parsedName)
          break
        }
      }
    }
  }
  
  // Extract semester (1st Semester, 2nd Semester, Summer)
  // Multiple patterns to catch various formats including standalone FIRST/SECOND
  const semesterPatterns = [
    /(\d)(?:st|nd|rd|th)?\s*Semester/i,                    // 1st Semester, 2 Semester
    /(First|Second|Third)\s*Semester/i,                    // First Semester
    /Semester\s*:?\s*(\d|First|Second|Summer)/i,           // Semester: 1, Semester: First
    /(Summer)\s*(?:Term|Semester|Class)/i,                 // Summer Term
    /(?:^|\s)(1st|2nd)\s*Sem(?:ester)?/i,                  // 1st Sem, 2nd Sem
    /Sem(?:ester)?\s*:?\s*(\d|1st|2nd)/i,                  // Sem: 1, Sem: 1st
    /\b(FIRST|SECOND)\b/,                                   // Standalone FIRST or SECOND (uppercase)
    /(?:Semester|Sem)\s*:?\s*(FIRST|SECOND)/i,             // Semester: FIRST
  ]
  
  for (const pattern of semesterPatterns) {
    const semesterMatch = cleanText.match(pattern)
    if (semesterMatch) {
      const sem = (semesterMatch[1] || semesterMatch[0]).toLowerCase().trim()
      if (sem === '1' || sem === '1st' || sem === 'first') {
        studentInfo.semester = '1st Semester'
        break
      } else if (sem === '2' || sem === '2nd' || sem === 'second') {
        studentInfo.semester = '2nd Semester'
        break
      } else if (sem === '3' || sem === '3rd' || sem === 'third') {
        studentInfo.semester = '3rd Semester'
        break
      } else if (sem.includes('summer')) {
        studentInfo.semester = 'Summer'
        break
      }
    }
  }
  console.log('Semester found:', studentInfo.semester)
  
  // Extract school year (e.g., 2024-2025, A.Y. 2024-2025)
  // More specific regex: looks for A.Y. or School Year label, or consecutive years with hyphen
  const yearPatterns = [
    /(?:A\.?Y\.?|School\s*Year|S\.?Y\.?)\s*:?\s*(\d{4})\s*[-–]\s*(\d{4})/i,  // A.Y. 2024-2025 or School Year: 2024-2025
    /(\d{4})\s*[-–]\s*(\d{4})(?:\s*(?:Semester|sem))/i,  // 2024-2025 followed by Semester
    /(?:Semester|sem)[^0-9]*(\d{4})\s*[-–]\s*(\d{4})/i,  // Semester ... 2024-2025
  ]
  
  for (const pattern of yearPatterns) {
    const yearMatch = cleanText.match(pattern)
    if (yearMatch) {
      const year1 = parseInt(yearMatch[1])
      const year2 = parseInt(yearMatch[2])
      // Validate that the second year is exactly one more than the first
      if (year2 === year1 + 1 && year1 >= 2000 && year1 <= 2100) {
        studentInfo.schoolYear = `${year1}-${year2}`
        break
      }
    }
  }
  
  // Fallback: look for any year pattern but validate it
  if (!studentInfo.schoolYear) {
    const fallbackMatch = cleanText.match(/(\d{4})\s*[-–]\s*(\d{4})/g)
    if (fallbackMatch) {
      for (const match of fallbackMatch) {
        const years = match.match(/(\d{4})\s*[-–]\s*(\d{4})/)
        if (years) {
          const year1 = parseInt(years[1])
          const year2 = parseInt(years[2])
          if (year2 === year1 + 1 && year1 >= 2000 && year1 <= 2100) {
            studentInfo.schoolYear = `${year1}-${year2}`
            break
          }
        }
      }
    }
  }
  console.log('School Year found:', studentInfo.schoolYear)
  
  // Extract course/program (e.g., BSCS, BSIT, BSIS, BSEMC, BAJOURN, etc.)
  // First try to get from "Course:" field
  const courseFieldMatch = cleanText.match(/Course\s*:?\s*([A-Z]{2,}(?:\s+[A-Z]+)*)/i)
  if (courseFieldMatch) {
    const courseCode = courseFieldMatch[1].toUpperCase().trim()
    // Normalize common course names
    if (courseCode.includes('COMPUTER SCIENCE') || courseCode === 'BSCS') {
      studentInfo.course = 'BS Computer Science'
    } else if (courseCode.includes('INFORMATION TECHNOLOGY') || courseCode === 'BSIT') {
      studentInfo.course = 'BS Information Technology'
    } else if (courseCode.includes('INFORMATION SYSTEM') || courseCode === 'BSIS') {
      studentInfo.course = 'BS Information Systems'
    } else if (courseCode.includes('ENTERTAINMENT') || courseCode === 'BSEMC') {
      studentInfo.course = 'BS Entertainment & Multimedia Computing'
    } else if (courseCode === 'BAJOURN' || courseCode.includes('JOURNALISM')) {
      studentInfo.course = 'BA Journalism'
    } else {
      studentInfo.course = courseCode
    }
  }
  
  // Fallback to other course patterns if not found
  if (!studentInfo.course) {
    const courseMatch = cleanText.match(/\b(Bachelor\s+of\s+(?:Science|Arts)\s+in\s+[A-Za-z\s]+|BSCS|BSIT|BSIS|BSEMC|BAJOURN|BS\s+in\s+[A-Za-z\s]+|BA\s+in\s+[A-Za-z\s]+)\b/i)
    if (courseMatch) {
      const course = courseMatch[1].toUpperCase()
      if (course.includes('COMPUTER SCIENCE') || course === 'BSCS') {
        studentInfo.course = 'BS Computer Science'
      } else if (course.includes('INFORMATION TECHNOLOGY') || course === 'BSIT') {
        studentInfo.course = 'BS Information Technology'
      } else if (course.includes('INFORMATION SYSTEM') || course === 'BSIS') {
        studentInfo.course = 'BS Information Systems'
      } else if (course.includes('ENTERTAINMENT') || course === 'BSEMC') {
        studentInfo.course = 'BS Entertainment & Multimedia Computing'
      } else if (course === 'BAJOURN' || course.includes('JOURNALISM')) {
        studentInfo.course = 'BA Journalism'
      } else {
        studentInfo.course = courseMatch[1]
      }
    }
  }
  console.log('Course found:', studentInfo.course)
  
  // Extract section directly from "Section:" field first (e.g., "Section: BAJOURN-3A")
  const sectionFieldMatch = cleanText.match(/Section\s*:?\s*([A-Z]{2,}[-\s]*\d[A-Z])/i)
  if (sectionFieldMatch) {
    studentInfo.section = sectionFieldMatch[1].toUpperCase().replace(/\s+/g, '-')
    console.log('Section found from field:', studentInfo.section)
  }
  
  // Check if student is IRREGULAR
  const irregularMatch = cleanText.match(/\bIRREGULAR\b/i)
  if (irregularMatch && !studentInfo.section) {
    studentInfo.section = 'IRREGULAR'
  }
  
  // Try to extract year level (e.g., "3rd Year", "Year 3", "THIRD YEAR", "4TH YEAR", "Year Level: 3")
  // This works for both regular and irregular students
  const yearLevelPatterns = [
    /Year\s*Level\s*:?\s*(\d)/i,                            // Year Level: 3, Year Level 4
    /(\d)(?:st|nd|rd|th)\s*Year/i,                          // 3rd Year, 4th Year
    /Year\s*:?\s*(\d)/i,                                    // Year 3, Year: 4
    /(FIRST|SECOND|THIRD|FOURTH|FIFTH)\s*Year/i,            // FIRST YEAR, THIRD YEAR
    /\b(\d)(?:st|nd|rd|th)\b/i,                             // Just 4th, 3rd (standalone)
    /Year\s*Level\s*[:\s]*([1-5])/i,                        // Year Level  4
  ]
  
  for (const pattern of yearLevelPatterns) {
    const yearLevelMatch = cleanText.match(pattern)
    if (yearLevelMatch) {
      let year = yearLevelMatch[1]
      // Convert word to number if needed
      const yearLower = year.toLowerCase()
      if (yearLower === 'first') year = '1'
      else if (yearLower === 'second') year = '2'
      else if (yearLower === 'third') year = '3'
      else if (yearLower === 'fourth') year = '4'
      else if (yearLower === 'fifth') year = '5'
      
      studentInfo.yearLevel = `${year}${getYearSuffix(year)} Year`
      console.log('Year level matched with pattern:', pattern, 'Value:', year)
      break
    }
  }
  
  // If still no year level found, try to find just a number near year-related context
  if (!studentInfo.yearLevel) {
    // Look for patterns like "4 IRREGULAR" or course code with year
    const altYearMatch = cleanText.match(/\b([1-5])\s*(?:IRREGULAR|Irregular)/i) ||
                         cleanText.match(/(?:BSCS|BSIT|BSIS|BSEMC)\s*[-]?\s*([1-5])/i)
    if (altYearMatch) {
      const year = altYearMatch[1]
      studentInfo.yearLevel = `${year}${getYearSuffix(year)} Year`
      console.log('Year level matched with alt pattern, Value:', year)
    }
  }
  
  // Check for regular section pattern (e.g., BSCS-3E, BAJOURN-3A) - fallback if not found from Section field
  if (!studentInfo.section || studentInfo.section === 'IRREGULAR') {
    // Generic pattern: COURSECODE-YEARSECTION (e.g., BSCS-3E, BAJOURN-3A, BSIT-2B)
    const sectionMatch = cleanText.match(/\b([A-Z]{2,})[-\s]*(\d)([A-Z])\b/i)
    if (sectionMatch && !studentInfo.section) {
      const program = sectionMatch[1].toUpperCase()
      const year = sectionMatch[2]
      const section = sectionMatch[3].toUpperCase()
      studentInfo.section = `${program}-${year}${section}`
      // Override year level from section if found
      studentInfo.yearLevel = `${year}${getYearSuffix(year)} Year`
      
      // If course wasn't found earlier, derive from section
      if (!studentInfo.course) {
        if (program === 'BSCS') studentInfo.course = 'BS Computer Science'
        else if (program === 'BSIT') studentInfo.course = 'BS Information Technology'
        else if (program === 'BSIS') studentInfo.course = 'BS Information Systems'
        else if (program === 'BSEMC') studentInfo.course = 'BS Entertainment & Multimedia Computing'
        else if (program === 'BAJOURN') studentInfo.course = 'BA Journalism'
      }
    }
  }
  console.log('Section found:', studentInfo.section)
  console.log('Year Level found:', studentInfo.yearLevel)

  // Find all course IDs (9 digits starting with year like 2023, 2024, 2025, etc.)
  const courseIdPattern = /20\d{7}/g
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
    // Pattern supports:
    // - Standard codes: JOUR 100, GNED 15, DCIT 25
    // - COGNATE format: COGNATE 2 (word followed by single digit)
    // - Other formats with longer course codes
    const codeMatch = segment.match(/^([A-Z]{2,7}\s+\d{1,3}[A-Z]?)\s+(.+?)\s+(\d)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/)
    
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
    
    // Create schedule entries with schedule code for matchmaking
    // Schedule 1: day1, time1, room1
    schedules.push({
      id: schedules.length + 1,
      scheduleCode: currentId.id, // 9-digit schedule code for professor matchmaking
      subject: subjectName,
      room: normalizeRoomName(room1),
      professor: 'TBA', // Will be updated from class_sections
      section: studentInfo.section || 'N/A',
      day: dayAbbreviations[day1.toUpperCase()] || day1,
      startTime: time1Start,
      endTime: time1End,
    })
    
    // Schedule 2: day2, time2, room2
    schedules.push({
      id: schedules.length + 1,
      scheduleCode: currentId.id, // Same schedule code for both entries
      subject: subjectName,
      room: normalizeRoomName(room2),
      professor: 'TBA', // Will be updated from class_sections
      section: studentInfo.section || 'N/A',
      day: dayAbbreviations[day2.toUpperCase()] || day2,
      startTime: time2Start,
      endTime: time2End,
    })
  }

  console.log('Final extracted schedules:', schedules)
  console.log('Student info:', studentInfo)
  
  return { schedules, studentInfo }
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
      
      const room1 = roomMatch ? normalizeRoomName(roomMatch[1]) : 'TBA'
      const room2 = roomMatch ? normalizeRoomName(roomMatch[2]) : 'TBA'
      
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
    <ModalOverlay onClose={isProcessing ? null : onClose} closeOnBackdropClick={!isProcessing}>
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Upload Registration Form</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            disabled={isProcessing}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
          Upload your CvSU registration form (PDF) to automatically extract your class schedule.
        </p>

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">Processing your registration form...</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Extracting schedule data</p>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
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
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
              Drag and drop your registration form here
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">or</p>
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
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-4">Supported format: PDF</p>
          </div>
        )}
        </div>
      </div>
    </ModalOverlay>
  )
}

// Schedule Detail Modal Component
const ScheduleDetailModal = ({ 
  schedule, 
  isOpen, 
  onClose, 
  classSectionProfessors = {},
  isIrregular = false,
  onUpdateClassSection = null,
  canToggleRoom = false,
  roomsMap = {},
  onToggleRoomStatus = null,
  userId = null
}) => {
  const [editingSection, setEditingSection] = useState(false)
  const [classSection, setClassSection] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isTogglingRoom, setIsTogglingRoom] = useState(false)

  // Initialize classSection when schedule changes
  useEffect(() => {
    if (schedule) {
      setClassSection(schedule.classSection || '')
      setEditingSection(false)
    }
  }, [schedule])

  // Use professor name from Schedule Code Matchmaking if available
  const displayProfessor = schedule?.scheduleCode && classSectionProfessors[schedule.scheduleCode]
    ? classSectionProfessors[schedule.scheduleCode]
    : schedule?.professor || 'TBA'

  // Display section: use classSection if set (for irregulars), otherwise use schedule.section
  const displaySection = schedule?.classSection || schedule?.section

  const handleSaveSection = async () => {
    if (!onUpdateClassSection || !classSection.trim()) return
    
    setIsSaving(true)
    try {
      await onUpdateClassSection(schedule.id, classSection.trim().toUpperCase())
      setEditingSection(false)
    } catch (error) {
      console.error('Error updating class section:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !schedule) return null

  return (
    <ModalOverlay onClose={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-green-600 text-white px-6 py-4 flex items-start justify-between flex-shrink-0">
          <div className="flex-1">
            <h2 className="text-xl font-bold">{schedule.subject}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-block px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium">
                {displaySection}
              </span>
              {isIrregular && schedule.classSection && schedule.classSection !== schedule.section && (
                <span className="inline-block px-2 py-0.5 bg-white/30 text-white rounded-full text-xs">
                  Class Section
                </span>
              )}
              {schedule.scheduleCode && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 text-white rounded-full text-sm font-mono">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  {schedule.scheduleCode}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors -mr-2 -mt-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
        {/* Irregular Student Section Assignment */}
        {isIrregular && onUpdateClassSection && (
          <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2">Class Section Assignment</p>
                {editingSection ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={classSection}
                      onChange={(e) => setClassSection(e.target.value.toUpperCase())}
                      placeholder="e.g., BSIT-3A"
                      className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveSection}
                        disabled={isSaving || !classSection.trim()}
                        className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setClassSection(schedule.classSection || '')
                          setEditingSection(false)
                        }}
                        className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-purple-700 dark:text-purple-300">
                      {schedule.classSection ? schedule.classSection : 'Not set'}
                    </span>
                    <button
                      onClick={() => setEditingSection(true)}
                      className="text-xs px-2 py-1 bg-purple-200 text-purple-700 rounded hover:bg-purple-300"
                    >
                      {schedule.classSection ? 'Change' : 'Set Section'}
                    </button>
                  </div>
                )}
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                  As an irregular student, you can specify which section you're joining for this class.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Details */}
        <div className="space-y-4">
          {/* Day */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Day</p>
              <p className="font-medium text-gray-900 dark:text-white">{schedule.day}</p>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
              <p className="font-medium text-gray-900 dark:text-white">{schedule.startTime} - {schedule.endTime}</p>
            </div>
          </div>

          {/* Room */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Room</p>
              <p className="font-medium text-gray-900 dark:text-white">{schedule.room}</p>
            </div>
            {/* Room status indicator - shows real-time status based on current time */}
            {schedule.room && schedule.room !== 'TBA' && (() => {
              const roomName = schedule.room.toUpperCase().trim().replace(/\s+/g, '')
              const room = Object.values(roomsMap).find(r => r.name?.toUpperCase().trim().replace(/\s+/g, '') === roomName)
              
              // Check if this specific schedule's slot is marked as vacant
              const isThisSlotVacant = room ? isScheduleSlotVacant(room, schedule) : false
              // Check if the room is currently vacant (based on time)
              const isCurrentlyVacant = room ? isRoomCurrentlyVacant(room) : false
              
              if (room) {
                return (
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isCurrentlyVacant ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                  }`}>
                    {isCurrentlyVacant ? 'Vacant Now' : 'Occupied'}
                    {isThisSlotVacant && !isCurrentlyVacant && (
                      <span className="ml-1 text-blue-600">(Scheduled)</span>
                    )}
                  </div>
                )
              }
              return null
            })()}
          </div>

          {/* Room Status Toggle for Class Rep / Faculty - Time-Based Vacancy */}
          {canToggleRoom && schedule.room && schedule.room !== 'TBA' && onToggleRoomStatus && (() => {
            // Normalize and handle combined room names (e.g., "RM.9/CL3" -> ["RM.9", "CL3"])
            const normalizedInput = schedule.room.toUpperCase().trim().replace(/\s+/g, '')
            const roomNames = normalizedInput.includes('/') 
              ? normalizedInput.split('/').map(r => r.trim()).filter(r => r)
              : [normalizedInput]
            
            // Find all rooms that exist in the system
            const foundRooms = roomNames
              .map(name => Object.values(roomsMap).find(r => r.name?.toUpperCase().trim().replace(/\s+/g, '') === name))
              .filter(r => r)
            
            const missingRooms = roomNames.filter(name => 
              !Object.values(roomsMap).find(r => r.name?.toUpperCase().trim().replace(/\s+/g, '') === name)
            )
            
            // Check if ANY of the rooms have this time slot marked as vacant
            const isThisSlotVacant = foundRooms.some(room => isScheduleSlotVacant(room, schedule))
            
            const handleToggle = async () => {
              setIsTogglingRoom(true)
              try {
                // Pass the schedule object so vacancy is time-bound - will update ALL rooms
                await onToggleRoomStatus(schedule.room, !isThisSlotVacant, userId, schedule)
              } catch (error) {
                console.error('Error toggling room status:', error)
                alert(error.message || 'Failed to update room status')
              } finally {
                setIsTogglingRoom(false)
              }
            }
            
            // If NO rooms found in system, show message and don't allow toggle
            if (foundRooms.length === 0) {
              return (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Room(s) Not in System</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Room(s) "{roomNames.join(', ')}" not registered in the system. Please contact an admin to add these rooms.
                      </p>
                    </div>
                  </div>
                </div>
              )
            }
            
            return (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Room Status Control</p>
                    
                    {/* Show which rooms will be updated */}
                    {roomNames.length > 1 && (
                      <div className="bg-white/60 rounded-lg px-3 py-2 mb-2">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Rooms:</span> {foundRooms.map(r => r.name).join(', ')}
                          {missingRooms.length > 0 && (
                            <span className="text-amber-600"> (missing: {missingRooms.join(', ')})</span>
                          )}
                        </p>
                      </div>
                    )}
                    
                    {/* Show time slot info */}
                    <div className="bg-white/60 rounded-lg px-3 py-2 mb-3">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{schedule.day}</span>
                        <span>•</span>
                        <span>{schedule.startTime} - {schedule.endTime}</span>
                      </div>
                      {isThisSlotVacant && (
                        <p className="text-emerald-600 text-xs mt-1 font-medium">
                          ✓ This time slot is marked as vacant
                        </p>
                      )}
                    </div>
                    
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                      {isThisSlotVacant 
                        ? 'Remove the vacancy marking for this time slot.'
                        : `Mark this room as vacant during ${schedule.startTime} - ${schedule.endTime} on ${schedule.day}.`}
                    </p>
                    <button
                      onClick={handleToggle}
                      disabled={isTogglingRoom}
                      className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                        isThisSlotVacant
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      } disabled:opacity-50`}
                    >
                      {isTogglingRoom ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating...
                        </span>
                      ) : isThisSlotVacant ? (
                        <>
                          <span className="mr-2">⏺</span> Remove Vacant Marking
                        </>
                      ) : (
                        <>
                          <span className="mr-2">✓</span> Mark as Vacant ({schedule.startTime} - {schedule.endTime})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Schedule Code */}
          {schedule.scheduleCode && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-700 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Schedule Code</p>
                <p className="font-mono font-medium text-gray-900 dark:text-white">{schedule.scheduleCode}</p>
              </div>
            </div>
          )}

          {/* Professor - Editable */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Professor</p>
              <p className="font-medium text-gray-900 dark:text-white">{displayProfessor}</p>
              {displayProfessor === 'TBA' && schedule.scheduleCode && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Waiting for faculty to claim this schedule code
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
        >
          Close
        </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// Schedule Card Component - Adaptive design that shows all details
const ScheduleCard = ({ schedule, style, onClick, classSectionProfessors = {} }) => {
  // Use professor name from Schedule Code Matchmaking if available, otherwise fall back to stored name
  const professorName = schedule.scheduleCode && classSectionProfessors[schedule.scheduleCode]
    ? classSectionProfessors[schedule.scheduleCode]
    : schedule.professor || 'TBA'
  
  // Display classSection if set (for irregulars), otherwise use schedule.section
  const displaySection = schedule.classSection || schedule.section
  
  // Get card height from style to determine layout
  const cardHeight = parseInt(style?.height) || 0
  
  // Determine layout based on available height
  // Tiny: < 45px - just subject
  // Small: 45-70px - subject + room inline
  // Medium: 70-110px - subject, room/professor inline, badges
  // Large: > 110px - full layout with spacing
  const isTiny = cardHeight < 45
  const isSmall = cardHeight >= 45 && cardHeight < 70
  const isMedium = cardHeight >= 70 && cardHeight < 110
  const isLarge = cardHeight >= 110
  
  return (
    <div
      className="absolute left-1 right-1 bg-primary rounded-md overflow-hidden cursor-pointer hover:bg-primary/90 hover:shadow-md transition-all"
      style={style}
      onClick={() => onClick(schedule)}
      title={`${schedule.subject}\n${schedule.room} • ${displaySection}\n${schedule.startTime} - ${schedule.endTime}\n${professorName}`}
    >
      {/* Tiny View - Subject only */}
      {isTiny && (
        <div className="px-1.5 py-0.5 h-full flex items-center">
          <h4 className="font-medium text-white text-[10px] leading-tight truncate">{schedule.subject}</h4>
        </div>
      )}
      
      {/* Small View - Subject + Room inline */}
      {isSmall && (
        <div className="p-1.5 h-full flex flex-col justify-center">
          <h4 className="font-semibold text-white text-[11px] leading-tight truncate">{schedule.subject}</h4>
          <div className="text-white/80 text-[9px] truncate mt-0.5">
            {schedule.room}
          </div>
        </div>
      )}
      
      {/* Medium View - Compact full info */}
      {isMedium && (
        <div className="p-1.5 h-full flex flex-col">
          <h4 className="font-semibold text-white text-xs leading-tight line-clamp-2">{schedule.subject}</h4>
          <div className="flex-1 min-h-0 flex flex-col justify-end">
            <div className="text-white/80 text-[9px] truncate">{schedule.room}</div>
            <div className="text-white/70 text-[9px] truncate">{professorName}</div>
            <div className="flex items-center gap-0.5 mt-0.5">
              <span className="px-1 py-0.5 bg-white/20 rounded text-white text-[8px] font-medium truncate max-w-[70px]">
                {displaySection}
              </span>
              {schedule.scheduleCode && (
                <span className="px-1 py-0.5 bg-yellow-400/30 rounded text-white text-[8px] font-mono">
                  {schedule.scheduleCode.slice(-4)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Large View - Full layout with better spacing */}
      {isLarge && (
        <div className="p-2 h-full flex flex-col">
          <h4 className="font-semibold text-white text-sm leading-tight line-clamp-2">{schedule.subject}</h4>
          <div className="flex-1 min-h-0 flex flex-col justify-center mt-1 space-y-0.5">
            <div className="text-white/90 text-[11px] truncate">{schedule.room}</div>
            <div className="text-white/80 text-[11px] truncate">{professorName}</div>
          </div>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            <span className="px-1.5 py-0.5 bg-white/20 rounded text-white text-[9px] font-medium">
              {displaySection}
            </span>
            {schedule.scheduleCode && (
              <span className="px-1.5 py-0.5 bg-yellow-400/30 rounded text-white text-[9px] font-mono">
                {schedule.scheduleCode.slice(-4)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Empty State Component
const EmptyState = ({ onUploadClick }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
        <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Schedule Yet</h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
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
  const { user, userProfile, hasMinRole } = useAuth()
  
  // Check if user is faculty or above - show faculty view
  const isFacultyOrAbove = hasMinRole(ROLES.FACULTY)
  
  // If faculty or above, render the FacultyScheduleView
  if (isFacultyOrAbove) {
    return <FacultyScheduleView />
  }
  
  // Otherwise, render the student schedule view
  return <StudentScheduleView />
}

// Student Schedule View Component (original Schedule component logic)
function StudentScheduleView() {
  const { user, userProfile, refreshProfile } = useAuth()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [scheduleData, setScheduleData] = useState([])
  const [studentInfo, setStudentInfo] = useState({
    semester: '',
    schoolYear: '',
    course: '',
    yearLevel: '',
    section: ''
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  // Real-time professor names from Schedule Code Matchmaking
  const [classSectionProfessors, setClassSectionProfessors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', details: '' })
  // Rooms state for real-time room status
  const [roomsMap, setRoomsMap] = useState({})

  // Check if user can toggle room status (class_rep or faculty+)
  const canToggleRoom = userProfile?.role && ['class_rep', 'faculty', 'admin', 'super_admin'].includes(userProfile.role)

  // Subscribe to rooms for real-time status updates
  useEffect(() => {
    const unsubscribe = subscribeToRooms((rooms) => {
      const map = {}
      rooms.forEach(room => {
        map[room.id] = room
      })
      setRoomsMap(map)
    })
    return () => unsubscribe()
  }, [])

  // Load saved schedule on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // Load schedule from Firebase
        const savedData = await getStudentSchedule(user.uid)
        if (savedData) {
          if (savedData.schedules && savedData.schedules.length > 0) {
            setScheduleData(savedData.schedules)
          }
          setStudentInfo({
            semester: savedData.semester || '',
            schoolYear: savedData.schoolYear || '',
            course: savedData.course || '',
            yearLevel: savedData.yearLevel || '',
            section: savedData.section || ''
          })
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

  // Subscribe to schedule codes for real-time professor name updates
  useEffect(() => {
    if (!scheduleData || scheduleData.length === 0) return

    // Extract all schedule codes from the schedule data
    const scheduleCodes = scheduleData
      .filter(item => item.scheduleCode)
      .map(item => item.scheduleCode)

    if (scheduleCodes.length === 0) return

    // Subscribe to real-time updates for these schedule codes
    const unsubscribe = subscribeToScheduleCodes(scheduleCodes, (professorMap) => {
      setClassSectionProfessors(professorMap)
    })

    return () => unsubscribe()
  }, [scheduleData])

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

      // Validate that this is a CvSU Imus Campus registration form
      const isImusCampus = /imus|cvsu[-\s]?imus|cavite\s*state\s*university[-\s]*imus/i.test(fullText)
      if (!isImusCampus) {
        setErrorModal({
          isOpen: true,
          title: 'Invalid Campus',
          message: 'This registration form is not from CvSU Imus Campus.',
          details: 'UNISYNC only accepts registration forms from Cavite State University - Imus Campus. Please upload a valid CvSU Imus Campus registration form.'
        })
        setIsModalOpen(false)
        setIsProcessing(false)
        return
      }

      // Parse the schedule from extracted text using the new parser
      const { schedules: extractedSchedule, studentInfo: extractedStudentInfo } = parseRegistrationForm(fullText)
      
      // Validate that the registration form belongs to this user
      // Compare last name from reg form with user's profile last name
      if (extractedStudentInfo.lastName && userProfile?.lastName) {
        const formLastName = extractedStudentInfo.lastName.trim().toLowerCase()
        const profileLastName = userProfile.lastName.trim().toLowerCase()
        
        if (formLastName !== profileLastName) {
          setErrorModal({
            isOpen: true,
            title: 'Name Mismatch',
            message: `This registration form belongs to "${extractedStudentInfo.lastName}".`,
            details: `Your account name is "${userProfile.lastName}". You can only upload your own registration form. If your name has changed, please contact an administrator to update your account.`
          })
          setIsModalOpen(false)
          setIsProcessing(false)
          return
        }
      }
      
      // Validate against current semester settings from system configuration (set by super admin)
      try {
        const semesterSettings = await getSemesterSettings()
        const systemSemester = semesterSettings.currentSemester
        const systemSchoolYear = semesterSettings.currentSchoolYear
        
        // Check if the registration form matches the current semester settings
        if (systemSchoolYear && extractedStudentInfo.schoolYear) {
          const formSchoolYear = extractedStudentInfo.schoolYear.trim()
          const settingsSchoolYear = systemSchoolYear.trim()
          
          if (formSchoolYear !== settingsSchoolYear) {
            setErrorModal({
              isOpen: true,
              title: 'Outdated Registration Form',
              message: `This registration form is from School Year ${formSchoolYear}.`,
              details: `Please upload a current registration form (S.Y. ${settingsSchoolYear}).`
            })
            setIsModalOpen(false)
            setIsProcessing(false)
            return
          }
        }
        
        if (systemSemester && extractedStudentInfo.semester) {
          const formSemester = extractedStudentInfo.semester.trim().toLowerCase()
          const settingsSemester = systemSemester.trim().toLowerCase()
          
          // Normalize semester names for comparison
          const normalizeSemester = (sem) => {
            if (sem.includes('1st') || sem.includes('first')) return '1st semester'
            if (sem.includes('2nd') || sem.includes('second')) return '2nd semester'
            if (sem.includes('summer') || sem.includes('mid')) return 'summer'
            return sem
          }
          
          const normalizedFormSemester = normalizeSemester(formSemester)
          const normalizedSettingsSemester = normalizeSemester(settingsSemester)
          
          if (normalizedFormSemester !== normalizedSettingsSemester) {
            setErrorModal({
              isOpen: true,
              title: 'Semester Mismatch',
              message: `This registration form is for the ${extractedStudentInfo.semester}.`,
              details: `The current academic period is set to ${systemSemester}. Please upload a registration form for the current semester.`
            })
            setIsModalOpen(false)
            setIsProcessing(false)
            return
          }
        }
      } catch (semesterError) {
        console.error('Error checking semester settings:', semesterError)
        // Continue if we can't check settings (fallback to basic validation)
      }
      
      if (extractedSchedule.length > 0) {
        // Save to Firebase with student info
        await saveStudentSchedule(user.uid, extractedSchedule, extractedStudentInfo)
        setScheduleData(extractedSchedule)
        setStudentInfo(extractedStudentInfo)
        
        // Auto-update user profile with extracted student information
        try {
          // Get existing tags to preserve them
          const existingTags = userProfile?.tags || []
          
          const profileUpdateData = {
            updatedAt: serverTimestamp()
          }
          
          // Build updated tags array
          let updatedTags = [...existingTags]
          
          // Add student info fields if they were extracted
          if (extractedStudentInfo.studentId) {
            profileUpdateData.studentId = extractedStudentInfo.studentId
          }
          if (extractedStudentInfo.course) {
            profileUpdateData.course = extractedStudentInfo.course
          }
          if (extractedStudentInfo.yearLevel) {
            profileUpdateData.yearLevel = extractedStudentInfo.yearLevel
            // Add year tag (extract just the number)
            const yearMatch = extractedStudentInfo.yearLevel.match(/(\d)/)
            if (yearMatch) {
              // Remove old year tags and add new one
              updatedTags = updatedTags.filter(tag => !tag.startsWith('year:'))
              updatedTags.push(`year:${yearMatch[1]}`)
            }
          }
          if (extractedStudentInfo.section) {
            profileUpdateData.section = extractedStudentInfo.section
            // Add section tag for announcement targeting
            // Remove old section tags and add new one
            updatedTags = updatedTags.filter(tag => !tag.startsWith('section:'))
            updatedTags.push(`section:${extractedStudentInfo.section.toUpperCase()}`)
          }
          
          // Update tags in profile
          profileUpdateData.tags = updatedTags
          
          // Update name from registration form if extracted
          if (extractedStudentInfo.givenName) {
            profileUpdateData.givenName = extractedStudentInfo.givenName
          }
          if (extractedStudentInfo.middleName) {
            profileUpdateData.middleName = extractedStudentInfo.middleName
          }
          if (extractedStudentInfo.lastName) {
            profileUpdateData.lastName = extractedStudentInfo.lastName
          }
          // Always update suffix (empty string if none)
          if (extractedStudentInfo.studentName) {
            profileUpdateData.suffix = extractedStudentInfo.suffix || ''
            
            // Update displayName with parsed name: "Juan G. Dela Cruz, Jr." format
            const middleInitial = extractedStudentInfo.middleName 
              ? `${extractedStudentInfo.middleName.charAt(0).toUpperCase()}.` 
              : ''
            const suffix = extractedStudentInfo.suffix || ''
            
            let displayName = extractedStudentInfo.givenName
            if (middleInitial) displayName += ` ${middleInitial}`
            displayName += ` ${extractedStudentInfo.lastName}`
            if (suffix) displayName += `, ${suffix}`
            
            profileUpdateData.displayName = displayName
          }
          
          // Update user profile in Firestore
          await updateDoc(doc(db, 'users', user.uid), profileUpdateData)
          console.log('User profile updated with student info:', profileUpdateData)
          
          // Refresh user profile in context so UI updates immediately
          if (refreshProfile) {
            await refreshProfile()
          }
        } catch (profileError) {
          console.error('Error updating user profile:', profileError)
          // Don't fail the entire upload if profile update fails
        }
        
        // Register each schedule entry with class_sections for Schedule Code Matchmaking
        // This allows professors to see which classes have students enrolled
        // Pass user.uid to track unique students and prevent duplicate counting
        
        // Group entries by schedule code to handle multiple time slots per code
        // This prevents race conditions when the same schedule code has multiple time slots
        const scheduleByCode = extractedSchedule
          .filter(entry => entry.scheduleCode)
          .reduce((acc, entry) => {
            const code = entry.scheduleCode.toString().trim()
            if (!acc[code]) {
              acc[code] = {
                subject: entry.subject,
                section: extractedStudentInfo.section || entry.section,
                timeSlots: []
              }
            }
            // Add time slot for this entry
            acc[code].timeSlots.push({
              day: entry.day,
              startTime: entry.startTime,
              endTime: entry.endTime,
              room: entry.room
            })
            return acc
          }, {})
        
        // Now update each unique schedule code with all its time slots
        const updatePromises = Object.entries(scheduleByCode).map(([code, data]) => 
          updateClassSectionFromStudent(code, {
            subject: data.subject,
            section: data.section,
            timeSlots: data.timeSlots
          }, user.uid).catch(err => {
            console.error(`Error registering schedule code ${code}:`, err)
            // Don't fail the entire upload if one code fails
          })
        )
        
        await Promise.all(updatePromises)
        
        // Mark rooms as occupied based on the schedule
        // This updates room availability in real-time
        const roomOccupancyPromises = extractedSchedule
          .filter(entry => entry.room && entry.room !== 'TBA')
          .map(entry => 
            addRoomOccupancy(entry.room, {
              day: entry.day,
              startTime: entry.startTime,
              endTime: entry.endTime,
              subject: entry.subject,
              section: extractedStudentInfo.section || entry.section
            }, user.uid).catch(err => {
              console.error(`Error marking room ${entry.room} as occupied:`, err)
            })
          )
        
        await Promise.all(roomOccupancyPromises)
        
        // Also keep localStorage as backup
        localStorage.setItem('studentSchedule', JSON.stringify(extractedSchedule))
        localStorage.setItem('studentInfo', JSON.stringify(extractedStudentInfo))
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
        // First, remove student from all class sections they were enrolled in
        const removePromises = scheduleData
          .filter(entry => entry.scheduleCode)
          .map(entry => 
            removeStudentFromClassSection(entry.scheduleCode, user.uid).catch(err => {
              console.error(`Error removing from schedule code ${entry.scheduleCode}:`, err)
            })
          )
        await Promise.all(removePromises)
        
        // Remove room occupancies added by this user
        await removeUserOccupancies(user.uid)
        
        await deleteStudentSchedule(user.uid)
        setScheduleData([])
        setStudentInfo({
          semester: '',
          schoolYear: '',
          course: '',
          yearLevel: '',
          section: ''
        })
        localStorage.removeItem('studentSchedule')
        localStorage.removeItem('studentInfo')
      } catch (error) {
        console.error('Error clearing schedule:', error)
        alert('Failed to clear schedule. Please try again.')
      } finally {
        setIsSaving(false)
      }
    }
  }

  // Update class section for irregular students
  // When setting a section for a course, apply to ALL schedules with the same course code
  const handleUpdateClassSection = async (scheduleId, newClassSection) => {
    if (!user) return
    
    try {
      // Find the schedule item being updated
      const targetSchedule = scheduleData.find(item => item.id === scheduleId)
      if (!targetSchedule) return
      
      // Extract course code from subject (e.g., "COSC 101" from "COSC 101 - CS ELECTIVE 1")
      const courseCodeMatch = targetSchedule.subject?.match(/^([A-Z]+\s*\d+)/i)
      const courseCode = courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null
      
      // Update local state - apply to ALL schedules with the same course code
      const updatedSchedule = scheduleData.map(item => {
        // Check if this item has the same course code
        const itemCourseMatch = item.subject?.match(/^([A-Z]+\s*\d+)/i)
        const itemCourseCode = itemCourseMatch ? itemCourseMatch[1].toUpperCase() : null
        
        if (courseCode && itemCourseCode === courseCode) {
          // Same course code - apply the section change
          return { ...item, classSection: newClassSection }
        }
        return item
      })
      setScheduleData(updatedSchedule)
      
      // Update selected schedule if it's one of the affected ones
      if (selectedSchedule) {
        const selectedCourseMatch = selectedSchedule.subject?.match(/^([A-Z]+\s*\d+)/i)
        const selectedCourseCode = selectedCourseMatch ? selectedCourseMatch[1].toUpperCase() : null
        if (courseCode && selectedCourseCode === courseCode) {
          setSelectedSchedule({ ...selectedSchedule, classSection: newClassSection })
        }
      }
      
      // Save to Firebase
      await saveStudentSchedule(user.uid, updatedSchedule, studentInfo)
      
      // Update class_sections for ALL affected schedule codes
      const affectedSchedules = updatedSchedule.filter(item => {
        const itemCourseMatch = item.subject?.match(/^([A-Z]+\s*\d+)/i)
        const itemCourseCode = itemCourseMatch ? itemCourseMatch[1].toUpperCase() : null
        return courseCode && itemCourseCode === courseCode && item.scheduleCode
      })
      
      for (const scheduleItem of affectedSchedules) {
        await updateClassSectionFromStudent(scheduleItem.scheduleCode, {
          subject: scheduleItem.subject,
          room: scheduleItem.room,
          day: scheduleItem.day,
          startTime: scheduleItem.startTime,
          endTime: scheduleItem.endTime,
          section: newClassSection
        }, user.uid)
      }
      
      // Update localStorage
      localStorage.setItem('studentSchedule', JSON.stringify(updatedSchedule))
    } catch (error) {
      console.error('Error updating class section:', error)
      throw error
    }
  }

  // Check if student is irregular
  const isIrregular = studentInfo.section?.toUpperCase() === 'IRREGULAR'

  // Get schedules for a specific day
  const getSchedulesForDay = (day) => {
    return scheduleData.filter(schedule => schedule.day === day)
  }

  const cellHeight = 50 // Height of each time slot cell in pixels (optimized for 1-hour slots)

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Loading your schedule...</p>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">View your class schedule for this semester</p>
              {userProfile && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Logged in as: {userProfile.firstName} {userProfile.lastName}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {scheduleData.length > 0 && (
                <button
                  onClick={handleClearSchedule}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
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

      {/* Student Info Card */}
      {scheduleData.length > 0 && (studentInfo.semester || studentInfo.schoolYear || studentInfo.course || studentInfo.yearLevel) && (
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Student Information</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {studentInfo.semester && (
              <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 border border-white/50 dark:border-gray-600/50">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Semester</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{studentInfo.semester}</p>
              </div>
            )}
            {studentInfo.schoolYear && (
              <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 border border-white/50 dark:border-gray-600/50">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">School Year</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{studentInfo.schoolYear}</p>
              </div>
            )}
            {studentInfo.course && (
              <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 border border-white/50 dark:border-gray-600/50">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Course</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{studentInfo.course}</p>
              </div>
            )}
            {studentInfo.yearLevel && (
              <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 border border-white/50 dark:border-gray-600/50">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Year Level</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{studentInfo.yearLevel}</p>
              </div>
            )}
            {studentInfo.section && (
              <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 border border-white/50 dark:border-gray-600/50">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Section</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{studentInfo.section}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadSuccess && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-green-800 dark:text-green-300 font-medium">Schedule successfully extracted from registration form!</p>
        </div>
      )}

      {scheduleData.length === 0 ? (
        <EmptyState onUploadClick={() => setIsModalOpen(true)} />
      ) : (
        <>
          {/* Controls: Week Navigation + View Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousWeek}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToCurrentWeek}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                This Week
              </button>
              <button
                onClick={goToNextWeek}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                {scheduleData.length} class{scheduleData.length !== 1 ? 'es' : ''}
              </span>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                List
              </button>
            </div>
          </div>

          {/* List View */}
          {viewMode === 'list' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {days.map((day) => {
                  const daySchedules = getSchedulesForDay(day)
                  if (daySchedules.length === 0) return null
                  
                  return (
                    <div key={day}>
                      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">{day}</h3>
                      </div>
                      <div className="divide-y divide-gray-50 dark:divide-gray-700">
                        {daySchedules
                          .sort((a, b) => a.startTime.localeCompare(b.startTime))
                          .map((schedule) => {
                            const professorName = schedule.scheduleCode && classSectionProfessors[schedule.scheduleCode]
                              ? classSectionProfessors[schedule.scheduleCode]
                              : schedule.professor || 'TBA'
                            const displaySection = schedule.classSection || schedule.section
                            
                            return (
                              <div
                                key={schedule.id}
                                onClick={() => handleScheduleClick(schedule)}
                                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors flex items-start gap-4"
                              >
                                <div className="flex-shrink-0 w-20 text-center">
                                  <div className="text-sm font-semibold text-primary">{schedule.startTime}</div>
                                  <div className="text-xs text-gray-400 dark:text-gray-500">to</div>
                                  <div className="text-sm font-semibold text-primary">{schedule.endTime}</div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-900 dark:text-white">{schedule.subject}</h4>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      </svg>
                                      {schedule.room}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      {professorName}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                                    {displaySection}
                                  </span>
                                  {schedule.scheduleCode && (
                                    <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded text-xs font-mono">
                                      {schedule.scheduleCode}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Grid View - Schedule Grid */}
          {viewMode === 'grid' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Header Row */}
                <div className="grid grid-cols-[80px_repeat(6,1fr)] border-b border-gray-200 dark:border-gray-700">
                  <div className="p-3 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700">
                    Time
                  </div>
                  {days.map((day) => (
                    <div
                      key={day}
                      className="p-3 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Time Slots Grid */}
                <div className="grid grid-cols-[80px_repeat(6,1fr)]">
                  {/* Time Column */}
                  <div className="border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    {timeSlots.map((time) => (
                      <div
                        key={time}
                        className="h-[50px] px-2 flex items-start pt-1 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-600 font-medium"
                      >
                        {time}
                      </div>
                    ))}
                  </div>

                  {/* Day Columns */}
                  {days.map((day) => (
                    <div key={day} className="relative border-r border-gray-200 dark:border-gray-700 last:border-r-0 min-w-0">
                      {/* Time slot backgrounds */}
                      {timeSlots.map((time) => (
                        <div
                          key={`${day}-${time}`}
                          className="h-[50px] border-b border-gray-100 dark:border-gray-700"
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
                            classSectionProfessors={classSectionProfessors}
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
          )}
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
        classSectionProfessors={classSectionProfessors}
        isIrregular={isIrregular}
        onUpdateClassSection={isIrregular ? handleUpdateClassSection : null}
        canToggleRoom={canToggleRoom}
        roomsMap={roomsMap}
        onToggleRoomStatus={updateRoomStatus}
        userId={user?.uid}
      />

      {/* Error Modal */}
      {errorModal.isOpen && (
        <ModalOverlay onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header with error icon */}
            <div className="bg-red-500 px-6 py-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">{errorModal.title}</h3>
            </div>
            
            {/* Content */}
            <div className="px-6 py-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-800 dark:text-gray-100 font-medium">{errorModal.message}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{errorModal.details}</p>
                </div>
              </div>
              
              {/* Info box */}
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-amber-800 dark:text-amber-300 text-sm">
                    Only registration forms from the current school year are accepted to ensure your schedule is up to date.
                  </p>
                </div>
              </div>
              
              {/* Button */}
              <button
                onClick={() => setErrorModal({ isOpen: false, title: '', message: '', details: '' })}
                className="w-full px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Different Form
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
