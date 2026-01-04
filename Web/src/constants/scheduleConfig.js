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

// Notification types for all system notifications
export const NOTIFICATION_TYPES = {
  // Schedule-related
  SCHEDULE_VALIDATED: 'schedule_validated',
  SCHEDULE_INVALIDATED: 'schedule_invalidated',
  SCHEDULE_CODE_CLAIMED: 'schedule_code_claimed',
  NEW_STUDENT_ENROLLED: 'new_student_enrolled',
  
  // Announcement-related
  NEW_ANNOUNCEMENT: 'new_announcement',
  URGENT_ANNOUNCEMENT: 'urgent_announcement',
  ANNOUNCEMENT_APPROVED: 'announcement_approved',
  ANNOUNCEMENT_REJECTED: 'announcement_rejected',
  ANNOUNCEMENT_REACTION: 'announcement_reaction',
  ANNOUNCEMENT_COMMENT: 'announcement_comment',
  
  // Faculty request-related
  FACULTY_REQUEST_APPROVED: 'faculty_request_approved',
  FACULTY_REQUEST_REJECTED: 'faculty_request_rejected',
  FACULTY_REQUEST_SUBMITTED: 'faculty_request_submitted',
  
  // System notifications
  SYSTEM_MAINTENANCE: 'system_maintenance',
  WELCOME: 'welcome'
};

export default {
  DEFAULT_MINIMUM_STUDENTS_FOR_VALIDATION,
  SCHEDULE_SETTINGS_DOC,
  NOTIFICATION_TYPES
};
