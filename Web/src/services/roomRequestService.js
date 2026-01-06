/**
 * Room Request Service
 * 
 * Handles room addition requests when students upload reg forms
 * with rooms that don't exist in the system.
 * 
 * Workflow:
 * - When parsing reg form, check if rooms exist in system
 * - If room doesn't exist, create a request for admin to add it
 * - Admins can approve (create room) or reject requests
 */

import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'

const ROOM_REQUESTS_COLLECTION = 'room_requests'

/**
 * Request status constants
 */
export const ROOM_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

/**
 * Check if a room exists in the system
 * @param {string} roomName - Room name to check
 * @returns {Promise<boolean>} True if room exists
 */
export async function checkRoomExists(roomName) {
  if (!roomName || roomName === 'TBA' || roomName === 'N/A') return true // Skip TBA rooms
  
  const roomsRef = collection(db, 'rooms')
  const snapshot = await getDocs(roomsRef)
  
  const normalizedInput = roomName.toUpperCase().trim().replace(/\s+/g, '')
  
  // Check if room exists with flexible matching
  let found = false
  snapshot.forEach((docSnap) => {
    const data = docSnap.data()
    const storedName = data.name?.toUpperCase().trim().replace(/\s+/g, '') || ''
    const flexInput = normalizedInput.replace(/[.\s]/g, '')
    const flexStored = storedName.replace(/[.\s]/g, '')
    
    if (normalizedInput === storedName || flexInput === flexStored) {
      found = true
    }
  })
  
  return found
}

/**
 * Check multiple rooms and return list of missing ones
 * @param {string[]} roomNames - Array of room names to check
 * @returns {Promise<string[]>} Array of room names that don't exist
 */
export async function findMissingRooms(roomNames) {
  if (!roomNames || roomNames.length === 0) return []
  
  const roomsRef = collection(db, 'rooms')
  const snapshot = await getDocs(roomsRef)
  
  // Build lookup of existing rooms
  const existingRooms = new Set()
  snapshot.forEach((docSnap) => {
    const data = docSnap.data()
    const name = data.name?.toUpperCase().trim().replace(/\s+/g, '') || ''
    const flexName = name.replace(/[.\s]/g, '')
    existingRooms.add(name)
    existingRooms.add(flexName)
  })
  
  // Find missing rooms
  const missingRooms = []
  const uniqueRooms = [...new Set(roomNames)] // Remove duplicates
  
  for (const room of uniqueRooms) {
    if (!room || room === 'TBA' || room === 'N/A') continue
    
    const normalizedInput = room.toUpperCase().trim().replace(/\s+/g, '')
    const flexInput = normalizedInput.replace(/[.\s]/g, '')
    
    if (!existingRooms.has(normalizedInput) && !existingRooms.has(flexInput)) {
      missingRooms.push(room)
    }
  }
  
  return missingRooms
}

/**
 * Check if a room request already exists for this room
 * @param {string} roomName - Room name to check
 * @returns {Promise<boolean>} True if pending request exists
 */
export async function hasPendingRoomRequest(roomName) {
  const normalizedName = roomName.toUpperCase().trim().replace(/\s+/g, '')
  
  const q = query(
    collection(db, ROOM_REQUESTS_COLLECTION),
    where('roomNameNormalized', '==', normalizedName),
    where('status', '==', ROOM_REQUEST_STATUS.PENDING)
  )
  
  const snapshot = await getDocs(q)
  return !snapshot.empty
}

/**
 * Submit a room addition request
 * @param {Object} requestData - Request data
 * @param {string} requestData.roomName - Room name from reg form
 * @param {string} requestData.userId - User's UID who submitted
 * @param {string} requestData.userName - User's name
 * @param {string} requestData.userEmail - User's email
 * @param {string} requestData.source - Source of request (e.g., 'reg_form')
 * @returns {Promise<string>} Request document ID
 */
export async function submitRoomRequest(requestData) {
  const { roomName, userId, userName, userEmail, source = 'reg_form' } = requestData
  
  const normalizedName = roomName.toUpperCase().trim().replace(/\s+/g, '')
  
  // Check if request already exists
  const hasExisting = await hasPendingRoomRequest(roomName)
  if (hasExisting) {
    console.log(`Room request already exists for: ${roomName}`)
    return null // Don't create duplicate
  }
  
  // Check if room actually exists (race condition check)
  const exists = await checkRoomExists(roomName)
  if (exists) {
    console.log(`Room already exists: ${roomName}`)
    return null
  }
  
  // Suggest building and floor based on room name pattern
  const { suggestedBuilding, suggestedFloor } = suggestRoomLocation(roomName)
  
  const requestDoc = {
    roomName: roomName,
    roomNameNormalized: normalizedName,
    suggestedBuilding,
    suggestedFloor,
    requestedBy: userId,
    requestedByName: userName,
    requestedByEmail: userEmail,
    source,
    status: ROOM_REQUEST_STATUS.PENDING,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
  
  const docRef = await addDoc(collection(db, ROOM_REQUESTS_COLLECTION), requestDoc)
  console.log(`Created room request for: ${roomName}`)
  return docRef.id
}

/**
 * Suggest building and floor based on room name pattern
 * @param {string} roomName - Room name
 * @returns {Object} { suggestedBuilding, suggestedFloor }
 */
function suggestRoomLocation(roomName) {
  const normalized = roomName.toUpperCase().trim()
  
  // Computer Labs (CL1-CL8) -> Old Building
  if (/^CL\d+$/i.test(normalized)) {
    return { suggestedBuilding: 'old', suggestedFloor: 'Computer Labs' }
  }
  
  // Regular Rooms (RM.1-RM.9) -> Old Building
  if (/^RM\.?\d+$/i.test(normalized)) {
    return { suggestedBuilding: 'old', suggestedFloor: 'Regular Rooms' }
  }
  
  // New Building rooms (A-201, A-301, etc.)
  const newBuildingMatch = normalized.match(/^A-?(\d)(\d{2})$/)
  if (newBuildingMatch) {
    const floor = parseInt(newBuildingMatch[1])
    const floorNames = { 2: '2nd Floor', 3: '3rd Floor', 4: '4th Floor', 5: '5th Floor' }
    return { suggestedBuilding: 'new', suggestedFloor: floorNames[floor] || `${floor}th Floor` }
  }
  
  // Default - unknown location
  return { suggestedBuilding: '', suggestedFloor: '' }
}

/**
 * Get all pending room requests (for admin view)
 * @returns {Promise<Array>} Array of pending requests
 */
export async function getPendingRoomRequests() {
  const q = query(
    collection(db, ROOM_REQUESTS_COLLECTION),
    where('status', '==', ROOM_REQUEST_STATUS.PENDING),
    orderBy('createdAt', 'desc')
  )
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date()
  }))
}

/**
 * Get all room requests (for admin view)
 * @returns {Promise<Array>} Array of all requests
 */
export async function getAllRoomRequests() {
  const q = query(
    collection(db, ROOM_REQUESTS_COLLECTION),
    orderBy('createdAt', 'desc')
  )
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date()
  }))
}

/**
 * Approve a room request - creates the room in the system
 * @param {string} requestId - Request document ID
 * @param {Object} roomDetails - Room details to create
 * @param {string} roomDetails.building - Building ID
 * @param {string} roomDetails.floor - Floor name
 * @param {string} adminId - Admin user ID
 * @returns {Promise<void>}
 */
export async function approveRoomRequest(requestId, roomDetails, adminId) {
  const requestRef = doc(db, ROOM_REQUESTS_COLLECTION, requestId)
  const requestSnap = await getDoc(requestRef)
  
  if (!requestSnap.exists()) {
    throw new Error('Request not found')
  }
  
  const request = requestSnap.data()
  
  // Create the room
  const roomsRef = collection(db, 'rooms')
  await addDoc(roomsRef, {
    name: request.roomName,
    building: roomDetails.building || request.suggestedBuilding || 'old',
    floor: roomDetails.floor || request.suggestedFloor || 'General',
    occupied: false,
    occupancyPeriods: [],
    vacancyPeriods: [],
    createdAt: serverTimestamp(),
    createdBy: adminId,
    createdFromRequest: requestId
  })
  
  // Update request status
  await updateDoc(requestRef, {
    status: ROOM_REQUEST_STATUS.APPROVED,
    approvedBy: adminId,
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    roomBuilding: roomDetails.building || request.suggestedBuilding,
    roomFloor: roomDetails.floor || request.suggestedFloor
  })
}

/**
 * Reject a room request
 * @param {string} requestId - Request document ID
 * @param {string} reason - Rejection reason
 * @param {string} adminId - Admin user ID
 * @returns {Promise<void>}
 */
export async function rejectRoomRequest(requestId, reason, adminId) {
  const requestRef = doc(db, ROOM_REQUESTS_COLLECTION, requestId)
  
  await updateDoc(requestRef, {
    status: ROOM_REQUEST_STATUS.REJECTED,
    rejectedBy: adminId,
    rejectedAt: serverTimestamp(),
    rejectionReason: reason,
    updatedAt: serverTimestamp()
  })
}

/**
 * Delete a room request
 * @param {string} requestId - Request document ID
 * @returns {Promise<void>}
 */
export async function deleteRoomRequest(requestId) {
  await deleteDoc(doc(db, ROOM_REQUESTS_COLLECTION, requestId))
}

/**
 * Get count of pending room requests
 * @returns {Promise<number>} Count of pending requests
 */
export async function getPendingRoomRequestCount() {
  const q = query(
    collection(db, ROOM_REQUESTS_COLLECTION),
    where('status', '==', ROOM_REQUEST_STATUS.PENDING)
  )
  
  const snapshot = await getDocs(q)
  return snapshot.size
}
