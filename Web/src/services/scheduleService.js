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
  orderBy
} from 'firebase/firestore';

const SCHEDULES_COLLECTION = 'schedules';
const USERS_COLLECTION = 'users';

/**
 * Save or update a student's schedule
 * @param {string} userId - The user's ID
 * @param {Array} scheduleData - Array of schedule items
 * @returns {Promise<void>}
 */
export const saveStudentSchedule = async (userId, scheduleData) => {
  try {
    const scheduleRef = doc(db, SCHEDULES_COLLECTION, userId);
    await setDoc(scheduleRef, {
      userId,
      schedules: scheduleData,
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
 * Get a student's schedule
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} - Array of schedule items
 */
export const getStudentSchedule = async (userId) => {
  try {
    const scheduleRef = doc(db, SCHEDULES_COLLECTION, userId);
    const scheduleDoc = await getDoc(scheduleRef);
    
    if (scheduleDoc.exists()) {
      return scheduleDoc.data().schedules || [];
    }
    return [];
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
  initializeProfessors
};
