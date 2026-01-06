/**
 * Rooms Page
 * 
 * Shows room management with vacancy/occupied status for Old and New Buildings.
 * Includes schedule view for each room.
 * Admins can create and manage rooms.
 * 
 * Database: rooms collection - each room is a document
 * 
 * Room status is TIME-BASED:
 * - Rooms have vacancyPeriods array with time slots when marked vacant
 * - isRoomCurrentlyVacant() checks if current time falls within any vacancy period
 * - Status automatically updates based on current time
 */
import { useState, useEffect } from 'react'
import { doc, setDoc, onSnapshot, collection, getDocs, deleteDoc, addDoc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import { isRoomCurrentlyVacant } from '../services/roomService'

// Days of the week
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Building options
const BUILDING_OPTIONS = {
  old: { name: 'Old Building' },
  new: { name: 'New Building' }
}

// Default rooms to seed when collection is empty (all VACANT by default - occupied only when regform indicates a section)
const DEFAULT_ROOMS = [
  // Old Building - Computer Labs
  { name: 'CL1', building: 'old', floor: 'Computer Labs', occupied: false },
  { name: 'CL2', building: 'old', floor: 'Computer Labs', occupied: false },
  { name: 'CL3', building: 'old', floor: 'Computer Labs', occupied: false },
  { name: 'CL4', building: 'old', floor: 'Computer Labs', occupied: false },
  { name: 'CL5', building: 'old', floor: 'Computer Labs', occupied: false },
  { name: 'CL6', building: 'old', floor: 'Computer Labs', occupied: false },
  { name: 'CL7', building: 'old', floor: 'Computer Labs', occupied: false },
  { name: 'CL8', building: 'old', floor: 'Computer Labs', occupied: false },
  // Old Building - Regular Rooms
  { name: 'RM.1', building: 'old', floor: 'Regular Rooms', occupied: false },
  { name: 'RM.2', building: 'old', floor: 'Regular Rooms', occupied: false },
  { name: 'RM.3', building: 'old', floor: 'Regular Rooms', occupied: false },
  { name: 'RM.4', building: 'old', floor: 'Regular Rooms', occupied: false },
  { name: 'RM.5', building: 'old', floor: 'Regular Rooms', occupied: false },
  { name: 'RM.6', building: 'old', floor: 'Regular Rooms', occupied: false },
  { name: 'RM.7', building: 'old', floor: 'Regular Rooms', occupied: false },
  { name: 'RM.8', building: 'old', floor: 'Regular Rooms', occupied: false },
  { name: 'RM.9', building: 'old', floor: 'Regular Rooms', occupied: false },
  // New Building - 2nd Floor
  { name: 'A-201', building: 'new', floor: '2nd Floor', occupied: false },
  { name: 'A-202', building: 'new', floor: '2nd Floor', occupied: false },
  { name: 'A-203', building: 'new', floor: '2nd Floor', occupied: false },
  { name: 'A-204', building: 'new', floor: '2nd Floor', occupied: false },
  { name: 'A-205', building: 'new', floor: '2nd Floor', occupied: false },
  // New Building - 3rd Floor
  { name: 'A-301', building: 'new', floor: '3rd Floor', occupied: false },
  { name: 'A-302', building: 'new', floor: '3rd Floor', occupied: false },
  { name: 'A-303', building: 'new', floor: '3rd Floor', occupied: false },
  { name: 'A-304', building: 'new', floor: '3rd Floor', occupied: false },
  { name: 'A-305', building: 'new', floor: '3rd Floor', occupied: false },
  // New Building - 4th Floor
  { name: 'A-401', building: 'new', floor: '4th Floor', occupied: false },
  { name: 'A-402', building: 'new', floor: '4th Floor', occupied: false },
  { name: 'A-403', building: 'new', floor: '4th Floor', occupied: false },
  { name: 'A-404', building: 'new', floor: '4th Floor', occupied: false },
  { name: 'A-405', building: 'new', floor: '4th Floor', occupied: false },
  // New Building - 5th Floor
  { name: 'A-501', building: 'new', floor: '5th Floor', occupied: false },
  { name: 'A-502', building: 'new', floor: '5th Floor', occupied: false },
  { name: 'A-503', building: 'new', floor: '5th Floor', occupied: false },
  { name: 'A-504', building: 'new', floor: '5th Floor', occupied: false },
  { name: 'A-505', building: 'new', floor: '5th Floor', occupied: false },
]

// Format time for display
const formatTime = (time) => {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${displayHour}:${minutes} ${ampm}`
}

export default function Rooms() {
  const { userProfile } = useAuth()
  const [rooms, setRooms] = useState([]) // Array of room documents from Firestore
  const [roomSchedules, setRoomSchedules] = useState({})
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [activeBuilding, setActiveBuilding] = useState('old')
  const [filter, setFilter] = useState('all')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [selectedDay, setSelectedDay] = useState('Monday')
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date()) // For time-based vacancy refresh
  
  // Room management modal states
  const [showRoomManager, setShowRoomManager] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null) // Room document being edited
  const [roomForm, setRoomForm] = useState({ name: '', building: 'old', floor: '' })
  const [saving, setSaving] = useState(false)

  // Check permissions
  const canToggle = userProfile?.role && ['class_rep', 'faculty', 'admin', 'super_admin'].includes(userProfile.role)
  const canManageRooms = userProfile?.role && ['admin', 'super_admin'].includes(userProfile.role)

  // Refresh time every minute for real-time vacancy status
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    
    return () => clearInterval(timer)
  }, [])

  // Build room lookup for schedule matching
  const buildRoomLookup = () => {
    const lookup = {}
    rooms.forEach(room => {
      lookup[room.name.toUpperCase().trim()] = room.name
    })
    return lookup
  }

  // Get rooms organized by building and floor
  const getRoomsByBuilding = (buildingId) => {
    const buildingRooms = rooms.filter(r => r.building === buildingId)
    // Group by floor
    const floorMap = {}
    buildingRooms.forEach(room => {
      const floor = room.floor || 'General'
      if (!floorMap[floor]) {
        floorMap[floor] = []
      }
      floorMap[floor].push(room)
    })
    
    // Define floor order for sorting
    const floorOrder = (floorName) => {
      // Extract floor number if it exists (e.g., "1st Floor" -> 1, "2nd Floor" -> 2)
      const match = floorName.match(/(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
      // Put special floors at the end
      if (floorName === 'Computer Labs') return 100;
      if (floorName === 'Regular Rooms') return 101;
      if (floorName === 'General') return 102;
      return 99;
    }
    
    // Convert to array format and sort by floor order
    return Object.entries(floorMap)
      .map(([name, roomList]) => ({
        name,
        rooms: roomList.sort((a, b) => a.name.localeCompare(b.name))
      }))
      .sort((a, b) => floorOrder(a.name) - floorOrder(b.name))
  }

  // Reset rooms collection (super_admin only) - clears all scheduled classes from rooms
  const resetRoomsCollection = async () => {
    if (userProfile?.role !== 'super_admin') return
    
    if (!confirm('This will CLEAR all scheduled classes from rooms (all rooms will become VACANT). The rooms themselves will NOT be deleted. Continue?')) {
      return
    }
    
    setLoading(true)
    try {
      const roomsRef = collection(db, 'rooms')
      const snapshot = await getDocs(roomsRef)
      
      // Clear vacancyPeriods and occupancyPeriods from all existing rooms
      console.log('Clearing schedules from', snapshot.size, 'rooms...')
      const updatePromises = snapshot.docs.map(docSnap => 
        updateDoc(doc(db, 'rooms', docSnap.id), {
          vacancyPeriods: [],
          occupancyPeriods: [],
          lastUpdated: new Date().toISOString()
        })
      )
      await Promise.all(updatePromises)
      
      console.log('Room schedules cleared successfully')
      alert('Room schedules cleared successfully! All rooms are now VACANT. Rooms will show as occupied only when class schedules are uploaded.')
    } catch (error) {
      console.error('Error clearing room schedules:', error)
      alert('Error clearing room schedules: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Subscribe to rooms collection from Firestore
  useEffect(() => {
    if (!userProfile) return

    // Seed default rooms if collection is empty (only admin+ can seed)
    const seedDefaultRooms = async () => {
      if (!canManageRooms) return
      
      try {
        const roomsRef = collection(db, 'rooms')
        const snapshot = await getDocs(roomsRef)
        
        if (snapshot.empty) {
          console.log('Seeding default rooms...')
          const batch = []
          for (const room of DEFAULT_ROOMS) {
            batch.push(addDoc(roomsRef, {
              ...room,
              vacancyPeriods: [], // Empty array - no scheduled vacancies
              createdAt: new Date().toISOString(),
              createdBy: userProfile.uid
            }))
          }
          await Promise.all(batch)
          console.log('Default rooms seeded successfully')
        }
      } catch (error) {
        console.error('Error seeding rooms:', error)
      }
    }

    seedDefaultRooms()

    const unsubscribe = onSnapshot(
      collection(db, 'rooms'),
      (snapshot) => {
        const roomsList = []
        snapshot.forEach((doc) => {
          roomsList.push({ id: doc.id, ...doc.data() })
        })
        setRooms(roomsList)
        setLoading(false)
      },
      (error) => {
        console.error('Error fetching rooms:', error)
        setRooms([])
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [userProfile, canManageRooms])

  // Subscribe to schedules for real-time updates when students upload reg forms
  useEffect(() => {
    if (!userProfile) return

    setLoadingSchedules(true)
    
    const unsubscribeSchedules = onSnapshot(
      collection(db, 'schedules'),
      (snapshot) => {
        const schedulesByRoom = {}
        const roomLookup = buildRoomLookup()
        
        // Helper function to get ALL normalized room names for a room string
        // Returns array of room codes (handles combined rooms like "RM. 9/CL3")
        const getAllRoomCodes = (roomStr) => {
          if (!roomStr) return []
          const room = roomStr.toUpperCase().trim()
          const roomCodes = []
          
          // If it contains a slash (e.g., "RM. 9/CL3"), get ALL rooms
          if (room.includes('/')) {
            const parts = room.split('/')
            for (const part of parts) {
              const trimmed = part.trim()
              // Try exact match
              if (roomLookup[trimmed]) {
                roomCodes.push(roomLookup[trimmed])
              } else {
                // Try without spaces
                const noSpaces = trimmed.replace(/\s+/g, '')
                if (roomLookup[noSpaces]) {
                  roomCodes.push(roomLookup[noSpaces])
                } else {
                  // Try flexible match (remove dots too)
                  const flexName = trimmed.replace(/[.\s]/g, '')
                  for (const [storedName, normalizedName] of Object.entries(roomLookup)) {
                    const flexStored = storedName.replace(/[.\s]/g, '')
                    if (flexName === flexStored) {
                      roomCodes.push(normalizedName)
                      break
                    }
                  }
                }
              }
            }
          } else {
            // Single room - try various normalizations
            if (roomLookup[room]) {
              roomCodes.push(roomLookup[room])
            } else {
              const noSpaces = room.replace(/\s+/g, '')
              if (roomLookup[noSpaces]) {
                roomCodes.push(roomLookup[noSpaces])
              } else {
                roomCodes.push(room) // Return as-is
              }
            }
          }
          
          return roomCodes
        }
        
        snapshot.forEach((docSnap) => {
          const data = docSnap.data()
          const schedules = data.schedules || []
          
          schedules.forEach((schedule) => {
            // Get ALL room codes for this schedule (handles combined rooms)
            const roomCodes = getAllRoomCodes(schedule.room)
            if (roomCodes.length === 0 || (roomCodes.length === 1 && roomCodes[0] === 'TBA')) return
            
            // Add schedule to EACH room
            roomCodes.forEach(roomCode => {
              if (roomCode === 'TBA') return
              
              if (!schedulesByRoom[roomCode]) {
                schedulesByRoom[roomCode] = []
              }
              
              // Create unique key to prevent duplicates
              const scheduleKey = `${schedule.subject}-${data.section || schedule.section}-${schedule.day}-${schedule.startTime}-${schedule.endTime}`
              
              // Check if this schedule already exists
              const isDuplicate = schedulesByRoom[roomCode].some(s => 
                `${s.subject}-${s.section}-${s.day}-${s.startTime}-${s.endTime}` === scheduleKey
              )
              
              if (!isDuplicate) {
                schedulesByRoom[roomCode].push({
                  subject: schedule.subject,
                  day: schedule.day,
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                  section: data.section || schedule.section || '',
                  course: data.course || '',
                  professor: schedule.professor || '',
                  originalRoom: schedule.room // Keep original for reference
                })
              }
            })
          })
        })
        
        // Sort schedules by start time within each room
        Object.keys(schedulesByRoom).forEach(room => {
          schedulesByRoom[room].sort((a, b) => a.startTime.localeCompare(b.startTime))
        })
        
        setRoomSchedules(schedulesByRoom)
        setLoadingSchedules(false)
      },
      (error) => {
        console.error('Error fetching schedules:', error)
        setLoadingSchedules(false)
      }
    )

    return () => unsubscribeSchedules()
  }, [userProfile, rooms]) // Re-run when rooms change to update lookup

  // Toggle room status (update room document directly)
  const toggleRoomStatus = async (room, e) => {
    e.stopPropagation()
    if (!canToggle) return
    
    setUpdating(room.id)
    try {
      await updateDoc(doc(db, 'rooms', room.id), {
        occupied: !room.occupied,
        statusUpdatedAt: new Date().toISOString(),
        statusUpdatedBy: userProfile?.uid,
        statusUpdatedByName: userProfile?.displayName || userProfile?.email
      })
    } catch (error) {
      console.error('Error updating room status:', error)
    } finally {
      setUpdating(null)
    }
  }

  // Get room display name
  const getRoomName = (room) => {
    return typeof room === 'object' ? room.name : room
  }

  // Get schedules for a specific room
  const getRoomSchedule = (room) => {
    const name = getRoomName(room)
    const normalizedRoom = name.toUpperCase().trim()
    return roomSchedules[normalizedRoom] || []
  }

  // Get schedules for a specific room and day
  const getRoomScheduleForDay = (room, day) => {
    const schedules = getRoomSchedule(room)
    return schedules.filter(s => s.day === day)
  }

  // Count stats for active building (using time-based vacancy)
  const getStats = () => {
    const buildingRooms = rooms.filter(r => r.building === activeBuilding)
    const vacant = buildingRooms.filter(r => isRoomCurrentlyVacant(r)).length
    const occupied = buildingRooms.length - vacant
    return { total: buildingRooms.length, occupied, vacant }
  }

  const stats = getStats()

  // Filter rooms based on status (using time-based vacancy)
  const filterRoomsList = (roomsList) => {
    if (!roomsList) return []
    if (filter === 'all') return roomsList
    return roomsList.filter(room => {
      const isCurrentlyVacant = isRoomCurrentlyVacant(room)
      return filter === 'occupied' ? !isCurrentlyVacant : isCurrentlyVacant
    })
  }

  // Get current day
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[new Date().getDay()]
  }

  // Open room schedule modal
  const openRoomSchedule = (room) => {
    setSelectedRoom(room)
    setSelectedDay(getCurrentDay() === 'Sunday' ? 'Monday' : getCurrentDay())
  }

  // Save room (create or update)
  const saveRoom = async () => {
    if (!canManageRooms) return
    
    setSaving(true)
    try {
      const name = roomForm.name.trim().toUpperCase()
      if (!name) {
        alert('Room name is required')
        setSaving(false)
        return
      }

      const building = roomForm.building
      const floor = roomForm.floor.trim() || 'General'

      // Check for duplicate room name (except when editing the same room)
      const duplicate = rooms.find(r => 
        r.name === name && (!editingRoom || r.id !== editingRoom.id)
      )
      if (duplicate) {
        alert('A room with this name already exists')
        setSaving(false)
        return
      }

      const roomData = {
        name,
        building,
        floor,
        occupied: editingRoom?.occupied || false,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.uid
      }
      
      if (editingRoom) {
        // Update existing room
        await updateDoc(doc(db, 'rooms', editingRoom.id), roomData)
      } else {
        // Create new room
        roomData.createdAt = new Date().toISOString()
        roomData.createdBy = userProfile?.uid
        await addDoc(collection(db, 'rooms'), roomData)
      }
      
      setShowRoomManager(false)
      setEditingRoom(null)
      setRoomForm({ name: '', building: 'old', floor: '' })
    } catch (error) {
      console.error('Error saving room:', error)
      alert('Error saving room')
    } finally {
      setSaving(false)
    }
  }

  // Delete room
  const deleteRoom = async (room) => {
    if (!canManageRooms) return
    if (!confirm(`Are you sure you want to delete room ${room.name}?`)) return

    try {
      await deleteDoc(doc(db, 'rooms', room.id))
      setShowRoomManager(false)
      setEditingRoom(null)
    } catch (error) {
      console.error('Error deleting room:', error)
    }
  }

  // Open edit modal
  const openEditRoom = (room) => {
    setEditingRoom(room)
    setRoomForm({
      name: room.name,
      building: room.building,
      floor: room.floor || ''
    })
    setShowRoomManager(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  // Get floors for current building
  const currentFloors = getRoomsByBuilding(activeBuilding)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Room Status</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View room availability and schedules across buildings.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Reset Rooms Button (Super Admin only) */}
            {userProfile?.role === 'super_admin' && (
              <button
                onClick={resetRoomsCollection}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Reset Rooms</span>
                <span className="sm:hidden">Reset</span>
              </button>
            )}
            
            {/* Add Room Button (Admin only) */}
            {canManageRooms && (
              <button
                onClick={() => {
                  setEditingRoom(null)
                  setRoomForm({ 
                    name: '', 
                    building: activeBuilding, 
                    floor: '' 
                  })
                  setShowRoomManager(true)
                }}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Add Room</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-3 sm:gap-4 text-sm sm:ml-auto overflow-x-auto">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-emerald-500"></div>
              <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Vacant</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-red-500"></div>
              <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Occupied</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total Rooms</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-200 dark:border-emerald-800 p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.vacant}</p>
          <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">Vacant</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800 p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-3xl font-bold text-red-600 dark:text-red-400">{stats.occupied}</p>
          <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">Occupied</p>
        </div>
      </div>

      {/* Building Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {Object.entries(BUILDING_OPTIONS).map(([key, building]) => (
            <button
              key={key}
              onClick={() => setActiveBuilding(key)}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                activeBuilding === key
                  ? 'bg-primary text-white'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {building.name}
            </button>
          ))}
        </div>

        {/* Filter Buttons */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Filter:</span>
            {[
              { value: 'all', label: 'All Rooms' },
              { value: 'vacant', label: 'Vacant Only' },
              { value: 'occupied', label: 'Occupied Only' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  filter === option.value
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="p-6">
          {currentFloors.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Rooms Yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {canManageRooms ? 'Click "Add Room" to create rooms for this building.' : 'No rooms have been added to this building yet.'}
              </p>
            </div>
          ) : (
            currentFloors.map((floor, floorIdx) => {
              const filteredRooms = filterRoomsList(floor.rooms)
              if (filteredRooms.length === 0 && filter !== 'all') return null
              
              return (
                <div key={floorIdx} className={floorIdx > 0 ? 'mt-8' : ''}>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {floor.name}
                  </h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredRooms.map((room) => {
                      // Time-based vacancy: check if room is currently vacant based on vacancyPeriods
                      const isCurrentlyVacant = isRoomCurrentlyVacant(room)
                      const isOccupied = !isCurrentlyVacant
                      const isUpdating = updating === room.id
                      const scheduleCount = getRoomSchedule(room).length
                      const hasVacancyPeriods = room.vacancyPeriods && room.vacancyPeriods.length > 0
                      
                      return (
                        <div
                          key={room.id}
                          className={`relative rounded-xl border-2 p-4 transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-105 ${
                            isOccupied
                              ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30'
                              : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30'
                          }`}
                          onClick={() => openRoomSchedule(room)}
                        >
                          {/* Admin Edit Button */}
                        {canManageRooms && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditRoom(room)
                            }}
                            className="absolute top-1 left-1 p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded"
                            title="Edit Room"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}

                        {/* Status Indicator */}
                        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                          isOccupied ? 'bg-red-500' : 'bg-emerald-500'
                        } ${!isOccupied ? 'animate-pulse' : ''}`}></div>
                        
                        {/* Room ID */}
                        <div className="text-center">
                          <p className={`text-xl font-bold ${isOccupied ? 'text-red-700' : 'text-emerald-700'}`}>
                            {room.name}
                          </p>
                          <p className={`text-xs font-medium mt-1 ${isOccupied ? 'text-red-600' : 'text-emerald-600'}`}>
                            {isUpdating ? (
                              <span className="flex items-center justify-center gap-1">
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Updating...
                              </span>
                            ) : isOccupied ? 'OCCUPIED' : 'VACANT NOW'}
                          </p>
                          
                          {/* Show vacancy time slots */}
                          {hasVacancyPeriods && (
                            <div className="mt-1 space-y-0.5">
                              {room.vacancyPeriods.slice(0, 2).map((vacancy, idx) => (
                                <p key={idx} className="text-[9px] text-blue-600 leading-tight">
                                  {vacancy.day?.substring(0, 3)} {vacancy.startTime}-{vacancy.endTime}
                                </p>
                              ))}
                              {room.vacancyPeriods.length > 2 && (
                                <p className="text-[9px] text-blue-500">+{room.vacancyPeriods.length - 2} more</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Schedule Count Badge */}
                        {scheduleCount > 0 && (
                          <div className="absolute top-6 left-1 px-1.5 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded">
                            {scheduleCount}
                          </div>
                        )}

                        {/* View Schedule Hint */}
                        <p className="text-[10px] text-gray-400 text-center mt-2">
                          Click to view schedule
                        </p>
                      </div>
                    )
                  })}
                </div>

                {filteredRooms.length === 0 && filter !== 'all' && (
                  <p className="text-gray-400 text-sm italic">No {filter} rooms on this floor.</p>
                )}
              </div>
            )
          })
          )}
        </div>
      </div>

      {/* Instructions */}
      {canToggle && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Room Management</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Click on the toggle switch to change room status. Click anywhere else on the card to view the room's schedule.
                {canManageRooms && ' Use the Add Room button to create new rooms.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Room Schedule Modal */}
      {selectedRoom && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          style={{ 
            position: 'fixed',
            top: '-50px',
            left: 0,
            right: 0,
            bottom: '-50px',
            paddingTop: '50px',
            paddingBottom: '50px'
          }}
          onClick={() => setSelectedRoom(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Room {typeof selectedRoom === 'object' ? selectedRoom.name : selectedRoom} Schedule</h2>
                <p className="text-sm text-white/80">View class schedules for this room</p>
              </div>
              <button 
                onClick={() => setSelectedRoom(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Day Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
              {DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium transition-colors ${
                    selectedDay === day
                      ? 'bg-primary/10 dark:bg-primary/20 text-primary border-b-2 border-primary'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {day.slice(0, 3)}
                  {getRoomScheduleForDay(selectedRoom, day).length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-primary text-white text-[10px] rounded-full">
                      {getRoomScheduleForDay(selectedRoom, day).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Schedule Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingSchedules ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                </div>
              ) : getRoomScheduleForDay(selectedRoom, selectedDay).length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Classes Scheduled</h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">This room is available all day on {selectedDay}.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getRoomScheduleForDay(selectedRoom, selectedDay).map((schedule, idx) => (
                    <div 
                      key={idx}
                      className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border border-primary/20 dark:border-primary/30 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 dark:text-white">{schedule.subject}</h4>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {schedule.section && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
                                {schedule.section}
                              </span>
                            )}
                            {schedule.course && (
                              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-medium rounded">
                                {schedule.course}
                              </span>
                            )}
                            {schedule.professor && (
                              <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-medium rounded">
                                {schedule.professor}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            {formatTime(schedule.startTime)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            to {formatTime(schedule.endTime)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Time Grid Visual */}
              {getRoomScheduleForDay(selectedRoom, selectedDay).length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Daily Timeline</h4>
                  <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg h-12 overflow-hidden">
                    {/* Time markers */}
                    <div className="absolute inset-0 flex">
                      {['7AM', '9AM', '11AM', '1PM', '3PM', '5PM', '7PM', '9PM'].map((time, idx) => (
                        <div key={time} className="flex-1 border-l border-gray-300 dark:border-gray-600 first:border-l-0">
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 ml-1">{time}</span>
                        </div>
                      ))}
                    </div>
                    {/* Scheduled blocks */}
                    {getRoomScheduleForDay(selectedRoom, selectedDay).map((schedule, idx) => {
                      const startHour = parseInt(schedule.startTime.split(':')[0]) + parseInt(schedule.startTime.split(':')[1]) / 60
                      const endHour = parseInt(schedule.endTime.split(':')[0]) + parseInt(schedule.endTime.split(':')[1]) / 60
                      const left = ((startHour - 7) / 14) * 100
                      const width = ((endHour - startHour) / 14) * 100
                      
                      return (
                        <div
                          key={idx}
                          className="absolute top-1 bottom-1 bg-primary rounded"
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${schedule.subject} (${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)})`}
                        ></div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Scheduled Vacancy Periods */}
              {(() => {
                const roomData = typeof selectedRoom === 'object' ? selectedRoom : rooms.find(r => r.name === selectedRoom);
                const dayVacancies = roomData?.vacancyPeriods?.filter(v => v.day === selectedDay) || [];
                
                if (dayVacancies.length === 0) return null;
                
                return (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Scheduled Vacancy Periods for {selectedDay}
                    </h4>
                    <div className="space-y-2">
                      {dayVacancies.map((vacancy, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center">
                              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {vacancy.startTime} - {vacancy.endTime}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {vacancy.subject} • {vacancy.section}
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full">
                            VACANT
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total: {getRoomSchedule(selectedRoom).length} classes this week
              </div>
              <button
                onClick={() => setSelectedRoom(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Manager Modal */}
      {showRoomManager && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          style={{ 
            position: 'fixed',
            top: '-50px',
            left: 0,
            right: 0,
            bottom: '-50px',
            paddingTop: '50px',
            paddingBottom: '50px'
          }}
          onClick={() => setShowRoomManager(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingRoom ? 'Edit Room' : 'Add New Room'}</h2>
              <button 
                onClick={() => setShowRoomManager(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Room Name *</label>
                <input
                  type="text"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  placeholder="e.g., CL3, RM.1, A-301"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter the exact room name as it appears in schedules
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Building</label>
                <select
                  value={roomForm.building}
                  onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="old">Old Building</option>
                  <option value="new">New Building</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Floor Name</label>
                <input
                  type="text"
                  value={roomForm.floor}
                  onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })}
                  placeholder="e.g., Computer Labs, 2nd Floor"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              {editingRoom && (
                <button
                  onClick={() => deleteRoom(editingRoom)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors"
                >
                  Delete Room
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setShowRoomManager(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRoom}
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingRoom ? 'Update Room' : 'Add Room'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
