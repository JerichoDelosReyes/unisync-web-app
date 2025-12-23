/**
 * Schedule Configuration Constants
 * 
 * These are default values that can be overridden by system settings in Firestore.
 */

// Default minimum number of students required to validate a faculty schedule
// When a class has >= this many students, it becomes "validated" and visible to faculty
export const DEFAULT_MINIMUM_STUDENTS_FOR_VALIDATION = 5;

// Firestore document path for schedule settings
export const SCHEDULE_SETTINGS_DOC = 'systemSettings/scheduleConfig';

// Notification types for schedule validation
export const NOTIFICATION_TYPES = {
  SCHEDULE_VALIDATED: 'schedule_validated',
  SCHEDULE_INVALIDATED: 'schedule_invalidated'
};

export default {
  DEFAULT_MINIMUM_STUDENTS_FOR_VALIDATION,
  SCHEDULE_SETTINGS_DOC,
  NOTIFICATION_TYPES
};
