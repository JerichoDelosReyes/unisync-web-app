import { useState, useRef, useEffect } from 'react'
import { getOrganizationOfficers, getCommitteeMembers } from '../../services/organizationService'
import { db } from '../../config/firebase'
import { collection, getDocs } from 'firebase/firestore'

/**
 * AI Chat Component - Enhanced with NLP and Database Integration
 * 
 * Features:
 * - Intent Recognition with confidence scoring
 * - Entity Extraction (time, location, subject, organization, etc.)
 * - Fuzzy string matching for typo tolerance
 * - Context awareness (remembers conversation history)
 * - Sentiment detection (positive, negative, neutral)
 * - Multi-language support (English/Tagalog)
 * - Smart follow-up suggestions
 * - REAL DATA INTEGRATION with Firestore
 * - Privacy-safe responses (no emails, passwords, or sensitive data)
 */

// ============================================
// ORGANIZATION DATA CACHE
// ============================================

// Organization code mappings for recognition
const ORG_ALIASES = {
  'csc': { code: 'CSC', name: 'Computer Science Clique' },
  'computer science clique': { code: 'CSC', name: 'Computer Science Clique' },
  'computer science': { code: 'CSC', name: 'Computer Science Clique' },
  'csg': { code: 'CSG', name: 'Central Student Government' },
  'student government': { code: 'CSG', name: 'Central Student Government' },
  'central student government': { code: 'CSG', name: 'Central Student Government' },
  'bits': { code: 'BITS', name: 'Builders of Innovative Technologist Society' },
  'bms': { code: 'BMS', name: 'Business Management Society' },
  'business management': { code: 'BMS', name: 'Business Management Society' },
  'cyle': { code: 'CYLE', name: 'Cavite Young Leaders for Entrepreneurship' },
  'edge': { code: 'EDGE', name: "Educators' Guild for Excellence" },
  'yopa': { code: 'YOPA', name: 'Young Office Professional Advocates' },
  'chls': { code: 'CHLS', name: 'Circle of Hospitality and Tourism Students' },
  'chts': { code: 'CHLS', name: 'Circle of Hospitality and Tourism Students' },
  'smsp': { code: 'SMSP', name: 'Samahan ng mga Mag-aaral ng Sikolohiya' },
  'sikolohiya': { code: 'SMSP', name: 'Samahan ng mga Mag-aaral ng Sikolohiya' },
  'sinag tala': { code: 'ST', name: 'Sinag-Tala' },
  'sinagtala': { code: 'ST', name: 'Sinag-Tala' },
  'the flare': { code: 'TF', name: 'The Flare' },
  'flare': { code: 'TF', name: 'The Flare' },
  'honor society': { code: 'HS', name: 'Honor Society' },
  'cc': { code: 'CC', name: 'Cavite Communicators' },
  'cavite communicators': { code: 'CC', name: 'Cavite Communicators' }
}

// ============================================
// DATABASE QUERY FUNCTIONS (Privacy-Safe)
// ============================================

/**
 * Get specific officer by position for an organization
 * Returns only name (privacy-safe - no email/phone)
 */
const getOfficerByPosition = async (orgCode, positionQuery) => {
  try {
    const orgData = await getOrganizationOfficers(orgCode)
    if (!orgData || !orgData.officers) return null
    
    // Normalize position query
    const normalizedQuery = positionQuery.toLowerCase().replace(/[^a-z]/g, '')
    
    // Map common queries to position IDs
    const positionMap = {
      'president': 'president',
      'pres': 'president',
      'vp': 'vice_president',
      'vicepresident': 'vice_president',
      'vpinternal': 'vp_internal',
      'vpinternalaffairs': 'vp_internal',
      'vpexternal': 'vp_external',
      'vpexternalaffairs': 'vp_external',
      'secretary': 'secretary',
      'sec': 'secretary',
      'secretarygeneral': 'secretary_general',
      'secgen': 'secretary_general',
      'treasurer': 'treasurer',
      'treas': 'treasurer',
      'treasurergeneral': 'treasurer_general',
      'treasgen': 'treasurer_general',
      'auditor': 'auditor',
      'aud': 'auditor',
      'pro': 'pro',
      'publicrelations': 'pro',
      'publicrelationsofficer': 'pro',
      'adviser': 'adviser',
      'advisor': 'adviser'
    }
    
    const targetPositionId = positionMap[normalizedQuery]
    if (!targetPositionId) return null
    
    // Find officer with matching positionId
    const officer = orgData.officers.find(o => o.positionId === targetPositionId)
    if (!officer) return null
    
    // Get org name from aliases or use code
    const orgName = ORG_ALIASES[orgCode.toLowerCase()]?.name || orgCode
    
    return {
      name: officer.displayName,
      position: officer.positionTitle,
      positionId: officer.positionId,
      orgName
    }
  } catch (error) {
    console.error('Error getting officer by position:', error)
    return null
  }
}

/**
 * Get all officers for an organization
 * Returns only names and positions (privacy-safe)
 */
const getAllOfficers = async (orgCode) => {
  try {
    const orgData = await getOrganizationOfficers(orgCode)
    if (!orgData) return null
    
    const officers = (orgData.officers || []).map(o => ({
      name: o.displayName,
      position: o.positionTitle
    }))
    
    const advisers = (orgData.advisers || []).map(a => ({
      name: a.displayName,
      position: 'Adviser'
    }))
    
    return {
      officers: [...officers, ...advisers],
      orgName: ORG_ALIASES[orgCode.toLowerCase()]?.name || orgCode
    }
  } catch (error) {
    console.error('Error getting all officers:', error)
    return null
  }
}

/**
 * Get committee members (privacy-safe - names only)
 */
const getCommitteeInfo = async (orgCode, committeeId) => {
  try {
    const members = await getCommitteeMembers(orgCode)
    if (!members) return null
    
    // Map committee keywords to IDs
    const committeeMap = {
      'internal': 'internal_affairs',
      'internalaffairs': 'internal_affairs',
      'external': 'external_affairs',
      'externalaffairs': 'external_affairs',
      'membership': 'membership_dues',
      'membershipdues': 'membership_dues',
      'secretariat': 'secretariat',
      'publicity': 'publicity',
      'multimedia': 'multimedia',
      'finance': 'finance_sponsorship',
      'financesponsorship': 'finance_sponsorship',
      'audits': 'audits',
      'documentation': 'documentation'
    }
    
    const normalizedCommittee = committeeId?.toLowerCase().replace(/[^a-z]/g, '') || ''
    const targetCommittee = committeeMap[normalizedCommittee] || normalizedCommittee
    
    const committeeMembers = members[targetCommittee] || []
    
    return {
      orgName: ORG_ALIASES[orgCode.toLowerCase()]?.name || orgCode,
      committee: targetCommittee.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      members: committeeMembers.map(m => ({ name: m.displayName }))
    }
  } catch (error) {
    console.error('Error getting committee info:', error)
    return null
  }
}

/**
 * Get room count statistics
 */
const getRoomStats = async () => {
  try {
    const roomsRef = collection(db, 'rooms')
    const snapshot = await getDocs(roomsRef)
    
    let total = 0
    let occupied = 0
    let vacant = 0
    
    snapshot.forEach(doc => {
      const data = doc.data()
      total++
      if (data.currentSchedule || data.isOccupied) {
        occupied++
      } else {
        vacant++
      }
    })
    
    return { total, occupied, vacant }
  } catch (error) {
    console.error('Error getting room stats:', error)
    return null
  }
}

// ============================================
// NLP UTILITIES
// ============================================

// Common typo corrections map
const TYPO_CORRECTIONS = {
  // Schedule related
  'sked': 'schedule', 'shedule': 'schedule', 'schdule': 'schedule', 'schedle': 'schedule',
  'scheduel': 'schedule', 'shcedule': 'schedule', 'skejul': 'schedule', 'skedyul': 'schedule',
  'scedule': 'schedule', 'schedulle': 'schedule', 'scheduele': 'schedule', 'sche': 'schedule',
  'skd': 'schedule', 'schd': 'schedule', 'isked': 'schedule', 'skeds': 'schedules',
  // Announcement related
  'anouncement': 'announcement', 'annoucement': 'announcement', 'announement': 'announcement',
  'annoucment': 'announcement', 'anounce': 'announce', 'anunsyo': 'announcement',
  'annoucnement': 'announcement', 'announcment': 'announcement', 'anncmnt': 'announcement',
  'annc': 'announcement', 'announce': 'announcement', 'anounc': 'announcement',
  'balita': 'announcement', 'news': 'announcement', 'updates': 'announcement',
  // Room related
  'rom': 'room', 'rooom': 'room', 'rrom': 'room', 'silid': 'room', 'kwarto': 'room',
  'roo': 'room', 'rmm': 'room', 'rm': 'room', 'rms': 'rooms', 'roms': 'rooms',
  'claasroom': 'classroom', 'classrom': 'classroom', 'classrm': 'classroom',
  // Organization related
  'organiztion': 'organization', 'organzation': 'organization', 'orgnization': 'organization',
  'organisasyon': 'organization', 'org': 'organization', 'orgs': 'organizations',
  'organizasyon': 'organization', 'organiation': 'organization', 'orgnaization': 'organization',
  'klub': 'club', 'klubs': 'clubs', 'clubs': 'organizations',
  // Common words
  'hwo': 'how', 'waht': 'what', 'teh': 'the', 'cna': 'can', 'yuo': 'you', 'adn': 'and',
  'taht': 'that', 'wiht': 'with', 'abotu': 'about', 'abuot': 'about', 'baout': 'about',
  'becuase': 'because', 'beacuse': 'because', 'becasue': 'because', 'cuz': 'because', 'coz': 'because',
  'wnat': 'want', 'watn': 'want', 'nede': 'need', 'neeed': 'need', 'ned': 'need',
  'plase': 'please', 'pleae': 'please', 'pls': 'please', 'plz': 'please', 'plss': 'please',
  'thnks': 'thanks', 'thx': 'thanks', 'tnx': 'thanks', 'salamta': 'salamat', 'thnk': 'thanks',
  'hlep': 'help', 'hepl': 'help', 'hellp': 'help', 'tulog': 'tulong', 'hlp': 'help',
  'pano': 'paano', 'panu': 'paano', 'paanu': 'paano', 'pnu': 'paano', 'pao': 'paano',
  'san': 'saan', 'sna': 'saan', 'nasan': 'nasaan', 'nsaan': 'nasaan', 'sn': 'saan',
  'sino': 'sino', 'cno': 'sino', 'sno': 'sino', 'sinu': 'sino', 'cinu': 'sino',
  'ano': 'ano', 'anu': 'ano', 'anong': 'ano ang', 'anon': 'ano', 'anuu': 'ano',
  // Position typos
  'pres': 'president', 'presedent': 'president', 'presidnet': 'president', 'presi': 'president',
  'presidente': 'president', 'presiden': 'president', 'prez': 'president',
  'sec': 'secretary', 'secratary': 'secretary', 'secreatry': 'secretary', 'sekre': 'secretary',
  'sekretaryo': 'secretary', 'secy': 'secretary', 'secretry': 'secretary',
  'treas': 'treasurer', 'treasrer': 'treasurer', 'tresurer': 'treasurer', 'tresuarer': 'treasurer',
  'advisr': 'adviser', 'advsor': 'adviser', 'advisor': 'adviser', 'advsier': 'adviser',
  'oficer': 'officer', 'offcer': 'officer', 'oficers': 'officers', 'offcier': 'officer',
  'oficrs': 'officers', 'ofcr': 'officer', 'ofcrs': 'officers',
  'memebr': 'member', 'meber': 'member', 'membr': 'member', 'mmber': 'member',
  'miyembro': 'member', 'mmbr': 'member', 'membres': 'members',
  // Student/faculty
  'studnt': 'student', 'studen': 'student', 'estudyante': 'student', 'stud': 'student',
  'fculty': 'faculty', 'faculyt': 'faculty', 'guro': 'faculty', 'teacher': 'faculty',
  'techer': 'faculty', 'tcher': 'faculty', 'prof': 'faculty', 'propesor': 'faculty',
  // Class
  'claas': 'class', 'clas': 'class', 'klase': 'class', 'klas': 'class', 'clss': 'class',
  // Actions
  'uploaf': 'upload', 'uplaod': 'upload', 'iupload': 'upload', 'upld': 'upload',
  'veify': 'verify', 'verfiy': 'verify', 'verfy': 'verify', 'vrfy': 'verify',
  'regitration': 'registration', 'registartion': 'registration', 'rehistrasyon': 'registration',
  'cor': 'registration form', 'c.o.r': 'registration form', 'c.o.r.': 'registration form',
  // Greetings
  'helo': 'hello', 'hellow': 'hello', 'hii': 'hi', 'hiii': 'hi', 'heyyy': 'hey',
  'kumsta': 'kumusta', 'kmusta': 'kumusta', 'msta': 'kumusta', 'musta': 'kumusta',
  // Actions
  'cretae': 'create', 'craete': 'create', 'gumwa': 'gumawa', 'gawa': 'gumawa', 'creat': 'create',
  'veiw': 'view', 'viwe': 'view', 'tingnn': 'tingnan', 'tngnan': 'tingnan', 'vw': 'view',
  'fnd': 'find', 'fidn': 'find', 'hanapin': 'find', 'hanap': 'find', 'fid': 'find',
  'jion': 'join', 'jon': 'join', 'sumali': 'join', 'sumla': 'join', 'jn': 'join',
  'requst': 'request', 'rquest': 'request', 'rekwest': 'request', 'req': 'request',
  // Check/see
  'chek': 'check', 'chck': 'check', 'cehck': 'check', 'cheeck': 'check',
  'se': 'see', 'seee': 'see', 'c': 'see',
  // Where/show
  'wher': 'where', 'whre': 'where', 'were': 'where', 'ware': 'where',
  'shwo': 'show', 'shw': 'show', 'shoow': 'show', 'sho': 'show',
  // Available
  'availble': 'available', 'avalable': 'available', 'avail': 'available', 'avlbl': 'available',
  'bakante': 'available', 'libre': 'available', 'vacant': 'available', 'vacnt': 'available'
}

// Normalize text by fixing common typos
const normalizeText = (input) => {
  let normalized = input.toLowerCase().trim()
  
  // Remove extra spaces
  normalized = normalized.replace(/\s+/g, ' ')
  
  // Remove common filler words that don't affect meaning
  const fillers = ['po', 'naman', 'lang', 'nga', 'ba', 'eh', 'ah', 'oh', 'uh', 'um', 'like', 'just', 'actually', 'basically']
  fillers.forEach(filler => {
    normalized = normalized.replace(new RegExp(`\\b${filler}\\b`, 'g'), '')
  })
  
  // Fix typos word by word
  const words = normalized.split(' ')
  const correctedWords = words.map(word => TYPO_CORRECTIONS[word] || word)
  normalized = correctedWords.join(' ').replace(/\s+/g, ' ').trim()
  
  return normalized
}

// Levenshtein distance for fuzzy matching
const levenshteinDistance = (str1, str2) => {
  const m = str1.length
  const n = str2.length
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1
      }
    }
  }
  return dp[m][n]
}

// Calculate similarity score (0-1)
const similarity = (str1, str2) => {
  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return 1
  return 1 - levenshteinDistance(str1.toLowerCase(), str2.toLowerCase()) / maxLen
}

// Fuzzy match - returns true if similarity > threshold
const fuzzyMatch = (input, target, threshold = 0.6) => {
  const words = input.toLowerCase().split(/\s+/)
  const targetLower = target.toLowerCase()
  
  // Exact match
  if (input.toLowerCase().includes(targetLower)) return true
  
  // Word-by-word fuzzy match
  return words.some(word => similarity(word, targetLower) >= threshold)
}

// ============================================
// INTENT DEFINITIONS (Expanded for typo tolerance)
// ============================================

const intents = {
  GREETING: {
    patterns: [
      // English greetings
      'hello', 'hi', 'hey', 'heya', 'hiya', 'yo', 'sup', 'whats up', "what's up", 'wassup',
      'good morning', 'good afternoon', 'good evening', 'good day', 'greetings',
      'howdy', 'hola', 'aloha', 'morning', 'afternoon', 'evening',
      // Filipino greetings
      'kumusta', 'kamusta', 'musta', 'oi', 'uy', 'pre', 'pare', 'bes', 'beshie',
      'magandang umaga', 'magandang hapon', 'magandang gabi', 'magandang tanghali',
      // Casual/informal
      'ayy', 'ey', 'yow', 'hoi', 'hewwo', 'henlo', 'hai', 'hallo'
    ],
    weight: 1.0
  },
  FAREWELL: {
    patterns: [
      'bye', 'goodbye', 'good bye', 'see you', 'see ya', 'later', 'take care',
      'gotta go', 'gtg', 'ttyl', 'talk later', 'cya', 'c ya', 'bai', 'byeee',
      // Filipino
      'paalam', 'babay', 'bye bye', 'sige', 'ingat', 'aalis na ako', 'kailangan ko na umalis',
      'hanggang sa muli', 'salamat sige'
    ],
    weight: 1.0
  },
  THANKS: {
    patterns: [
      'thank', 'thanks', 'thank you', 'thankyou', 'thx', 'ty', 'tysm', 'tyvm',
      'thanks a lot', 'thank you so much', 'much appreciated', 'appreciate it',
      'grateful', 'i appreciate', 'thnx', 'thankss', 'thanku',
      // Filipino
      'salamat', 'maraming salamat', 'salamat po', 'thank you po', 'salamuch',
      'thanks pre', 'tnx', 'thnks'
    ],
    weight: 1.0
  },
  VIEW_SCHEDULE: {
    patterns: [
      // Direct queries
      'view schedule', 'see schedule', 'check schedule', 'my schedule', 'show schedule',
      'class schedule', 'show my class', 'my classes', 'what are my classes',
      'display schedule', 'get schedule', 'open schedule', 'look at schedule',
      // Time-based
      'timetable', 'time table', 'when is my class', 'what time is my class',
      'class times', 'when do i have class', 'class today', 'classes tomorrow',
      // Subject related
      'what subjects', 'my subjects', 'which subjects', 'subject list', 'subject schedule',
      // Questions
      'where to see schedule', 'how to check schedule', 'how to view schedule',
      'how can i see my schedule', 'where is my schedule', 'schedule where',
      'pano makita schedule', 'san makita schedule', 'nasaan schedule ko',
      // Filipino
      'tingnan schedule', 'schedule ko', 'oras ng klase', 'ano klase ko', 'klase ko',
      'ano schedule ko', 'ano sked ko', 'saan makita sched', 'paano makita sched',
      'ipakita schedule', 'check sched', 'tignan sched',
      // Short forms
      'schedule', 'sched', 'sked', 'classes', 'klase',
      // Questions with what/where
      'what is my schedule', 'where can i see schedule', 'show me my schedule',
      'can i see my schedule', 'i want to see my schedule', 'need to check schedule'
    ],
    weight: 1.2
  },
  UPLOAD_SCHEDULE: {
    patterns: [
      // COR/Registration related
      'upload schedule', 'add schedule', 'registration form', 'cor upload', 'upload cor',
      'add registration', 'import schedule', 'submit registration', 'registration upload',
      'how to add schedule', 'how to upload schedule', 'upload my cor', 'submit cor',
      'cor', 'c.o.r', 'c.o.r.', 'certificate of registration', 'upload registration form',
      // Action-based
      'add my schedule', 'input schedule', 'enter schedule', 'set up schedule',
      'setup schedule', 'put schedule', 'insert schedule',
      // Questions
      'how to add schedule', 'where to upload schedule', 'how can i upload',
      'paano mag-upload', 'saan mag-upload ng schedule', 'paano magdagdag schedule',
      // Filipino
      'paano magdagdag schedule', 'upload registration', 'add my schedule',
      'i-upload schedule', 'dagdag schedule', 'ilagay schedule',
      // Contextual
      'no schedule yet', 'schedule not showing', 'add classes', 'input classes'
    ],
    weight: 1.2
  },
  FACULTY_SCHEDULE: {
    patterns: [
      // Faculty-specific
      'faculty schedule', 'teacher schedule', 'teaching schedule', 'professor schedule',
      'instructor schedule', 'my teaching load', 'teaching load',
      // Claim related
      'claim classes', 'claim schedule', 'claim code', 'schedule code', 'class code',
      'how to claim', 'claim my classes', 'claiming schedule', 'get claim code',
      'verify schedule', 'link schedule', 'connect schedule',
      // Questions
      'how do faculty add schedule', 'im a teacher how do i', 'as a faculty',
      'where to claim', 'pano mag-claim', 'paano i-claim',
      // Filipino
      'guro schedule', 'sched ng guro', 'schedule ng faculty', 'code para sa sched',
      'kunin schedule', 'claim ng klase'
    ],
    weight: 1.3
  },
  VIEW_ANNOUNCEMENTS: {
    patterns: [
      // Direct
      'announcements', 'news', 'updates', 'posts', 'latest news', 'recent news',
      'campus news', 'notices', 'bulletin', 'what is new', 'whats new', "what's new",
      'new posts', 'new updates', 'recent posts', 'latest posts', 'latest updates',
      // View/check
      'view announcements', 'check announcements', 'see announcements', 'read announcements',
      'show announcements', 'open announcements', 'view news', 'check news',
      // Questions
      'any announcements', 'any news', 'any updates', 'is there news',
      'what are the announcements', 'what announcements', 'announcement today',
      'where to see news', 'where announcements', 'meron bang balita',
      // Filipino
      'balita', 'anunsyo', 'ano bago', 'ano ang bago', 'mga anunsyo', 'mga balita',
      'tingnan anunsyo', 'mga post', 'ano updates', 'may balita ba',
      'bagong updates', 'bagong balita', 'latest anunsyo'
    ],
    weight: 1.0
  },
  CREATE_ANNOUNCEMENT: {
    patterns: [
      // Create/post
      'create announcement', 'post announcement', 'make announcement', 'new announcement',
      'publish announcement', 'add announcement', 'write announcement', 'compose post',
      'create post', 'make post', 'new post', 'publish post', 'submit post',
      // How to
      'how to post', 'how to create announcement', 'how to announce', 'how to make announcement',
      'where to post', 'can i post', 'i want to post', 'post something',
      'paano mag-post', 'saan mag-post', 'paano gumawa ng announcement',
      // Filipino
      'gumawa ng announcement', 'mag-post', 'mag-announce', 'paano mag-announce',
      'gumawa ng post', 'i-post', 'publish balita', 'share announcement',
      // Contextual
      'share news', 'announce something', 'tell everyone', 'inform students'
    ],
    weight: 1.2
  },
  FILTER_ANNOUNCEMENTS: {
    patterns: [
      // Filter/sort
      'filter announcement', 'filter announcements', 'sort announcements', 'search announcement',
      'find announcement', 'filter by', 'sort by', 'filter posts', 'search posts',
      'organization posts', 'org posts', 'specific org', 'organization post',
      // Looking for
      'announcements from', 'posts from', 'news from', 'find posts from',
      'look for announcement', 'search for announcement', 'looking for post',
      // Filipino
      'hanapin anunsyo', 'filter anunsyo', 'specific na org', 'announcement ng org'
    ],
    weight: 1.1
  },
  FIND_ROOM: {
    patterns: [
      // Room finder
      'find room', 'available room', 'room finder', 'free room', 'vacant room',
      'empty room', 'available rooms', 'room available', 'which room is free',
      'open room', 'unused room', 'unoccupied room',
      // Classroom
      'classroom available', 'available classroom', 'free classroom', 'empty classroom',
      'vacant classroom', 'find classroom', 'which classroom',
      // Status/location
      'room status', 'where is room', 'room location', 'which room', 'what room',
      'is room available', 'is room free', 'room occupied', 'is room occupied',
      // Questions
      'where can i find room', 'how to find room', 'check room availability',
      'any available room', 'available room now', 'room available now',
      'looking for room', 'need room', 'need classroom', 'i need a room',
      // Building
      'building', 'hall', 'venue', 'lecture room', 'lab', 'laboratory',
      // Filipino
      'hanap silid', 'bakanteng room', 'bakante room', 'available silid',
      'may bakanteng room ba', 'saan may room', 'room ba available',
      'silid na bakante', 'may room ba', 'nasaan room', 'san room',
      // Short
      'rooms', 'room', 'silid', 'classroom', 'check room', 'room check'
    ],
    weight: 1.1
  },
  BOOK_ROOM: {
    patterns: [
      // Booking
      'book room', 'reserve room', 'room reservation', 'book a room', 'reserve a room',
      'make reservation', 'booking room', 'reserving room', 'get room', 'rent room',
      // Venue
      'reserve venue', 'book venue', 'venue booking', 'venue reservation',
      'event venue', 'reserve space', 'book space',
      // How to
      'how to book', 'how to reserve', 'where to book room', 'can i book',
      'can i reserve', 'i want to book', 'i need to book', 'room booking',
      // Filipino
      'ireserba room', 'mag-book ng room', 'paano mag-book', 'reserve room',
      'schedule room', 'room para sa event', 'kumuha ng room',
      // Contextual
      'need room for event', 'room for meeting', 'room for presentation'
    ],
    weight: 1.2
  },
  JOIN_ORG: {
    patterns: [
      // Joining
      'join organization', 'join org', 'join an org', 'join club', 'join a club',
      'become member', 'become a member', 'be a member', 'sign up org',
      'register org', 'membership', 'org membership', 'club membership',
      // How to
      'how to join', 'how to join org', 'how can i join', 'where to join',
      'i want to join', 'interested to join', 'can i join', 'apply organization',
      'apply to org', 'apply for membership', 'application org',
      // Specific orgs
      'join bits', 'join csg', 'join csc', 'member ng bits', 'member ng csc',
      // Filipino
      'sumali sa org', 'mag-member', 'paano sumali', 'gusto ko sumali',
      'maging member', 'paano maging member', 'join sa org', 'sali sa org',
      'apply sa org', 'member saan', 'maging miyembro'
    ],
    weight: 1.1
  },
  LIST_ORGS: {
    patterns: [
      // Listing
      'list organizations', 'all organizations', 'organizations list', 'available orgs',
      'list of orgs', 'show orgs', 'show organizations', 'display orgs', 'see orgs',
      // Questions
      'what organizations', 'which organizations', 'what orgs', 'what clubs',
      'campus orgs', 'student orgs', 'student organizations', 'school orgs',
      'university orgs', 'club list', 'clubs list', 'available clubs',
      // About specific
      'what is bits', 'what is csc', 'what is csg', 'what is bms', 'what is chls',
      'about org', 'tell me about', 'about bits', 'about csc', 'about csg',
      'ano ang bits', 'ano ang csc', 'about organization',
      // Filipino
      'ano mga org', 'mga org', 'mga organization', 'lahat ng org', 'mga club',
      'listahan ng org', 'ano ano ang org', 'ilan ang org', 'may org ba'
    ],
    weight: 1.0
  },
  EDIT_PROFILE: {
    patterns: [
      // Edit/update
      'edit profile', 'update profile', 'change profile', 'modify profile',
      'edit my profile', 'update my profile', 'change my profile',
      'profile settings', 'profile edit', 'profile update',
      // Account
      'account settings', 'my account', 'account info', 'edit account',
      'update account', 'change account', 'account settings',
      // Specific changes
      'change name', 'update name', 'change picture', 'update picture',
      'change photo', 'update photo', 'change info', 'update info',
      'change email', 'update email', 'change password',
      'personal information', 'edit information',
      // How to
      'how to edit profile', 'how to change name', 'how to update',
      'where to edit profile', 'can i change my name', 'i want to edit',
      // Filipino
      'baguhin profile', 'i-edit profile', 'palitan profile', 'edit ko profile',
      'paano mag-edit ng profile', 'paano baguhin pangalan',
      'i-update profile', 'settings ng account'
    ],
    weight: 1.1
  },
  VIEW_PROFILE: {
    patterns: [
      'view profile', 'my profile', 'see profile', 'check profile', 'show profile',
      'profile info', 'profile information', 'my information', 'my details',
      'account info', 'my account info', 'display profile', 'open profile',
      // Filipino
      'tingnan profile', 'profile ko', 'see my profile', 'look at profile',
      'ipakita profile', 'impormasyon ko'
    ],
    weight: 1.0
  },
  REQUEST_FACULTY: {
    patterns: [
      // Request
      'request faculty', 'become faculty', 'faculty role', 'apply faculty',
      'faculty request', 'request faculty role', 'faculty application',
      'apply for faculty', 'register as faculty', 'sign up faculty',
      // Verification
      'teacher verification', 'verify faculty', 'faculty verification',
      'verify as teacher', 'teacher role', 'instructor role',
      // How to
      'how to be faculty', 'how to become faculty', 'how to apply faculty',
      'i am a teacher', 'im a faculty', 'i want to be faculty',
      'can i become faculty', 'faculty account', 'teacher account',
      // Filipino
      'gusto maging faculty', 'paano maging faculty', 'apply bilang guro',
      'maging teacher', 'request guro', 'apply as guro'
    ],
    weight: 1.2
  },
  HELP: {
    patterns: [
      // General help
      'help', 'help me', 'i need help', 'can you help', 'assist', 'assist me',
      'support', 'need support', 'assistance', 'need assistance',
      // Questions about bot
      'what can you do', 'what do you do', 'what are you', 'who are you',
      'capabilities', 'features', 'functions', 'your features', 'your functions',
      // How to use
      'how to use', 'how does this work', 'how to', 'guide', 'tutorial',
      'instructions', 'user guide', 'getting started', 'how do i use',
      // Confused
      'i dont know', 'im lost', 'im confused', 'confused', 'stuck', 'i dont understand',
      'what should i do', 'where do i start', 'show me how',
      // Filipino
      'tulong', 'tulungan mo ako', 'paano', 'ano kaya mo', 'ano magagawa mo',
      'paano gamitin', 'pano to', 'pano ba to', 'guide naman',
      'naguguluhan ako', 'hindi ko alam', 'san mag-start'
    ],
    weight: 0.9
  },
  CLASS_REP: {
    patterns: [
      'class representative', 'class rep', 'become rep', 'class officer',
      'student rep', 'section rep', 'be a rep', 'representative role',
      'how to be class rep', 'apply class rep', 'class representative role',
      // Filipino
      'maging rep', 'class rep naman', 'representative ng klase',
      'paano maging rep', 'class officer application'
    ],
    weight: 1.1
  },
  MODERATION: {
    patterns: [
      'moderation', 'moderate', 'moderator', 'review posts', 'pending approval',
      'content review', 'approve post', 'reject post', 'pending posts',
      'posts to review', 'moderate content', 'approval queue',
      'how to moderate', 'moderation tools', 'moderator duties'
    ],
    weight: 1.0
  },
  COMPLAINT: {
    patterns: [
      // Problems
      'not working', 'doesnt work', "doesn't work", 'broken', 'bug', 'error',
      'problem', 'issue', 'glitch', 'crash', 'crashing', 'freezing',
      'something wrong', 'went wrong', 'malfunctioning', 'malfunction',
      // Specific issues
      'cant load', "can't load", 'wont load', "won't load", 'not loading',
      'cant see', "can't see", 'not showing', 'not displaying', 'missing',
      'slow', 'lagging', 'laggy', 'stuck', 'frozen', 'blank page',
      // Help fix
      'help me fix', 'how to fix', 'fix this', 'please fix', 'need fix',
      // Filipino
      'hindi gumagana', 'sira', 'mali', 'may problema', 'ayaw gumana',
      'error to', 'di gumagana', 'bakit ganito', 'ang bagal',
      'hindi lumalabas', 'hindi naglo-load'
    ],
    weight: 1.0
  },
  POSITIVE_FEEDBACK: {
    patterns: [
      'great', 'awesome', 'amazing', 'perfect', 'excellent', 'wonderful',
      'fantastic', 'brilliant', 'love it', 'love this', 'best', 'superb',
      'nice', 'cool', 'neat', 'good job', 'well done', 'impressive',
      'thank you bot', 'youre helpful', "you're helpful", 'very helpful',
      // Filipino
      'maganda', 'galing', 'ang galing', 'ang husay', 'nice naman',
      'bet ko to', 'solid', 'astig', 'thanks bot', 'salamat bot'
    ],
    weight: 0.8
  },
  ORG_OFFICER: {
    patterns: [
      // President
      'who is the president', 'who is president', 'whos the president', "who's the president",
      'president of', 'sino presidente', 'sino ang president', 'sino pres',
      'current president', 'present ng', 'president ng',
      // Vice president
      'who is the vice president', 'who is vice president', 'vice president of', 'vp of',
      'sino vp', 'sino vice president', 'sino ang vp',
      // Secretary
      'who is the secretary', 'who is secretary', 'secretary of', 'sino secretary',
      'sino ang secretary', 'sino sec',
      // Treasurer
      'who is the treasurer', 'who is treasurer', 'treasurer of', 'sino treasurer',
      'sino ang treasurer', 'sino treas',
      // Auditor
      'who is the auditor', 'who is auditor', 'auditor of', 'sino auditor',
      'sino ang auditor',
      // PIO
      'who is the pio', 'who is pio', 'pio of', 'public information officer',
      'sino pio', 'sino ang pio',
      // Adviser
      'who is the adviser', 'who is adviser', 'adviser of', 'advisor of',
      'sino adviser', 'sino advisor', 'sino ang adviser',
      // General
      'who leads', 'leader of', 'head of', 'current officers', 'officer ng',
      'sino ang', 'sino yung', 'who is in charge', 'whos in charge'
    ],
    weight: 1.5
  },
  ORG_OFFICERS_LIST: {
    patterns: [
      'list officers', 'all officers', 'officers of', 'show officers', 'display officers',
      'who are the officers', 'officers list', 'officer list', 'view officers',
      'complete officers', 'full officer list', 'get officers', 'see officers',
      // Team
      'team of', 'members of executive', 'executive board', 'exec board',
      'leadership team', 'org team', 'organization team',
      // Filipino
      'sino mga officers', 'lahat ng officers', 'officers ng', 'mga officer ng',
      'sino sino officers', 'listahan ng officers', 'officers lahat'
    ],
    weight: 1.4
  },
  ORG_COMMITTEE: {
    patterns: [
      // Committee general
      'committee members', 'who is in committee', 'committee of', 'committee list',
      'show committee', 'display committee', 'view committee',
      // Specific committees
      'internal committee', 'internal affairs', 'external committee', 'external affairs',
      'documentation committee', 'docu committee', 'finance committee', 'finance and sponsorship',
      'logistics committee', 'publicity committee', 'multimedia committee',
      'ways and means', 'sports committee', 'academics committee', 'secretariat',
      'membership committee', 'audits committee',
      // Filipino
      'sino sa committee', 'members ng committee', 'committee ng', 'miyembro ng committee',
      'sino mga nasa', 'sino kasama sa'
    ],
    weight: 1.4
  },
  ROOM_STATS: {
    patterns: [
      'how many rooms', 'room statistics', 'room count', 'total rooms',
      'available rooms count', 'occupied rooms', 'occupied rooms count',
      'vacant rooms count', 'room status overall', 'room summary',
      'room numbers', 'overall room status', 'all rooms status',
      // Filipino
      'ilan ang rooms', 'ilan mga room', 'gaano karaming room',
      'ilang room available', 'ilang room occupied', 'statistics ng room'
    ],
    weight: 1.2
  }
}

// ============================================
// ENTITY EXTRACTION
// ============================================

const entityPatterns = {
  time: /\b(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm)|morning|afternoon|evening|umaga|hapon|gabi)\b/gi,
  day: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|miyerkules|huwebes|biyernes|sabado|linggo|today|tomorrow|bukas|ngayon)\b/gi,
  room: /\b(room\s*\d+|rm\s*\d+|[a-z]+\s*building|[a-z]+\s*hall|\d{3,4}[a-z]?)\b/gi,
  organization: /\b(csg|bits|csc|bms|cyle|edge|yopa|chls|sinag.?tala|the\s*flare|honor\s*society|smsp|computer\s*science\s*circle|computer\s*society|business\s*management\s*society|hospitality\s*league|young\s*professionals|youth\s*organization)\b/gi,
  subject: /\b(it\s*\d+|cs\s*\d+|math\s*\d+|eng\s*\d+|[a-z]{2,4}\s*\d{3,4})\b/gi,
  position: /\b(president|vice\s*president|vp|secretary|treasurer|auditor|pio|public\s*information\s*officer|adviser|advisor|head|leader|chairperson|chair)\b/gi
}

// Extract organization from input using ORG_ALIASES
const extractOrganization = (input) => {
  const lowerInput = input.toLowerCase()
  for (const [alias, orgData] of Object.entries(ORG_ALIASES)) {
    if (lowerInput.includes(alias)) {
      return orgData.code // Return just the code string, not the object
    }
  }
  return null
}

// Extract position from input
const extractPosition = (input) => {
  const lowerInput = input.toLowerCase()
  const positionMap = {
    'president': 'president',
    'vice president': 'vicePresident',
    'vp': 'vicePresident',
    'secretary': 'secretary',
    'treasurer': 'treasurer',
    'auditor': 'auditor',
    'pio': 'pio',
    'public information officer': 'pio',
    'adviser': 'adviser',
    'advisor': 'adviser'
  }
  
  for (const [keyword, position] of Object.entries(positionMap)) {
    if (lowerInput.includes(keyword)) {
      return position
    }
  }
  return null
}

const extractEntities = (input) => {
  const entities = {}
  const lowerInput = input.toLowerCase()
  
  for (const [entityType, pattern] of Object.entries(entityPatterns)) {
    const matches = lowerInput.match(pattern)
    if (matches) {
      entities[entityType] = [...new Set(matches)]
    }
  }
  
  return entities
}

// ============================================
// SENTIMENT ANALYSIS
// ============================================

const sentimentWords = {
  positive: [
    'good', 'great', 'awesome', 'love', 'like', 'nice', 'excellent', 'perfect',
    'amazing', 'wonderful', 'fantastic', 'thank', 'happy', 'helpful', 'best',
    'maganda', 'galing', 'salamat', 'masaya', 'ayos', 'nice'
  ],
  negative: [
    'bad', 'terrible', 'awful', 'hate', 'wrong', 'error', 'broken', 'not working',
    'problem', 'issue', 'bug', 'frustrated', 'angry', 'confused', 'lost',
    'hindi', 'mali', 'sira', 'galit', 'hindi gumagana', 'ayaw'
  ]
}

const analyzeSentiment = (input) => {
  const lowerInput = input.toLowerCase()
  let positiveScore = 0
  let negativeScore = 0
  
  sentimentWords.positive.forEach(word => {
    if (lowerInput.includes(word)) positiveScore++
  })
  
  sentimentWords.negative.forEach(word => {
    if (lowerInput.includes(word)) negativeScore++
  })
  
  if (positiveScore > negativeScore) return 'positive'
  if (negativeScore > positiveScore) return 'negative'
  return 'neutral'
}

// ============================================
// INTENT RECOGNITION (Enhanced with typo tolerance)
// ============================================

const recognizeIntent = (input) => {
  // Apply typo corrections and normalization first
  const normalizedInput = normalizeText(input)
  const originalInput = input.toLowerCase().trim()
  
  let bestMatch = { intent: null, confidence: 0 }
  
  // First, check for organization + position queries (these are high priority)
  const orgCode = extractOrganization(originalInput) || extractOrganization(normalizedInput)
  const position = extractPosition(originalInput) || extractPosition(normalizedInput)
  if (orgCode && position) {
    return { intent: 'ORG_OFFICER', confidence: 1.0 }
  }
  if (orgCode && (normalizedInput.includes('officer') || normalizedInput.includes('who') || originalInput.includes('officer') || originalInput.includes('who'))) {
    return { intent: 'ORG_OFFICER', confidence: 0.9 }
  }
  
  // Try matching with both normalized and original input
  const inputsToCheck = [normalizedInput, originalInput]
  
  for (const checkInput of inputsToCheck) {
    for (const [intentName, intentData] of Object.entries(intents)) {
      for (const pattern of intentData.patterns) {
        const patternLower = pattern.toLowerCase()
        
        // Exact match (input equals pattern)
        if (checkInput === patternLower) {
          return { intent: intentName, confidence: 1.0 }
        }
        
        // Pattern is contained in input
        if (checkInput.includes(patternLower)) {
          // Give higher confidence to longer pattern matches
          const confidence = Math.min((patternLower.length / Math.max(checkInput.length, 1)) * intentData.weight * 1.5, 1)
          if (confidence > bestMatch.confidence) {
            bestMatch = { intent: intentName, confidence }
          }
        }
        
        // Input is contained in pattern (for short queries like "rooms")
        if (patternLower.includes(checkInput) && checkInput.length >= 3) {
          const confidence = 0.6 * intentData.weight
          if (confidence > bestMatch.confidence) {
            bestMatch = { intent: intentName, confidence }
          }
        }
        
        // Fuzzy match for typos (more lenient threshold of 0.55)
        if (fuzzyMatch(checkInput, patternLower, 0.55)) {
          const confidence = 0.7 * intentData.weight
          if (confidence > bestMatch.confidence) {
            bestMatch = { intent: intentName, confidence }
          }
        }
        
        // Word overlap matching for longer queries
        const inputWords = new Set(checkInput.split(/\s+/).filter(w => w.length > 2))
        const patternWords = patternLower.split(/\s+/).filter(w => w.length > 2)
        
        if (patternWords.length > 0 && inputWords.size > 0) {
          const matchedWords = patternWords.filter(pw => 
            [...inputWords].some(iw => similarity(iw, pw) >= 0.7)
          )
          const overlap = matchedWords.length / patternWords.length
          if (overlap >= 0.6) {
            const confidence = overlap * intentData.weight * 0.8
            if (confidence > bestMatch.confidence) {
              bestMatch = { intent: intentName, confidence }
            }
          }
        }
      }
    }
  }
  
  // Lower threshold for matching
  if (bestMatch.confidence < 0.12) {
    return { intent: 'UNKNOWN', confidence: 0 }
  }
  
  return bestMatch
}

// ============================================
// RESPONSE TEMPLATES
// ============================================

const responses = {
  GREETING: [
    "Hello! 👋 I'm UNISYNC AI, your campus assistant. How can I help you today?",
    "Hi there! Kumusta! I'm here to help with schedules, announcements, rooms, and more. What do you need?",
    "Hey! Welcome to UNISYNC. Ask me anything about the campus system! 🎓",
    "Magandang araw! I'm your AI assistant. How may I assist you today?"
  ],
  FAREWELL: [
    "Goodbye! Feel free to come back if you have more questions. Paalam! 👋",
    "Take care! I'm always here if you need help. Ingat!",
    "See you later! Don't hesitate to ask if you need anything. Sige, paalam!"
  ],
  THANKS: [
    "You're welcome! Is there anything else I can help you with? 😊",
    "Walang anuman! Happy to help. Need anything else?",
    "Glad I could help! Let me know if you have more questions.",
    "My pleasure! Don't hesitate to ask more questions. 🙌"
  ],
  VIEW_SCHEDULE: [
    "📅 Viewing Your Schedule\n\nYou can find your class schedule in the Schedule page:\n\n1. Click 'Schedule' in the sidebar\n2. Your classes appear based on your uploaded registration form\n3. View by day or week format\n\n(Pumunta sa Schedule page para makita ang iyong mga klase.)"
  ],
  UPLOAD_SCHEDULE: [
    "📤 Uploading Your Schedule\n\nTo add your class schedule:\n\n1. Go to the Schedule page\n2. Click 'Add Registration Form'\n3. Upload your COR (Certificate of Registration) PDF\n4. The system automatically extracts your classes!\n\n(I-upload ang iyong COR para ma-extract ang schedule mo.)"
  ],
  FACULTY_SCHEDULE: [
    "👨‍🏫 Faculty Schedule Management\n\nAs a faculty member:\n\n1. Go to Schedule page\n2. Click the 'Claim Classes' tab\n3. Enter the schedule codes from student CORs\n4. Once claimed, you'll see your teaching schedule and student lists!\n\n(Mag-claim ng schedule codes para makita ang iyong teaching schedule.)"
  ],
  VIEW_ANNOUNCEMENTS: [
    "📢 Viewing Announcements\n\nThe Announcements page shows:\n\n• Campus-wide updates\n• Department-specific news\n• Organization posts\n• Urgent notices (pinned at top)\n\nUse the filter tabs (All, Important, Academic, General, Organizations) to find what you need!\n\n(Pumunta sa Announcements para sa mga balita at updates.)"
  ],
  CREATE_ANNOUNCEMENT: [
    "✏️ Creating Announcements\n\nTo post an announcement:\n\n1. Go to Announcements page\n2. Click 'Create' button\n3. Fill in:\n   • Title and content\n   • Priority level (Urgent/High/Normal/Low)\n   • Target audience (department, year level, section)\n   • Attach images or videos (optional)\n4. Submit for review!\n\n(I-click ang Create button para gumawa ng announcement.)"
  ],
  FILTER_ANNOUNCEMENTS: [
    "🔍 Filtering Announcements\n\nTo find specific posts:\n\n1. Use the category tabs (All, Important, Academic, General, Orgs)\n2. Click on organization logos to filter by org\n3. Announcements are automatically filtered based on your department and year level"
  ],
  FIND_ROOM: [
    "🏫 Finding Available Rooms\n\nTo check room availability:\n\n1. Go to Room Status in the sidebar\n2. Select the building (e.g., Main Building, Annex)\n3. View rooms by floor\n4. Green = Vacant, Red = Occupied\n\n(Pumunta sa Room Status para makita ang available na mga silid.)"
  ],
  BOOK_ROOM: [
    "📋 Room Booking\n\nTo reserve a room for events:\n\n1. Find an available room in Room Status\n2. Contact the Admin Office for official bookings\n3. Provide event details, date, and time"
  ],
  JOIN_ORG: [
    "🤝 Joining Organizations\n\nTo become a member:\n\n1. Browse organization posts in Announcements\n2. Look for membership drives or application announcements\n3. Contact the org through their posted details\n4. Follow their application process\n\nActive Campus Organizations:\nCSG, BITS, CSC, BMS, CYLE, EDGE, YOPA, and more!\n\n(Tingnan ang announcements para sa membership drives.)"
  ],
  LIST_ORGS: [
    "🏛️ Campus Organizations\n\n• CSG - Central Student Government\n• BITS - Builders of Innovative Technologist Society\n• CSC - Computer Science Clique\n• BMS - Business Management Society\n• CYLE - Cavite Young Leaders for Entrepreneurship\n• EDGE - Educators' Guild for Excellence\n• YOPA - Young Office Professional Advocates\n• CHLS - Circle of Hospitality & Tourism Students\n• Sinag-Tala - Literary & Arts\n• The Flare - Campus Publication\n• Honor Society"
  ],
  EDIT_PROFILE: [
    "⚙️ Editing Your Profile\n\nTo update your information:\n\n1. Click your profile picture in the sidebar\n2. Go to Account Settings\n3. Edit your:\n   • Display name\n   • Department\n   • Year level & section\n   • Profile photo\n4. Save changes!\n\n(I-click ang profile picture mo para ma-edit ang iyong information.)"
  ],
  VIEW_PROFILE: [
    "👤 Your Profile\n\nYour profile contains:\n\n• Personal information (name, email)\n• Role (Student/Faculty/Admin)\n• Department & year level\n• Organization memberships\n• Tagged groups\n\nClick your profile picture in the sidebar to view or edit.\n\n(I-click ang profile mo sa sidebar para makita ang details.)"
  ],
  REQUEST_FACULTY: [
    "🎓 Requesting Faculty Role\n\nTo get verified as faculty:\n\n1. Go to Dashboard\n2. Find the 'Faculty Role Verification' card\n3. Click 'Request Faculty Role'\n4. Upload your Faculty ID for verification\n5. Wait for admin approval\n\n(Pumunta sa Dashboard at i-click ang Request Faculty Role.)"
  ],
  HELP: [
    "🤖 I'm UNISYNC AI - Your Campus Assistant!\n\nI can help you with:\n\n📅 Schedule - View classes, upload COR, claim teaching schedules\n📢 Announcements - Browse, create, and filter posts\n🏫 Rooms - Find available classrooms\n🏛️ Organizations - Learn about campus orgs\n👤 Profile - Update your information\n🎓 Faculty - Request role verification\n\nJust ask me in English or Tagalog!\n\nTry: \"How do I view my schedule?\" or \"Paano gumawa ng announcement?\""
  ],
  CLASS_REP: [
    "👑 Class Representative Role\n\nClass Representatives can:\n\n• Create announcements for their section\n• Moderate comments on posts\n• Represent their class in the system\n\nTo become a Class Rep:\nContact your department head or student affairs office for the tagging process.\n\n(Makipag-ugnay sa department head para maging Class Representative.)"
  ],
  MODERATION: [
    "🛡️ Content Moderation\n\nFor Moderators and Admins:\n\n1. Go to Announcement Review page\n2. Review pending announcements\n3. Approve or reject with feedback\n4. Manage flagged content"
  ],
  COMPLAINT: [
    "😟 I'm sorry you're having issues!\n\nHere's what you can do:\n\n1. Refresh the page - Sometimes this fixes temporary issues\n2. Clear browser cache - Old data can cause problems\n3. Try a different browser - Chrome or Firefox work best\n4. Contact support - Report persistent issues to campus IT\n\nCan you describe the specific problem you're experiencing? I'll try to help! 💪"
  ],
  POSITIVE_FEEDBACK: [
    "Thank you so much! 😊 I'm glad I could help. Is there anything else you'd like to know about UNISYNC?",
    "That's great to hear! Salamat! Let me know if you have more questions! 🎉",
    "Awesome! I'm always here to help. Feel free to ask anything else! 💚"
  ],
  // Dynamic responses - these are placeholders that get replaced with real data
  ORG_OFFICER: [
    "DYNAMIC_OFFICER_RESPONSE"
  ],
  ORG_OFFICERS_LIST: [
    "DYNAMIC_OFFICERS_LIST_RESPONSE"
  ],
  ORG_COMMITTEE: [
    "DYNAMIC_COMMITTEE_RESPONSE"
  ],
  ROOM_STATS: [
    "DYNAMIC_ROOM_STATS_RESPONSE"
  ],
  UNKNOWN: [
    "I'm not quite sure I understand. 🤔 Could you rephrase that?\n\nI can help with:\n• Schedule - \"how to view schedule\", \"upload cor\"\n• Announcements - \"check news\", \"create post\"\n• Rooms - \"find available room\"\n• Organizations - \"who is csc president\", \"officers of bits\"\n• Profile - \"edit profile\", \"account settings\"",
    "Hmm, I didn't catch that. 🤔\n\nTry asking about:\n📅 \"Where is my schedule?\" or \"saan makita sched ko?\"\n📢 \"Any announcements?\" or \"may balita ba?\"\n🏫 \"Find room\" or \"bakanteng room?\"\n🏛️ \"Who is BITS president?\" or \"sino officers?\"\n\n(Subukan ulit in simpler words!)",
    "Sorry, I'm not sure what you mean. 😅\n\nHere are some things you can ask me:\n• \"View my schedule\" - See your classes\n• \"Check announcements\" - Latest news\n• \"Room available\" - Find vacant rooms\n• \"CSC officers\" - Organization info\n• \"Help\" - See all features\n\n(Type 'help' to see everything I can do!)",
    "I couldn't understand that one. 🤖\n\nTry typing:\n• \"sched\" for schedule help\n• \"announce\" for announcements\n• \"room\" for room finder\n• \"org\" for organization info\n• \"help\" for full guide\n\nOr ask me in Taglish - gets ko yan! 💪"
  ]
}

// ============================================
// SMART SUGGESTIONS (Expanded)
// ============================================

const getSuggestions = (intent, input = '') => {
  const suggestionMap = {
    VIEW_SCHEDULE: ['How to upload COR?', 'Faculty schedule?', 'View room availability', 'Check announcements'],
    UPLOAD_SCHEDULE: ['View my schedule', 'Find available rooms', 'Create announcement', 'List organizations'],
    FACULTY_SCHEDULE: ['Upload schedule', 'View announcements', 'Find rooms', 'Help'],
    VIEW_ANNOUNCEMENTS: ['Create announcement', 'Filter by organization', 'View schedule', 'Find rooms'],
    CREATE_ANNOUNCEMENT: ['View announcements', 'Check schedule', 'Room finder', 'List orgs'],
    FILTER_ANNOUNCEMENTS: ['All announcements', 'Create post', 'Check schedule', 'Rooms'],
    FIND_ROOM: ['Book a room', 'View schedule', 'Check announcements', 'Room statistics'],
    BOOK_ROOM: ['Find available rooms', 'Room stats', 'View schedule', 'Announcements'],
    JOIN_ORG: ['List organizations', 'CSC officers', 'BITS officers', 'View announcements'],
    LIST_ORGS: ['CSC officers?', 'BITS officers?', 'CSG officers?', 'How to join org?'],
    EDIT_PROFILE: ['View my profile', 'Check schedule', 'Announcements', 'Help'],
    VIEW_PROFILE: ['Edit profile', 'View schedule', 'Check announcements', 'Rooms'],
    REQUEST_FACULTY: ['View schedule', 'Announcements', 'Help', 'Find rooms'],
    GREETING: ['View my schedule', 'Check announcements', 'Find rooms', 'CSC officers?'],
    FAREWELL: ['View schedule', 'Announcements', 'Rooms', 'Organizations'],
    THANKS: ['Anything else?', 'View schedule', 'Check announcements', 'Find rooms'],
    HELP: ['View schedule', 'Announcements', 'Room finder', 'CSC president?'],
    CLASS_REP: ['View announcements', 'Create post', 'Profile settings', 'Help'],
    MODERATION: ['View announcements', 'Schedule', 'Rooms', 'Help'],
    COMPLAINT: ['Refresh page', 'Clear cache', 'Contact support', 'Help'],
    POSITIVE_FEEDBACK: ['View schedule', 'Announcements', 'Rooms', 'Orgs'],
    ORG_OFFICER: ['All officers of this org?', 'Officers of other orgs?', 'Committee members?', 'How to join?'],
    ORG_OFFICERS_LIST: ['Specific officer?', 'Committee members?', 'How to join?', 'Announcements'],
    ORG_COMMITTEE: ['List all officers', 'Other committees?', 'How to join?', 'Announcements'],
    ROOM_STATS: ['Find specific room', 'Book a room', 'View schedule', 'Announcements'],
    UNKNOWN: ['How to view schedule?', 'Check announcements', 'Find available rooms', 'Help']
  }
  
  return suggestionMap[intent] || suggestionMap.UNKNOWN
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      type: 'bot', 
      text: "Hello! 👋 I'm UNISYNC AI, your smart campus assistant.\n\nI can help you with schedules, announcements, rooms, and more. Just ask in English or Tagalog!\n\n(Kumusta! Paano kita matutulungan?)",
      suggestions: ['View my schedule', 'Check announcements', 'Find rooms', 'Help']
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationContext, setConversationContext] = useState({
    lastIntent: null,
    entities: {},
    messageCount: 0
  })
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion)
    // Trigger send
    setTimeout(() => {
      handleSendWithInput(suggestion)
    }, 100)
  }

  const handleSendWithInput = async (input) => {
    if (!input.trim()) return

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: input
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Process with NLP (async for database queries)
    try {
      const response = await processInput(input)
      const botMessage = {
        id: messages.length + 2,
        type: 'bot',
        text: response.text,
        suggestions: response.suggestions
      }
      setMessages(prev => [...prev, botMessage])
      
      // Update context
      setConversationContext(prev => ({
        lastIntent: response.intent,
        entities: { ...prev.entities, ...response.entities },
        messageCount: prev.messageCount + 1
      }))
    } catch (error) {
      console.error('Error processing message:', error)
      const errorMessage = {
        id: messages.length + 2,
        type: 'bot',
        text: "Sorry, I encountered an error while processing your request. Please try again! 🙁",
        suggestions: ['Try again', 'Help', 'View schedule']
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    await handleSendWithInput(inputValue)
  }

  const processInput = async (userInput) => {
    // Intent recognition
    const { intent, confidence } = recognizeIntent(userInput)
    
    // Entity extraction
    const entities = extractEntities(userInput)
    
    // Sentiment analysis
    const sentiment = analyzeSentiment(userInput)
    
    // Get response (async for database queries)
    let responseText = await getResponse(intent, entities, sentiment, conversationContext, userInput)
    
    // Get suggestions
    const suggestions = getSuggestions(intent)
    
    return {
      text: responseText,
      suggestions,
      intent,
      entities,
      confidence
    }
  }

  const getResponse = async (intent, entities, sentiment, context, userInput) => {
    // Handle dynamic database queries for organization intents
    if (intent === 'ORG_OFFICER') {
      const orgCode = extractOrganization(userInput)
      const position = extractPosition(userInput)
      
      if (orgCode && position) {
        const officer = await getOfficerByPosition(orgCode, position)
        if (officer) {
          return `👤 ${officer.position} of ${officer.orgName || orgCode}\n\nThe current ${officer.position} is ${officer.name}.`
        } else {
          const positionDisplayName = position.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          return `I couldn't find the ${positionDisplayName} for ${orgCode}. The organization might not have filled this position yet.`
        }
      } else if (orgCode && !position) {
        // They asked about an org but didn't specify position, list all officers
        const officerData = await getAllOfficers(orgCode)
        if (officerData && officerData.officers && officerData.officers.length > 0) {
          let response = `👥 Officers of ${officerData.orgName || orgCode}\n\n`
          officerData.officers.forEach(({ position, name }) => {
            response += `• ${position}: ${name}\n`
          })
          return response
        } else {
          return `I couldn't find officer information for ${orgCode}. The organization data might not be available yet.`
        }
      } else {
        return "I can tell you about organization officers! Please specify which organization you're asking about.\n\nFor example:\n• \"Who is the president of CSC?\"\n• \"Who are the officers of BITS?\"\n\nAvailable organizations: CSG, BITS, CSC, BMS, CYLE, EDGE, YOPA, CHLS, Sinag-Tala, The Flare, Honor Society"
      }
    }
    
    if (intent === 'ORG_OFFICERS_LIST') {
      const orgCode = extractOrganization(userInput)
      
      if (orgCode) {
        const officerData = await getAllOfficers(orgCode)
        if (officerData && officerData.officers && officerData.officers.length > 0) {
          let response = `👥 Officers of ${officerData.orgName || orgCode}\n\n`
          officerData.officers.forEach(({ position, name }) => {
            response += `• ${position}: ${name}\n`
          })
          return response
        } else {
          return `I couldn't find officer information for ${orgCode}. The organization data might not be available yet.`
        }
      } else {
        return "Which organization's officers would you like to know about?\n\nAvailable organizations: CSG, BITS, CSC, BMS, CYLE, EDGE, YOPA, CHLS, Sinag-Tala, The Flare, Honor Society"
      }
    }
    
    if (intent === 'ORG_COMMITTEE') {
      const orgCode = extractOrganization(userInput)
      
      if (orgCode) {
        // Try to extract committee name from input
        const lowerInput = userInput.toLowerCase()
        let committeeType = null
        const committeeKeywords = ['internal', 'external', 'documentation', 'finance', 'logistics', 'publicity', 'ways and means', 'sports', 'academics', 'membership', 'secretariat', 'multimedia', 'audits']
        for (const keyword of committeeKeywords) {
          if (lowerInput.includes(keyword)) {
            committeeType = keyword
            break
          }
        }
        
        if (!committeeType) {
          return `Which committee of ${orgCode} would you like to know about?\n\nCommon committees include: Internal Affairs, External Affairs, Membership, Finance, Publicity, Documentation, etc.`
        }
        
        const committee = await getCommitteeInfo(orgCode, committeeType)
        if (committee && committee.members && committee.members.length > 0) {
          let response = `📋 ${committee.committee} - ${committee.orgName || orgCode}\n\nMembers:\n`
          committee.members.forEach(member => {
            response += `• ${member.name}\n`
          })
          return response
        } else {
          return `I couldn't find committee information for ${orgCode}${committeeType ? ` (${committeeType} committee)` : ''}. This data might not be available yet.`
        }
      } else {
        return "Which organization's committee would you like to know about?\n\nFor example: \"Who is in the Internal Committee of CSC?\""
      }
    }
    
    if (intent === 'ROOM_STATS') {
      const stats = await getRoomStats()
      if (stats) {
        return `🏫 Room Statistics\n\nTotal Rooms: ${stats.total}\nVacant: ${stats.vacant} 🟢\nOccupied: ${stats.occupied} 🔴`
      } else {
        return "I couldn't fetch room statistics right now. Please check the Room Status page for current availability."
      }
    }
    
    // Get response templates for intent
    const templates = responses[intent] || responses.UNKNOWN
    
    // Pick a random response from templates
    let response = templates[Math.floor(Math.random() * templates.length)]
    
    // Personalize based on entities
    if (entities.organization && entities.organization.length > 0) {
      const org = entities.organization[0].toUpperCase()
      response = response.replace(/organizations?/gi, org)
    }
    
    return response
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-40 group"
        aria-label="Open AI Assistant"
      >
        {/* Minimalist Robot Icon */}
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Antenna */}
          <line x1="12" y1="2" x2="12" y2="5" />
          <circle cx="12" cy="2" r="1" fill="currentColor" />
          {/* Head */}
          <rect x="5" y="5" width="14" height="10" rx="2" />
          {/* Eyes */}
          <circle cx="9" cy="10" r="1.5" fill="currentColor" />
          <circle cx="15" cy="10" r="1.5" fill="currentColor" />
          {/* Body */}
          <rect x="7" y="15" width="10" height="6" rx="1" />
          {/* Feet */}
          <line x1="9" y1="21" x2="9" y2="23" />
          <line x1="15" y1="21" x2="15" y2="23" />
        </svg>
        <span className="absolute bottom-16 right-0 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
          🤖 UNISYNC AI Assistant
        </span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 max-h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-500 text-white rounded-t-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            {/* Minimalist Robot Icon */}
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="5" />
              <circle cx="12" cy="2" r="1" fill="currentColor" />
              <rect x="5" y="5" width="14" height="10" rx="2" />
              <circle cx="9" cy="10" r="1.5" fill="currentColor" />
              <circle cx="15" cy="10" r="1.5" fill="currentColor" />
              <rect x="7" y="15" width="10" height="6" rx="1" />
              <line x1="9" y1="21" x2="9" y2="23" />
              <line x1="15" y1="21" x2="15" y2="23" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold">UNISYNC AI</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
              <p className="text-xs text-green-100">Smart Assistant • Online</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          aria-label="Close chat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 max-h-[400px]">
        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-green-500 text-white rounded-br-md'
                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-md shadow-sm border border-gray-100 dark:border-gray-600'
                }`}
              >
                <p className="text-sm whitespace-pre-line">{message.text}</p>
              </div>
            </div>
            
            {/* Suggestions */}
            {message.type === 'bot' && message.suggestions && (
              <div className="flex flex-wrap gap-2 ml-2">
                {message.suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-xs px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors border border-green-200 dark:border-green-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 dark:border-gray-600">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 rounded-b-2xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me anything... (English/Tagalog)"
            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 transition-colors flex items-center justify-center"
            aria-label="Send message"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">Powered by UNISYNC AI • English & Tagalog supported</p>
      </form>
    </div>
  )
}