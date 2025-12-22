// ============================================
// SECURITY SERVICE - Input Validation & Sanitization
// ============================================
// 
// This service provides security utilities for:
// 1. Input sanitization (XSS prevention)
// 2. Input validation
// 3. Rate limiting helpers
// 4. Security logging
// ============================================

import { db, auth } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes all HTML tags and encodes special characters
 */
export const sanitizeHTML = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#x60;')
    .replace(/=/g, '&#x3D;');
};

/**
 * Sanitize object - recursively sanitize all string values
 */
export const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeHTML(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Remove potentially dangerous characters from filenames
 */
export const sanitizeFileName = (fileName) => {
  if (typeof fileName !== 'string') return '';
  
  return fileName
    .replace(/[/\\:*?"<>|]/g, '_') // Remove path characters
    .replace(/\.\./g, '_') // Prevent directory traversal
    .replace(/^\./, '_') // Don't allow hidden files
    .substring(0, 255); // Limit length
};

// ============================================
// INPUT VALIDATION
// ============================================

/**
 * Validate email format and domain
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  const trimmedEmail = email.trim().toLowerCase();
  
  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  // CvSU domain check
  if (!trimmedEmail.endsWith('@cvsu.edu.ph')) {
    return { valid: false, error: 'Only @cvsu.edu.ph emails are allowed' };
  }
  
  return { valid: true, error: null, email: trimmedEmail };
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  
  const errors = [];
  
  if (password.length < 8) {
    errors.push('at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('one special character');
  }
  
  if (errors.length > 0) {
    return { 
      valid: false, 
      error: `Password must contain ${errors.join(', ')}` 
    };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate text input length
 */
export const validateTextLength = (text, minLen = 1, maxLen = 1000, fieldName = 'Text') => {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const trimmed = text.trim();
  
  if (trimmed.length < minLen) {
    return { valid: false, error: `${fieldName} must be at least ${minLen} characters` };
  }
  
  if (trimmed.length > maxLen) {
    return { valid: false, error: `${fieldName} must be less than ${maxLen} characters` };
  }
  
  return { valid: true, error: null, text: trimmed };
};

/**
 * Validate file upload
 */
export const validateFileUpload = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  } = options;
  
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }
  
  // Check file size
  if (file.size > maxSize) {
    const sizeMB = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File size must be less than ${sizeMB}MB` };
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }
  
  // Check file extension
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return { valid: false, error: 'File extension not allowed' };
  }
  
  return { valid: true, error: null };
};

// ============================================
// RATE LIMITING (Client-side helper)
// ============================================

const rateLimitStore = new Map();

/**
 * Check if action is rate limited
 * @param {string} action - Action identifier
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - True if rate limited
 */
export const isRateLimited = (action, maxAttempts = 5, windowMs = 60000) => {
  const now = Date.now();
  const key = `${auth.currentUser?.uid || 'anonymous'}_${action}`;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { attempts: [], blockedUntil: 0 });
  }
  
  const record = rateLimitStore.get(key);
  
  // Check if currently blocked
  if (record.blockedUntil > now) {
    return true;
  }
  
  // Clean old attempts
  record.attempts = record.attempts.filter(time => time > now - windowMs);
  
  // Check if too many attempts
  if (record.attempts.length >= maxAttempts) {
    record.blockedUntil = now + windowMs;
    return true;
  }
  
  // Record this attempt
  record.attempts.push(now);
  return false;
};

/**
 * Get remaining time until rate limit resets
 */
export const getRateLimitReset = (action) => {
  const key = `${auth.currentUser?.uid || 'anonymous'}_${action}`;
  const record = rateLimitStore.get(key);
  
  if (!record || record.blockedUntil <= Date.now()) {
    return 0;
  }
  
  return Math.ceil((record.blockedUntil - Date.now()) / 1000);
};

// ============================================
// SECURITY LOGGING
// ============================================

/**
 * Log security event to Firestore
 */
export const logSecurityEvent = async (eventType, details = {}) => {
  try {
    const user = auth.currentUser;
    
    await addDoc(collection(db, 'logs'), {
      type: 'security',
      eventType,
      userId: user?.uid || 'anonymous',
      userEmail: user?.email || 'anonymous',
      details: sanitizeObject(details),
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

/**
 * Log failed authentication attempt
 */
export const logFailedAuth = async (email, reason) => {
  await logSecurityEvent('auth_failed', {
    email: sanitizeHTML(email),
    reason
  });
};

/**
 * Log suspicious activity
 */
export const logSuspiciousActivity = async (activity, details) => {
  await logSecurityEvent('suspicious_activity', {
    activity,
    ...details
  });
};

// ============================================
// CONTENT SECURITY
// ============================================

/**
 * Check if URL is from allowed domain
 */
export const isAllowedUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsed = new URL(url);
    const allowedDomains = [
      'firebasestorage.googleapis.com',
      'unisync-web-app-ac1fd.firebasestorage.app',
      'cvsu.edu.ph'
    ];
    
    return allowedDomains.some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
};

/**
 * Check for common injection patterns
 */
export const containsInjectionPatterns = (input) => {
  if (typeof input !== 'string') return false;
  
  const patterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=/gi, // Event handlers
    /data:/gi, // Data URLs
    /vbscript:/gi, // VBScript protocol
    /expression\s*\(/gi, // CSS expression
    /url\s*\(/gi, // CSS url
  ];
  
  return patterns.some(pattern => pattern.test(input));
};

export default {
  sanitizeHTML,
  sanitizeObject,
  sanitizeFileName,
  validateEmail,
  validatePassword,
  validateTextLength,
  validateFileUpload,
  isRateLimited,
  getRateLimitReset,
  logSecurityEvent,
  logFailedAuth,
  logSuspiciousActivity,
  isAllowedUrl,
  containsInjectionPatterns
};
