/**
 * Room Service
 * 
 * Handles room status updates for real-time room availability.
 * Used by Schedule page to allow faculty/class reps to toggle room status.
 * 
 * Room vacancy is now TIME-BASED - when marking a room vacant, it's only vacant
 * during the schedule's time slot (e.g., 9:00-10:30), then auto-reverts to occupied.
 */
import { db } from '../config/firebase'
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, addDoc, arrayUnion, arrayRemove } from 'firebase/firestore'

/**
 * Helper to get current day name
 */
const getCurrentDay = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[new Date().getDay()]
}

/**
 * Helper to convert time string to minutes for comparison
 * @param {string} timeStr - Time in format "HH:MM" or "H:MM"
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
 * Check if a vacancy period is currently active
 * @param {object} vacancy - Vacancy object with day, startTime, endTime
 * @returns {boolean} - True if the vacancy is currently active
 */
export const isVacancyActive = (vacancy) => {
  if (!vacancy || !vacancy.day || !vacancy.startTime || !vacancy.endTime) return false
  
  const currentDay = getCurrentDay()
  if (vacancy.day !== currentDay) return false
  
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = timeToMinutes(vacancy.startTime)
  const endMinutes = timeToMinutes(vacancy.endTime)
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/**
 * Check if a room is currently vacant based on its vacancy periods
 * @param {object} room - Room document with vacancyPeriods array
 * @returns {boolean} - True if room is currently vacant (not occupied)
 */
export const isRoomCurrentlyVacant = (room) => {
  if (!room) return false
  
  // If room has no vacancy periods, it's occupied (default)
  if (!room.vacancyPeriods || !Array.isArray(room.vacancyPeriods) || room.vacancyPeriods.length === 0) {
    return false
  }
  
  // Check if any vacancy period is currently active
  return room.vacancyPeriods.some(vacancy => isVacancyActive(vacancy))
}

/**
 * Find a room by name and toggle vacancy for a specific time slot
 * Only updates existing rooms - does NOT create new rooms
 * Handles combined room names like "RM.9/CL3" - updates ALL rooms in the combo
 * @param {string} roomName - The room name (e.g., "CL3", "A-201", "RM. 9", "RM.9/CL3")
 * @param {boolean} setVacant - True to add vacancy period, false to remove
 * @param {string} userId - ID of user making the change
 * @param {object} schedule - Schedule object with day, startTime, endTime
 * @returns {Promise<boolean>} - Success status
 */
export const updateRoomStatus = async (roomName, setVacant, userId, schedule = null) => {
  try {
    // Normalize room name - remove extra spaces, uppercase
    const normalizedInput = roomName.toUpperCase().trim().replace(/\s+/g, '')
    
    // Handle combined room names like "RM.9/CL3" - split into array
    const roomNames = normalizedInput.includes('/') 
      ? normalizedInput.split('/').map(r => r.trim()).filter(r => r)
      : [normalizedInput]
    
    console.log(`Updating room(s): ${roomNames.join(', ')}`)
    
    // Query for all rooms
    const roomsRef = collection(db, 'rooms')
    const snapshot = await getDocs(roomsRef)
    
    // Build a map of all rooms by normalized name
    const roomsMap = {}
    snapshot.forEach((docSnap) => {
      const data = docSnap.data()
      const storedName = data.name?.toUpperCase().trim().replace(/\s+/g, '') || ''
      roomsMap[storedName] = { id: docSnap.id, ...data }
    })
    
    console.log('Available rooms in database:', Object.keys(roomsMap))
    console.log('Looking for rooms:', roomNames)
    
    // Create vacancy period from schedule
    const vacancyPeriod = schedule ? {
      day: schedule.day,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      scheduleId: schedule.id || null,
      subject: schedule.subject || null,
      section: schedule.section || null,
      markedBy: userId,
      markedAt: new Date().toISOString()
    } : null
    
    // Find which rooms exist and which don't
    const foundRooms = []
    const missingRooms = []
    
    for (const name of roomNames) {
      // Try exact match first
      if (roomsMap[name]) {
        foundRooms.push({ name, ...roomsMap[name] })
      } else {
        // Try matching with flexible normalization (handle "RM. 9" vs "RM.9")
        // Remove dots, spaces, and compare
        const flexName = name.replace(/[.\s]/g, '')
        let found = false
        
        for (const [storedNormalized, roomData] of Object.entries(roomsMap)) {
          const flexStored = storedNormalized.replace(/[.\s]/g, '')
          if (flexName === flexStored) {
            foundRooms.push({ name: storedNormalized, ...roomData })
            found = true
            break
          }
        }
        
        if (!found) {
          missingRooms.push(name)
        }
      }
    }
    
    // If no rooms found at all, throw error
    if (foundRooms.length === 0) {
      console.error(`No rooms found: ${roomNames.join(', ')}`)
      throw new Error(`Room(s) "${roomNames.join(', ')}" not found in the system. Please contact an admin to add these rooms.`)
    }
    
    // Log if some rooms are missing
    if (missingRooms.length > 0) {
      console.warn(`Some rooms not found: ${missingRooms.join(', ')} - only updating found rooms`)
    }
    
    // Update all found rooms
    const updatePromises = foundRooms.map(async (roomDoc) => {
      const updateData = {
        statusUpdatedAt: new Date().toISOString(),
        statusUpdatedBy: userId
      }
      
      if (vacancyPeriod) {
        if (setVacant) {
          // Add vacancy period - first check if this exact period exists
          const existingPeriods = roomDoc.vacancyPeriods || []
          const alreadyExists = existingPeriods.some(p => 
            p.day === vacancyPeriod.day && 
            p.startTime === vacancyPeriod.startTime && 
            p.endTime === vacancyPeriod.endTime
          )
          
          if (!alreadyExists) {
            updateData.vacancyPeriods = [...existingPeriods, vacancyPeriod]
          }
        } else {
          // Remove vacancy period for this time slot
          const existingPeriods = roomDoc.vacancyPeriods || []
          updateData.vacancyPeriods = existingPeriods.filter(p => 
            !(p.day === vacancyPeriod.day && 
              p.startTime === vacancyPeriod.startTime && 
              p.endTime === vacancyPeriod.endTime)
          )
        }
      }
      
      await updateDoc(doc(db, 'rooms', roomDoc.id), updateData)
      console.log(`Updated room: ${roomDoc.name}`)
    })
    
    await Promise.all(updatePromises)
    console.log(`Successfully updated ${foundRooms.length} room(s)`)
    
    return true
  } catch (error) {
    console.error('Error updating room status:', error)
    throw error
  }
}

/**
 * Check if a specific schedule's time slot is marked as vacant for a room
 * @param {object} room - Room document
 * @param {object} schedule - Schedule with day, startTime, endTime
 * @returns {boolean} - True if this schedule's slot is marked vacant
 */
export const isScheduleSlotVacant = (room, schedule) => {
  if (!room || !schedule || !room.vacancyPeriods) return false
  
  return room.vacancyPeriods.some(p => 
    p.day === schedule.day && 
    p.startTime === schedule.startTime && 
    p.endTime === schedule.endTime
  )
}

/**
 * Get room status by name
 * @param {string} roomName - The room name
 * @returns {Promise<{occupied: boolean, id: string} | null>}
 */
export const getRoomStatus = async (roomName) => {
  try {
    const normalizedName = roomName.toUpperCase().trim()
    const roomsRef = collection(db, 'rooms')
    const snapshot = await getDocs(roomsRef)
    
    let found = null
    snapshot.forEach((docSnap) => {
      const data = docSnap.data()
      if (data.name && data.name.toUpperCase().trim() === normalizedName) {
        found = { id: docSnap.id, ...data }
      }
    })
    
    return found
  } catch (error) {
    console.error('Error getting room status:', error)
    return null
  }
}

/**
 * Subscribe to all rooms for real-time updates
 * @param {function} callback - Function to call with rooms array
 * @returns {function} Unsubscribe function
 */
export const subscribeToRooms = (callback) => {
  const roomsRef = collection(db, 'rooms')
  
  return onSnapshot(roomsRef, (snapshot) => {
    const rooms = []
    snapshot.forEach((docSnap) => {
      rooms.push({ id: docSnap.id, ...docSnap.data() })
    })
    callback(rooms)
  }, (error) => {
    console.error('Error subscribing to rooms:', error)
    callback([])
  })
}
