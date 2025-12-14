/**
 * Best-Fit Room Scheduling Algorithm
 * 
 * This algorithm finds the optimal room for a class/booking based on:
 * 1. Capacity match (minimize wasted seats)
 * 2. Required amenities (AC, projector, etc.)
 * 3. Availability at requested time
 * 4. Building preference
 * 
 * HOW IT WORKS:
 * 1. Filter rooms that meet minimum requirements
 * 2. Score each room based on fit criteria
 * 3. Return the room with the best (lowest waste) score
 * 
 * BEST-FIT PRINCIPLE:
 * - Choose the room where: capacity - required >= 0 (fits)
 * - And: capacity - required is MINIMIZED (least waste)
 */

/**
 * Room data structure
 * In production, this would come from a database
 */
export const ROOMS_DATABASE = [
  // New Building (NB)
  { id: 'NB-101', name: 'Room 101', building: 'New Building', floor: 1, capacity: 40, amenities: ['ac', 'projector', 'whiteboard'], type: 'lecture' },
  { id: 'NB-102', name: 'Room 102', building: 'New Building', floor: 1, capacity: 35, amenities: ['ac', 'whiteboard'], type: 'lecture' },
  { id: 'NB-103', name: 'Room 103', building: 'New Building', floor: 1, capacity: 45, amenities: ['ac', 'projector', 'whiteboard', 'speakers'], type: 'lecture' },
  { id: 'NB-104', name: 'Room 104', building: 'New Building', floor: 1, capacity: 30, amenities: ['fan', 'whiteboard'], type: 'lecture' },
  { id: 'NB-201', name: 'Room 201', building: 'New Building', floor: 2, capacity: 40, amenities: ['ac', 'projector', 'whiteboard'], type: 'lecture' },
  { id: 'NB-202', name: 'Room 202', building: 'New Building', floor: 2, capacity: 50, amenities: ['ac', 'projector', 'whiteboard', 'speakers'], type: 'lecture' },
  { id: 'NB-203', name: 'Room 203', building: 'New Building', floor: 2, capacity: 35, amenities: ['ac', 'whiteboard'], type: 'lecture' },
  { id: 'NB-301', name: 'CompLab 1', building: 'New Building', floor: 3, capacity: 40, amenities: ['ac', 'projector', 'computers'], type: 'laboratory' },
  { id: 'NB-302', name: 'CompLab 2', building: 'New Building', floor: 3, capacity: 40, amenities: ['ac', 'projector', 'computers'], type: 'laboratory' },
  { id: 'NB-303', name: 'CompLab 3', building: 'New Building', floor: 3, capacity: 35, amenities: ['ac', 'projector', 'computers'], type: 'laboratory' },
  
  // Old Building (OB)
  { id: 'OB-101', name: 'Room 101', building: 'Old Building', floor: 1, capacity: 35, amenities: ['fan', 'whiteboard'], type: 'lecture' },
  { id: 'OB-102', name: 'Room 102', building: 'Old Building', floor: 1, capacity: 30, amenities: ['fan', 'whiteboard'], type: 'lecture' },
  { id: 'OB-103', name: 'Room 103', building: 'Old Building', floor: 1, capacity: 40, amenities: ['ac', 'whiteboard'], type: 'lecture' },
  { id: 'OB-201', name: 'Room 201', building: 'Old Building', floor: 2, capacity: 35, amenities: ['fan', 'whiteboard'], type: 'lecture' },
  { id: 'OB-202', name: 'Room 202', building: 'Old Building', floor: 2, capacity: 45, amenities: ['ac', 'projector', 'whiteboard'], type: 'lecture' },
  
  // HM Building
  { id: 'HM-101', name: 'HM Lab 1', building: 'HM Building', floor: 1, capacity: 30, amenities: ['ac', 'kitchen'], type: 'laboratory' },
  { id: 'HM-102', name: 'HM Lab 2', building: 'HM Building', floor: 1, capacity: 25, amenities: ['ac', 'kitchen'], type: 'laboratory' },
  { id: 'HM-201', name: 'HM Lecture', building: 'HM Building', floor: 2, capacity: 40, amenities: ['ac', 'projector', 'whiteboard'], type: 'lecture' },
  
  // Special Facilities
  { id: 'GYM-01', name: 'Gymnasium', building: 'Gymnasium', floor: 1, capacity: 500, amenities: ['speakers', 'stage'], type: 'venue' },
  { id: 'AVR-01', name: 'AVR', building: 'New Building', floor: 4, capacity: 100, amenities: ['ac', 'projector', 'speakers', 'stage'], type: 'venue' },
];

/**
 * Sample schedule data
 * In production, this would come from a database
 */
let scheduleDatabase = [
  { roomId: 'NB-101', day: 'Monday', startTime: '07:00', endTime: '08:30', subject: 'IT 101', section: 'BSIT 1-1' },
  { roomId: 'NB-101', day: 'Monday', startTime: '08:30', endTime: '10:00', subject: 'IT 102', section: 'BSIT 1-2' },
  { roomId: 'NB-102', day: 'Monday', startTime: '07:00', endTime: '10:00', subject: 'CS 201', section: 'BSCS 2-1' },
  { roomId: 'NB-301', day: 'Monday', startTime: '13:00', endTime: '16:00', subject: 'CC 103 Lab', section: 'BSIT 1-1' },
  { roomId: 'NB-201', day: 'Tuesday', startTime: '07:00', endTime: '08:30', subject: 'Math 101', section: 'BSIT 1-1' },
];

/**
 * Check if a time slot overlaps with an existing schedule
 */
const hasTimeConflict = (schedule, day, startTime, endTime) => {
  const toMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const newStart = toMinutes(startTime);
  const newEnd = toMinutes(endTime);
  
  return schedule.some(slot => {
    if (slot.day !== day) return false;
    
    const slotStart = toMinutes(slot.startTime);
    const slotEnd = toMinutes(slot.endTime);
    
    // Check for overlap
    return (newStart < slotEnd && newEnd > slotStart);
  });
};

/**
 * Get room availability status
 */
export const getRoomStatus = (roomId, day, time) => {
  const toMinutes = (t) => {
    const [hours, minutes] = t.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const currentTime = toMinutes(time);
  const roomSchedule = scheduleDatabase.filter(s => s.roomId === roomId && s.day === day);
  
  for (const slot of roomSchedule) {
    const slotStart = toMinutes(slot.startTime);
    const slotEnd = toMinutes(slot.endTime);
    
    if (currentTime >= slotStart && currentTime < slotEnd) {
      return {
        status: 'occupied',
        currentClass: slot.subject,
        section: slot.section,
        endsAt: slot.endTime
      };
    }
  }
  
  // Check for upcoming class
  const upcoming = roomSchedule.find(slot => {
    const slotStart = toMinutes(slot.startTime);
    return slotStart > currentTime && slotStart - currentTime <= 60; // Within 1 hour
  });
  
  if (upcoming) {
    return {
      status: 'available',
      nextClass: upcoming.subject,
      startsAt: upcoming.startTime
    };
  }
  
  return { status: 'available' };
};

/**
 * Best-Fit Algorithm
 * 
 * @param {object} requirements - Booking requirements
 * @param {number} requirements.capacity - Number of students/attendees
 * @param {string[]} requirements.amenities - Required amenities (optional)
 * @param {string} requirements.type - Room type: 'lecture', 'laboratory', 'venue' (optional)
 * @param {string} requirements.building - Preferred building (optional)
 * @param {string} requirements.day - Day of the week
 * @param {string} requirements.startTime - Start time (HH:MM)
 * @param {string} requirements.endTime - End time (HH:MM)
 * 
 * @returns {object} Best matching room or null
 * 
 * USAGE:
 * const result = findBestFitRoom({
 *   capacity: 35,
 *   amenities: ['ac', 'projector'],
 *   day: 'Monday',
 *   startTime: '10:00',
 *   endTime: '11:30'
 * });
 */
export const findBestFitRoom = (requirements) => {
  const {
    capacity,
    amenities = [],
    type,
    building,
    day,
    startTime,
    endTime
  } = requirements;
  
  // Step 1: Filter rooms that meet basic requirements
  let candidates = ROOMS_DATABASE.filter(room => {
    // Must have enough capacity
    if (room.capacity < capacity) return false;
    
    // Must have required amenities
    const hasAllAmenities = amenities.every(a => room.amenities.includes(a));
    if (!hasAllAmenities) return false;
    
    // Must match type if specified
    if (type && room.type !== type) return false;
    
    // Check availability
    const roomSchedule = scheduleDatabase.filter(s => s.roomId === room.id);
    if (hasTimeConflict(roomSchedule, day, startTime, endTime)) return false;
    
    return true;
  });
  
  if (candidates.length === 0) {
    return {
      success: false,
      message: 'No available rooms match your requirements',
      suggestions: getSuggestions(requirements)
    };
  }
  
  // Step 2: Score each room (lower is better)
  const scoredRooms = candidates.map(room => {
    let score = 0;
    
    // BEST-FIT: Minimize wasted capacity
    // The key principle: smaller waste = better fit
    const wastedSeats = room.capacity - capacity;
    score += wastedSeats * 2; // Weight: 2 points per wasted seat
    
    // Bonus for matching building preference
    if (building && room.building === building) {
      score -= 10; // Reduce score (better)
    }
    
    // Bonus for having extra amenities
    const extraAmenities = room.amenities.filter(a => !amenities.includes(a));
    score -= extraAmenities.length; // Small bonus per extra amenity
    
    // Prefer lower floors for accessibility
    score += room.floor * 0.5;
    
    return {
      ...room,
      score,
      wastedSeats,
      matchPercentage: Math.round((capacity / room.capacity) * 100)
    };
  });
  
  // Step 3: Sort by score (ascending - lower is better)
  scoredRooms.sort((a, b) => a.score - b.score);
  
  // Return the best match
  const bestMatch = scoredRooms[0];
  
  return {
    success: true,
    bestMatch,
    alternatives: scoredRooms.slice(1, 4), // Top 3 alternatives
    message: `Best fit: ${bestMatch.name} (${bestMatch.building}) - ${bestMatch.wastedSeats} extra seats`,
    algorithm: 'Best-Fit',
    criteria: {
      requestedCapacity: capacity,
      roomCapacity: bestMatch.capacity,
      wastedSeats: bestMatch.wastedSeats,
      matchPercentage: bestMatch.matchPercentage
    }
  };
};

/**
 * Get suggestions when no exact match found
 */
const getSuggestions = (requirements) => {
  const suggestions = [];
  
  // Try with fewer amenities
  if (requirements.amenities?.length > 0) {
    suggestions.push('Try removing some amenity requirements');
  }
  
  // Try different time
  suggestions.push('Try a different time slot');
  
  // Try different building
  if (requirements.building) {
    suggestions.push('Consider rooms in other buildings');
  }
  
  return suggestions;
};

/**
 * Book a room (add to schedule)
 */
export const bookRoom = (roomId, booking) => {
  const room = ROOMS_DATABASE.find(r => r.id === roomId);
  if (!room) {
    return { success: false, message: 'Room not found' };
  }
  
  const roomSchedule = scheduleDatabase.filter(s => s.roomId === roomId);
  if (hasTimeConflict(roomSchedule, booking.day, booking.startTime, booking.endTime)) {
    return { success: false, message: 'Time slot already booked' };
  }
  
  const newBooking = {
    id: `BK-${Date.now()}`,
    roomId,
    ...booking,
    createdAt: new Date().toISOString()
  };
  
  scheduleDatabase.push(newBooking);
  
  return {
    success: true,
    message: `Room ${room.name} booked successfully`,
    booking: newBooking
  };
};

/**
 * Get all available rooms for a time slot
 */
export const getAvailableRooms = (day, startTime, endTime) => {
  return ROOMS_DATABASE.filter(room => {
    const roomSchedule = scheduleDatabase.filter(s => s.roomId === room.id);
    return !hasTimeConflict(roomSchedule, day, startTime, endTime);
  }).map(room => ({
    ...room,
    status: getRoomStatus(room.id, day, startTime)
  }));
};

/**
 * Get room schedule for a specific day
 */
export const getRoomSchedule = (roomId, day) => {
  return scheduleDatabase
    .filter(s => s.roomId === roomId && s.day === day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
};

/**
 * Mark room as vacant (for Class Rep feature)
 */
export const markRoomVacant = (roomId, day, time, reason = 'Class dismissed early') => {
  const toMinutes = (t) => {
    const [hours, minutes] = t.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const currentTime = toMinutes(time);
  
  // Find the current schedule entry
  const scheduleIndex = scheduleDatabase.findIndex(s => {
    if (s.roomId !== roomId || s.day !== day) return false;
    const slotStart = toMinutes(s.startTime);
    const slotEnd = toMinutes(s.endTime);
    return currentTime >= slotStart && currentTime < slotEnd;
  });
  
  if (scheduleIndex === -1) {
    return { success: false, message: 'No active class in this room' };
  }
  
  // Update the end time to now (marking as vacant)
  const [hours, minutes] = time.split(':');
  scheduleDatabase[scheduleIndex].endTime = time;
  scheduleDatabase[scheduleIndex].markedVacantAt = new Date().toISOString();
  scheduleDatabase[scheduleIndex].vacantReason = reason;
  
  return {
    success: true,
    message: 'Room marked as vacant. It is now available for booking.',
    roomId,
    vacantFrom: time
  };
};

export default {
  findBestFitRoom,
  bookRoom,
  getAvailableRooms,
  getRoomStatus,
  getRoomSchedule,
  markRoomVacant,
  ROOMS_DATABASE
};
