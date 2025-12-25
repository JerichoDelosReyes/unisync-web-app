/**
 * System Settings Service
 * 
 * Manages system-wide configuration stored in Firestore.
 */

import { db } from '../config/firebase';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { DEFAULT_MINIMUM_STUDENTS_FOR_VALIDATION } from '../constants/scheduleConfig';

const SYSTEM_SETTINGS_COLLECTION = 'systemSettings';

// ============================================
// SEMESTER SETTINGS
// ============================================

/**
 * Get current semester settings
 * @returns {Promise<Object>} Semester settings object
 */
export const getSemesterSettings = async () => {
  try {
    const settingsRef = doc(db, SYSTEM_SETTINGS_COLLECTION, 'semesterConfig');
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      return {
        currentSemester: settingsDoc.data().currentSemester || '1st Semester',
        currentSchoolYear: settingsDoc.data().currentSchoolYear || '',
        updatedAt: settingsDoc.data().updatedAt,
        updatedBy: settingsDoc.data().updatedBy
      };
    }
    
    // Return defaults if document doesn't exist
    const currentYear = new Date().getFullYear();
    return {
      currentSemester: '1st Semester',
      currentSchoolYear: `${currentYear}-${currentYear + 1}`,
      updatedAt: null,
      updatedBy: null
    };
  } catch (error) {
    console.error('Error getting semester settings:', error);
    const currentYear = new Date().getFullYear();
    return {
      currentSemester: '1st Semester',
      currentSchoolYear: `${currentYear}-${currentYear + 1}`,
      updatedAt: null,
      updatedBy: null
    };
  }
};

/**
 * Update semester settings (Super Admin only)
 * @param {Object} settings - Settings to update (currentSemester, currentSchoolYear)
 * @param {string} updatedByUserId - ID of the user making the update
 * @returns {Promise<void>}
 */
export const updateSemesterSettings = async (settings, updatedByUserId) => {
  try {
    const settingsRef = doc(db, SYSTEM_SETTINGS_COLLECTION, 'semesterConfig');
    
    await setDoc(settingsRef, {
      currentSemester: settings.currentSemester,
      currentSchoolYear: settings.currentSchoolYear,
      updatedAt: serverTimestamp(),
      updatedBy: updatedByUserId
    }, { merge: true });
    
    console.log('Semester settings updated successfully');
  } catch (error) {
    console.error('Error updating semester settings:', error);
    throw error;
  }
};

// ============================================
// SCHEDULE VALIDATION SETTINGS
// ============================================

/**
 * Get schedule configuration settings
 * @returns {Promise<Object>} Schedule settings object
 */
export const getScheduleSettings = async () => {
  try {
    const settingsRef = doc(db, SYSTEM_SETTINGS_COLLECTION, 'scheduleConfig');
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      return {
        minimumStudentsForValidation: settingsDoc.data().minimumStudentsForValidation ?? DEFAULT_MINIMUM_STUDENTS_FOR_VALIDATION,
        updatedAt: settingsDoc.data().updatedAt,
        updatedBy: settingsDoc.data().updatedBy
      };
    }
    
    // Return defaults if document doesn't exist
    return {
      minimumStudentsForValidation: DEFAULT_MINIMUM_STUDENTS_FOR_VALIDATION,
      updatedAt: null,
      updatedBy: null
    };
  } catch (error) {
    console.error('Error getting schedule settings:', error);
    // Return defaults on error
    return {
      minimumStudentsForValidation: DEFAULT_MINIMUM_STUDENTS_FOR_VALIDATION,
      updatedAt: null,
      updatedBy: null
    };
  }
};

/**
 * Update schedule configuration settings
 * @param {Object} settings - Settings to update
 * @param {string} updatedByUserId - ID of the user making the update
 * @returns {Promise<void>}
 */
export const updateScheduleSettings = async (settings, updatedByUserId) => {
  try {
    const settingsRef = doc(db, SYSTEM_SETTINGS_COLLECTION, 'scheduleConfig');
    
    await setDoc(settingsRef, {
      minimumStudentsForValidation: settings.minimumStudentsForValidation,
      updatedAt: serverTimestamp(),
      updatedBy: updatedByUserId
    }, { merge: true });
    
    console.log('Schedule settings updated successfully');
  } catch (error) {
    console.error('Error updating schedule settings:', error);
    throw error;
  }
};

/**
 * Get the minimum students threshold for schedule validation
 * @returns {Promise<number>} Minimum students required
 */
export const getMinimumStudentsThreshold = async () => {
  const settings = await getScheduleSettings();
  return settings.minimumStudentsForValidation;
};

export default {
  // Semester settings
  getSemesterSettings,
  updateSemesterSettings,
  // Schedule validation settings
  getScheduleSettings,
  updateScheduleSettings,
  getMinimumStudentsThreshold
};
