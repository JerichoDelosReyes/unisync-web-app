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
import { resetAllClassSections } from './classSectionService';

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
      studentId: studentInfo.studentId || '',
      studentName: studentInfo.studentName || '',
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
        section: data.section || '',
        studentId: data.studentId || '',
        studentName: data.studentName || ''
      };
    }
    return {
      schedules: [],
      semester: '',
      schoolYear: '',
      course: '',
      yearLevel: '',
      section: '',
      studentId: '',
      studentName: ''
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

const CLASS_SECTIONS_COLLECTION = 'class_sections';

/**
 * Get a faculty member's schedule from claimed schedule codes
 * Uses the Schedule Code Matchmaking system where professors claim schedule codes
 * @param {string} facultyUserId - The faculty user's ID
 * @param {Object} options - Options for filtering (includeUnvalidated for admin view)
 * @returns {Promise<Object>} - Object with schedule and statistics
 */
export const getFacultySchedule = async (facultyUserId, options = {}) => {
  try {
    // Get faculty user details
    const facultyDoc = await getDoc(doc(db, USERS_COLLECTION, facultyUserId));
    if (!facultyDoc.exists()) {
      throw new Error('Faculty user not found');
    }
    
    const facultyData = facultyDoc.data();
    
    // Query class_sections where professorId matches the faculty user
    const classSectionsQuery = query(
      collection(db, CLASS_SECTIONS_COLLECTION),
      where('professorId', '==', facultyUserId)
    );
    
    const classSectionsSnapshot = await getDocs(classSectionsQuery);
    
    // Map to aggregate classes by subject + day + time combination
    const classMap = new Map();
    
    for (const docSnapshot of classSectionsSnapshot.docs) {
      const data = docSnapshot.data();
      
      // Get student count from enrolledStudents array or studentCount field
      const studentCount = data.enrolledStudents?.length || data.studentCount || 0;
      const section = data.section || 'Unknown';
      
      // Check if this class section has multiple time slots
      const timeSlots = data.timeSlots || [];
      
      // If timeSlots array exists and has entries, use it
      if (timeSlots.length > 0) {
        for (const slot of timeSlots) {
          if (!data.subject || !slot.day || !slot.startTime) continue;
          
          // Create unique key for this class slot
          const classKey = `${data.subject}-${slot.day}-${slot.startTime}-${slot.endTime}`;
          
          if (classMap.has(classKey)) {
            // Aggregate with existing class entry
            const existingClass = classMap.get(classKey);
            // Don't double-count students - they're enrolled once per schedule code
            if (!existingClass.scheduleCodes.includes(docSnapshot.id)) {
              existingClass.studentCount += studentCount;
              existingClass.scheduleCodes.push(docSnapshot.id);
            }
            if (!existingClass.sections.includes(section)) {
              existingClass.sections.push(section);
            }
            // Update room if was TBA and now we have a real room
            if (existingClass.room === 'TBA' && slot.room && slot.room !== 'TBA') {
              existingClass.room = slot.room;
            }
          } else {
            // Create new class entry
            classMap.set(classKey, {
              id: classMap.size + 1,
              subject: data.subject,
              day: slot.day,
              startTime: slot.startTime,
              endTime: slot.endTime,
              room: slot.room || 'TBA',
              sections: [section],
              studentCount: studentCount,
              scheduleCodes: [docSnapshot.id],
              classKey: classKey,
              validated: true,
              studentsNeeded: 0
            });
          }
        }
      } else {
        // Legacy format - single time slot stored directly in document
        if (!data.subject || !data.day || !data.startTime) {
          continue;
        }
        
        // Create unique key for this class slot
        const classKey = `${data.subject}-${data.day}-${data.startTime}-${data.endTime}`;
        
        if (classMap.has(classKey)) {
          // Aggregate with existing class entry
          const existingClass = classMap.get(classKey);
          existingClass.studentCount += studentCount;
          existingClass.scheduleCodes.push(docSnapshot.id);
          if (!existingClass.sections.includes(section)) {
            existingClass.sections.push(section);
          }
          // Update room if was TBA and now we have a real room
          if (existingClass.room === 'TBA' && data.room && data.room !== 'TBA') {
            existingClass.room = data.room;
          }
        } else {
          // Create new class entry
          classMap.set(classKey, {
            id: classMap.size + 1,
            subject: data.subject,
            day: data.day,
            startTime: data.startTime,
            endTime: data.endTime,
            room: data.room || 'TBA',
            sections: [section],
            studentCount: studentCount,
            scheduleCodes: [docSnapshot.id],
            classKey: classKey,
            validated: true, // All claimed classes are valid
            studentsNeeded: 0
          });
        }
      }
    }
    
    // Convert map to array and sort by day and time
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const derivedSchedule = Array.from(classMap.values()).sort((a, b) => {
      const dayCompare = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      if (dayCompare !== 0) return dayCompare;
      return a.startTime.localeCompare(b.startTime);
    });
    
    // Calculate statistics
    const totalClasses = derivedSchedule.length;
    const totalStudents = derivedSchedule.reduce((sum, c) => sum + c.studentCount, 0);
    const uniqueSections = [...new Set(derivedSchedule.flatMap(c => c.sections))];
    const uniqueSubjects = [...new Set(derivedSchedule.map(c => c.subject))];
    
    return {
      schedules: derivedSchedule,
      allClasses: derivedSchedule,
      pendingClasses: [],
      validatedClasses: derivedSchedule,
      minimumStudentsRequired: 0,
      statistics: {
        totalClasses,
        totalStudents,
        totalSections: uniqueSections.length,
        totalSubjects: uniqueSubjects.length,
        sections: uniqueSections,
        subjects: uniqueSubjects,
        pendingClassesCount: 0,
        validatedClassesCount: totalClasses,
        totalAllClasses: totalClasses
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
    
    // Then reset student schedules
    const resetResult = await resetAllSchedules(userId);
    
    // Also reset class sections (professor schedule view)
    // This clears student enrollments and removes unclaimed sections
    const classSectionsResult = await resetAllClassSections();
    
    return {
      success: true,
      archive: archiveResult,
      reset: resetResult,
      classSections: classSectionsResult,
      message: `Archived ${archiveResult.schedulesArchived} schedules, reset ${resetResult.schedulesDeleted} schedules, cleared ${classSectionsResult.sectionsCleared} class sections`
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
