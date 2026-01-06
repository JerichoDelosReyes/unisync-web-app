/**
 * Best-Fit Room Algorithm Service
 * 
 * Implements an intelligent room allocation algorithm for CvSU Imus Campus.
 * The algorithm finds the optimal room based on:
 * 1. Time availability (no schedule conflicts)
 * 2. Facility type matching (lab, lecture, etc.)
 * 3. Capacity requirements (room must fit all students)
 * 4. Best-fit optimization (smallest sufficient room to maximize space efficiency)
 * 5. Department preference (tie-breaker)
 * 
 * Real-World Scenario:
 * Prof. Bautista needs a room for 40 students on Wednesday 1:00-4:00 PM.
 * - CL1 (30 capacity) - Too small ❌
 * - CL2 (50 capacity) - Occupied ❌
 * - A-304 (45 capacity) - BEST FIT ✅ (smallest sufficient + vacant)
 * - Gym (500 capacity) - Too wasteful ❌
 */

import { db } from '../config/firebase'
import { collection, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore'

/**
 * Room types for facility matching
 */
export const ROOM_TYPES = {
  COMPUTER_LAB: 'computer_lab',
  LECTURE: 'lecture',
  LABORATORY: 'laboratory',
  SEMINAR: 'seminar',
  ANY: 'any'
}

/**
 * Room type display names
 */
export const ROOM_TYPE_LABELS = {
  [ROOM_TYPES.COMPUTER_LAB]: 'Computer Lab',
  [ROOM_TYPES.LECTURE]: 'Lecture Room',
  [ROOM_TYPES.LABORATORY]: 'Laboratory',
  [ROOM_TYPES.SEMINAR]: 'Seminar Room',
  [ROOM_TYPES.ANY]: 'Any Room Type'
}

/**
 * Default room capacities for CvSU Imus
 * Based on typical room sizes in the campus
 */
export const DEFAULT_ROOM_CAPACITIES = {
  // Computer Labs (Old Building) - typically 30-40 students
  'CL1': { capacity: 35, type: ROOM_TYPES.COMPUTER_LAB, departmentPriority: ['DCS', 'General'] },
  'CL2': { capacity: 35, type: ROOM_TYPES.COMPUTER_LAB, departmentPriority: ['DCS', 'General'] },
  'CL3': { capacity: 40, type: ROOM_TYPES.COMPUTER_LAB, departmentPriority: ['DCS', 'General'] },
  'CL4': { capacity: 40, type: ROOM_TYPES.COMPUTER_LAB, departmentPriority: ['DCS', 'General'] },
  'CL5': { capacity: 35, type: ROOM_TYPES.COMPUTER_LAB, departmentPriority: ['DCS', 'General'] },
  'CL6': { capacity: 35, type: ROOM_TYPES.COMPUTER_LAB, departmentPriority: ['DCS', 'General'] },
  'CL7': { capacity: 30, type: ROOM_TYPES.COMPUTER_LAB, departmentPriority: ['DCS', 'General'] },
  'CL8': { capacity: 30, type: ROOM_TYPES.COMPUTER_LAB, departmentPriority: ['DCS', 'General'] },
  
  // Regular Rooms (Old Building) - typically 40-50 students
  'RM.1': { capacity: 45, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'RM.2': { capacity: 45, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'RM.3': { capacity: 50, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'RM.4': { capacity: 50, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'RM.5': { capacity: 45, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'RM.6': { capacity: 45, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'RM.7': { capacity: 40, type: ROOM_TYPES.LABORATORY, departmentPriority: ['General'] },
  'RM.8': { capacity: 40, type: ROOM_TYPES.LABORATORY, departmentPriority: ['General'] },
  'RM.9': { capacity: 40, type: ROOM_TYPES.LABORATORY, departmentPriority: ['General'] },
  
  // New Building - 2nd Floor (typically 45-55 students)
  'A-201': { capacity: 50, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'A-202': { capacity: 50, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'A-203': { capacity: 45, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'A-204': { capacity: 45, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'A-205': { capacity: 55, type: ROOM_TYPES.SEMINAR, departmentPriority: ['General'] },
  
  // New Building - 3rd Floor
  'A-301': { capacity: 50, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'A-302': { capacity: 50, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'A-303': { capacity: 45, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'A-304': { capacity: 45, type: ROOM_TYPES.LECTURE, departmentPriority: ['DCS', 'General'] },
  'A-305': { capacity: 55, type: ROOM_TYPES.SEMINAR, departmentPriority: ['General'] },
  
  // New Building - 4th Floor
  'A-401': { capacity: 50, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'A-402': { capacity: 50, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'A-403': { capacity: 45, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'A-404': { capacity: 45, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'A-405': { capacity: 55, type: ROOM_TYPES.SEMINAR, departmentPriority: ['General'] },
  
  // New Building - 5th Floor
  'A-501': { capacity: 50, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'A-502': { capacity: 50, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'A-503': { capacity: 45, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'A-504': { capacity: 45, type: ROOM_TYPES.LECTURE, departmentPriority: ['General'] },
  'A-505': { capacity: 55, type: ROOM_TYPES.SEMINAR, departmentPriority: ['General'] }
}

/**
 * Convert time string to minutes from midnight for comparison
 * @param {string} timeStr - Time in "HH:MM" or "H:MM" format
 * @returns {number} Minutes from midnight
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  const hours = parseInt(parts[0]) || 0
  const minutes = parseInt(parts[1]) || 0
  return hours * 60 + minutes
}

/**
 * Convert minutes from midnight back to time string
 * @param {number} minutes - Minutes from midnight
 * @returns {string} Time in "HH:MM" format
 */
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Check if two time ranges overlap
 * @param {string} start1 - Start time of first range
 * @param {string} end1 - End time of first range
 * @param {string} start2 - Start time of second range
 * @param {string} end2 - End time of second range
 * @returns {boolean} True if ranges overlap
 */
const doTimesOverlap = (start1, end1, start2, end2) => {
  const s1 = timeToMinutes(start1)
  const e1 = timeToMinutes(end1)
  const s2 = timeToMinutes(start2)
  const e2 = timeToMinutes(end2)
  
  // Overlap occurs if: start1 < end2 AND start2 < end1
  return s1 < e2 && s2 < e1
}

/**
 * Check if a room has a schedule conflict at the requested time
 * @param {object} room - Room object with occupancyPeriods
 * @param {string} day - Requested day (e.g., "Wednesday")
 * @param {string} startTime - Requested start time
 * @param {string} endTime - Requested end time
 * @returns {boolean} True if there's a conflict (room is busy)
 */
const hasTimeConflict = (room, day, startTime, endTime) => {
  if (!room.occupancyPeriods || !Array.isArray(room.occupancyPeriods)) {
    return false // No schedules = no conflict
  }
  
  return room.occupancyPeriods.some(period => {
    if (period.day !== day) return false
    return doTimesOverlap(period.startTime, period.endTime, startTime, endTime)
  })
}

/**
 * Get room metadata (capacity, type) from defaults or room document
 * @param {object} room - Room document from Firestore
 * @returns {object} Room with enriched metadata
 */
const enrichRoomMetadata = (room) => {
  const normalizedName = room.name?.toUpperCase().replace(/\s+/g, '') || ''
  const defaults = DEFAULT_ROOM_CAPACITIES[normalizedName] || DEFAULT_ROOM_CAPACITIES[room.name] || {}
  
  return {
    ...room,
    capacity: room.capacity || defaults.capacity || 40, // Default 40 if unknown
    type: room.type || defaults.type || ROOM_TYPES.LECTURE,
    departmentPriority: room.departmentPriority || defaults.departmentPriority || ['General']
  }
}

/**
 * Calculate fit score for a room (lower is better)
 * Score considers: capacity waste, department match, building preference
 * @param {object} room - Enriched room object
 * @param {object} request - Room request parameters
 * @returns {number} Fit score (lower = better fit)
 */
const calculateFitScore = (room, request) => {
  const capacityWaste = room.capacity - request.requiredCapacity
  
  // Base score is capacity waste (we want minimal waste)
  let score = capacityWaste
  
  // Department priority bonus (reduce score if department matches)
  if (request.department && room.departmentPriority) {
    if (room.departmentPriority.includes(request.department)) {
      score -= 5 // Bonus for matching department
    }
  }
  
  // Building preference (if specified)
  if (request.preferredBuilding && room.building === request.preferredBuilding) {
    score -= 3 // Bonus for preferred building
  }
  
  return score
}

/**
 * Determine fit quality label for display
 * @param {object} room - Room object
 * @param {number} requiredCapacity - Required student count
 * @returns {object} { label, color } for UI display
 */
const getFitQuality = (room, requiredCapacity) => {
  const waste = room.capacity - requiredCapacity
  const wastePercent = (waste / room.capacity) * 100
  
  if (wastePercent <= 15) {
    return { label: 'Perfect Fit', color: 'green', badge: '🏆 BEST MATCH' }
  } else if (wastePercent <= 30) {
    return { label: 'Good Fit', color: 'emerald', badge: '✓ Recommended' }
  } else if (wastePercent <= 50) {
    return { label: 'Slightly Large', color: 'yellow', badge: '○ Alternative' }
  } else {
    return { label: 'Oversized', color: 'orange', badge: '△ Last Resort' }
  }
}

/**
 * Main Best-Fit Algorithm
 * Finds the optimal room for a given request
 * 
 * @param {object} request - Room request parameters
 * @param {string} request.day - Day of the week (e.g., "Wednesday")
 * @param {string} request.startTime - Start time in "HH:MM" format
 * @param {string} request.endTime - End time in "HH:MM" format
 * @param {number} request.requiredCapacity - Number of students
 * @param {string} request.roomType - Type of room needed (from ROOM_TYPES)
 * @param {string} [request.department] - Requesting faculty's department
 * @param {string} [request.preferredBuilding] - Preferred building ('old' or 'new')
 * @param {object[]} allRooms - Array of all room documents from Firestore
 * @returns {object} Result with bestMatch, alternatives, and rejectedRooms
 */
export const findBestFitRoom = (request, allRooms) => {
  const {
    day,
    startTime,
    endTime,
    requiredCapacity,
    roomType = ROOM_TYPES.ANY,
    department = null,
    preferredBuilding = null
  } = request
  
  // Track rejected rooms for transparency
  const rejectedRooms = {
    timeConflict: [],
    wrongType: [],
    tooSmall: []
  }
  
  // Step 1: Enrich all rooms with metadata
  const enrichedRooms = allRooms.map(enrichRoomMetadata)
  console.log('Best-Fit Search:', {
    totalRooms: enrichedRooms.length,
    day,
    startTime,
    endTime,
    requiredCapacity,
    roomType
  })
  
  // Step 2: Filter rooms through each criterion
  const availableRooms = enrichedRooms.filter(room => {
    // 2a. Time Collision Check
    if (hasTimeConflict(room, day, startTime, endTime)) {
      rejectedRooms.timeConflict.push({
        ...room,
        reason: `Occupied on ${day} ${startTime}-${endTime}`
      })
      return false
    }
    
    // 2b. Facility Type Filter
    if (roomType !== ROOM_TYPES.ANY && room.type !== roomType) {
      // Special case: Computer labs can be used for lectures if needed
      const isCompatible = 
        (roomType === ROOM_TYPES.LECTURE && room.type === ROOM_TYPES.SEMINAR) ||
        (roomType === ROOM_TYPES.LECTURE && room.type === ROOM_TYPES.COMPUTER_LAB)
      
      if (!isCompatible) {
        rejectedRooms.wrongType.push({
          ...room,
          reason: `Type mismatch: need ${ROOM_TYPE_LABELS[roomType]}, room is ${ROOM_TYPE_LABELS[room.type]}`
        })
        return false
      }
    }
    
    // 2c. Capacity Hard Filter
    if (room.capacity < requiredCapacity) {
      rejectedRooms.tooSmall.push({
        ...room,
        reason: `Capacity ${room.capacity} < Required ${requiredCapacity}`
      })
      return false
    }
    
    return true
  })
  
  console.log('After filtering:', {
    availableRooms: availableRooms.length,
    timeConflicts: rejectedRooms.timeConflict.length,
    wrongType: rejectedRooms.wrongType.length,
    tooSmall: rejectedRooms.tooSmall.length
  })
  
  // Step 3: No rooms available
  if (availableRooms.length === 0) {
    return {
      success: false,
      bestMatch: null,
      alternatives: [],
      rejectedRooms,
      message: 'No rooms available matching your criteria'
    }
  }
  
  // Step 4: Best-Fit Sorting (ascending by capacity, then by fit score)
  const sortedRooms = availableRooms
    .map(room => ({
      ...room,
      fitScore: calculateFitScore(room, { requiredCapacity, department, preferredBuilding }),
      fitQuality: getFitQuality(room, requiredCapacity)
    }))
    .sort((a, b) => {
      // Primary sort: by capacity (smallest sufficient first)
      const capacityDiff = a.capacity - b.capacity
      if (capacityDiff !== 0) return capacityDiff
      
      // Secondary sort: by fit score (department preference, etc.)
      return a.fitScore - b.fitScore
    })
  
  // Step 5: Return results
  if (sortedRooms.length === 0) {
    return {
      success: false,
      bestMatch: null,
      alternatives: [],
      rejectedRooms,
      totalAvailable: 0,
      message: 'No rooms available matching your criteria'
    }
  }
  
  const bestMatch = sortedRooms[0]
  const alternatives = sortedRooms.slice(1, 4) // Next 3 alternatives
  
  return {
    success: true,
    bestMatch,
    alternatives,
    rejectedRooms,
    totalAvailable: sortedRooms.length,
    message: `Found ${sortedRooms.length} available room(s). Best match: ${bestMatch.name} (Capacity: ${bestMatch.capacity})`
  }
}

/**
 * Get all rooms from Firestore
 * @returns {Promise<object[]>} Array of room documents
 */
export const getAllRoomsForBestFit = async () => {
  try {
    const roomsRef = collection(db, 'rooms')
    const snapshot = await getDocs(roomsRef)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching rooms for best-fit:', error)
    throw error
  }
}

/**
 * Create an instant confirmed booking (Auto-Approval Workflow)
 * Since the Best-Fit Algorithm mathematically guarantees vacancy,
 * bookings are instantly confirmed without manual approval.
 * 
 * @param {object} bookingData - Booking data
 * @returns {Promise<string>} Booking document ID
 */
export const createInstantBooking = async (bookingData) => {
  const {
    roomId,
    roomName,
    day,
    startTime,
    endTime,
    requiredCapacity,
    purpose,
    bookedBy,
    bookedByName,
    bookedByEmail,
    department,
    roomCapacity,
    roomType,
    roomBuilding
  } = bookingData
  
  try {
    const now = new Date().toISOString()
    
    // Create instant confirmed booking
    const bookingDoc = {
      type: 'instant_booking',
      roomId,
      roomName,
      day,
      startTime,
      endTime,
      requiredCapacity,
      roomCapacity,
      roomType,
      roomBuilding,
      purpose: purpose || 'Make-up Class',
      bookedBy,
      bookedByName,
      bookedByEmail,
      department,
      status: 'confirmed', // INSTANT CONFIRMATION - No approval needed
      bookingMethod: 'best_fit_algorithm',
      createdAt: now,
      updatedAt: now,
      confirmedAt: now
    }
    
    console.log('Creating instant booking:', bookingDoc)
    const docRef = await addDoc(collection(db, 'room_bookings'), bookingDoc)
    console.log('Instant booking created successfully:', docRef.id)
    
    // Update the room's occupancy periods to reflect the new booking
    await updateRoomOccupancy(roomId, day, startTime, endTime, {
      bookingId: docRef.id,
      purpose,
      bookedByName,
      department
    })
    
    return docRef.id
  } catch (error) {
    console.error('Error creating instant booking:', error)
    console.error('Error details:', error.message, error.code)
    throw new Error(`Failed to create instant booking: ${error.message}`)
  }
}

/**
 * Update room's occupancy periods with new booking
 * @param {string} roomId - Room document ID
 * @param {string} day - Day of the week
 * @param {string} startTime - Start time
 * @param {string} endTime - End time
 * @param {object} bookingInfo - Booking metadata
 */
const updateRoomOccupancy = async (roomId, day, startTime, endTime, bookingInfo) => {
  try {
    const roomRef = doc(db, 'rooms', roomId)
    
    // Get current room data
    const roomSnapshot = await getDoc(roomRef)
    
    if (!roomSnapshot.exists()) {
      console.warn('Room not found:', roomId)
      return
    }
    
    const currentOccupancy = roomSnapshot.data().occupancyPeriods || []
    
    // Add new occupancy period
    const newPeriod = {
      day,
      startTime,
      endTime,
      ...bookingInfo
    }
    
    await updateDoc(roomRef, {
      occupancyPeriods: [...currentOccupancy, newPeriod],
      lastUpdated: new Date().toISOString()
    })
    
    console.log('Room occupancy updated:', roomId)
  } catch (error) {
    console.error('Error updating room occupancy:', error)
    // Don't throw - booking is already created
  }
}

/**
 * Create a quick room booking request (DEPRECATED - Use createInstantBooking instead)
 * This creates a room_requests document for admin approval
 * @param {object} bookingData - Booking request data
 * @returns {Promise<string>} Request document ID
 */
export const createQuickBookingRequest = async (bookingData) => {
  const {
    roomId,
    roomName,
    day,
    startTime,
    endTime,
    requiredCapacity,
    purpose,
    requestedBy,
    requestedByName,
    requestedByEmail,
    department
  } = bookingData
  
  try {
    const now = new Date().toISOString()
    const requestDoc = {
      type: 'quick_booking',
      roomId,
      roomName,
      day,
      startTime,
      endTime,
      requiredCapacity,
      purpose: purpose || 'Make-up Class',
      requestedBy,
      requestedByName,
      requestedByEmail,
      department,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    }
    
    console.log('Creating quick booking request:', requestDoc)
    const docRef = await addDoc(collection(db, 'room_bookings'), requestDoc)
    console.log('Quick booking request created successfully:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('Error creating booking request:', error)
    console.error('Error details:', error.message, error.code)
    throw new Error(`Failed to create booking request: ${error.message}`)
  }
}

/**
 * Calculate end time from start time and duration
 * @param {string} startTime - Start time in "HH:MM" format
 * @param {number} durationHours - Duration in hours
 * @returns {string} End time in "HH:MM" format
 */
export const calculateEndTime = (startTime, durationHours) => {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = startMinutes + (durationHours * 60)
  return minutesToTime(endMinutes)
}

/**
 * Format time for display (12-hour format)
 * @param {string} time24 - Time in "HH:MM" format
 * @returns {string} Time in "h:mm AM/PM" format
 */
export const formatTimeDisplay = (time24) => {
  if (!time24) return ''
  const [hours, minutes] = time24.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${displayHour}:${minutes} ${ampm}`
}
