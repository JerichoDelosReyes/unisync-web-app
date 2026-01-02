import { useState, useRef, useEffect } from 'react'

/**
 * AI Chat Component - Enhanced with NLP capabilities
 * 
 * Features:
 * - Intent Recognition with confidence scoring
 * - Entity Extraction (time, location, subject, etc.)
 * - Fuzzy string matching for typo tolerance
 * - Context awareness (remembers conversation history)
 * - Sentiment detection (positive, negative, neutral)
 * - Multi-language support (English/Tagalog)
 * - Smart follow-up suggestions
 * - Typing indicators and smooth animations
 */

// ============================================
// NLP UTILITIES
// ============================================

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
const fuzzyMatch = (input, target, threshold = 0.7) => {
  const words = input.toLowerCase().split(/\s+/)
  const targetLower = target.toLowerCase()
  
  // Exact match
  if (input.toLowerCase().includes(targetLower)) return true
  
  // Word-by-word fuzzy match
  return words.some(word => similarity(word, targetLower) >= threshold)
}

// ============================================
// INTENT DEFINITIONS
// ============================================

const intents = {
  GREETING: {
    patterns: [
      'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
      'kumusta', 'kamusta', 'musta', 'magandang umaga', 'magandang hapon', 
      'magandang gabi', 'yo', 'sup', 'hola', 'greetings'
    ],
    weight: 1.0
  },
  FAREWELL: {
    patterns: [
      'bye', 'goodbye', 'see you', 'take care', 'paalam', 'babay', 
      'sige', 'ingat', 'later', 'gtg', 'gotta go'
    ],
    weight: 1.0
  },
  THANKS: {
    patterns: [
      'thank', 'thanks', 'thank you', 'salamat', 'maraming salamat', 
      'appreciate', 'grateful', 'ty', 'tysm'
    ],
    weight: 1.0
  },
  VIEW_SCHEDULE: {
    patterns: [
      'view schedule', 'see schedule', 'check schedule', 'my schedule',
      'class schedule', 'classes', 'timetable', 'when is my class',
      'tingnan schedule', 'schedule ko', 'oras ng klase', 'ano klase ko',
      'what subjects', 'ano subject', 'my classes', 'show my schedule'
    ],
    weight: 1.2
  },
  UPLOAD_SCHEDULE: {
    patterns: [
      'upload schedule', 'add schedule', 'registration form', 'cor upload',
      'upload cor', 'add registration', 'how to add schedule', 'import schedule',
      'paano magdagdag schedule', 'upload registration', 'add my schedule'
    ],
    weight: 1.2
  },
  FACULTY_SCHEDULE: {
    patterns: [
      'faculty schedule', 'teacher schedule', 'teaching schedule', 'claim classes',
      'claim schedule', 'professor schedule', 'guro schedule', 'schedule code',
      'how to claim', 'claim code'
    ],
    weight: 1.3
  },
  VIEW_ANNOUNCEMENTS: {
    patterns: [
      'announcements', 'news', 'updates', 'posts', 'balita', 'anunsyo',
      'what\'s new', 'ano bago', 'latest news', 'campus news', 'notices'
    ],
    weight: 1.0
  },
  CREATE_ANNOUNCEMENT: {
    patterns: [
      'create announcement', 'post announcement', 'make announcement', 
      'new announcement', 'how to post', 'gumawa ng announcement',
      'mag-post', 'paano mag-announce', 'publish announcement'
    ],
    weight: 1.2
  },
  FILTER_ANNOUNCEMENTS: {
    patterns: [
      'filter announcement', 'find announcement', 'search announcement',
      'specific org', 'organization post', 'filter by', 'sort announcements'
    ],
    weight: 1.1
  },
  FIND_ROOM: {
    patterns: [
      'find room', 'available room', 'room finder', 'free room', 'vacant room',
      'classroom available', 'hanap silid', 'bakanteng room', 'room status',
      'which room', 'where is room', 'building', 'room location', 'empty room'
    ],
    weight: 1.1
  },
  BOOK_ROOM: {
    patterns: [
      'book room', 'reserve room', 'room reservation', 'reserve venue',
      'ireserba room', 'book venue', 'room booking', 'schedule room'
    ],
    weight: 1.2
  },
  JOIN_ORG: {
    patterns: [
      'join organization', 'join org', 'become member', 'membership',
      'how to join', 'sumali sa org', 'mag-member', 'apply organization',
      'join club', 'org membership'
    ],
    weight: 1.1
  },
  LIST_ORGS: {
    patterns: [
      'list organizations', 'all organizations', 'what organizations',
      'campus orgs', 'student orgs', 'ano mga org', 'available orgs',
      'organizations list', 'clubs list'
    ],
    weight: 1.0
  },
  EDIT_PROFILE: {
    patterns: [
      'edit profile', 'update profile', 'change profile', 'profile settings',
      'account settings', 'my account', 'baguhin profile', 'i-edit profile',
      'change name', 'update info', 'personal information'
    ],
    weight: 1.1
  },
  VIEW_PROFILE: {
    patterns: [
      'view profile', 'my profile', 'profile info', 'account info',
      'tingnan profile', 'profile ko', 'see profile'
    ],
    weight: 1.0
  },
  REQUEST_FACULTY: {
    patterns: [
      'request faculty', 'become faculty', 'faculty role', 'apply faculty',
      'teacher verification', 'faculty request', 'verify faculty',
      'how to be faculty', 'gusto maging faculty', 'faculty application'
    ],
    weight: 1.2
  },
  HELP: {
    patterns: [
      'help', 'assist', 'support', 'what can you do', 'how to use',
      'guide', 'tulong', 'paano', 'instructions', 'features', 'capabilities',
      'ano kaya mo', 'functions'
    ],
    weight: 0.9
  },
  CLASS_REP: {
    patterns: [
      'class representative', 'class rep', 'become rep', 'class officer',
      'student rep', 'section rep', 'maging rep'
    ],
    weight: 1.1
  },
  MODERATION: {
    patterns: [
      'moderation', 'moderate', 'review posts', 'pending approval',
      'content review', 'approve post', 'reject post'
    ],
    weight: 1.0
  },
  COMPLAINT: {
    patterns: [
      'not working', 'broken', 'bug', 'error', 'problem', 'issue',
      'hindi gumagana', 'sira', 'mali', 'help me fix', 'something wrong'
    ],
    weight: 1.0
  },
  POSITIVE_FEEDBACK: {
    patterns: [
      'great', 'awesome', 'love it', 'amazing', 'perfect', 'excellent',
      'maganda', 'galing', 'nice', 'cool', 'wonderful', 'best'
    ],
    weight: 0.8
  }
}

// ============================================
// ENTITY EXTRACTION
// ============================================

const entityPatterns = {
  time: /\b(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm)|morning|afternoon|evening|umaga|hapon|gabi)\b/gi,
  day: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|miyerkules|huwebes|biyernes|sabado|linggo|today|tomorrow|bukas|ngayon)\b/gi,
  room: /\b(room\s*\d+|rm\s*\d+|[a-z]+\s*building|[a-z]+\s*hall|\d{3,4}[a-z]?)\b/gi,
  organization: /\b(csg|bits|csc|bms|cyle|edge|yopa|chls|sinag.?tala|the\s*flare|honor\s*society|smsp)\b/gi,
  subject: /\b(it\s*\d+|cs\s*\d+|math\s*\d+|eng\s*\d+|[a-z]{2,4}\s*\d{3,4})\b/gi
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
// INTENT RECOGNITION
// ============================================

const recognizeIntent = (input) => {
  const normalizedInput = input.toLowerCase().trim()
  let bestMatch = { intent: null, confidence: 0 }
  
  for (const [intentName, intentData] of Object.entries(intents)) {
    for (const pattern of intentData.patterns) {
      // Exact substring match
      if (normalizedInput.includes(pattern.toLowerCase())) {
        const confidence = (pattern.length / normalizedInput.length) * intentData.weight
        if (confidence > bestMatch.confidence) {
          bestMatch = { intent: intentName, confidence: Math.min(confidence * 1.5, 1) }
        }
      }
      
      // Fuzzy match for typos
      if (fuzzyMatch(normalizedInput, pattern, 0.75)) {
        const confidence = 0.7 * intentData.weight
        if (confidence > bestMatch.confidence) {
          bestMatch = { intent: intentName, confidence }
        }
      }
    }
  }
  
  // If no confident match, return unknown
  if (bestMatch.confidence < 0.3) {
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
    "📅 **Viewing Your Schedule**\n\nYou can find your class schedule in the **Schedule** page:\n\n1. Click 'Schedule' in the sidebar\n2. Your classes appear based on your uploaded registration form\n3. View by day or week format\n\n*Tip: Make sure you've uploaded your COR (Certificate of Registration) to see your classes!*\n\n(Pumunta sa Schedule page para makita ang iyong mga klase.)"
  ],
  UPLOAD_SCHEDULE: [
    "📤 **Uploading Your Schedule**\n\nTo add your class schedule:\n\n1. Go to the **Schedule** page\n2. Click **'Add Registration Form'**\n3. Upload your COR (Certificate of Registration) PDF\n4. The system automatically extracts your classes!\n\n*Note: Only PDF files are accepted. Make sure your COR is clear and readable.*\n\n(I-upload ang iyong COR para ma-extract ang schedule mo.)"
  ],
  FACULTY_SCHEDULE: [
    "👨‍🏫 **Faculty Schedule Management**\n\nAs a faculty member:\n\n1. Go to **Schedule** page\n2. Click the **'Claim Classes'** tab\n3. Enter the **schedule codes** from student CORs\n4. Once claimed, you'll see your teaching schedule and student lists!\n\n*The schedule code connects you to students enrolled in your subjects.*\n\n(Mag-claim ng schedule codes para makita ang iyong teaching schedule.)"
  ],
  VIEW_ANNOUNCEMENTS: [
    "📢 **Viewing Announcements**\n\nThe **Announcements** page shows:\n\n• Campus-wide updates\n• Department-specific news\n• Organization posts\n• Urgent notices (pinned at top)\n\nUse the filter tabs (All, Important, Academic, General, Organizations) to find what you need!\n\n(Pumunta sa Announcements para sa mga balita at updates.)"
  ],
  CREATE_ANNOUNCEMENT: [
    "✏️ **Creating Announcements**\n\nTo post an announcement:\n\n1. Go to **Announcements** page\n2. Click **'Create'** button\n3. Fill in:\n   • Title and content\n   • Priority level (Urgent/High/Normal/Low)\n   • Target audience (department, year level, section)\n   • Attach images or videos (optional)\n4. Submit for review!\n\n*Note: Class Representatives and above can post. Posts are reviewed before publishing.*\n\n(I-click ang Create button para gumawa ng announcement.)"
  ],
  FILTER_ANNOUNCEMENTS: [
    "🔍 **Filtering Announcements**\n\nTo find specific posts:\n\n1. Use the **category tabs** (All, Important, Academic, General, Orgs)\n2. Click on **organization logos** to filter by org\n3. Announcements are automatically filtered based on your department and year level\n\n*Tip: Important/Urgent announcements are always shown at the top!*"
  ],
  FIND_ROOM: [
    "🏫 **Finding Available Rooms**\n\nTo check room availability:\n\n1. Go to **Room Status** in the sidebar\n2. Select the building (e.g., Main Building, Annex)\n3. View rooms by floor\n4. Green = Vacant, Red = Occupied\n\n*You can see which classes are using occupied rooms and when they'll be free.*\n\n(Pumunta sa Room Status para makita ang available na mga silid.)"
  ],
  BOOK_ROOM: [
    "📋 **Room Booking**\n\nTo reserve a room for events:\n\n1. Find an available room in **Room Status**\n2. Contact the **Admin Office** for official bookings\n3. Provide event details, date, and time\n\n*Note: Room reservations require approval from campus administration.*"
  ],
  JOIN_ORG: [
    "🤝 **Joining Organizations**\n\nTo become a member:\n\n1. Browse organization posts in **Announcements**\n2. Look for **membership drives** or **application announcements**\n3. Contact the org through their posted details\n4. Follow their application process\n\n**Active Campus Organizations:**\nCSG, BITS, CSC, BMS, CYLE, EDGE, YOPA, and more!\n\n(Tingnan ang announcements para sa membership drives.)"
  ],
  LIST_ORGS: [
    "🏛️ **Campus Organizations**\n\n• **CSG** - Central Student Government\n• **BITS** - Builders of Innovative Technologist Society\n• **CSC** - Computer Science Clique\n• **BMS** - Business Management Society\n• **CYLE** - Cavite Young Leaders for Entrepreneurship\n• **EDGE** - Educators' Guild for Excellence\n• **YOPA** - Young Office Professional Advocates\n• **CHLS** - Circle of Hospitality & Tourism Students\n• **Sinag-Tala** - Literary & Arts\n• **The Flare** - Campus Publication\n• **Honor Society**\n\n*Check Announcements to see posts from each organization!*"
  ],
  EDIT_PROFILE: [
    "⚙️ **Editing Your Profile**\n\nTo update your information:\n\n1. Click your **profile picture** in the sidebar\n2. Go to **Account Settings**\n3. Edit your:\n   • Display name\n   • Department\n   • Year level & section\n   • Profile photo\n4. Save changes!\n\n(I-click ang profile picture mo para ma-edit ang iyong information.)"
  ],
  VIEW_PROFILE: [
    "👤 **Your Profile**\n\nYour profile contains:\n\n• Personal information (name, email)\n• Role (Student/Faculty/Admin)\n• Department & year level\n• Organization memberships\n• Tagged groups\n\nClick your profile picture in the sidebar to view or edit.\n\n(I-click ang profile mo sa sidebar para makita ang details.)"
  ],
  REQUEST_FACULTY: [
    "🎓 **Requesting Faculty Role**\n\nTo get verified as faculty:\n\n1. Go to **Dashboard**\n2. Find the **'Faculty Role Verification'** card\n3. Click **'Request Faculty Role'**\n4. Upload your **Faculty ID** for verification\n5. Wait for admin approval\n\n*Once approved, you can claim teaching schedules and access faculty features!*\n\n(Pumunta sa Dashboard at i-click ang Request Faculty Role.)"
  ],
  HELP: [
    "🤖 **I'm UNISYNC AI - Your Campus Assistant!**\n\nI can help you with:\n\n📅 **Schedule** - View classes, upload COR, claim teaching schedules\n📢 **Announcements** - Browse, create, and filter posts\n🏫 **Rooms** - Find available classrooms\n🏛️ **Organizations** - Learn about campus orgs\n👤 **Profile** - Update your information\n🎓 **Faculty** - Request role verification\n\n**Just ask me in English or Tagalog!**\n\nTry: \"How do I view my schedule?\" or \"Paano gumawa ng announcement?\""
  ],
  CLASS_REP: [
    "👑 **Class Representative Role**\n\nClass Representatives can:\n\n• Create announcements for their section\n• Moderate comments on posts\n• Represent their class in the system\n\n**To become a Class Rep:**\nContact your department head or student affairs office for the tagging process.\n\n(Makipag-ugnay sa department head para maging Class Representative.)"
  ],
  MODERATION: [
    "🛡️ **Content Moderation**\n\nFor Moderators and Admins:\n\n1. Go to **Announcement Review** page\n2. Review pending announcements\n3. Approve or reject with feedback\n4. Manage flagged content\n\n*Announcements from certain roles require approval before publishing.*"
  ],
  COMPLAINT: [
    "😟 **I'm sorry you're having issues!**\n\nHere's what you can do:\n\n1. **Refresh the page** - Sometimes this fixes temporary issues\n2. **Clear browser cache** - Old data can cause problems\n3. **Try a different browser** - Chrome or Firefox work best\n4. **Contact support** - Report persistent issues to campus IT\n\nCan you describe the specific problem you're experiencing? I'll try to help! 💪"
  ],
  POSITIVE_FEEDBACK: [
    "Thank you so much! 😊 I'm glad I could help. Is there anything else you'd like to know about UNISYNC?",
    "That's great to hear! Salamat! Let me know if you have more questions! 🎉",
    "Awesome! I'm always here to help. Feel free to ask anything else! 💚"
  ],
  UNKNOWN: [
    "I'm not quite sure I understand. 🤔 Could you rephrase that?\n\nI can help with:\n• Schedule (view, upload, claim)\n• Announcements (view, create, filter)\n• Rooms (find available)\n• Organizations (list, join)\n• Profile & Settings\n\n*Try being more specific, like \"How do I upload my schedule?\"*",
    "Hmm, I didn't catch that. 🤔\n\nTry asking about:\n📅 Schedule\n📢 Announcements\n🏫 Rooms\n🏛️ Organizations\n\n(Subukan mong magtanong tungkol sa schedule, announcements, o rooms.)"
  ]
}

// ============================================
// SMART SUGGESTIONS
// ============================================

const getSuggestions = (intent) => {
  const suggestionMap = {
    VIEW_SCHEDULE: ['How to upload COR?', 'What are schedule codes?', 'View room availability'],
    UPLOAD_SCHEDULE: ['View my schedule', 'Find available rooms', 'Help with announcements'],
    VIEW_ANNOUNCEMENTS: ['Create announcement', 'Filter by organization', 'View my schedule'],
    FIND_ROOM: ['View my schedule', 'Check announcements', 'Organization list'],
    GREETING: ['View my schedule', 'Check announcements', 'Find available rooms'],
    HELP: ['View schedule', 'Announcements', 'Room finder', 'Organizations'],
    UNKNOWN: ['How to view schedule?', 'What are announcements?', 'Help me find rooms']
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

  const handleSendWithInput = (input) => {
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

    // Process with NLP
    setTimeout(() => {
      const response = processInput(input)
      const botMessage = {
        id: messages.length + 2,
        type: 'bot',
        text: response.text,
        suggestions: response.suggestions
      }
      setMessages(prev => [...prev, botMessage])
      setIsLoading(false)
      
      // Update context
      setConversationContext(prev => ({
        lastIntent: response.intent,
        entities: { ...prev.entities, ...response.entities },
        messageCount: prev.messageCount + 1
      }))
    }, 600 + Math.random() * 400) // Variable delay for natural feel
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    handleSendWithInput(inputValue)
  }

  const processInput = (userInput) => {
    // Intent recognition
    const { intent, confidence } = recognizeIntent(userInput)
    
    // Entity extraction
    const entities = extractEntities(userInput)
    
    // Sentiment analysis
    const sentiment = analyzeSentiment(userInput)
    
    // Get response
    let responseText = getResponse(intent, entities, sentiment, conversationContext)
    
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

  const getResponse = (intent, entities, sentiment, context) => {
    // Get response templates for intent
    const templates = responses[intent] || responses.UNKNOWN
    
    // Pick a random response from templates
    let response = templates[Math.floor(Math.random() * templates.length)]
    
    // Personalize based on entities
    if (entities.organization && entities.organization.length > 0) {
      const org = entities.organization[0].toUpperCase()
      response = response.replace(/organizations?/gi, org)
    }
    
    if (entities.day && entities.day.length > 0) {
      response += `\n\n*I noticed you mentioned ${entities.day[0]}. Check your schedule for that day!*`
    }
    
    if (entities.room && entities.room.length > 0) {
      response += `\n\n*Looking for ${entities.room[0]}? Check the Room Status page for availability.*`
    }
    
    // Add sentiment-based prefix for negative sentiment
    if (sentiment === 'negative' && intent !== 'COMPLAINT') {
      response = "I understand you might be frustrated. Let me help! 💪\n\n" + response
    }
    
    // Handle follow-up context
    if (context.messageCount > 2 && intent === 'UNKNOWN') {
      response = "I'm still here to help! Let me know if you want me to explain something in more detail.\n\n" + 
        "You can ask about:\n• Schedule\n• Announcements\n• Rooms\n• Organizations"
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
        <span className="absolute bottom-16 right-0 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
          🤖 UNISYNC AI Assistant
        </span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 max-h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-5">
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 max-h-[400px]">
        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-green-500 text-white rounded-br-md'
                    : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100'
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
                    className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors border border-green-200"
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
            <div className="bg-white text-gray-800 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
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
      <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 bg-white rounded-b-2xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me anything... (English/Tagalog)"
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
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
        <p className="text-xs text-gray-400 mt-2 text-center">Powered by UNISYNC AI • English & Tagalog supported</p>
      </form>
    </div>
  )
}