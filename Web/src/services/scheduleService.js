import { db } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { getMinimumStudentsThreshold } from './systemSettingsService';
import { notifyScheduleValidated, hasValidationNotification } from './notificationService';
import { DEFAULT_MINIMUM_STUDENTS_FOR_VALIDATION } from '../constants/scheduleConfig';

const SCHEDULES_COLLECTION = 'schedules';
const SCHEDULES_ARCHIVE_COLLECTION = 'schedules_archive';
const USERS_COLLECTION = 'users';

// Cache for validated classes to track state changes for notifications
let previousValidatedClasses = new Map();

/**
 * Save or update a student's schedule
 * @param {string} userId - The user's ID
 * @param {Array} scheduleData - Array of schedule items
 * @param {Object} studentInfo - Additional student info (semester, schoolYear, course, yearLevel)
 * @returns {Promise<void>}
 */
export const saveStudentSchedule = async (userId, scheduleData, studentInfo = {}) => {
  try {
    const scheduleRef = doc(db, SCHEDULES_COLLECTION, userId);
    await setDoc(scheduleRef, {
      userId,
      schedules: scheduleData,
      semester: studentInfo.semester || '',
      schoolYear: studentInfo.schoolYear || '',
      course: studentInfo.course || '',
      yearLevel: studentInfo.yearLevel || '',
      section: studentInfo.section || '',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });
    
    console.log('Schedule saved successfully');
  } catch (error) {
    console.error('Error saving schedule:', error);
    throw error;
  }
};

/**
 * Get a student's schedule with info
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - Object with schedules array and student info
 */
export const getStudentSchedule = async (userId) => {
  try {
    const scheduleRef = doc(db, SCHEDULES_COLLECTION, userId);
    const scheduleDoc = await getDoc(scheduleRef);
    
    if (scheduleDoc.exists()) {
      const data = scheduleDoc.data();
      return {
        schedules: data.schedules || [],
        semester: data.semester || '',
        schoolYear: data.schoolYear || '',
        course: data.course || '',
        yearLevel: data.yearLevel || '',
        section: data.section || ''
      };
    }
    return {
      schedules: [],
      semester: '',
      schoolYear: '',
      course: '',
      yearLevel: '',
      section: ''
    };
  } catch (error) {
    console.error('Error getting schedule:', error);
    throw error;
  }
};

/**
 * Update a single schedule item (e.g., update professor)
 * @param {string} userId - The user's ID
 * @param {number} scheduleId - The schedule item ID
 * @param {object} updates - Fields to update
 * @returns {Promise<Array>} - Updated schedules array
 */
export const updateScheduleItem = async (userId, scheduleId, updates) => {
  try {
    const scheduleRef = doc(db, SCHEDULES_COLLECTION, userId);
    const scheduleDoc = await getDoc(scheduleRef);
    
    if (scheduleDoc.exists()) {
      const schedules = scheduleDoc.data().schedules || [];
      const updatedSchedules = schedules.map(s => 
        s.id === scheduleId ? { ...s, ...updates } : s
      );
      
      await updateDoc(scheduleRef, {
        schedules: updatedSchedules,
        updatedAt: serverTimestamp()
      });
      
      return updatedSchedules;
    }
    return [];
  } catch (error) {
    console.error('Error updating schedule item:', error);
    throw error;
  }
};

/**
 * Delete a student's schedule
 * @param {string} userId - The user's ID
 * @returns {Promise<void>}
 */
export const deleteStudentSchedule = async (userId) => {
  try {
    const scheduleRef = doc(db, SCHEDULES_COLLECTION, userId);
    await deleteDoc(scheduleRef);
    console.log('Schedule deleted successfully');
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
};

/**
 * Get all schedules (for admin/faculty view)
 * @returns {Promise<Array>} - Array of all student schedules
 */
export const getAllSchedules = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, SCHEDULES_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting all schedules:', error);
    throw error;
  }
};

/**
 * Get schedules by section
 * @param {string} section - Section name (e.g., 'BSCS-3E')
 * @returns {Promise<Array>} - Array of schedules for that section
 */
export const getSchedulesBySection = async (section) => {
  try {
    const allSchedules = await getAllSchedules();
    return allSchedules.filter(schedule => 
      schedule.schedules?.some(s => s.section === section)
    );
  } catch (error) {
    console.error('Error getting schedules by section:', error);
    throw error;
  }
};

// ============================================
// PROFESSORS (FACULTY) MANAGEMENT
// ============================================

/**
 * Get the list of professors (faculty members from users collection)
 * @returns {Promise<Array>} - Array of professor objects with id, name, email
 */
export const getProfessors = async () => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('role', '==', 'faculty'));
    const querySnapshot = await getDocs(q);
    
    const professors = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Build full name with all name parts
      // Support both 'givenName' (from authService) and 'firstName' field names
      const nameParts = [];
      const firstName = data.givenName || data.firstName || '';
      const middleName = data.middleName || '';
      const lastName = data.lastName || '';
      const suffix = data.suffix || '';
      
      if (firstName) nameParts.push(firstName);
      if (middleName) nameParts.push(middleName);
      if (lastName) nameParts.push(lastName);
      if (suffix) nameParts.push(suffix);
      
      // Create full name, fallback to displayName or email if no name parts
      const fullName = nameParts.length > 0 
        ? nameParts.join(' ') 
        : (data.displayName || data.email || 'Unknown Professor');
      
      return {
        id: doc.id,
        name: fullName,
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        suffix: suffix,
        email: data.email || '',
        department: data.department || ''
      };
    });
    
    // Sort by last name, then first name
    return professors.sort((a, b) => {
      const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '');
      if (lastNameCompare !== 0) return lastNameCompare;
      return (a.firstName || '').localeCompare(b.firstName || '');
    });
  } catch (error) {
    console.error('Error getting professors:', error);
    return [];
  }
};

/**
 * Get professor names as simple array (for backward compatibility)
 * @returns {Promise<Array>} - Array of professor names
 */
export const getProfessorNames = async () => {
  const professors = await getProfessors();
  return professors.map(p => p.name);
};

/**
 * Initialize professors - no longer needed as we use faculty from users
 * Kept for backward compatibility
 */
export const initializeProfessors = async () => {
  // No longer needed - professors come from users collection
  return;
};

/**
 * Add professor - redirects to info about adding faculty users
 * @param {string} professorName - Name of the professor
 */
export const addProfessor = async (professorName) => {
  console.log('To add a professor, create a new user with faculty role');
  // Return current list
  return await getProfessorNames();
};

/**
 * Remove professor - not applicable, manage via user management
 */
export const removeProfessor = async (professorName) => {
  console.log('To remove a professor, manage via user management');
  return await getProfessorNames();
};

// ============================================
// FACULTY SCHEDULE (Auto-derived from students)
// ============================================

/**
 * Get a faculty member's schedule derived from all student schedules
 * This aggregates all classes where students have assigned the faculty member as professor
 * Classes are ONLY shown (validated) when they have >= minimum students threshold
 * @param {string} facultyUserId - The faculty user's ID
 * @param {Object} options - Options for filtering (includeUnvalidated for admin view)
 * @returns {Promise<Object>} - Object with derived schedule and statistics
 */
export const getFacultySchedule = async (facultyUserId, options = {}) => {
  try {
    // Get the minimum students threshold from settings
    const minimumStudents = await getMinimumStudentsThreshold();
    
    // Get faculty user details for name matching
    const facultyDoc = await getDoc(doc(db, USERS_COLLECTION, facultyUserId));
    if (!facultyDoc.exists()) {
      throw new Error('Faculty user not found');
    }
    
    const facultyData = facultyDoc.data();
    
    // Build faculty name variations for matching
    const firstName = (facultyData.givenName || facultyData.firstName || '').toLowerCase().trim();
    const lastName = (facultyData.lastName || '').toLowerCase().trim();
    const middleName = (facultyData.middleName || '').toLowerCase().trim();
    const displayName = (facultyData.displayName || '').toLowerCase().trim();
    const fullName = `${firstName} ${lastName}`.toLowerCase().trim();
    const fullNameWithMiddle = `${firstName} ${middleName} ${lastName}`.toLowerCase().trim();
    
    // Get all student schedules
    const allSchedules = await getAllSchedules();
    
    // Map to track unique classes (by subject + day + time combination)
    const classMap = new Map();
    
    // Filter and aggregate schedule items where professor matches faculty name
    for (const studentSchedule of allSchedules) {
      if (!studentSchedule.schedules || !Array.isArray(studentSchedule.schedules)) continue;
      
      for (const item of studentSchedule.schedules) {
        if (!item.professor || item.professor === 'TBA') continue;
        
        const professorName = item.professor.toLowerCase().trim();
        
        // Check if professor name matches faculty (flexible matching)
        const isMatch = 
          // Exact full name match
          professorName === fullName ||
          professorName === fullNameWithMiddle ||
          professorName === displayName ||
          // Last name match (handles "Dr. Dela Cruz", "Prof. Dela Cruz", etc.)
          (lastName && professorName.includes(lastName) && 
            (firstName ? professorName.includes(firstName.charAt(0)) || professorName.includes(firstName) : true)) ||
          // First and last name anywhere in string
          (firstName && lastName && professorName.includes(firstName) && professorName.includes(lastName));
        
        if (isMatch) {
          // Create unique key for this class slot
          const classKey = `${item.subject}-${item.day}-${item.startTime}-${item.endTime}`;
          
          if (classMap.has(classKey)) {
            // Add student to existing class
            const existingClass = classMap.get(classKey);
            existingClass.studentCount += 1;
            if (!existingClass.sections.includes(studentSchedule.section)) {
              existingClass.sections.push(studentSchedule.section);
            }
            // Update room if was TBA and now we have a real room
            if (existingClass.room === 'TBA' && item.room !== 'TBA') {
              existingClass.room = item.room;
            }
            // Update validation status
            existingClass.validated = existingClass.studentCount >= minimumStudents;
            existingClass.studentsNeeded = Math.max(0, minimumStudents - existingClass.studentCount);
          } else {
            // Create new class entry
            const studentCount = 1;
            classMap.set(classKey, {
              id: classMap.size + 1,
              subject: item.subject,
              day: item.day,
              startTime: item.startTime,
              endTime: item.endTime,
              room: item.room || 'TBA',
              sections: [studentSchedule.section || 'Unknown'],
              studentCount: studentCount,
              validated: studentCount >= minimumStudents,
              studentsNeeded: Math.max(0, minimumStudents - studentCount),
              classKey: classKey
            });
          }
        }
      }
    }
    
    // Check for newly validated classes and send notifications
    const currentValidatedClasses = new Map();
    for (const [classKey, classData] of classMap) {
      if (classData.validated) {
        currentValidatedClasses.set(classKey, classData);
        
        // Check if this class just became validated (wasn't validated before)
        const wasValidated = previousValidatedClasses.get(`${facultyUserId}-${classKey}`);
        if (!wasValidated) {
          // Check if notification already sent (persistent check)
          const hasNotification = await hasValidationNotification(facultyUserId, classKey);
          if (!hasNotification) {
            // Send notification for newly validated class
            try {
              await notifyScheduleValidated(facultyUserId, {
                ...classData,
                classKey: classKey
              });
              console.log(`Notification sent for validated class: ${classKey}`);
            } catch (notifyError) {
              console.error('Error sending validation notification:', notifyError);
            }
          }
        }
        // Update cache
        previousValidatedClasses.set(`${facultyUserId}-${classKey}`, true);
      }
    }
    
    // Convert map to array and sort by day and time
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let derivedSchedule = Array.from(classMap.values()).sort((a, b) => {
      const dayCompare = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      if (dayCompare !== 0) return dayCompare;
      return a.startTime.localeCompare(b.startTime);
    });
    
    // Store all classes (for admin view) and pending classes count
    const allClasses = [...derivedSchedule];
    const pendingClasses = derivedSchedule.filter(c => !c.validated);
    const validatedClasses = derivedSchedule.filter(c => c.validated);
    
    // Filter to only show validated classes (unless includeUnvalidated option is set)
    if (!options.includeUnvalidated) {
      derivedSchedule = validatedClasses;
    }
    
    // Calculate statistics (based on validated classes only for display)
    const totalClasses = validatedClasses.length;
    const totalStudents = validatedClasses.reduce((sum, c) => sum + c.studentCount, 0);
    const uniqueSections = [...new Set(validatedClasses.flatMap(c => c.sections))];
    const uniqueSubjects = [...new Set(validatedClasses.map(c => c.subject))];
    
    return {
      schedules: derivedSchedule,
      allClasses: allClasses, // For admin view
      pendingClasses: pendingClasses,
      validatedClasses: validatedClasses,
      minimumStudentsRequired: minimumStudents,
      statistics: {
        totalClasses,
        totalStudents,
        totalSections: uniqueSections.length,
        totalSubjects: uniqueSubjects.length,
        sections: uniqueSections,
        subjects: uniqueSubjects,
        pendingClassesCount: pendingClasses.length,
        validatedClassesCount: validatedClasses.length,
        totalAllClasses: allClasses.length
      },
      facultyInfo: {
        name: facultyData.displayName || `${facultyData.givenName || ''} ${facultyData.lastName || ''}`.trim(),
        email: facultyData.email,
        department: facultyData.department || ''
      }
    };
  } catch (error) {
    console.error('Error getting faculty schedule:', error);
    throw error;
  }
};

/**
 * Get all students assigned to a specific faculty member
 * @param {string} facultyUserId - The faculty user's ID
 * @returns {Promise<Array>} - Array of student info objects
 */
export const getFacultyStudents = async (facultyUserId) => {
  try {
    const facultySchedule = await getFacultySchedule(facultyUserId);
    
    // Get faculty name info for matching
    const facultyDoc = await getDoc(doc(db, USERS_COLLECTION, facultyUserId));
    const facultyData = facultyDoc.data();
    const firstName = (facultyData.givenName || facultyData.firstName || '').toLowerCase();
    const lastName = (facultyData.lastName || '').toLowerCase();
    
    const allSchedules = await getAllSchedules();
    const studentIds = new Set();
    const students = [];
    
    for (const schedule of allSchedules) {
      if (!schedule.schedules) continue;
      
      const hasThisProfessor = schedule.schedules.some(item => {
        if (!item.professor || item.professor === 'TBA') return false;
        const prof = item.professor.toLowerCase();
        return (lastName && prof.includes(lastName)) && 
               (firstName ? prof.includes(firstName.charAt(0)) || prof.includes(firstName) : true);
      });
      
      if (hasThisProfessor && !studentIds.has(schedule.userId)) {
        studentIds.add(schedule.userId);
        students.push({
          userId: schedule.userId,
          course: schedule.course,
          yearLevel: schedule.yearLevel,
          section: schedule.section,
          semester: schedule.semester,
          schoolYear: schedule.schoolYear
        });
      }
    }
    
    return students;
  } catch (error) {
    console.error('Error getting faculty students:', error);
    throw error;
  }
};

/**
 * Get schedule by subject for a faculty member
 * @param {string} facultyUserId - The faculty user's ID  
 * @param {string} subject - Subject name to filter by
 * @returns {Promise<Array>} - Filtered schedule items
 */
export const getFacultyScheduleBySubject = async (facultyUserId, subject) => {
  try {
    const { schedules } = await getFacultySchedule(facultyUserId);
    return schedules.filter(item => 
      item.subject.toLowerCase().includes(subject.toLowerCase())
    );
  } catch (error) {
    console.error('Error getting faculty schedule by subject:', error);
    throw error;
  }
};

// ============================================
// SCHEDULE ARCHIVE & RESET (Super Admin Only)
// ============================================

/**
 * Archive all current schedules before reset
 * Creates a snapshot of all schedules in the archive collection
 * @param {string} semester - The semester being archived (e.g., "1st Semester")
 * @param {string} schoolYear - The school year being archived (e.g., "2024-2025")
 * @param {string} archivedByUserId - ID of the user performing the archive
 * @returns {Promise<Object>} - Archive result with count and archive ID
 */
export const archiveAllSchedules = async (semester, schoolYear, archivedByUserId) => {
  try {
    // Get all current schedules
    const allSchedules = await getAllSchedules();
    
    if (allSchedules.length === 0) {
      return {
        success: true,
        archiveId: null,
        schedulesArchived: 0,
        message: 'No schedules to archive'
      };
    }
    
    // Create archive document with timestamp
    const archiveId = `${schoolYear}_${semester.replace(/\s+/g, '_')}_${Date.now()}`;
    const archiveRef = doc(db, SCHEDULES_ARCHIVE_COLLECTION, archiveId);
    
    // Prepare archive data
    const archiveData = {
      archiveId,
      semester,
      schoolYear,
      archivedAt: serverTimestamp(),
      archivedBy: archivedByUserId,
      totalSchedules: allSchedules.length,
      totalStudents: allSchedules.length,
      schedules: allSchedules.map(schedule => ({
        ...schedule,
        archivedFrom: schedule.id
      }))
    };
    
    // Save archive
    await setDoc(archiveRef, archiveData);
    
    console.log(`Archived ${allSchedules.length} schedules to ${archiveId}`);
    
    return {
      success: true,
      archiveId,
      schedulesArchived: allSchedules.length,
      message: `Successfully archived ${allSchedules.length} schedules`
    };
  } catch (error) {
    console.error('Error archiving schedules:', error);
    throw error;
  }
};

/**
 * Reset (delete) all current schedules
 * Should be called AFTER archiveAllSchedules
 * @param {string} resetByUserId - ID of the user performing the reset
 * @returns {Promise<Object>} - Reset result with count
 */
export const resetAllSchedules = async (resetByUserId) => {
  try {
    // Get all current schedules
    const allSchedules = await getAllSchedules();
    
    if (allSchedules.length === 0) {
      return {
        success: true,
        schedulesDeleted: 0,
        message: 'No schedules to reset'
      };
    }
    
    // Delete in batches (Firestore batch limit is 500)
    const batchSize = 450; // Leave some margin
    let totalDeleted = 0;
    
    for (let i = 0; i < allSchedules.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = allSchedules.slice(i, i + batchSize);
      
      for (const schedule of chunk) {
        const scheduleRef = doc(db, SCHEDULES_COLLECTION, schedule.id);
        batch.delete(scheduleRef);
      }
      
      await batch.commit();
      totalDeleted += chunk.length;
    }
    
    // Clear the validation cache
    previousValidatedClasses.clear();
    
    console.log(`Reset ${totalDeleted} schedules`);
    
    return {
      success: true,
      schedulesDeleted: totalDeleted,
      message: `Successfully reset ${totalDeleted} schedules`
    };
  } catch (error) {
    console.error('Error resetting schedules:', error);
    throw error;
  }
};

/**
 * Archive and reset all schedules in one operation
 * @param {string} semester - The semester being archived
 * @param {string} schoolYear - The school year being archived
 * @param {string} userId - ID of the user performing the operation
 * @returns {Promise<Object>} - Combined result
 */
export const archiveAndResetSchedules = async (semester, schoolYear, userId) => {
  try {
    // First archive
    const archiveResult = await archiveAllSchedules(semester, schoolYear, userId);
    
    // Then reset
    const resetResult = await resetAllSchedules(userId);
    
    return {
      success: true,
      archive: archiveResult,
      reset: resetResult,
      message: `Archived ${archiveResult.schedulesArchived} and reset ${resetResult.schedulesDeleted} schedules`
    };
  } catch (error) {
    console.error('Error in archive and reset:', error);
    throw error;
  }
};

/**
 * Get list of archived schedules (for history view)
 * @returns {Promise<Array>} - Array of archive metadata (without full schedule data)
 */
export const getArchiveHistory = async () => {
  try {
    const archivesRef = collection(db, SCHEDULES_ARCHIVE_COLLECTION);
    const q = query(archivesRef, orderBy('archivedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        archiveId: data.archiveId,
        semester: data.semester,
        schoolYear: data.schoolYear,
        archivedAt: data.archivedAt?.toDate(),
        archivedBy: data.archivedBy,
        totalSchedules: data.totalSchedules,
        totalStudents: data.totalStudents
      };
    });
  } catch (error) {
    console.error('Error getting archive history:', error);
    return [];
  }
};

/**
 * Get a specific archive's full data
 * @param {string} archiveId - The archive document ID
 * @returns {Promise<Object|null>} - Full archive data or null
 */
export const getArchiveById = async (archiveId) => {
  try {
    const archiveRef = doc(db, SCHEDULES_ARCHIVE_COLLECTION, archiveId);
    const archiveDoc = await getDoc(archiveRef);
    
    if (archiveDoc.exists()) {
      return {
        id: archiveDoc.id,
        ...archiveDoc.data(),
        archivedAt: archiveDoc.data().archivedAt?.toDate()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting archive:', error);
    throw error;
  }
};

/**
 * Delete an archive (Super Admin only)
 * @param {string} archiveId - The archive document ID
 * @returns {Promise<void>}
 */
export const deleteArchive = async (archiveId) => {
  try {
    const archiveRef = doc(db, SCHEDULES_ARCHIVE_COLLECTION, archiveId);
    await deleteDoc(archiveRef);
    console.log(`Deleted archive: ${archiveId}`);
  } catch (error) {
    console.error('Error deleting archive:', error);
    throw error;
  }
};

export default {
  saveStudentSchedule,
  getStudentSchedule,
  updateScheduleItem,
  deleteStudentSchedule,
  getAllSchedules,
  getSchedulesBySection,
  getProfessors,
  getProfessorNames,
  addProfessor,
  removeProfessor,
  initializeProfessors,
  // Faculty schedule functions
  getFacultySchedule,
  getFacultyStudents,
  getFacultyScheduleBySubject,
  // Archive & Reset functions (Super Admin)
  archiveAllSchedules,
  resetAllSchedules,
  archiveAndResetSchedules,
  getArchiveHistory,
  getArchiveById,
  deleteArchive
};
