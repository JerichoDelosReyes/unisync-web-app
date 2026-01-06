import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth, ROLES, ROLE_HIERARCHY, ROLE_DISPLAY_NAMES } from '../contexts/AuthContext'
import {
  AcademicCapIcon,
  BuildingLibraryIcon,
  PencilIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline'
import {
  createAnnouncement,
  getAnnouncementsForUser,
  getAllAnnouncements,
  deleteAnnouncement,
  updateAnnouncement,
  removeMediaFromAnnouncement,
  toggleReaction,
  getReactionCounts,
  addComment,
  getComments,
  deleteComment,
  subscribeToAnnouncements,
  subscribeToComments,
  ANNOUNCEMENT_STATUS,
  PRIORITY_LEVELS
} from '../services/announcementService'
import { reportAnnouncement, checkReportSpamProtection } from '../services/reportService'
import { createLog, LOG_CATEGORIES, LOG_ACTIONS } from '../services/logService'
import { checkGrammarAndSpelling, autoCorrect } from '../utils/grammarChecker'
import { validateComment, checkProfanity } from '../services/moderationService'
import AudienceSelector from '../components/announcements/AudienceSelector'
import { matchesTargetAudience, DEPARTMENT_CODES } from '../constants/targeting'
import ModalOverlay from '../components/ui/ModalOverlay'

// Import organization logos
import CSGLogo from '../assets/img/CSG-removebg-preview.png'
import BITSLogo from '../assets/img/BITS-removebg-preview.png'
import BMSLogo from '../assets/img/BMS-removebg-preview.png'
import CaviteCommLogo from '../assets/img/CAVITECOMMUNICATOR-removebg-preview.png'
import CHLSLogo from '../assets/img/CHTS-removebg-preview.png'
import CYLELogo from '../assets/img/CYLE-removebg-preview.png'
import CSCLogo from '../assets/img/CSC-removebg-preview.png'
import EDGELogo from '../assets/img/EDGE-removebg-preview.png'
import SikolohiyaLogo from '../assets/img/SIKOLOHIYA-removebg-preview.png'
import YOPALogo from '../assets/img/YOPA-removebg-preview.png'
import SinagTalaLogo from '../assets/img/SINAGTALA-removebg-preview.png'
import TheFlareLogo from '../assets/img/THE_FLARE-removebg-preview.png'
import HonorSocLogo from '../assets/img/HONORSOC-removebg-preview.png'

/**
 * Announcements Page
 * 
 * Features:
 * - View announcements filtered by user tags
 * - Create announcements with media (photos/videos)
 * - Tag-based visibility targeting
 */
export default function Announcements() {
  const { user, userProfile, hasMinRole } = useAuth()
  const location = useLocation()
  
  // State
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // 'all', 'important', 'academic', 'general', 'organizations'
  const [toast, setToast] = useState({ show: false, message: '', kind: 'info' })
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Media viewer state
  const [mediaViewer, setMediaViewer] = useState({ open: false, media: null, index: 0, allMedia: [] })
  
  // Edit modal state
  const [editModal, setEditModal] = useState({ open: false, announcement: null })
  const [editFormData, setEditFormData] = useState({
    title: '',
    content: '',
    priority: PRIORITY_LEVELS.NORMAL,
    targetTags: []
  })
  const [editSubmitting, setEditSubmitting] = useState(false)
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, announcement: null })
  const [deleting, setDeleting] = useState(false)
  
  // Create announcement modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Selected organization for filtering
  const [selectedOrganization, setSelectedOrganization] = useState(null)
  
  // Report announcement modal state
  const [reportModal, setReportModal] = useState({ open: false, announcement: null })
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportSpamCheck, setReportSpamCheck] = useState({ checking: false, blocked: false, reason: null })
  
  // Content warning modal state (for Faculty content moderation)
  const [contentWarningModal, setContentWarningModal] = useState({
    open: false,
    flaggedWords: [],
    onConfirm: null
  })
  
  // Comments and reactions state
  const [comments, setComments] = useState([])
  const [reactions, setReactions] = useState({})
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null) // { id, authorName } of comment being replied to
  const [deleteCommentConfirm, setDeleteCommentConfirm] = useState({ open: false, comment: null })
  const [deletingComment, setDeletingComment] = useState(false)
  
  // Date filter state
  const [dateFilter, setDateFilter] = useState('all') // 'all', 'today', 'week', 'month'
  
  // Create form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: PRIORITY_LEVELS.NORMAL,
    targetTags: []
  })
  const [mediaFiles, setMediaFiles] = useState([])
  const [mediaPreview, setMediaPreview] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [moderationPreview, setModerationPreview] = useState(null)
  const [grammarCheck, setGrammarCheck] = useState(null)
  const [showGrammarPanel, setShowGrammarPanel] = useState(false)
  const fileInputRef = useRef(null)
  const initialNavHandledRef = useRef(false) // Track if initial navigation state was handled
  
  // CvSU Imus Campus Organizations for targeting
  const organizations = [
    { name: 'Central Student Government', code: 'CSG', logo: CSGLogo },
    { name: 'Builders of Innovative Technologist Society', code: 'BITS', logo: BITSLogo },
    { name: 'Business Management Society', code: 'BMS', logo: BMSLogo },
    { name: 'Cavite Communicators', code: 'CC', logo: CaviteCommLogo },
    { name: 'Circle of Hospitality and Tourism Students', code: 'CHLS', logo: CHLSLogo },
    { name: 'Cavite Young Leaders for Entrepreneurship', code: 'CYLE', logo: CYLELogo },
    { name: 'Computer Science Clique', code: 'CSC', logo: CSCLogo },
    { name: 'Educators\' Guild for Excellence', code: 'EDGE', logo: EDGELogo },
    { name: 'Samahan ng mga Magaaral ng Sikolohiya', code: 'SMSP', logo: SikolohiyaLogo },
    { name: 'Young Office Professional Advocates', code: 'YOPA', logo: YOPALogo },
    { name: 'Sinag-Tala', code: 'ST', logo: SinagTalaLogo },
    { name: 'The Flare', code: 'TF', logo: TheFlareLogo },
    { name: 'Honor Society', code: 'HS', logo: HonorSocLogo }
  ]
  
  // Check if user is an organization officer who can announce
  const isOrgOfficer = userProfile?.officerOf && Object.keys(userProfile.officerOf).length > 0
  const userOrgPositions = userProfile?.officerOf || {}
  
  // Get list of organizations user can announce for
  const getUserAnnouncementOrgs = () => {
    if (!userOrgPositions) return []
    return Object.entries(userOrgPositions).map(([orgCode, pos]) => ({
      code: orgCode,
      name: pos.orgName,
      position: pos.positionTitle,
      canTagOfficers: pos.canTagOfficers
    }))
  }
  const userAnnouncementOrgs = getUserAnnouncementOrgs()
  
  // User can create if they are Class Rep OR Org Officer OR higher role
  const canCreate = hasMinRole(ROLES.CLASS_REP) || isOrgOfficer
  // Admin+ can edit/delete any announcement
  const canModerate = hasMinRole(ROLES.ADMIN)
  // Admin+ skips review queue but profanity is ALWAYS checked
  const skipReviewQueue = hasMinRole(ROLES.ADMIN)
  
  // Check if Class Rep has a section set (required to create announcements as class rep)
  const isClassRepWithoutSection = userProfile?.role === ROLES.CLASS_REP && !userProfile?.section
  
  // Announcement mode state for users with multiple roles
  const [announcementMode, setAnnouncementMode] = useState('classrep') // 'classrep' or 'org'
  const [selectedAnnouncementOrg, setSelectedAnnouncementOrg] = useState(null)
  
  // Can user announce as class rep?
  const canAnnounceAsClassRep = userProfile?.role === ROLES.CLASS_REP && userProfile?.section
  
  // Handle Class Rep trying to create without section
  const handleCreateClick = () => {
    // If user is ONLY a class rep without section, block
    if (userProfile?.role === ROLES.CLASS_REP && !userProfile?.section && !isOrgOfficer) {
      showToast('Please upload your registration form in the Schedule page first to set your section.', 'error')
      return
    }
    
    // If user has multiple announcement capabilities, set default mode
    if (canAnnounceAsClassRep && isOrgOfficer) {
      setAnnouncementMode('classrep') // Default to class rep mode
    } else if (isOrgOfficer) {
      setAnnouncementMode('org')
      if (userAnnouncementOrgs.length === 1) {
        setSelectedAnnouncementOrg(userAnnouncementOrgs[0])
      }
    } else {
      setAnnouncementMode('classrep')
    }
    
    setShowCreateModal(true)
  }

  // Show toast notification
  const showToast = (message, kind = 'info') => {
    setToast({ show: true, message, kind })
    setTimeout(() => setToast({ show: false, message: '', kind: 'info' }), 4000)
  }

  // Real-time announcements subscription
  useEffect(() => {
    if (!userProfile || !user) return

    setLoading(true)
    setError(null)
    
    const userTags = userProfile.tags || []
    
    // Subscribe to real-time announcements
    const unsubscribe = subscribeToAnnouncements(
      userTags,
      (newAnnouncements) => {
        setAnnouncements(newAnnouncements)
        setLoading(false)
      },
      { userId: user.uid }
    )

    // Cleanup subscription on unmount
    return () => {
      unsubscribe()
    }
  }, [userProfile, user])

  // Handle navigation state to open specific announcement (only once on initial load)
  useEffect(() => {
    if (location.state?.selectedAnnouncementId && announcements.length > 0 && !loading && !initialNavHandledRef.current) {
      const targetAnnouncement = announcements.find(a => a.id === location.state.selectedAnnouncementId)
      if (targetAnnouncement) {
        setSelectedAnnouncement(targetAnnouncement)
        // Mark as handled so it doesn't re-trigger
        initialNavHandledRef.current = true
        // Clear the navigation state from browser history
        window.history.replaceState({}, document.title)
      }
    }
  }, [location.state?.selectedAnnouncementId, announcements, loading])

  // Real-time comments subscription when announcement is selected
  useEffect(() => {
    if (!selectedAnnouncement) return

    setLoadingComments(true)
    
    // Set initial reactions from announcement
    if (selectedAnnouncement.reactions) {
      const counts = getReactionCounts(selectedAnnouncement.reactions)
      setReactions(counts)
    } else {
      setReactions({})
    }
    
    // Subscribe to real-time comments
    const unsubscribe = subscribeToComments(
      selectedAnnouncement.id,
      (newComments) => {
        setComments(newComments)
        setLoadingComments(false)
      }
    )
    
    setCommentText('')
    setReplyingTo(null)

    // Cleanup subscription on unmount or when announcement changes
    return () => {
      unsubscribe()
    }
  }, [selectedAnnouncement?.id])

  // Handle grammar check
  const handleGrammarCheck = () => {
    if (!formData.title && !formData.content) {
      showToast('Please enter some text to check', 'error')
      return
    }
    const result = checkGrammarAndSpelling(formData.title, formData.content)
    setGrammarCheck(result)
    setShowGrammarPanel(true)
  }

  // Handle auto-correct
  const handleAutoCorrect = () => {
    const titleResult = autoCorrect(formData.title)
    const contentResult = autoCorrect(formData.content)
    
    if (titleResult.hasChanges || contentResult.hasChanges) {
      setFormData(prev => ({
        ...prev,
        title: titleResult.corrected,
        content: contentResult.corrected
      }))
      // Re-run grammar check after corrections
      const result = checkGrammarAndSpelling(titleResult.corrected, contentResult.corrected)
      setGrammarCheck(result)
      showToast(`Applied ${titleResult.changes.length + contentResult.changes.length} correction(s)`, 'success')
    } else {
      showToast('No auto-corrections needed', 'info')
    }
  }

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    const validFiles = []
    const previews = []
    
    for (const file of files) {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      
      if (!isImage && !isVideo) {
        showToast(`Invalid file type: ${file.name}`, 'error')
        continue
      }
      
      if (file.size > 50 * 1024 * 1024) {
        showToast(`File too large: ${file.name} (max 50MB)`, 'error')
        continue
      }
      
      validFiles.push(file)
      
      // Create preview
      if (isImage) {
        previews.push({
          type: 'image',
          url: URL.createObjectURL(file),
          name: file.name
        })
      } else {
        previews.push({
          type: 'video',
          url: URL.createObjectURL(file),
          name: file.name
        })
      }
    }
    
    setMediaFiles(prev => [...prev, ...validFiles])
    setMediaPreview(prev => [...prev, ...previews])
  }

  // Remove media from preview
  const removeMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
    setMediaPreview(prev => {
      URL.revokeObjectURL(prev[index].url)
      return prev.filter((_, i) => i !== index)
    })
  }

  // Validate announcement content quality
  const validateAnnouncementQuality = (title, content) => {
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    
    // Check minimum title length (at least 5 characters)
    if (trimmedTitle.length < 5) {
      return { valid: false, message: 'Title must be at least 5 characters long' }
    }
    
    // Check if title has at least 2 words
    const titleWords = trimmedTitle.split(/\s+/).filter(word => word.length > 0)
    if (titleWords.length < 2) {
      return { valid: false, message: 'Title must contain at least 2 words' }
    }
    
    // Check minimum content length (at least 20 characters)
    if (trimmedContent.length < 20) {
      return { valid: false, message: 'Content must be at least 20 characters long' }
    }
    
    // Check if content has at least 3 words
    const contentWords = trimmedContent.split(/\s+/).filter(word => word.length > 0)
    if (contentWords.length < 3) {
      return { valid: false, message: 'Content must contain at least 3 words' }
    }
    
    // Check for repeated characters (e.g., "aaaaaaa", "!!!!!!")
    const repeatedCharPattern = /(.)\1{4,}/
    if (repeatedCharPattern.test(trimmedTitle) || repeatedCharPattern.test(trimmedContent)) {
      return { valid: false, message: 'Please avoid excessive repeated characters' }
    }
    
    // Check for keyboard spam (e.g., "asdfgh", "qwerty")
    const keyboardSpamPatterns = ['qwerty', 'asdfgh', 'zxcvbn', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '12345', '123456', 'awef', 'wef', 'faw', 'awe', 'ewa', 'wae', 'eaw']
    const lowerTitle = trimmedTitle.toLowerCase()
    const lowerContent = trimmedContent.toLowerCase()
    for (const pattern of keyboardSpamPatterns) {
      // Count occurrences of pattern
      const titleOccurrences = (lowerTitle.match(new RegExp(pattern, 'g')) || []).length
      const contentOccurrences = (lowerContent.match(new RegExp(pattern, 'g')) || []).length
      // If pattern appears 3+ times, it's spam
      if (titleOccurrences >= 3 || contentOccurrences >= 3) {
        return { valid: false, message: 'Please enter a meaningful announcement' }
      }
    }
    
    // Check if content is mostly special characters
    const alphanumericCount = (trimmedContent.match(/[a-zA-Z0-9]/g) || []).length
    if (alphanumericCount < trimmedContent.length * 0.5) {
      return { valid: false, message: 'Content must contain mostly letters and numbers' }
    }
    
    // Check for gibberish/nonsense words
    const isGibberishWord = (word) => {
      if (word.length < 5) return false // Short words are OK
      const lowerWord = word.toLowerCase()
      
      // Check for repeated 2-4 letter patterns (e.g., "awefawef", "fawfaw")
      for (let len = 2; len <= 4; len++) {
        for (let i = 0; i <= lowerWord.length - len * 2; i++) {
          const pattern = lowerWord.substring(i, i + len)
          const rest = lowerWord.substring(i + len)
          if (rest.includes(pattern)) {
            return true
          }
        }
      }
      
      // Check for alternating patterns (e.g., "aeaeae", "wfwfwf")
      if (/(.{1,2})\1{2,}/.test(lowerWord)) return true
      
      // Check vowel ratio - real words need balanced vowels
      const vowels = (lowerWord.match(/[aeiou]/g) || []).length
      const vowelRatio = vowels / lowerWord.length
      // Too few vowels (< 20%) or too many (> 65%) suggests gibberish for longer words
      if (lowerWord.length >= 6 && (vowelRatio < 0.2 || vowelRatio > 0.65)) return true
      
      // Check for too many consonants in a row (more than 4)
      if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(lowerWord)) return true
      
      // Check for same letter repeated 3+ times anywhere in word
      if (/(.)\1\1/.test(lowerWord)) return true
      
      // Check for lack of common letter combinations (real English words have common bigrams)
      const commonBigrams = ['th', 'he', 'in', 'er', 'an', 'on', 'at', 'en', 'nd', 'ti', 'es', 'or', 'te', 'of', 'ed', 'is', 'it', 'al', 'ar', 'st', 'to', 'nt', 'ng', 'se', 'ha', 're', 'ou', 'le', 've', 'me', 'de', 'hi', 'ri', 'ro', 'ic', 'ne', 'ea', 'ra', 'ce', 'li', 'ch', 'll', 'be', 'ma', 'si', 'om', 'ur']
      const hasCommonBigram = commonBigrams.some(bg => lowerWord.includes(bg))
      
      // Long words without any common bigrams are likely gibberish
      if (lowerWord.length >= 7 && !hasCommonBigram) return true
      
      return false
    }
    
    // Check all words in title and content for gibberish
    const allWords = [...titleWords, ...contentWords]
    const gibberishWords = allWords.filter(isGibberishWord)
    
    // If more than 20% of words are gibberish, reject (stricter threshold)
    if (gibberishWords.length > allWords.length * 0.2) {
      return { valid: false, message: 'Please enter a meaningful announcement without random characters' }
    }
    
    // If most words look similar (likely copy-pasted gibberish)
    const uniqueWords = new Set(allWords.map(w => w.toLowerCase()))
    if (allWords.length >= 4 && uniqueWords.size < allWords.length * 0.5) {
      return { valid: false, message: 'Please avoid repetitive content' }
    }
    
    // Check if any single word is excessively long (likely gibberish)
    const hasExcessivelyLongWord = allWords.some(word => word.length > 20)
    if (hasExcessivelyLongWord) {
      return { valid: false, message: 'Words are too long. Please use proper spacing between words.' }
    }
    
    return { valid: true, message: '' }
  }

  /**
   * Check if user is an Organization President (has canTagOfficers = true)
   */
  const isOrgPresident = () => {
    if (!userProfile?.officerOf) return false
    return Object.values(userProfile.officerOf).some(org => org.canTagOfficers === true)
  }

  /**
   * Check if user is a non-President org officer or class rep (needs approval for flagged content)
   */
  const needsPresidentApproval = () => {
    const isClassRep = userProfile?.role === ROLES.CLASS_REP
    const hasOrgPositions = userProfile?.officerOf && Object.keys(userProfile.officerOf).length > 0
    
    // Class reps always need approval for flagged content
    if (isClassRep) return true
    
    // Org officers who are NOT presidents need approval
    if (hasOrgPositions && !isOrgPresident()) return true
    
    return false
  }

  /**
   * Actually submit the announcement (called after confirmations)
   */
  const submitAnnouncement = async (forceApprove = false) => {
    try {
      setSubmitting(true)
      
      // Build author object with org context if applicable
      const author = {
        uid: user.uid,
        name: `${userProfile.givenName} ${userProfile.lastName}`,
        role: userProfile.role,
        photoURL: userProfile.photoURL || null
      }
      
      // Add organization context if announcing as org officer
      if (announcementMode === 'org') {
        const orgInfo = selectedAnnouncementOrg || userAnnouncementOrgs[0]
        author.organizationContext = {
          orgCode: orgInfo.code,
          orgName: orgInfo.name,
          position: orgInfo.position
        }
      }
      
      // Add class rep context if announcing as class rep
      if (announcementMode === 'classrep' && userProfile?.section) {
        author.sectionContext = {
          section: userProfile.section.toUpperCase()
        }
      }
      
      // Faculty who confirmed warning can bypass review (forceApprove)
      const shouldSkipReview = skipReviewQueue || forceApprove
      
      const result = await createAnnouncement(
        formData,
        mediaFiles,
        author,
        shouldSkipReview
      )
      
      // Real-time listener will add announcement to list automatically
      if (result.status === ANNOUNCEMENT_STATUS.APPROVED) {
        showToast('Announcement published successfully!', 'success')
      } else if (result.status === ANNOUNCEMENT_STATUS.PENDING_REVIEW) {
        showToast('Announcement submitted for review. An admin will review it shortly.', 'info')
      } else {
        showToast(result.moderationResult.message || 'Announcement was rejected by moderation.', 'error')
      }
      
      // Log announcement creation
      await createLog({
        category: LOG_CATEGORIES.ANNOUNCEMENTS,
        action: LOG_ACTIONS.ANNOUNCEMENT_CREATE,
        performedBy: {
          uid: user.uid,
          email: user.email,
          name: `${userProfile.givenName} ${userProfile.lastName}`
        },
        details: {
          announcementId: result.id,
          title: formData.title,
          status: result.status,
          priority: formData.priority,
          targetTags: formData.targetTags,
          hasMedia: mediaFiles.length > 0
        },
        description: `Created announcement: "${formData.title}"`
      })
      
      // Reset form
      setFormData({
        title: '',
        content: '',
        priority: PRIORITY_LEVELS.NORMAL,
        targetTags: []
      })
      setMediaFiles([])
      setMediaPreview([])
      setModerationPreview(null)
      setGrammarCheck(null)
      setShowGrammarPanel(false)
      setShowCreateModal(false)
      setAnnouncementMode('classrep')
      setSelectedAnnouncementOrg(null)
      setActiveTab('all')
      
    } catch (err) {
      console.error('Error creating announcement:', err)
      showToast(err.message || 'Failed to create announcement', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim()) {
      showToast('Title and content are required', 'error')
      return
    }
    
    // For org mode, require an org to be selected
    if (announcementMode === 'org' && !selectedAnnouncementOrg && userAnnouncementOrgs.length > 1) {
      showToast('Please select an organization to announce for', 'error')
      return
    }
    
    // Validate content quality
    const qualityCheck = validateAnnouncementQuality(formData.title, formData.content)
    if (!qualityCheck.valid) {
      showToast(qualityCheck.message, 'error')
      return
    }
    
    // === ROLE-BASED CONTENT MODERATION ===
    const fullText = `${formData.title} ${formData.content}`
    const profanityResult = checkProfanity(fullText)
    const isFaculty = userProfile?.role === ROLES.FACULTY
    const isAdmin = hasMinRole(ROLES.ADMIN)
    
    // If profanity detected, apply role-based rules
    if (profanityResult.hasProfanity) {
      // Rule 1: SUPER_ADMIN - Show warning popup, let them decide (same as faculty)
      if (hasMinRole(ROLES.SUPER_ADMIN)) {
        setContentWarningModal({
          open: true,
          flaggedWords: profanityResult.matches || [],
          onConfirm: () => {
            setContentWarningModal({ open: false, flaggedWords: [], onConfirm: null })
            submitAnnouncement(true) // Force approve since super admin acknowledged
          }
        })
        return
      }
      
      // Rule 2: ADMIN - Show warning popup, let them decide
      if (isAdmin) {
        setContentWarningModal({
          open: true,
          flaggedWords: profanityResult.matches || [],
          onConfirm: () => {
            setContentWarningModal({ open: false, flaggedWords: [], onConfirm: null })
            submitAnnouncement(true) // Force approve since admin acknowledged
          }
        })
        return
      }
      
      // Rule 3: FACULTY - Show warning popup, let them decide
      if (isFaculty) {
        setContentWarningModal({
          open: true,
          flaggedWords: profanityResult.matches || [],
          onConfirm: () => {
            setContentWarningModal({ open: false, flaggedWords: [], onConfirm: null })
            submitAnnouncement(true) // Force approve since faculty acknowledged
          }
        })
        return
      }
      
      // Rule 3: CLASS REP / NON-PRESIDENT ORG OFFICERS - Route to pending approval
      if (needsPresidentApproval()) {
        // Submit but force it to pending review (don't skip review queue)
        showToast('Your announcement contains flagged content and will be reviewed by your Organization President before publishing.', 'warning')
        await submitAnnouncement(false) // Goes to pending review
        return
      }
      
      // Rule 4: ORG PRESIDENT - Same as faculty (warning popup)
      if (isOrgPresident()) {
        setContentWarningModal({
          open: true,
          flaggedWords: profanityResult.matches || [],
          onConfirm: () => {
            setContentWarningModal({ open: false, flaggedWords: [], onConfirm: null })
            submitAnnouncement(true) // Presidents can approve their own
          }
        })
        return
      }
      
      // Default: Reject outright (shouldn't reach here normally)
      showToast('Your announcement contains inappropriate content and cannot be posted.', 'error')
      return
    }
    
    // No profanity detected - post immediately
    await submitAnnouncement(skipReviewQueue)
  }

  // Handle opening report modal with spam check
  const handleOpenReportModal = async (announcement) => {
    if (!user) {
      showToast('You must be logged in to report announcements', 'error')
      return
    }
    
    // Check spam protection first
    setReportSpamCheck({ checking: true, blocked: false, reason: null })
    try {
      const spamCheck = await checkReportSpamProtection(user.uid, announcement.id)
      if (!spamCheck.canReport) {
        setReportSpamCheck({ checking: false, blocked: true, reason: spamCheck.reason })
        showToast(spamCheck.reason, 'error')
        return
      }
      setReportSpamCheck({ checking: false, blocked: false, reason: null })
      setReportModal({ open: true, announcement })
    } catch (err) {
      setReportSpamCheck({ checking: false, blocked: false, reason: null })
      // If spam check fails, still allow report
      setReportModal({ open: true, announcement })
    }
  }

  // Handle report submission
  const handleSubmitReport = async () => {
    if (!reportModal.announcement) return

    try {
      setReportSubmitting(true)
      await reportAnnouncement(
        reportModal.announcement.id,
        reportReason,
        {
          uid: user.uid,
          name: userProfile?.givenName + ' ' + userProfile?.lastName,
          email: user.email
        }
      )
      showToast('Report submitted successfully. Our team will review it.', 'success')
      setReportModal({ open: false, announcement: null })
      setReportReason('')
    } catch (err) {
      showToast(err.message || 'Failed to submit report', 'error')
    } finally {
      setReportSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = async (announcementId) => {
    try {
      setDeleting(true)
      const toDelete = deleteConfirm.announcement || announcements.find(a => a.id === announcementId)
      await deleteAnnouncement(announcementId)
      showToast('Announcement deleted', 'success')
      
      // Log the deletion
      await createLog({
        category: LOG_CATEGORIES.ANNOUNCEMENTS,
        action: LOG_ACTIONS.ANNOUNCEMENT_DELETE,
        performedBy: {
          uid: user.uid,
          email: user.email,
          name: `${userProfile.givenName} ${userProfile.lastName}`
        },
        targetUser: toDelete ? {
          uid: toDelete.authorId,
          email: null,
          name: toDelete.authorName
        } : null,
        details: {
          announcementId,
          title: toDelete?.title
        },
        description: `Deleted announcement: "${toDelete?.title || announcementId}"`
      })
      
      setAnnouncements(prev => prev.filter(a => a.id !== announcementId))
      setSelectedAnnouncement(null)
      setDeleteConfirm({ open: false, announcement: null })
    } catch (err) {
      showToast('Failed to delete announcement', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // Open edit modal
  const openEditModal = (announcement) => {
    setEditFormData({
      title: announcement.title || '',
      content: announcement.content || '',
      priority: announcement.priority || PRIORITY_LEVELS.NORMAL,
      targetTags: announcement.targetTags || []
    })
    setEditModal({ open: true, announcement })
    setSelectedAnnouncement(null)
  }

  // Handle edit submission
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    
    if (!editFormData.title.trim() || !editFormData.content.trim()) {
      showToast('Title and content are required', 'error')
      return
    }
    
    try {
      setEditSubmitting(true)
      
      await updateAnnouncement(editModal.announcement.id, {
        title: editFormData.title,
        content: editFormData.content,
        priority: editFormData.priority,
        targetTags: editFormData.targetTags
      })
      
      // Update local state
      const updatedAnnouncement = {
        ...editModal.announcement,
        title: editFormData.title,
        content: editFormData.content,
        priority: editFormData.priority,
        targetTags: editFormData.targetTags
      }
      
      setAnnouncements(prev => prev.map(a => 
        a.id === editModal.announcement.id ? updatedAnnouncement : a
      ))
      
      showToast('Announcement updated successfully!', 'success')
      setEditModal({ open: false, announcement: null })
    } catch (err) {
      console.error('Error updating announcement:', err)
      showToast('Failed to update announcement', 'error')
    } finally {
      setEditSubmitting(false)
    }
  }

  // Toggle edit tag selection
  const toggleEditTag = (tag) => {
    setEditFormData(prev => ({
      ...prev,
      targetTags: prev.targetTags.includes(tag)
        ? prev.targetTags.filter(t => t !== tag)
        : [...prev.targetTags, tag]
    }))
  }

  // Open media viewer
  const openMediaViewer = (media, index, allMedia) => {
    setMediaViewer({ open: true, media, index, allMedia })
  }

  // Navigate media viewer
  const navigateMedia = (direction) => {
    const newIndex = mediaViewer.index + direction
    if (newIndex >= 0 && newIndex < mediaViewer.allMedia.length) {
      setMediaViewer(prev => ({
        ...prev,
        index: newIndex,
        media: prev.allMedia[newIndex]
      }))
    }
  }

  // Toggle tag selection
  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      targetTags: prev.targetTags.includes(tag)
        ? prev.targetTags.filter(t => t !== tag)
        : [...prev.targetTags, tag]
    }))
  }

  // Handle adding a comment
  const handleAddComment = async (e) => {
    e.preventDefault()
    
    if (!commentText.trim()) {
      showToast('Comment cannot be empty', 'error')
      return
    }
    
    // Validate comment quality (reject single letters, repeated characters, spam)
    const validation = validateComment(commentText)
    if (!validation.isValid) {
      showToast(validation.reason, 'error')
      return
    }
    
    if (!selectedAnnouncement) return
    
    try {
      setSubmittingComment(true)
      
      const author = {
        uid: user.uid,
        name: `${userProfile.givenName} ${userProfile.lastName}`,
        role: userProfile.role,
        photoURL: userProfile.photoURL || null
      }
      
      const newComment = await addComment(selectedAnnouncement.id, commentText.trim(), author, replyingTo?.id || null, skipReviewQueue)
      
      // Show appropriate feedback based on moderation result
      if (newComment.status === 'rejected') {
        showToast('Your comment contains inappropriate content and cannot be posted.', 'error')
      } else if (newComment.status === 'pending_review') {
        showToast('Your comment is being reviewed by moderators.', 'warning')
      } else {
        showToast(replyingTo ? 'Reply added successfully!' : 'Comment added successfully!', 'success')
      }
      
      // Clear form - real-time listener will update comments list
      setCommentText('')
      setReplyingTo(null)
    } catch (err) {
      console.error('Error adding comment:', err)
      showToast(err.message || 'Failed to add comment', 'error')
    } finally {
      setSubmittingComment(false)
    }
  }

  // Handle deleting a comment
  const handleDeleteComment = async () => {
    if (!deleteCommentConfirm.comment || !selectedAnnouncement) return
    
    try {
      setDeletingComment(true)
      await deleteComment(selectedAnnouncement.id, deleteCommentConfirm.comment.id)
      
      // Real-time listener will update comments list automatically
      showToast('Comment deleted successfully', 'success')
      setDeleteCommentConfirm({ open: false, comment: null })
    } catch (err) {
      console.error('Error deleting comment:', err)
      showToast('Failed to delete comment', 'error')
    } finally {
      setDeletingComment(false)
    }
  }

  // Check if user can delete a comment (author or admin)
  const canDeleteComment = (comment) => {
    if (!user || !comment) return false
    return comment.authorId === user.uid || canModerate
  }

  // Filter announcements by date
  const filterByDate = (announcements) => {
    if (dateFilter === 'all') return announcements
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    return announcements.filter(a => {
      const createdAt = a.createdAt?.toDate?.() || (a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(0))
      
      switch (dateFilter) {
        case 'today':
          return createdAt >= today
        case 'week':
          const weekAgo = new Date(today)
          weekAgo.setDate(weekAgo.getDate() - 7)
          return createdAt >= weekAgo
        case 'month':
          const monthAgo = new Date(today)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          return createdAt >= monthAgo
        default:
          return true
      }
    })
  }

  // Handle toggling a reaction
  const handleToggleReaction = async (announcementId, reactionType) => {
    try {
      const result = await toggleReaction(announcementId, reactionType, user)
      
      // Update in announcements list
      setAnnouncements(prev => prev.map(a => 
        a.id === announcementId 
          ? { ...a, reactions: result.reactions }
          : a
      ))
      
      // Update selected announcement if it's the one being reacted to
      if (selectedAnnouncement && selectedAnnouncement.id === announcementId) {
        const counts = getReactionCounts(result.reactions)
        setReactions(counts)
        
        setSelectedAnnouncement(prev => ({
          ...prev,
          reactions: result.reactions
        }))
      }
      
      showToast('Reaction added!', 'success')
    } catch (err) {
      console.error('Error toggling reaction:', err)
      showToast('Failed to add reaction', 'error')
    }
  }

  // Format date - handles Firestore timestamps, Date objects, and serverTimestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now'
    
    try {
      let date
      
      // Handle Firestore Timestamp
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate()
      }
      // Handle seconds/nanoseconds object (serverTimestamp pending)
      else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000)
      }
      // Handle Date object or ISO string
      else if (timestamp instanceof Date) {
        date = timestamp
      }
      else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp)
      }
      else {
        return 'Just now'
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Just now'
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Just now'
    }
  }

  // Get display text for author role - show org position if available
  const getAuthorRoleDisplay = (announcement) => {
    // If announcement has organization context (posted as org officer), show position
    if (announcement.author?.organizationContext) {
      const { position, orgCode } = announcement.author.organizationContext
      return `${position} - ${orgCode}`
    }
    // Fallback to standard role display
    return ROLE_DISPLAY_NAMES[announcement.authorRole] || 'Member'
  }

  // Get organization logo for announcements posted by org officers
  const getOrgLogo = (orgCode) => {
    const org = organizations.find(o => o.code === orgCode)
    return org?.logo || null
  }

  // Get author display info - returns org info if organization context exists
  const getAuthorDisplayInfo = (announcement) => {
    if (announcement.author?.organizationContext) {
      const { orgCode, orgName, position } = announcement.author.organizationContext
      return {
        isOrg: true,
        logo: getOrgLogo(orgCode),
        name: orgName,
        subtitle: `${position} • ${announcement.authorName}`,
        orgCode
      }
    }
    return {
      isOrg: false,
      photo: announcement.authorPhotoURL,
      name: announcement.authorName,
      subtitle: getAuthorRoleDisplay(announcement),
      initial: announcement.authorName?.charAt(0) || 'U'
    }
  }

  // Generate display text for target tags - strips prefixes for cleaner display
  const getTagDisplayText = (tag) => {
    if (!tag) return ''
    
    // Handle new format: type:value - strip the prefix
    if (tag.includes(':')) {
      const colonIndex = tag.indexOf(':')
      const type = tag.substring(0, colonIndex)
      const value = tag.substring(colonIndex + 1)
      
      switch (type) {
        case 'dept':
          // Just show the department code value (e.g., "DCS" instead of "dept:DCS")
          return value
        case 'program':
          return value
        case 'org':
          return value
        case 'year':
          return `Year ${value}`
        case 'section':
          return `Sec ${value}`
        default:
          return value
      }
    }
    // Legacy format - just return as is or generate acronym if too long
    if (tag.length > 10) {
      return tag
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 4)
    }
    return tag
  }

  // Get tag color based on type - pastel pill design with dark text
  const getTagColor = (tag) => {
    if (tag.startsWith('dept:')) return 'bg-blue-100 text-blue-800'
    if (tag.startsWith('program:')) return 'bg-purple-100 text-purple-800'
    if (tag.startsWith('org:')) return 'bg-orange-100 text-orange-800'
    if (tag.startsWith('year:')) return 'bg-green-100 text-green-800'
    if (tag.startsWith('section:')) return 'bg-pink-100 text-pink-800'
    if (tag.startsWith('college:')) return 'bg-indigo-100 text-indigo-800'
    return 'bg-gray-100 text-gray-800'
  }

  // Format tag for display by removing prefixes like dept:, org:, year:, etc.
  const formatTagDisplay = (tag) => {
    if (!tag) return ''
    const colonIndex = tag.indexOf(':')
    if (colonIndex !== -1) {
      return tag.substring(colonIndex + 1)
    }
    return tag
  }

  // Get priority badge color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case PRIORITY_LEVELS.URGENT:
        return 'bg-red-100 text-red-700'
      case PRIORITY_LEVELS.HIGH:
        return 'bg-orange-100 text-orange-700'
      case PRIORITY_LEVELS.NORMAL:
        return 'bg-blue-100 text-blue-700'
      case PRIORITY_LEVELS.LOW:
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case ANNOUNCEMENT_STATUS.APPROVED:
        return 'bg-green-100 text-green-700'
      case ANNOUNCEMENT_STATUS.PENDING_REVIEW:
        return 'bg-yellow-100 text-yellow-700'
      case ANNOUNCEMENT_STATUS.REJECTED:
        return 'bg-red-100 text-red-700'
      case ANNOUNCEMENT_STATUS.ARCHIVED:
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[10000] px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 ${
          toast.kind === 'success' ? 'bg-emerald-500 text-white' :
          toast.kind === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Important campus updates, events, and announcements</p>
          </div>
            
          {canCreate && (
            <button
              onClick={handleCreateClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'important', label: 'Important' },
          { key: 'academic', label: 'Academic' },
          { key: 'general', label: 'General' },
          { key: 'organizations', label: 'Orgs' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm rounded-lg transition-all text-center ${
              activeTab === tab.key
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-green-600 hover:text-green-600'
            }`}
          >
            <span className="hidden sm:inline">{tab.key === 'organizations' ? 'Organizations' : tab.label}</span>
            <span className="sm:hidden">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Search Bar and Date Filter */}
      <div className="max-w-3xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <svg 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Date Filter Dropdown */}
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="appearance-none w-full sm:w-44 pl-4 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <svg 
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading announcements...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="py-12 text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* All Announcements Tab */}
      {!loading && !error && ['all', 'important', 'academic', 'general'].includes(activeTab) && (
        <div>
          {(() => {
            let filtered = announcements
            
            if (activeTab === 'important') {
              filtered = announcements.filter(a => a.priority === 'urgent' || a.priority === 'high')
            } else if (activeTab === 'academic') {
              const academicTags = ['Computer Science Clique', 'Educators\' Guild for Excellence', 'Builders of Innovative Technologist Society', 'Business Management Society']
              filtered = announcements.filter(a => a.targetTags?.some(tag => academicTags.includes(tag)))
            } else if (activeTab === 'general') {
              filtered = announcements.filter(a => !a.targetTags || a.targetTags.length === 0)
            }
            
            // Apply date filter
            filtered = filterByDate(filtered)
            
            // Apply search filter
            if (searchQuery.trim()) {
              const query = searchQuery.toLowerCase().trim()
              filtered = filtered.filter(a => 
                a.title?.toLowerCase().includes(query) ||
                a.content?.toLowerCase().includes(query) ||
                a.authorName?.toLowerCase().includes(query) ||
                a.authorRole?.toLowerCase().includes(query) ||
                a.targetTags?.some(tag => tag.toLowerCase().includes(query))
              )
            }
            
            if (filtered.length === 0) {
              return (
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-16 text-center max-w-3xl mx-auto">
                  <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {searchQuery ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      )}
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{searchQuery ? 'No Results Found' : 'No Announcements Yet'}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{searchQuery ? `No announcements matching "${searchQuery}". Try a different search term.` : 'Check back soon for exciting updates and campus news!'}</p>
                </div>
              )
            }
            
            return (
              <div className="space-y-4 w-full max-w-3xl mx-auto">
                {filtered.map((announcement, idx) => (
                  <div
                    key={announcement.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {/* Header - Facebook Style */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          {(() => {
                            const authorInfo = getAuthorDisplayInfo(announcement)
                            if (authorInfo.isOrg) {
                              return (
                                <>
                                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {authorInfo.logo ? (
                                      <img src={authorInfo.logo} alt={authorInfo.name} className="w-8 h-8 object-contain" />
                                    ) : (
                                      <span className="text-lg font-bold text-gray-600 dark:text-gray-300">{authorInfo.orgCode?.charAt(0)}</span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{authorInfo.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{authorInfo.subtitle} • {formatDate(announcement.createdAt)}</p>
                                  </div>
                                </>
                              )
                            }
                            return (
                              <>
                                {authorInfo.photo ? (
                                  <img src={authorInfo.photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {authorInfo.initial}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">{authorInfo.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{authorInfo.subtitle} • {formatDate(announcement.createdAt)}</p>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                        <div className="relative group flex-shrink-0">
                          <button
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                            </svg>
                          </button>
                          {/* Dropdown Menu - Admin Only */}
                          {canModerate && (
                            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                              <button
                                onClick={() => openEditModal(announcement)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ open: true, announcement })}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors border-t border-gray-100 dark:border-gray-700"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                              <button
                                onClick={() => handleOpenReportModal(announcement)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors border-t border-gray-100 dark:border-gray-700"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Report
                              </button>
                            </div>
                          )}
                          {/* Report option for all users + Delete for own announcements */}
                          {!canModerate && (
                            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                              {/* Delete button for own announcements */}
                              {announcement.authorId === userProfile?.uid && (
                                <button
                                  onClick={() => setDeleteConfirm({ open: true, announcement })}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenReportModal(announcement)}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors ${announcement.authorId === userProfile?.uid ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Report
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Priority and Target Tags */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priority?.toUpperCase() || 'NORMAL'}
                        </span>
                        {announcement.targetTags?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {announcement.targetTags.slice(0, 3).map((tag, idx) => (
                              <span key={idx} className={`px-2 py-0.5 text-xs font-bold rounded-full ${getTagColor(tag)}`} title={tag}>
                                {getTagDisplayText(tag)}
                              </span>
                            ))}
                            {announcement.targetTags.length > 3 && (
                              <div className="relative group">
                                <span className="px-2 py-0.5 text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full cursor-pointer">
                                  +{announcement.targetTags.length - 3}
                                </span>
                                {/* Tooltip showing remaining tags */}
                                <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block">
                                  <div className="bg-gray-800 text-white text-xs rounded-lg py-2 px-3 shadow-lg whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                      {announcement.targetTags.slice(3).map((tag, idx) => (
                                        <span key={idx} className={`px-2 py-0.5 font-semibold rounded ${getTagColor(tag)}`}>
                                          {getTagDisplayText(tag)}
                                        </span>
                                      ))}
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-800 rotate-45"></div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="px-4 py-3 cursor-pointer" onClick={() => setSelectedAnnouncement(announcement)}>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 hover:text-green-600 transition-colors">
                        {announcement.title}
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                        {announcement.content}
                      </p>
                    </div>
                    
                    {/* Media Gallery - Full Width */}
                    {announcement.media?.length > 0 && (
                      <div 
                        className="cursor-pointer px-4 py-2"
                        onClick={() => setSelectedAnnouncement(announcement)}
                      >
                        {announcement.media.length === 1 ? (
                          <div className="w-full flex justify-center">
                            {announcement.media[0].type === 'image' ? (
                              <img src={announcement.media[0].url} alt="" className="max-w-full h-auto max-h-[350px] object-contain rounded-lg" />
                            ) : (
                              <div className="w-full max-w-md aspect-video flex items-center justify-center bg-gray-900 rounded-lg">
                                <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1 max-w-lg mx-auto">
                            {announcement.media.slice(0, 4).map((media, idx) => (
                              <div key={idx} className="aspect-square overflow-hidden relative bg-gray-200 dark:bg-gray-700 rounded-lg">
                                {media.type === 'image' ? (
                                  <img src={media.url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                )}
                                {idx === 3 && announcement.media.length > 4 && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <p className="text-white font-bold text-xl">+{announcement.media.length - 4}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Engagement Stats & Action Bar - Facebook Style */}
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                      {/* Action Buttons */}
                      <div className="flex items-center justify-start gap-0">
                        {(() => {
                          const likeReactions = announcement.reactions?.['👍'] || [];
                          const likeCount = Array.isArray(likeReactions) ? likeReactions.length : 0;
                          const hasUserLiked = Array.isArray(likeReactions) && likeReactions.some(r => r.uid === user?.uid);
                          
                          return (
                            <button
                              onClick={() => handleToggleReaction(announcement.id, '👍')}
                              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all group ${
                                hasUserLiked 
                                  ? 'text-green-600 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50' 
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              <span className="group-hover:scale-125 transition-transform">
                                {hasUserLiked ? (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                                  </svg>
                                )}
                              </span>
                              <span>{hasUserLiked ? 'Liked' : 'Like'}</span>
                              {likeCount > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                  hasUserLiked ? 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                }`}>
                                  {likeCount}
                                </span>
                              )}
                            </button>
                          );
                        })()}
                        <button
                          onClick={() => setSelectedAnnouncement(announcement)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>Comment</span>
                          {announcement.comments?.length > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {announcement.comments.length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {/* Organizations Tab */}
      {!loading && !error && activeTab === 'organizations' && selectedOrganization === null && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">Student Organizations</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {organizations.map((org) => (
              <button
                key={org.name}
                onClick={() => setSelectedOrganization(org)}
                className="flex flex-col items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-600 hover:shadow-lg transition-all cursor-pointer group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
              >
                <div className="w-20 h-20 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-600 group-hover:border-green-600 group-hover:shadow-md transition-all">
                  <img 
                    src={org.logo} 
                    alt={org.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white text-center line-clamp-3">{org.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && activeTab === 'organizations' && selectedOrganization !== null && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <button
              onClick={() => setSelectedOrganization(null)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors text-sm w-fit"
            >
              ← Back to Organizations
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Announcements from {selectedOrganization.name}</h2>
          </div>
          {(() => {
            // Filter by org code in both new format (org:CSC) and legacy format (CSC, Computer Science Clique)
            // Also include announcements AUTHORED BY the organization (including campus-wide announcements)
            const orgCode = selectedOrganization.code
            const orgName = selectedOrganization.name
            const orgAnnouncements = announcements.filter(a => {
              // Check if announcement was AUTHORED BY this organization
              const authorOrg = a.author?.organizationContext
              if (authorOrg) {
                if (authorOrg.code === orgCode || authorOrg.orgCode === orgCode) {
                  return true // This org authored the announcement (including campus-wide)
                }
              }
              
              // Check if announcement was TARGETED TO this organization
              if (!a.targetTags || a.targetTags.length === 0) return false
              return a.targetTags.some(tag => {
                const tagLower = tag.toLowerCase()
                // Match new format: org:CSC
                if (tagLower === `org:${orgCode.toLowerCase()}`) return true
                // Match legacy format: just the code
                if (tagLower === orgCode.toLowerCase()) return true
                // Match legacy format: full name
                if (tagLower === orgName.toLowerCase()) return true
                // Match if tag contains the code (e.g., program:CSC)
                if (tag.includes(':') && tag.split(':')[1].toLowerCase() === orgCode.toLowerCase()) return true
                return false
              })
            })
            // Apply search filter to org announcements
            let filteredOrgAnnouncements = orgAnnouncements
            if (searchQuery.trim()) {
              const query = searchQuery.toLowerCase().trim()
              filteredOrgAnnouncements = orgAnnouncements.filter(a => 
                a.title?.toLowerCase().includes(query) ||
                a.content?.toLowerCase().includes(query) ||
                a.authorName?.toLowerCase().includes(query) ||
                a.authorRole?.toLowerCase().includes(query) ||
                a.targetTags?.some(tag => tag.toLowerCase().includes(query))
              )
            }
            
            if (filteredOrgAnnouncements.length === 0) {
              return (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{searchQuery ? 'No Results Found' : 'No Announcements'}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{searchQuery ? 'Try a different search term.' : "This organization hasn't posted any announcements yet."}</p>
                </div>
              )
            }
            return (
              <div className="space-y-4 w-full max-w-3xl mx-auto">
                {filteredOrgAnnouncements.map((announcement, idx) => (
                  <div
                    key={announcement.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          {(() => {
                            const authorInfo = getAuthorDisplayInfo(announcement)
                            if (authorInfo.isOrg) {
                              return (
                                <>
                                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {authorInfo.logo ? (
                                      <img src={authorInfo.logo} alt={authorInfo.name} className="w-8 h-8 object-contain" />
                                    ) : (
                                      <span className="text-lg font-bold text-gray-600 dark:text-gray-300">{authorInfo.orgCode?.charAt(0)}</span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{authorInfo.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{authorInfo.subtitle} • {formatDate(announcement.createdAt)}</p>
                                  </div>
                                </>
                              )
                            }
                            return (
                              <>
                                {authorInfo.photo ? (
                                  <img src={authorInfo.photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {authorInfo.initial}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">{authorInfo.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{authorInfo.subtitle} • {formatDate(announcement.createdAt)}</p>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priority?.toUpperCase() || 'NORMAL'}
                        </span>
                      </div>
                    </div>
                    <div className="px-4 py-3 cursor-pointer" onClick={() => setSelectedAnnouncement(announcement)}>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 hover:text-green-600 transition-colors">
                        {announcement.title}
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                        {announcement.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
      </div>
      )}

      {/* Create Announcement Modal */}
      {showCreateModal && (
        <ModalOverlay onClose={() => {
          setShowCreateModal(false)
          setFormData({ title: '', content: '', priority: PRIORITY_LEVELS.NORMAL, targetTags: [] })
          setMediaFiles([])
          setMediaPreview([])
          setAnnouncementMode('classrep')
          setSelectedAnnouncementOrg(null)
        }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl mx-4">
            {/* Modal Header */}
            <div className="sticky top-0 bg-green-600 text-white px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
              <h2 className="text-xl font-bold">Create Announcement</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({ title: '', content: '', priority: PRIORITY_LEVELS.NORMAL, targetTags: [] })
                  setMediaFiles([])
                  setMediaPreview([])
                  setAnnouncementMode('classrep')
                  setSelectedAnnouncementOrg(null)
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              {/* Announcement Mode Selector - Show if user has multiple roles */}
              {(canAnnounceAsClassRep && isOrgOfficer) && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Announce as:</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAnnouncementMode('classrep')
                        setSelectedAnnouncementOrg(null)
                      }}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                        announcementMode === 'classrep'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        <AcademicCapIcon className="w-5 h-5 text-green-600" />
                        <div className="text-left">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">Class Representative</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Section {userProfile?.section}</p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAnnouncementMode('org')
                        if (userAnnouncementOrgs.length === 1) {
                          setSelectedAnnouncementOrg(userAnnouncementOrgs[0])
                        }
                      }}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                        announcementMode === 'org'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        <BuildingLibraryIcon className="w-5 h-5 text-blue-600" />
                        <div className="text-left">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">Organization Officer</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {userAnnouncementOrgs.map(o => o.code).join(', ')}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Organization Selector - Show if org mode and multiple orgs */}
              {announcementMode === 'org' && userAnnouncementOrgs.length > 1 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm font-semibold text-blue-800 mb-3">Select Organization:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {userAnnouncementOrgs.map(org => (
                      <button
                        key={org.code}
                        type="button"
                        onClick={() => setSelectedAnnouncementOrg(org)}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          selectedAnnouncementOrg?.code === org.code
                            ? 'border-blue-500 bg-white dark:bg-gray-700'
                            : 'border-blue-100 dark:border-blue-900 bg-white/50 dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                      >
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{org.code}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{org.position}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Single Organization Notice */}
              {announcementMode === 'org' && userAnnouncementOrgs.length === 1 && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <BuildingLibraryIcon className="w-7 h-7 text-blue-600" />
                    <div>
                      <p className="font-semibold text-blue-900 dark:text-blue-100">Announcing as {selectedAnnouncementOrg?.position || userAnnouncementOrgs[0].position}</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">{selectedAnnouncementOrg?.name || userAnnouncementOrgs[0].name}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Post Creator Card */}
                <div className="bg-white dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 p-6 shadow-sm">
                  {/* User Header */}
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {userProfile?.givenName?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{userProfile?.givenName} {userProfile?.lastName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{ROLE_DISPLAY_NAMES[userProfile?.role]}</p>
                    </div>
                  </div>
                  
                  {/* Title Input */}
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="What's the announcement about?"
                    className="w-full px-0 py-2 text-2xl font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-transparent border-0 focus:outline-none resize-none mb-3"
                    required
                  />
                  
                  {/* Main Content Input */}
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Share the details of your announcement..."
                    rows={5}
                    className="w-full px-0 py-3 text-base text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-transparent border-0 focus:outline-none resize-none"
                    required
                  />
                  
                  {/* Media Previews */}
                  {mediaPreview.length > 0 && (
                    <div className="mt-4 -mx-6 px-6">
                      <div className="grid grid-cols-2 gap-3">
                        {mediaPreview.map((media, idx) => (
                          <div key={idx} className="relative group rounded-lg overflow-hidden bg-gray-100">
                            <div className="aspect-square">
                              {media.type === 'image' ? (
                                <img src={media.url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-400">
                                  <svg className="w-10 h-10 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeMedia(idx)}
                              className="absolute top-2 right-2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Action Bar */}
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                    />
                    
                    {/* Icon Buttons */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-all group"
                    >
                      <svg className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                      </svg>
                      <span className="hidden sm:inline">Photo/Video</span>
                    </button>
                    
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-all bg-transparent border-0 cursor-pointer text-center"
                    >
                      <option value={PRIORITY_LEVELS.LOW}>🟢 Low</option>
                      <option value={PRIORITY_LEVELS.NORMAL}>🟡 Normal</option>
                      <option value={PRIORITY_LEVELS.URGENT}>🔴 Urgent</option>
                    </select>
                  </div>
                  
                  {/* Audience Targeting Component */}
                  <div className="mt-4">
                    <AudienceSelector
                      value={formData.targetTags}
                      onChange={(tags) => setFormData(prev => ({ ...prev, targetTags: tags }))}
                      userProfile={userProfile}
                      announcementMode={announcementMode}
                      selectedOrg={selectedAnnouncementOrg}
                    />
                  </div>
                  
                  {/* Moderation Notice */}
                  {!skipReviewQueue && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-xs text-blue-900 dark:text-blue-100"><span className="font-semibold">Note:</span> Your post will be reviewed before publishing.</p>
                    </div>
                  )}
                  
                  {/* Grammar & Spelling Check */}
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <PencilIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Writing Assistant</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleGrammarCheck}
                          className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-all"
                        >
                          Check Grammar
                        </button>
                        {grammarCheck?.hasIssues && (
                          <button
                            type="button"
                            onClick={handleAutoCorrect}
                            className="px-3 py-1.5 text-xs font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50 rounded-lg hover:bg-green-200 dark:hover:bg-green-900 transition-all"
                          >
                            Auto-fix
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Grammar Check Results */}
                    {grammarCheck && showGrammarPanel && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        {/* Summary */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              grammarCheck.qualityScore >= 90 ? 'bg-green-100 text-green-700' :
                              grammarCheck.qualityScore >= 70 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {grammarCheck.qualityScore}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Quality Score</p>
                              <p className={`text-xs ${
                                grammarCheck.summary.status === 'excellent' ? 'text-green-600' :
                                grammarCheck.summary.status === 'good' ? 'text-blue-600' :
                                grammarCheck.summary.status === 'review' ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>{grammarCheck.summary.message}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowGrammarPanel(false)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Readability */}
                        <div className="mb-3 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-600">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400">Readability: <span className="font-semibold text-gray-700 dark:text-gray-300">{grammarCheck.readability.level}</span></span>
                            <span className="text-gray-500 dark:text-gray-400">{grammarCheck.readability.words} words • {grammarCheck.readability.sentences} sentences</span>
                          </div>
                        </div>
                        
                        {/* Issues List */}
                        {grammarCheck.allIssues.length > 0 && (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {grammarCheck.errors.map((issue, idx) => (
                              <div key={`error-${idx}`} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg border border-red-100">
                                <XCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-red-800">{issue.message}</p>
                                  {issue.suggestion && (
                                    <p className="text-xs text-red-600 mt-0.5">Suggestion: <span className="font-semibold">{issue.suggestion}</span></p>
                                  )}
                                </div>
                              </div>
                            ))}
                            {grammarCheck.warnings.map((issue, idx) => (
                              <div key={`warning-${idx}`} className="flex items-start gap-2 p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-yellow-800">{issue.message}</p>
                                  {issue.word && (
                                    <p className="text-xs text-yellow-600 mt-0.5">Found: "{issue.word}"</p>
                                  )}
                                </div>
                              </div>
                            ))}
                            {grammarCheck.suggestions.slice(0, 3).map((issue, idx) => (
                              <div key={`suggestion-${idx}`} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                                <LightBulbIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-800 flex-1">{issue.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {grammarCheck.allIssues.length === 0 && (
                          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-100 dark:border-green-800">
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                            <p className="text-xs text-green-800 dark:text-green-200">No grammar or spelling issues found!</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Submit Button */}
                  <div className="flex gap-3 mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false)
                        setFormData({ title: '', content: '', priority: PRIORITY_LEVELS.NORMAL, targetTags: [] })
                        setMediaFiles([])
                        setMediaPreview([])
                        setAnnouncementMode('classrep')
                        setSelectedAnnouncementOrg(null)
                        setGrammarCheck(null)
                        setShowGrammarPanel(false)
                      }}
                      className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {skipReviewQueue ? 'Publishing...' : 'Submitting...'}
                        </>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          {skipReviewQueue ? <><SparklesIcon className="w-4 h-4" /> Publish</> : <><ArrowUpTrayIcon className="w-4 h-4" /> Submit</>}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </ModalOverlay>
      )}
      
      {/* Old form hidden - keeping reference structure but replaced above */}
      {false && (
      <form onSubmit={handleSubmit} className="space-y-8">
            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Make it clear and engaging..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base"
                required
              />
            </div>
            
            {/* Content */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Share the details of your announcement..."
                rows={6}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none text-base"
                required
              />
            </div>
            
            {/* Priority */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">Priority Level</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base"
              >
                <option value={PRIORITY_LEVELS.LOW}>🟢 Low Priority</option>
                <option value={PRIORITY_LEVELS.NORMAL}>🟡 Normal Priority</option>
                <option value={PRIORITY_LEVELS.HIGH}>🟠 High Priority</option>
                <option value={PRIORITY_LEVELS.URGENT}>🔴 Urgent Priority</option>
              </select>
            </div>
            
            {/* Target Organizations */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Target Audience
                <span className="font-normal text-gray-600 ml-2">(optional - leave empty for campus-wide)</span>
              </label>
              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl max-h-64 overflow-y-auto">
                {organizations.map((org) => (
                  <button
                    key={org.name}
                    type="button"
                    onClick={() => toggleTag(org.name)}
                    className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      formData.targetTags.includes(org.name)
                        ? 'bg-green-600 text-white shadow-md scale-105'
                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50'
                    }`}
                  >
                    {org.name}
                  </button>
                ))}
              </div>
              {formData.targetTags.length === 0 && (
                <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg> This announcement will reach all campus users
                </p>
              )}
              {formData.targetTags.length > 0 && (
                <p className="text-sm text-blue-600 mt-3 font-medium">
                  Targeting {formData.targetTags.length} organization{formData.targetTags.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            
            {/* Media Upload */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Attachments
                <span className="font-normal text-gray-600 ml-2">(Photos & Videos • Up to 50MB each)</span>
              </label>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,video/*"
                multiple
                className="hidden"
              />
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-3 border-dashed border-green-300 rounded-xl p-8 text-center hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-green-600 font-bold text-lg">Click to upload</p>
                <p className="text-gray-500 text-sm mt-1">or drag and drop your files here</p>
              </div>
              
              {/* Media Previews */}
              {mediaPreview.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-6">
                  {mediaPreview.map((media, idx) => (
                    <div key={idx} className="relative group">
                      <div className="w-28 h-28 rounded-xl overflow-hidden bg-gray-200 shadow-md">
                        {media.type === 'image' ? (
                          <img src={media.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-400">
                            <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMedia(idx)}
                        className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                      </button>
                      <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs font-bold rounded-lg">
                        {media.type === 'image' ? 'IMG' : 'VID'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Submit */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="flex-1 px-6 py-3 text-base font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 text-base font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 hover:shadow-lg hover:-translate-y-1 disabled:opacity-50 transition-all"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {skipReviewQueue ? 'Publishing...' : 'Submitting...'}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {skipReviewQueue ? <SparklesIcon className="w-5 h-5" /> : <ArrowUpTrayIcon className="w-5 h-5" />}
                    {skipReviewQueue ? 'Publish Now' : 'Submit for Review'}
                  </span>
                )}
              </button>
            </div>
          </form>
      )}

      {/* Announcement Detail Modal - Facebook Style */}
      {selectedAnnouncement && (
        <div 
          className="z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          style={{
            position: 'fixed',
            top: '-50px',
            left: 0,
            right: 0,
            bottom: '-50px',
            paddingTop: '50px',
            paddingBottom: '50px',
            margin: 0,
          }}
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div 
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Compact Facebook Style */}
            <div className="sticky top-0 bg-green-600 text-white px-4 py-3 flex items-center justify-between z-10">
              <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${
                selectedAnnouncement.priority === PRIORITY_LEVELS.URGENT ? 'bg-red-500' :
                selectedAnnouncement.priority === PRIORITY_LEVELS.HIGH ? 'bg-orange-500' :
                selectedAnnouncement.priority === PRIORITY_LEVELS.NORMAL ? 'bg-blue-500' :
                'bg-gray-500'
              }`}>
                {selectedAnnouncement.priority?.toUpperCase() || 'NORMAL'}
              </span>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {/* Post Header with Author */}
              <div className="px-4 py-3">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    {(() => {
                      const authorInfo = getAuthorDisplayInfo(selectedAnnouncement)
                      if (authorInfo.isOrg) {
                        return (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {authorInfo.logo ? (
                                <img src={authorInfo.logo} alt={authorInfo.name} className="w-8 h-8 object-contain" />
                              ) : (
                                <span className="text-lg font-bold text-gray-600 dark:text-gray-300">{authorInfo.orgCode?.charAt(0)}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 dark:text-white text-sm">{authorInfo.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{authorInfo.subtitle}</p>
                            </div>
                          </>
                        )
                      }
                      return (
                        <>
                          {authorInfo.photo ? (
                            <img src={authorInfo.photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {authorInfo.initial}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white text-sm">{authorInfo.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{authorInfo.subtitle}</p>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDate(selectedAnnouncement.createdAt)}
                </p>
              </div>
              
              {/* Content */}
              <div className="px-4 py-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{selectedAnnouncement.title}</h2>
                <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedAnnouncement.content}
                </div>
              </div>
              
              {/* Media Gallery - Full Width */}
              {selectedAnnouncement.media?.length > 0 && (
                <div className="bg-gray-100 dark:bg-gray-700">
                  {selectedAnnouncement.media.length === 1 ? (
                    <div className="w-full cursor-pointer" onClick={() => openMediaViewer(selectedAnnouncement.media[0], 0, selectedAnnouncement.media)}>
                      {selectedAnnouncement.media[0].type === 'image' ? (
                        <img src={selectedAnnouncement.media[0].url} alt="" className="w-full h-auto object-contain hover:opacity-90 transition-opacity" />
                      ) : (
                        <div className="w-full aspect-video flex items-center justify-center bg-gray-300">
                          <svg className="w-16 h-16 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1">
                      {selectedAnnouncement.media.map((media, idx) => (
                        <div 
                          key={idx} 
                          className="aspect-square overflow-hidden bg-gray-300 cursor-pointer group relative"
                          onClick={() => openMediaViewer(media, idx, selectedAnnouncement.media)}
                        >
                          {media.type === 'image' ? (
                            <img src={media.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-10 h-10 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          )}
                          {idx === 3 && selectedAnnouncement.media.length > 4 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center group-hover:bg-black/70 transition-colors">
                              <p className="text-white font-bold text-xl">+{selectedAnnouncement.media.length - 4}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Target Tags */}
              {selectedAnnouncement.targetTags?.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">Audience Targeting ({selectedAnnouncement.targetTags.length} tag{selectedAnnouncement.targetTags.length !== 1 ? 's' : ''})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAnnouncement.targetTags.map((tag, idx) => (
                      <span key={idx} className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getTagColor(tag)}`}>
                        {getTagDisplayText(tag)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Comments Section */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Comments ({comments.length})</h3>
                
                {/* Reply indicator */}
                {replyingTo && (
                  <div className="mb-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Replying to <span className="font-semibold">{replyingTo.authorName}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                
                {/* Comment Input */}
                <form onSubmit={handleAddComment} className="mb-4">
                  <div className="flex gap-3 mb-3">
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {userProfile?.givenName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="flex-1">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={replyingTo ? `Reply to ${replyingTo.authorName}...` : "Share your thoughts..."}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCommentText('')
                            setReplyingTo(null)
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingComment || !commentText.trim()}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all"
                        >
                          {submittingComment ? 'Posting...' : (replyingTo ? 'Reply' : 'Post')}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
                
                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
                
                {/* Comments List */}
                {loadingComments ? (
                  <div className="text-center py-8">
                    <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Loading comments...</p>
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">No comments yet. Be the first to share your thoughts!</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {/* Parent comments (no parentId) */}
                    {comments.filter(c => !c.parentId).map((comment) => (
                      <div key={comment.id} className={`${comment.status === 'pending_review' ? 'opacity-60' : ''} ${comment.status === 'rejected' ? 'hidden' : ''}`}>
                        <div className="flex gap-3">
                          {comment.authorPhotoURL ? (
                            <img src={comment.authorPhotoURL} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {comment.authorName?.charAt(0) || 'U'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`rounded-lg px-3 py-2 ${comment.status === 'pending_review' ? 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{comment.authorName}</p>
                                {comment.status === 'pending_review' && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded font-medium">Pending Review</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{comment.content}</p>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(comment.createdAt)}</p>
                              <button
                                onClick={() => setReplyingTo({ id: comment.id, authorName: comment.authorName })}
                                className="text-xs text-primary hover:text-primary/80 font-medium"
                              >
                                Reply
                              </button>
                              {canDeleteComment(comment) && (
                                <button
                                  onClick={() => setDeleteCommentConfirm({ open: true, comment })}
                                  className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Replies to this comment */}
                        {comments.filter(reply => reply.parentId === comment.id).map((reply) => (
                          <div key={reply.id} className={`flex gap-3 ml-10 mt-2 ${reply.status === 'pending_review' ? 'opacity-60' : ''} ${reply.status === 'rejected' ? 'hidden' : ''}`}>
                            {reply.authorPhotoURL ? (
                              <img src={reply.authorPhotoURL} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                {reply.authorName?.charAt(0) || 'U'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className={`rounded-lg px-3 py-2 ${reply.status === 'pending_review' ? 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-700'}`}>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{reply.authorName}</p>
                                  {reply.status === 'pending_review' && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded font-medium">Pending</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{reply.content}</p>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{formatDate(reply.createdAt)}</p>
                                {canDeleteComment(reply) && (
                                  <button
                                    onClick={() => setDeleteCommentConfirm({ open: true, comment: reply })}
                                    className="text-[10px] text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Admin Actions */}
              {canModerate && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <button
                    onClick={() => openEditModal(selectedAnnouncement)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirm({ open: true, announcement: selectedAnnouncement })
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      {mediaViewer.open && mediaViewer.media && (
        <div 
          className="flex items-center justify-center bg-black/50 backdrop-blur-sm"
          style={{
            position: 'fixed',
            top: '-50px',
            left: 0,
            right: 0,
            bottom: '-50px',
            paddingTop: '50px',
            paddingBottom: '50px',
            margin: 0,
            zIndex: 99999,
          }}
          onClick={() => setMediaViewer({ open: false, media: null, index: 0, allMedia: [] })}
        >
          {/* Close button */}
          <button
            onClick={() => setMediaViewer({ open: false, media: null, index: 0, allMedia: [] })}
            className="absolute top-[70px] right-4 z-10 p-2 text-white/80 hover:text-white bg-black/50 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Navigation - Previous */}
          {mediaViewer.allMedia.length > 1 && mediaViewer.index > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigateMedia(-1); }}
              className="absolute left-4 z-10 p-3 text-white/80 hover:text-white bg-black/50 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          {/* Navigation - Next */}
          {mediaViewer.allMedia.length > 1 && mediaViewer.index < mediaViewer.allMedia.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigateMedia(1); }}
              className="absolute right-4 z-10 p-3 text-white/80 hover:text-white bg-black/50 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          
          {/* Media content - Full size, not cropped */}
          <div 
            className="flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {mediaViewer.media.type === 'image' ? (
              <img 
                src={mediaViewer.media.url} 
                alt="" 
                className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <video 
                src={mediaViewer.media.url} 
                controls 
                autoPlay
                className="max-w-[95vw] max-h-[85vh] rounded-lg shadow-2xl"
              />
            )}
          </div>
          
          {/* Counter */}
          {mediaViewer.allMedia.length > 1 && (
            <div className="absolute bottom-[70px] left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 text-white text-sm rounded-full">
              {mediaViewer.index + 1} / {mediaViewer.allMedia.length}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editModal.open && editModal.announcement && (
        <div 
          className="z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          style={{
            position: 'fixed',
            top: '-50px',
            left: 0,
            right: 0,
            bottom: '-50px',
            paddingTop: '50px',
            paddingBottom: '50px',
            margin: 0,
          }}
          onClick={() => setEditModal({ open: false, announcement: null })}
        >
          <div 
            className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Announcement</h3>
              <button
                onClick={() => setEditModal({ open: false, announcement: null })}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter announcement title"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content</label>
                <textarea
                  value={editFormData.content}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your announcement content..."
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                <select
                  value={editFormData.priority}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value={PRIORITY_LEVELS.LOW}>Low</option>
                  <option value={PRIORITY_LEVELS.NORMAL}>Normal</option>
                  <option value={PRIORITY_LEVELS.HIGH}>High</option>
                  <option value={PRIORITY_LEVELS.URGENT}>Urgent</option>
                </select>
              </div>
              
              {/* Target Organizations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Audience
                  <span className="font-normal text-gray-500 dark:text-gray-400 ml-1">(Leave empty for campus-wide)</span>
                </label>
                <div className="flex flex-wrap gap-2 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg max-h-48 overflow-y-auto">
                  {organizations.map((org) => (
                    <button
                      key={org.name}
                      type="button"
                      onClick={() => toggleEditTag(org.name)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        editFormData.targetTags.includes(org.name)
                          ? 'bg-primary text-white'
                          : 'bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
                      }`}
                    >
                      {org.name}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Existing Media */}
              {editModal.announcement.media?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Existing Attachments</label>
                  <div className="flex flex-wrap gap-3">
                    {editModal.announcement.media.map((media, idx) => (
                      <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                        {media.type === 'image' ? (
                          <img src={media.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={media.url} className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Note: Editing media requires re-creating the announcement</p>
                </div>
              )}
              
              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditModal({ open: false, announcement: null })}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {editSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.open && deleteConfirm.announcement && (
        <div 
          className="z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          style={{
            position: 'fixed',
            top: '-50px',
            left: 0,
            right: 0,
            bottom: '-50px',
            paddingTop: '50px',
            paddingBottom: '50px',
            margin: 0,
          }}
          onClick={() => setDeleteConfirm({ open: false, announcement: null })}
        >
          <div 
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Announcement?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">This action cannot be undone.</p>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 border-l-4 border-red-500">
              <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2">{deleteConfirm.announcement.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">by {deleteConfirm.announcement.authorName}</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false, announcement: null })}
                disabled={deleting}
                className="flex-1 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.announcement.id)}
                disabled={deleting}
                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Comment Confirmation Modal */}
      {deleteCommentConfirm.open && deleteCommentConfirm.comment && (
        <div 
          className="z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          style={{
            position: 'fixed',
            top: '-50px',
            left: 0,
            right: 0,
            bottom: '-50px',
            paddingTop: '50px',
            paddingBottom: '50px',
            margin: 0,
          }}
          onClick={() => setDeleteCommentConfirm({ open: false, comment: null })}
        >
          <div 
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Comment?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">This action cannot be undone.</p>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 border-l-4 border-red-500">
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{deleteCommentConfirm.comment.content}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">by {deleteCommentConfirm.comment.authorName}</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteCommentConfirm({ open: false, comment: null })}
                disabled={deletingComment}
                className="flex-1 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteComment}
                disabled={deletingComment}
                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {deletingComment ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportModal.open && reportModal.announcement && (
        <div 
          className="z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          style={{
            position: 'fixed',
            top: '-50px',
            left: 0,
            right: 0,
            bottom: '-50px',
            paddingTop: '50px',
            paddingBottom: '50px',
            margin: 0,
          }}
          onClick={() => {
            setReportModal({ open: false, announcement: null })
            setReportReason('')
          }}
        >
          <div 
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0a9 9 0 1 1 0-18 9 9 0 0 1 0 18z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Report Announcement</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Help us keep the community safe</p>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 border-l-4 border-orange-500">
              <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2">{reportModal.announcement.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">by {reportModal.announcement.authorName}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Reason for Report</label>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Please describe why you're reporting this announcement (minimum 10 characters)..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{reportReason.length} characters</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setReportModal({ open: false, announcement: null })
                  setReportReason('')
                }}
                disabled={reportSubmitting}
                className="flex-1 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={reportSubmitting || reportReason.trim().length < 10}
                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reportSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </span>
                ) : (
                  'Submit Report'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Warning Modal (Faculty/President Confirmation) */}
      {contentWarningModal.open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in fade-in zoom-in duration-200">
            {/* Warning Icon */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 animate-pulse">
                <svg className="w-9 h-9 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Content Warning Detected</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Sensitive content has been flagged in your announcement</p>
              </div>
            </div>
            
            {/* Flagged Content Display */}
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-1.5"><ExclamationTriangleIcon className="w-4 h-4" /> Flagged words/phrases:</p>
              <div className="flex flex-wrap gap-2">
                {contentWarningModal.flaggedWords.length > 0 ? (
                  contentWarningModal.flaggedWords.map((item, idx) => (
                    <span key={idx} className="px-2 py-1 text-xs font-bold bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-lg">
                      {typeof item === 'string' ? item : item.word}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-amber-700 dark:text-amber-300">Potentially sensitive content detected</span>
                )}
              </div>
            </div>
            
            {/* Warning Message */}
            <div className="bg-gray-50 dark:bg-gray-700 border-l-4 border-amber-500 p-4 rounded-r-lg mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>As a Faculty member or Organization President,</strong> you have the authority to proceed with this announcement despite the flagged content. 
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Please confirm that this content is appropriate for your intended audience.
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setContentWarningModal({ open: false, flaggedWords: [], onConfirm: null })}
                className="flex-1 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                ← Go Back & Edit
              </button>
              <button
                onClick={contentWarningModal.onConfirm}
                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-all"
              >
                Proceed Anyway →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
