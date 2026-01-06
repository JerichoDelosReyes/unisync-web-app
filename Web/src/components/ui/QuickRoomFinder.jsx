/**
 * QuickRoomFinder Component
 * 
 * A modal-based interface for faculty to quickly find and book available rooms
 * using the Best-Fit Algorithm. Designed for urgent make-up classes and 
 * emergency room needs.
 * 
 * Flow:
 * 1. Faculty clicks "⚡ Quick Book Room" button
 * 2. Modal opens with form: Day, Time, Duration, Students, Type
 * 3. System runs Best-Fit Algorithm
 * 4. Shows recommended room with "Book Now" option
 * 5. Creates booking request for admin approval
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  findBestFitRoom,
  getAllRoomsForBestFit,
  createQuickBookingRequest,
  calculateEndTime,
  formatTimeDisplay,
  ROOM_TYPES,
  ROOM_TYPE_LABELS
} from '../../services/bestFitRoomService'

// Days of the week
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Time slots (7 AM to 9 PM)
const TIME_SLOTS = []
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:00`)
  if (h < 21) TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:30`)
}

// Duration options
const DURATION_OPTIONS = [
  { value: 1, label: '1 Hour' },
  { value: 1.5, label: '1.5 Hours' },
  { value: 2, label: '2 Hours' },
  { value: 2.5, label: '2.5 Hours' },
  { value: 3, label: '3 Hours' },
  { value: 4, label: '4 Hours' }
]

// Building options
const BUILDING_OPTIONS = [
  { value: '', label: 'Any Building' },
  { value: 'old', label: 'Old Building' },
  { value: 'new', label: 'New Building' }
]

export default function QuickRoomFinder({ isOpen, onClose }) {
  const { user, userProfile } = useAuth()
  
  // Form state
  const [formData, setFormData] = useState({
    day: DAYS[new Date().getDay() === 0 ? 1 : new Date().getDay()] || 'Monday',
    startTime: '09:00',
    duration: 2,
    studentCount: 40,
    roomType: ROOM_TYPES.ANY,
    preferredBuilding: '',
    purpose: ''
  })
  
  // Results state
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [booking, setBooking] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [error, setError] = useState(null)
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setResults(null)
      setBookingSuccess(false)
      setError(null)
    }
  }, [isOpen])
  
  // Handle form change
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'studentCount' || name === 'duration' 
        ? parseFloat(value) 
        : value
    }))
  }
  
  // Find available rooms
  const handleFindRoom = async () => {
    setLoading(true)
    setError(null)
    setResults(null)
    
    try {
      // Get all rooms from Firestore
      const allRooms = await getAllRoomsForBestFit()
      
      // Calculate end time
      const endTime = calculateEndTime(formData.startTime, formData.duration)
      
      // Run Best-Fit Algorithm
      const result = findBestFitRoom({
        day: formData.day,
        startTime: formData.startTime,
        endTime: endTime,
        requiredCapacity: formData.studentCount,
        roomType: formData.roomType,
        department: userProfile?.department || 'General',
        preferredBuilding: formData.preferredBuilding || null
      }, allRooms)
      
      setResults(result)
    } catch (err) {
      console.error('Error finding room:', err)
      setError('Failed to search for rooms. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  // Book the selected room
  const handleBookRoom = async (room) => {
    setBooking(true)
    setError(null)
    
    try {
      const endTime = calculateEndTime(formData.startTime, formData.duration)
      
      // Construct full name from profile
      const fullName = userProfile?.displayName || 
                       (userProfile?.givenName && userProfile?.lastName 
                         ? `${userProfile.givenName} ${userProfile.lastName}` 
                         : user.email?.split('@')[0] || 'Unknown User')
      
      await createQuickBookingRequest({
        roomId: room.id,
        roomName: room.name,
        day: formData.day,
        startTime: formData.startTime,
        endTime: endTime,
        requiredCapacity: formData.studentCount,
        purpose: formData.purpose || 'Make-up Class',
        requestedBy: user.uid,
        requestedByName: fullName,
        requestedByEmail: user.email,
        department: userProfile?.department || 'General'
      })
      
      setBookingSuccess(true)
    } catch (err) {
      console.error('Error booking room:', err)
      setError(err.message || 'Failed to submit booking request. Please try again.')
    } finally {
      setBooking(false)
    }
  }
  
  // Get building display name
  const getBuildingName = (buildingId) => {
    return buildingId === 'old' ? 'Old Building' : buildingId === 'new' ? 'New Building' : buildingId
  }
  
  // Get fit quality colors
  const getFitColors = (quality) => {
    switch (quality?.color) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
      case 'emerald':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800'
      case 'orange':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ minHeight: '100vh', minWidth: '100vw' }}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-emerald-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Quick Room Finder</h2>
              <p className="text-white/80 text-sm">Best-Fit Algorithm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Success State */}
          {bookingSuccess ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Booking Request Submitted!</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your room booking request has been submitted for admin approval.
                You'll be notified once it's confirmed.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Form Section */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                  Room Requirements
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Day Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Day
                    </label>
                    <select
                      name="day"
                      value={formData.day}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      {DAYS.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Start Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Time
                    </label>
                    <select
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      {TIME_SLOTS.map(time => (
                        <option key={time} value={time}>{formatTimeDisplay(time)}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Duration
                    </label>
                    <select
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      {DURATION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Student Count */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Number of Students
                    </label>
                    <input
                      type="number"
                      name="studentCount"
                      value={formData.studentCount}
                      onChange={handleChange}
                      min="1"
                      max="500"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  
                  {/* Room Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Facility Type
                    </label>
                    <select
                      name="roomType"
                      value={formData.roomType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      {Object.entries(ROOM_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Preferred Building */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Preferred Building
                    </label>
                    <select
                      name="preferredBuilding"
                      value={formData.preferredBuilding}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      {BUILDING_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Purpose (optional) */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Purpose (Optional)
                  </label>
                  <input
                    type="text"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleChange}
                    placeholder="e.g., Make-up class for Data Structures"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                
                {/* Search Button */}
                <button
                  onClick={handleFindRoom}
                  disabled={loading}
                  className="mt-4 w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Find Available Room
                    </>
                  )}
                </button>
              </div>
              
              {/* Error State */}
              {error && (
                <div className="p-4 mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}
              
              {/* Results Section */}
              {results && (
                <div className="p-6">
                  {results.success ? (
                    <>
                      {/* Summary */}
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Found <span className="font-semibold text-gray-900 dark:text-white">{results.totalAvailable}</span> available room(s) for{' '}
                          <span className="font-semibold text-gray-900 dark:text-white">{formData.day}</span>,{' '}
                          <span className="font-semibold text-gray-900 dark:text-white">{formatTimeDisplay(formData.startTime)}</span> -{' '}
                          <span className="font-semibold text-gray-900 dark:text-white">{formatTimeDisplay(calculateEndTime(formData.startTime, formData.duration))}</span>
                        </p>
                      </div>
                      
                      {/* Best Match */}
                      {results.bestMatch && (
                        <div className="mb-4">
                          <div className={`border-2 rounded-xl p-4 ${getFitColors(results.bestMatch.fitQuality)}`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold uppercase tracking-wider">
                                    {results.bestMatch.fitQuality?.badge}
                                  </span>
                                </div>
                                <h4 className="text-xl font-bold">{results.bestMatch.name}</h4>
                                <div className="flex items-center gap-3 mt-1 text-sm opacity-80">
                                  <span>{getBuildingName(results.bestMatch.building)}</span>
                                  <span>•</span>
                                  <span>{results.bestMatch.floor}</span>
                                  <span>•</span>
                                  <span>Capacity: {results.bestMatch.capacity}</span>
                                </div>
                                <p className="text-sm mt-2 opacity-80">
                                  {results.bestMatch.fitQuality?.label} - {results.bestMatch.capacity - formData.studentCount} extra seats
                                </p>
                              </div>
                              <button
                                onClick={() => handleBookRoom(results.bestMatch)}
                                disabled={booking}
                                className="px-4 py-2 bg-white/90 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors disabled:opacity-50 shadow-sm"
                              >
                                {booking ? 'Booking...' : 'Book Now'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Alternatives */}
                      {results.alternatives.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                            Alternatives
                          </h4>
                          <div className="space-y-2">
                            {results.alternatives.map((room, idx) => (
                              <div 
                                key={room.id}
                                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex items-center justify-between border border-gray-200 dark:border-gray-600"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getFitColors(room.fitQuality)}`}>
                                      {room.fitQuality?.label}
                                    </span>
                                    <h5 className="font-semibold text-gray-900 dark:text-white">{room.name}</h5>
                                  </div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {getBuildingName(room.building)} • Capacity: {room.capacity}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleBookRoom(room)}
                                  disabled={booking}
                                  className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                                >
                                  Book
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Rejected Rooms Summary (Collapsed) */}
                      {(results.rejectedRooms.tooSmall.length > 0 || 
                        results.rejectedRooms.timeConflict.length > 0 || 
                        results.rejectedRooms.wrongType.length > 0) && (
                        <details className="mt-4">
                          <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                            View {results.rejectedRooms.tooSmall.length + results.rejectedRooms.timeConflict.length + results.rejectedRooms.wrongType.length} unavailable rooms
                          </summary>
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                            {results.rejectedRooms.timeConflict.map(r => (
                              <div key={r.id} className="flex items-center gap-2">
                                <span className="text-red-500">●</span>
                                <span>{r.name} - {r.reason}</span>
                              </div>
                            ))}
                            {results.rejectedRooms.tooSmall.map(r => (
                              <div key={r.id} className="flex items-center gap-2">
                                <span className="text-yellow-500">●</span>
                                <span>{r.name} - {r.reason}</span>
                              </div>
                            ))}
                            {results.rejectedRooms.wrongType.map(r => (
                              <div key={r.id} className="flex items-center gap-2">
                                <span className="text-gray-400">●</span>
                                <span>{r.name} - {r.reason}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </>
                  ) : (
                    /* No Results */
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Rooms Available</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{results.message}</p>
                      
                      {/* Suggestions */}
                      <div className="text-left bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-sm">
                        <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Try adjusting:</p>
                        <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Different time slot</li>
                          <li>• Smaller student count</li>
                          <li>• Different day</li>
                          <li>• "Any Room Type" for more options</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Quick Book Button Component
 * Place this in the Faculty Dashboard or Rooms page
 */
export function QuickBookButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium text-sm"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <span className="hidden sm:inline">Quick Book Room</span>
      <span className="sm:hidden">Quick Book</span>
    </button>
  )
}
