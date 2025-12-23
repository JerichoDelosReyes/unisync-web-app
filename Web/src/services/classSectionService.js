/**
 * Class Section Service
 * 
 * Handles the "Schedule Code Matchmaking" system where:
 * - Students have schedule data from their Registration Form (OCR/parsed)
 * - Professors "claim" a Schedule Code to attach their name to it
 * 
 * The Schedule Code (e.g., 202510765) is the KEY linking Students and Professors.
 * 
 * Two Scenarios:
 * A) Professor claims first → When student uploads with that code, professor name shows immediately
 * B) Student uploads first → Shows "TBA", then updates when professor claims the code
 */

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
  onSnapshot,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { notifyNewStudentEnrolled, notifyScheduleCodeClaimed } from './notificationService';

const CLASS_SECTIONS_COLLECTION = 'class_sections';

/**
 * Claim a schedule code as a professor
 * Creates or updates the class_sections document with professor details
 * 
 * @param {string} scheduleCode - The 9-digit schedule code (e.g., "202510765")
 * @param {Object} professor - Professor info { uid, name, email, department }
 * @returns {Promise<Object>} - The created/updated class section document
 */
export const claimScheduleCode = async (scheduleCode, professor) => {
  try {
    if (!scheduleCode || !professor?.uid) {
      throw new Error('Schedule code and professor info are required');
    }

    // Validate schedule code format (9 digits)
    const cleanCode = scheduleCode.toString().trim();
    if (!/^\d{9}$/.test(cleanCode)) {
      throw new Error('Schedule code must be a 9-digit number');
    }

    const sectionRef = doc(db, CLASS_SECTIONS_COLLECTION, cleanCode);
    const existingDoc = await getDoc(sectionRef);
    let enrolledStudents = [];

    if (existingDoc.exists()) {
      const existingData = existingDoc.data();
      enrolledStudents = existingData.enrolledStudents || [];
      
      // Check if already claimed by another professor
      if (existingData.professorId && existingData.professorId !== professor.uid) {
        throw new Error(`This schedule code is already claimed by ${existingData.professorName || 'another professor'}`);
      }

      // Update existing document with professor info
      await updateDoc(sectionRef, {
        professorId: professor.uid,
        professorName: professor.name || professor.displayName || 'Unknown Professor',
        professorEmail: professor.email || '',
        department: professor.department || '',
        claimedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new document
      await setDoc(sectionRef, {
        scheduleCode: cleanCode,
        professorId: professor.uid,
        professorName: professor.name || professor.displayName || 'Unknown Professor',
        professorEmail: professor.email || '',
        department: professor.department || '',
        // Schedule details will be populated when student uploads
        subject: null,
        room: null,
        day: null,
        startTime: null,
        endTime: null,
        section: null,
        enrolledStudents: [],
        studentCount: 0,
        claimedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    // Return the updated document
    const updatedDoc = await getDoc(sectionRef);
    const result = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };

    // Notify enrolled students about the professor assignment
    if (enrolledStudents.length > 0 && result.subject) {
      try {
        await notifyScheduleCodeClaimed(enrolledStudents, {
          scheduleCode: cleanCode,
          subject: result.subject,
          professorName: result.professorName,
          day: result.day,
          startTime: result.startTime,
          endTime: result.endTime
        });
      } catch (notifyError) {
        console.error('Error sending notifications:', notifyError);
        // Don't fail the claim operation if notifications fail
      }
    }

    return result;
  } catch (error) {
    console.error('Error claiming schedule code:', error);
    throw error;
  }
};

/**
 * Unclaim a schedule code (professor removes themselves)
 * 
 * @param {string} scheduleCode - The schedule code to unclaim
 * @param {string} professorUid - The professor's UID (for verification)
 * @returns {Promise<void>}
 */
export const unclaimScheduleCode = async (scheduleCode, professorUid) => {
  try {
    const sectionRef = doc(db, CLASS_SECTIONS_COLLECTION, scheduleCode);
    const sectionDoc = await getDoc(sectionRef);

    if (!sectionDoc.exists()) {
      throw new Error('Schedule code not found');
    }

    const data = sectionDoc.data();
    if (data.professorId !== professorUid) {
      throw new Error('You can only unclaim your own schedule codes');
    }

    // If there's student data, just remove professor info
    if (data.subject || data.studentCount > 0) {
      await updateDoc(sectionRef, {
        professorId: null,
        professorName: null,
        professorEmail: null,
        department: null,
        claimedAt: null,
        updatedAt: serverTimestamp()
      });
    } else {
      // No student data, delete the document entirely
      await deleteDoc(sectionRef);
    }
  } catch (error) {
    console.error('Error unclaiming schedule code:', error);
    throw error;
  }
};

/**
 * Get a class section by schedule code
 * 
 * @param {string} scheduleCode - The schedule code
 * @returns {Promise<Object|null>} - The class section or null if not found
 */
export const getClassSection = async (scheduleCode) => {
  try {
    const sectionRef = doc(db, CLASS_SECTIONS_COLLECTION, scheduleCode);
    const sectionDoc = await getDoc(sectionRef);

    if (sectionDoc.exists()) {
      return {
        id: sectionDoc.id,
        ...sectionDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting class section:', error);
    throw error;
  }
};

/**
 * Get all class sections claimed by a professor
 * 
 * @param {string} professorUid - The professor's UID
 * @returns {Promise<Array>} - Array of class sections
 */
export const getProfessorClasses = async (professorUid) => {
  try {
    const q = query(
      collection(db, CLASS_SECTIONS_COLLECTION),
      where('professorId', '==', professorUid)
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting professor classes:', error);
    throw error;
  }
};

/**
 * Subscribe to professor's classes (real-time updates)
 * 
 * @param {string} professorUid - The professor's UID
 * @param {Function} callback - Callback function receiving array of classes
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToProfessorClasses = (professorUid, callback) => {
  const q = query(
    collection(db, CLASS_SECTIONS_COLLECTION),
    where('professorId', '==', professorUid)
  );

  return onSnapshot(q, (querySnapshot) => {
    const classes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(classes);
  }, (error) => {
    console.error('Error subscribing to professor classes:', error);
    callback([]);
  });
};

/**
 * Update class section with schedule details (from student upload)
 * This is called when a student uploads their registration form
 * Tracks unique students to prevent duplicate counting
 * 
 * @param {string} scheduleCode - The schedule code
 * @param {Object} scheduleDetails - Details from parsed registration form
 * @param {string} studentUid - The student's user ID (for unique tracking)
 * @returns {Promise<Object>} - The updated class section
 */
export const updateClassSectionFromStudent = async (scheduleCode, scheduleDetails, studentUid) => {
  try {
    const cleanCode = scheduleCode.toString().trim();
    const sectionRef = doc(db, CLASS_SECTIONS_COLLECTION, cleanCode);
    const existingDoc = await getDoc(sectionRef);

    const updateData = {
      subject: scheduleDetails.subject || null,
      room: scheduleDetails.room || null,
      day: scheduleDetails.day || null,
      startTime: scheduleDetails.startTime || null,
      endTime: scheduleDetails.endTime || null,
      section: scheduleDetails.section || null,
      updatedAt: serverTimestamp()
    };

    let isNewEnrollment = false;
    let professorId = null;
    let newStudentCount = 1;

    if (existingDoc.exists()) {
      const existingData = existingDoc.data();
      const enrolledStudents = existingData.enrolledStudents || [];
      professorId = existingData.professorId;
      
      // Only add if student not already enrolled
      if (studentUid && !enrolledStudents.includes(studentUid)) {
        isNewEnrollment = true;
        newStudentCount = enrolledStudents.length + 1;
        await updateDoc(sectionRef, {
          ...updateData,
          enrolledStudents: arrayUnion(studentUid),
          studentCount: newStudentCount
        });
      } else {
        // Student already enrolled, just update details without incrementing count
        newStudentCount = enrolledStudents.length;
        await updateDoc(sectionRef, updateData);
      }
    } else {
      // Create new document (no professor yet - TBA scenario)
      isNewEnrollment = true;
      await setDoc(sectionRef, {
        scheduleCode: cleanCode,
        ...updateData,
        professorId: null,
        professorName: null,
        professorEmail: null,
        department: null,
        enrolledStudents: studentUid ? [studentUid] : [],
        studentCount: studentUid ? 1 : 0,
        claimedAt: null,
        createdAt: serverTimestamp()
      });
    }

    const updatedDoc = await getDoc(sectionRef);
    const result = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };

    // Notify professor about new student enrollment (if professor is assigned)
    if (isNewEnrollment && professorId && scheduleDetails.subject) {
      try {
        await notifyNewStudentEnrolled(professorId, {
          scheduleCode: cleanCode,
          subject: scheduleDetails.subject,
          section: scheduleDetails.section || 'Unknown',
          studentCount: newStudentCount
        });
      } catch (notifyError) {
        console.error('Error sending enrollment notification:', notifyError);
        // Don't fail the enrollment if notification fails
      }
    }

    return result;
  } catch (error) {
    console.error('Error updating class section from student:', error);
    throw error;
  }
};

/**
 * Remove a student from a class section (when they clear/delete their schedule)
 * 
 * @param {string} scheduleCode - The schedule code
 * @param {string} studentUid - The student's user ID
 * @returns {Promise<void>}
 */
export const removeStudentFromClassSection = async (scheduleCode, studentUid) => {
  try {
    const cleanCode = scheduleCode.toString().trim();
    const sectionRef = doc(db, CLASS_SECTIONS_COLLECTION, cleanCode);
    const existingDoc = await getDoc(sectionRef);

    if (existingDoc.exists() && studentUid) {
      const existingData = existingDoc.data();
      const enrolledStudents = existingData.enrolledStudents || [];
      
      if (enrolledStudents.includes(studentUid)) {
        const newCount = Math.max(0, enrolledStudents.length - 1);
        await updateDoc(sectionRef, {
          enrolledStudents: arrayRemove(studentUid),
          studentCount: newCount,
          updatedAt: serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.error('Error removing student from class section:', error);
    throw error;
  }
};

/**
 * Get professor name for a schedule code (for student display)
 * Returns "TBA" if no professor has claimed the code
 * 
 * @param {string} scheduleCode - The schedule code
 * @returns {Promise<string>} - Professor name or "TBA"
 */
export const getProfessorForScheduleCode = async (scheduleCode) => {
  try {
    const section = await getClassSection(scheduleCode);
    if (section && section.professorName) {
      return section.professorName;
    }
    return 'TBA';
  } catch (error) {
    console.error('Error getting professor for schedule code:', error);
    return 'TBA';
  }
};

/**
 * Batch get professor names for multiple schedule codes
 * Efficient for loading student schedule with multiple classes
 * 
 * @param {Array<string>} scheduleCodes - Array of schedule codes
 * @returns {Promise<Object>} - Map of scheduleCode -> professorName
 */
export const getProfessorsForScheduleCodes = async (scheduleCodes) => {
  try {
    const result = {};
    
    // Initialize all as TBA
    scheduleCodes.forEach(code => {
      result[code] = 'TBA';
    });

    if (scheduleCodes.length === 0) return result;

    // Batch fetch (Firestore limits 'in' queries to 30 items)
    const batchSize = 30;
    for (let i = 0; i < scheduleCodes.length; i += batchSize) {
      const batch = scheduleCodes.slice(i, i + batchSize);
      const q = query(
        collection(db, CLASS_SECTIONS_COLLECTION),
        where('__name__', 'in', batch)
      );
      const querySnapshot = await getDocs(q);

      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.professorName) {
          result[doc.id] = data.professorName;
        }
      });
    }

    return result;
  } catch (error) {
    console.error('Error batch getting professors:', error);
    return {};
  }
};

/**
 * Subscribe to class sections for schedule codes (real-time for student view)
 * Updates automatically when professors claim codes
 * 
 * @param {Array<string>} scheduleCodes - Array of schedule codes
 * @param {Function} callback - Callback receiving map of code -> professorName
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToScheduleCodes = (scheduleCodes, callback) => {
  if (!scheduleCodes || scheduleCodes.length === 0) {
    callback({});
    return () => {};
  }

  // For simplicity with multiple codes, we'll listen to the entire collection
  // and filter client-side. For large scale, use multiple queries.
  const codesSet = new Set(scheduleCodes.map(c => c.toString()));
  
  return onSnapshot(
    collection(db, CLASS_SECTIONS_COLLECTION),
    (querySnapshot) => {
      const result = {};
      
      // Initialize all as TBA
      scheduleCodes.forEach(code => {
        result[code] = 'TBA';
      });

      querySnapshot.docs.forEach(doc => {
        if (codesSet.has(doc.id)) {
          const data = doc.data();
          result[doc.id] = data.professorName || 'TBA';
        }
      });

      callback(result);
    },
    (error) => {
      console.error('Error subscribing to schedule codes:', error);
      callback({});
    }
  );
};

/**
 * Get all unclaimed class sections (for admin view)
 * 
 * @returns {Promise<Array>} - Array of unclaimed class sections
 */
export const getUnclaimedClassSections = async () => {
  try {
    const q = query(
      collection(db, CLASS_SECTIONS_COLLECTION),
      where('professorId', '==', null)
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting unclaimed class sections:', error);
    throw error;
  }
};

/**
 * Get all class sections (for admin view)
 * 
 * @returns {Promise<Array>} - Array of all class sections
 */
export const getAllClassSections = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, CLASS_SECTIONS_COLLECTION));

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting all class sections:', error);
    throw error;
  }
};

/**
 * Delete a class section (admin only)
 * 
 * @param {string} scheduleCode - The schedule code
 * @returns {Promise<void>}
 */
export const deleteClassSection = async (scheduleCode) => {
  try {
    const sectionRef = doc(db, CLASS_SECTIONS_COLLECTION, scheduleCode);
    await deleteDoc(sectionRef);
  } catch (error) {
    console.error('Error deleting class section:', error);
    throw error;
  }
};

export default {
  claimScheduleCode,
  unclaimScheduleCode,
  getClassSection,
  getProfessorClasses,
  subscribeToProfessorClasses,
  updateClassSectionFromStudent,
  removeStudentFromClassSection,
  getProfessorForScheduleCode,
  getProfessorsForScheduleCodes,
  subscribeToScheduleCodes,
  getUnclaimedClassSections,
  getAllClassSections,
  deleteClassSection
};
