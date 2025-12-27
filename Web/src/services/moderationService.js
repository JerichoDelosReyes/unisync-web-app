/**
 * Naive Bayes Content Moderation Algorithm with Profanity Filter
 * 
 * HOW IT ADAPTS:
 * 1. Training: Learn word probabilities from labeled examples (safe/unsafe)
 * 2. Feedback Loop: Admin corrections improve accuracy over time
 * 3. Classification: Calculate P(safe|words) vs P(unsafe|words)
 * 4. Decision: Return the class with higher probability
 * 
 * Formula: P(class|words) ∝ P(class) × ∏ P(word|class)
 * 
 * PROFANITY FILTER:
 * - Uses dynamic regex generation from root words with leetspeak substitutions
 * - Includes racial slurs, homophobic terms, Filipino curses
 * - Harassment and hate speech detection
 * - Number substitution detection (4=A, 0=O, 1=I, 3=E, 5=S, 7=T, 8=B)
 * - Automatic rejection for severe content, manual review for medium
 */

// Import the profanity filter utility
import {
  checkProfanity as checkProfanityFilter,
  normalizeText as normalizeProfanityText,
  censorText,
  fastCheckProfanity,
  generateRegexFromWord,
  BAD_WORD_ROOTS,
  LEETSPEAK_MAP
} from '../utils/profanityFilter'

// ==================== PROFANITY & SLUR FILTER ====================

/**
 * Character substitution map for leetspeak/number obfuscation
 * Used to normalize text before pattern matching
 */
const CHAR_SUBSTITUTIONS = {
  '0': 'o',
  '1': 'i',
  '2': 'z',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '6': 'g',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '*': '',
  '#': 'h',
  '+': 't',
  '€': 'e',
  '¥': 'y',
  '£': 'l',
  '(': 'c',
  ')': 'c',
  '[': 'c',
  ']': 'c',
  '{': 'c',
  '}': 'c',
  '<': 'c',
  '>': 'c',
  '|': 'l',
  '\\': 'l',
  '/': 'l',
}

/**
 * Normalize text by replacing common character substitutions
 * Converts "N1GG4" to "nigga", "4UCK" to "auck", etc.
 */
const normalizeText = (text) => {
  let normalized = text.toLowerCase()
  
  // Replace character substitutions
  for (const [char, replacement] of Object.entries(CHAR_SUBSTITUTIONS)) {
    normalized = normalized.split(char).join(replacement)
  }
  
  // Remove repeated characters beyond 2 (e.g., "fuuuuck" -> "fuuck")
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1')
  
  // Remove common separators used to evade filters
  normalized = normalized.replace(/[\s\-_\.]+/g, '')
  
  return normalized
}

// Comprehensive list of offensive terms (patterns to catch variations)
// These patterns work on NORMALIZED text (after character substitution)
const PROFANITY_PATTERNS = [
  // English curse words (patterns match normalized text)
  /f+u+c+k+/gi,
  /s+h+i+t+/gi,
  /b+i+t+c+h+/gi,
  /a+s+s+h+o+l+e+/gi,
  /d+a+m+n+/gi,
  /c+r+a+p+/gi,
  /b+a+s+t+a+r+d+/gi,
  /w+h+o+r+e+/gi,
  /s+l+u+t+/gi,
  /d+i+c+k+/gi,
  /p+e+n+i+s+/gi,
  /c+o+c+k+/gi,
  /p+u+s+s+y+/gi,
  /c+u+n+t+/gi,
  /t+i+t+s*\b/gi,
  /b+o+o+b+s*/gi,
  /a+s+s+\b/gi,
  
  // Racial slurs (NEVER acceptable - patterns for normalized text)
  /n+i+g+g+[ae]+r*/gi,
  /n+i+g+g+a+/gi,
  /n+e+g+r+o+/gi,
  /c+h+i+n+k+/gi,
  /g+o+o+k+/gi,
  /s+p+i+c+\b/gi,
  /w+e+t+b+a+c+k+/gi,
  /k+i+k+e+/gi,
  /r+a+g+h+e+a+d+/gi,
  /t+o+w+e+l+h+e+a+d+/gi,
  /c+a+m+e+l+j+o+c+k+e+y+/gi,
  /b+e+a+n+e+r+/gi,
  /c+o+o+n+\b/gi,
  /j+a+p+\b/gi,
  /c+h+i+n+o+\b/gi,
  
  // Filipino slurs/curses (Tagalog) - normalized patterns
  /p+u+t+a+n*g*i*n*a*/gi,
  /p+u+t+a+\b/gi,
  /p+u+k+i+n*a*n*g*i*n*a*/gi,
  /g+a+g+o+/gi,
  /t+a+n+g+i*n*a*/gi,
  /t+a+n+g+a+/gi,
  /l+i+n+t+i+k+/gi,
  /u+l+o+l+/gi,
  /t+a+r+a+n+t+a+d+o+/gi,
  /b+o+b+o+\b/gi,
  /l+e+c+h+e+/gi,
  /p+u+n+y+e+t+a+/gi,
  /h+i+n+d+o+t+/gi,
  /k+a+n+t+o+t+/gi,
  /p+a+k+y+u+/gi,
  /b+u+l+o+l+/gi,
  /e+g+u+l+/gi,
  /h+a+y+o+p+/gi,
  /b+u+w+i+s+i+t+/gi,
  /s+u+s+m+a+r+y+o+s+e+p+/gi,
  /d+e+m+o+n+y+o+/gi,
  /p+a+k+s+h+e+t+/gi,
  /s+h+u+t+a+n+g+i+n+a+/gi,
  /s+h+e+t+\b/gi,
  /p+a+k+e+n+g+s+h+e+t+/gi,
  /p+u+t+r+a+g+i+s+/gi,
  /l+e+c+c+h+e+/gi,
  /p+u+n+e+t+a+/gi,
  /i+n+y+o+n+g+\s*i+n+a+/gi,
  /k+a+g+a+g+o+h+a+n+/gi,
  /k+i+n+a+n+t+o+t+/gi,
  /b+a+d+a+y+/gi,
  /u+k+i+n+i+n+a+m+/gi, // Ilocano
  /y+a+w+a+/gi, // Bisaya
  /b+u+a+n+g+/gi, // Bisaya
  /a+t+a+y+/gi, // Bisaya
  /p+i+s+t+i+/gi, // Bisaya
  /b+i+l+a+t+/gi, // Bisaya
  /i+n+a+\s*m+o+/gi, // "ina mo" variations
  /n+a+m+[ou]+/gi, // "namo", "namu" slang
  /b+o+b+o+\s*m+o+/gi, // "bobo mo"
  /b+a+d+i+n+g+/gi, // Filipino slang for gay
  
  // Homophobic slurs
  /f+a+g+g*o*t*/gi,
  /d+y+k+e+/gi,
  /t+r+a+n+n+y+/gi,
  /h+o+m+o+\b/gi,
  /l+e+s+b+o+/gi,
  /q+u+e+e+r+/gi,
  /b+a+k+l+a+\b/gi, // Filipino
  /t+o+m+b+o+y+\b/gi, // When used as slur
  /g+a+y+a+s+s+/gi, // "gayass"
  /g+a+y+\s*n+i+g+g+[ae]+r*/gi, // "gay nigger"
  
  // Ableist slurs
  /r+e+t+a+r+d+/gi,
  /s+p+a+z+/gi,
]

// Hate speech keywords (context-sensitive phrases)
const HATE_KEYWORDS = [
  'kill all', 'death to', 'eliminate all', 'exterminate',
  'white power', 'race war', 'ethnic cleansing',
  'go back to your country', 'not belong here',
  'inferior race', 'subhuman',
  'hang them', 'burn them all', 'shoot them all',
  'gas the', 'nuke the', 'bomb the',
  'patayin lahat', 'dapat mamatay', // Filipino hate speech
  'walang kwenta', 'dapat mapatay', // Filipino
]

// Harassment patterns (targeted attacks)
const HARASSMENT_PATTERNS = [
  /you('re|\s+are)\s+(ugly|fat|stupid|worthless|garbage|trash)/gi,
  /nobody\s+(likes|loves|cares about)\s+you/gi,
  /kill\s+yourself/gi,
  /go\s+die/gi,
  /kys\b/gi, // "kill yourself" abbreviation
  /i('ll|will)\s+(find|hunt|kill|hurt)\s+you/gi,
  /you\s+deserve\s+to\s+(die|suffer|be hurt)/gi,
  /i\s+hope\s+you\s+die/gi,
  /mamatay\s+ka/gi, // Filipino
  /sana\s+mamatay/gi, // Filipino
  /mag\s*pakamatay/gi, // Filipino
]

/**
 * Profanity Filter - Detects explicit offensive content
 * This runs BEFORE Naive Bayes for immediate rejection of severe content
 */
class ProfanityFilter {
  constructor() {
    this.profanityPatterns = PROFANITY_PATTERNS
    this.hateKeywords = HATE_KEYWORDS
    this.harassmentPatterns = HARASSMENT_PATTERNS
    this.customBannedWords = new Set()
  }

  /**
   * Add custom banned words (admin feature)
   */
  addBannedWord(word) {
    this.customBannedWords.add(word.toLowerCase())
  }

  /**
   * Remove a custom banned word
   */
  removeBannedWord(word) {
    this.customBannedWords.delete(word.toLowerCase())
  }

  /**
   * Get all custom banned words
   */
  getCustomBannedWords() {
    return Array.from(this.customBannedWords)
  }

  /**
   * Check text for profanity, slurs, and harassment
   * Uses normalized text for pattern matching (catches number substitutions)
   * @returns {object} { hasProfanity, matches, severity, category }
   */
  check(text) {
    const originalText = text.toLowerCase()
    const normalizedText = normalizeText(text)
    const matches = []
    let severity = 'none'
    let category = 'clean'

    // Check profanity patterns on NORMALIZED text (catches N1GG4, 4UCK, etc.)
    for (const pattern of this.profanityPatterns) {
      const found = normalizedText.match(pattern)
      if (found) {
        matches.push(...found.map(m => m.substring(0, 2) + '***'))
        severity = 'severe'
        category = 'profanity'
      }
    }

    // Check hate keywords on both original and normalized text
    for (const keyword of this.hateKeywords) {
      const normalizedKeyword = normalizeText(keyword)
      if (normalizedText.includes(normalizedKeyword) || originalText.includes(keyword.toLowerCase())) {
        matches.push('[hate speech]')
        severity = 'severe'
        category = 'hate_speech'
      }
    }

    // Check harassment patterns on original text
    for (const pattern of this.harassmentPatterns) {
      const found = originalText.match(pattern)
      if (found) {
        matches.push('[harassment]')
        severity = 'severe'
        category = 'harassment'
      }
    }

    // Check custom banned words on normalized text
    for (const word of this.customBannedWords) {
      const normalizedWord = normalizeText(word)
      if (normalizedText.includes(normalizedWord)) {
        matches.push(`[banned: ${word.substring(0, 2)}***]`)
        if (severity === 'none') severity = 'medium'
        if (category === 'clean') category = 'custom_banned'
      }
    }

    return {
      hasProfanity: matches.length > 0,
      matches: [...new Set(matches)],
      severity,
      category,
      count: matches.length
    }
  }

  /**
   * Censor profanity in text (replace with asterisks)
   */
  censor(text) {
    let censoredText = text
    const normalizedText = normalizeText(text)
    
    for (const pattern of this.profanityPatterns) {
      // Find matches in normalized text
      let match
      const regex = new RegExp(pattern.source, pattern.flags)
      while ((match = regex.exec(normalizedText)) !== null) {
        // Replace corresponding section in original text
        const start = match.index
        const length = match[0].length
        const originalSection = text.substring(start, start + length)
        if (originalSection.length >= 2) {
          const censored = originalSection[0] + '*'.repeat(originalSection.length - 2) + originalSection[originalSection.length - 1]
          censoredText = censoredText.substring(0, start) + censored + censoredText.substring(start + length)
        }
      }
    }
    return censoredText
  }
}

// Create singleton profanity filter instance
const profanityFilter = new ProfanityFilter()

// ==================== NAIVE BAYES CLASSIFIER ====================

class NaiveBayesClassifier {
  constructor() {
    // Word counts per category
    this.wordCounts = {
      safe: {},
      unsafe: {}
    }
    // Total documents per category
    this.categoryCounts = {
      safe: 0,
      unsafe: 0
    }
    // Total words per category
    this.totalWords = {
      safe: 0,
      unsafe: 0
    }
    // Vocabulary (all unique words)
    this.vocabulary = new Set()
    // Laplace smoothing parameter (prevents zero probabilities)
    this.smoothing = 1
    // Initialize with training data
    this.train()
  }

  /**
   * Tokenize text into words
   * - Converts to lowercase
   * - Removes punctuation
   * - Splits into words
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/) // Split by whitespace
      .filter(word => word.length > 2) // Keep words with 3+ chars
  }

  /**
   * Train the classifier with labeled examples
   * In production, this would use a larger dataset from a database
   */
  train() {
    // SAFE content examples (typical school announcements - more examples = better accuracy)
    const safeExamples = [
      // Academic announcements
      "Final examination schedule for first semester",
      "Class suspension due to weather conditions",
      "General assembly this Friday at the gymnasium",
      "System maintenance notice for tonight",
      "Enrollment period starts next week",
      "Submit your requirements to the registrar",
      "Faculty meeting scheduled for Monday",
      "Library hours extended during finals week",
      "Student council election results",
      "Scholarship application deadline",
      "Seminar on career development",
      "Sports fest registration now open",
      "Computer laboratory schedule",
      "Online class will proceed as scheduled",
      "Please bring your school ID",
      "Room assignment for the new semester",
      "Congratulations to our honor students",
      "Community service event this weekend",
      "Academic excellence awards ceremony",
      "Research presentation schedule",
      "New building facilities orientation",
      "Campus cleanup drive volunteers needed",
      "Student organization fair tomorrow",
      "Important reminder about dress code",
      "Tuition fee payment deadline extended",
      "Free medical checkup for students",
      "Internship opportunities available",
      "Thesis defense schedule posted",
      "Holiday break announcement",
      "Welcome back to school activities",
      // Additional safe examples for better training
      "Midterm exam results are now available",
      "Please check your grades online",
      "Meeting for all student leaders",
      "Clearance signing schedule",
      "ID validation at the registrar office",
      "Request for official transcript",
      "Certificate of enrollment available",
      "Dean's list announcement",
      "Graduation ceremony details",
      "Commencement exercises schedule",
      "Faculty development program",
      "Workshop on research methodology",
      "Training for student assistants",
      "Blood donation drive this week",
      "Mental health awareness seminar",
      "Career fair next month",
      "Job placement orientation",
      "Alumni homecoming event",
      "Foundation day celebration",
      "Recognition day program",
      "Orientation for freshmen",
      "Campus tour for visitors",
      "Parent teacher conference",
      "Report card distribution",
      "Submission of project requirements",
      "Laboratory equipment maintenance",
      "WiFi password update notice",
      "Email account activation",
      "Student portal is now online",
      "Class schedule adjustment",
      "Room transfer notification",
      // CvSU-specific safe content
      "CEIT week celebration",
      "Buwan ng Wika activities",
      "Brigada Eskwela volunteers",
      "ROTC training schedule",
      "NSTP community outreach",
      "Intramurals opening ceremony",
      "Literary musical competition",
      "Science fair registration",
      "Math olympiad qualifiers",
      "Programming contest",
      "Hackathon announcement",
      "Dean's message to students",
      "Campus ministry activities",
      "Guidance counseling schedule",
      "Medical and dental services",
      "Canteen price list update",
      "Parking area guidelines",
      "Lost and found items",
      "Fire drill schedule",
      "Earthquake preparedness"
    ]

    // UNSAFE content examples (spam, harassment, inappropriate)
    const unsafeExamples = [
      "Buy cheap products click here now",
      "You are stupid and worthless",
      "This school is garbage and terrible",
      "Free money make millions fast",
      "Hate all the teachers here",
      "Click this link for free prizes",
      "Everyone here is an idiot",
      "Scam offer limited time only",
      "Violence against students",
      "Threatening message to administration",
      "Inappropriate sexual content",
      "Gambling site promotion",
      "Drug dealing contact me",
      "Fake news about the university",
      "Harassment and bullying post",
      "Racist and discriminatory content",
      "Spam advertisement for products",
      "Phishing attempt steal password",
      "Malware download click here",
      "Offensive language and cursing",
      // Additional unsafe examples
      "Make money from home easy cash",
      "You will regret this threat",
      "Worst school ever avoid this place",
      "Free iPhone giveaway click now",
      "Hot singles in your area",
      "Crypto investment guaranteed returns",
      "Hack any account tutorial",
      "Cheat on exams method works",
      "Teachers are corrupt here",
      "This is a scam university",
      "Buy followers and likes cheap",
      "Revenge against professor",
      "Expose private information",
      "Doxxing someone personal data",
      "Spreading false rumors about",
      "Destroy reputation of",
      "Get revenge on classmate",
      "Embarrass someone publicly",
      "Share leaked photos",
      "Blackmail and extortion"
    ]

    // Train on safe examples
    safeExamples.forEach(text => {
      this.addDocument(text, 'safe')
    })

    // Train on unsafe examples
    unsafeExamples.forEach(text => {
      this.addDocument(text, 'unsafe')
    })
  }

  /**
   * Add a document to the training set
   */
  addDocument(text, category) {
    const words = this.tokenize(text)
    this.categoryCounts[category]++

    words.forEach(word => {
      // Add to vocabulary
      this.vocabulary.add(word)

      // Initialize word count if needed
      if (!this.wordCounts[category][word]) {
        this.wordCounts[category][word] = 0
      }

      // Increment counts
      this.wordCounts[category][word]++
      this.totalWords[category]++
    })
  }

  /**
   * Calculate P(word|category) with Laplace smoothing
   * 
   * Formula: (count(word, category) + α) / (totalWords(category) + α × |vocabulary|)
   * 
   * Smoothing prevents zero probabilities for unseen words
   */
  wordProbability(word, category) {
    const wordCount = this.wordCounts[category][word] || 0
    const totalWords = this.totalWords[category]
    const vocabSize = this.vocabulary.size

    // Laplace smoothing
    return (wordCount + this.smoothing) / (totalWords + this.smoothing * vocabSize)
  }

  /**
   * Calculate P(category) - prior probability
   */
  categoryProbability(category) {
    const totalDocs = this.categoryCounts.safe + this.categoryCounts.unsafe
    return this.categoryCounts[category] / totalDocs
  }

  /**
   * Classify a text as safe or unsafe
   * 
   * Returns:
   * - category: 'safe' or 'unsafe'
   * - confidence: probability score (0-1)
   * - probabilities: detailed probability breakdown
   */
  classify(text) {
    const words = this.tokenize(text)

    // Calculate log probabilities (to avoid underflow with small numbers)
    let logProbSafe = Math.log(this.categoryProbability('safe'))
    let logProbUnsafe = Math.log(this.categoryProbability('unsafe'))

    // Multiply probabilities for each word (add in log space)
    words.forEach(word => {
      logProbSafe += Math.log(this.wordProbability(word, 'safe'))
      logProbUnsafe += Math.log(this.wordProbability(word, 'unsafe'))
    })

    // Convert back from log space
    const probSafe = Math.exp(logProbSafe)
    const probUnsafe = Math.exp(logProbUnsafe)

    // Normalize to get actual probabilities
    const total = probSafe + probUnsafe
    const normalizedSafe = probSafe / total
    const normalizedUnsafe = probUnsafe / total

    // Determine category
    const isSafe = normalizedSafe > normalizedUnsafe

    return {
      category: isSafe ? 'safe' : 'unsafe',
      confidence: isSafe ? normalizedSafe : normalizedUnsafe,
      probabilities: {
        safe: normalizedSafe,
        unsafe: normalizedUnsafe
      },
      // Flag for manual review if confidence is low
      needsReview: Math.max(normalizedSafe, normalizedUnsafe) < 0.7
    }
  }

  /**
   * Get flagged words that contributed to unsafe classification
   */
  getFlaggedWords(text) {
    const words = this.tokenize(text)
    const flaggedWords = []

    words.forEach(word => {
      const safeProb = this.wordProbability(word, 'safe')
      const unsafeProb = this.wordProbability(word, 'unsafe')

      // Word is flagged if it's more likely in unsafe content
      if (unsafeProb > safeProb * 1.5) {
        flaggedWords.push({
          word,
          unsafeProbability: unsafeProb,
          safeProbability: safeProb
        })
      }
    })

    return flaggedWords
  }
}

// Create singleton instance
const moderationClassifier = new NaiveBayesClassifier()

/**
 * Moderate announcement content
 * 
 * TWO-LAYER MODERATION:
 * 1. Profanity Filter: Immediate check for curse words, slurs, hate speech
 * 2. Naive Bayes: Probabilistic classification for spam, subtle unsafe content
 * 
 * @param {string} title - Announcement title
 * @param {string} content - Announcement content
 * @returns {object} Moderation result
 * 
 * USAGE:
 * const result = moderateContent("Title", "Content here...");
 * if (result.approved) {
 *   // Publish immediately
 * } else {
 *   // Send to admin for review or reject
 * }
 */
export const moderateContent = (title, content) => {
  const fullText = `${title} ${content}`

  // LAYER 1A: Check with new dynamic profanity filter (catches leetspeak variations)
  const dynamicProfanityResult = checkProfanityFilter(fullText)
  
  if (dynamicProfanityResult.hasProfanity) {
    return {
      approved: false,
      status: 'rejected',
      message: `Content rejected: Profanity detected (${dynamicProfanityResult.language || 'offensive language'}). This type of content violates community guidelines.`,
      confidence: 1.0,
      category: 'profanity',
      detectedIssues: dynamicProfanityResult.matches,
      filterType: 'profanity',
      probabilities: { safe: 0, unsafe: 1 },
      flaggedWords: dynamicProfanityResult.matches.map(w => ({ word: w, type: 'profanity' })),
      timestamp: new Date().toISOString()
    }
  }

  // LAYER 1B: Check legacy profanity filter (additional patterns)
  const profanityResult = profanityFilter.check(fullText)

  if (profanityResult.hasProfanity) {
    // Severe profanity/slurs = automatic rejection
    if (profanityResult.severity === 'severe') {
      return {
        approved: false,
        status: 'rejected',
        message: `Content rejected: ${profanityResult.category.replace('_', ' ')} detected. This type of content violates community guidelines.`,
        confidence: 1.0,
        category: profanityResult.category,
        detectedIssues: profanityResult.matches,
        filterType: 'profanity_filter',
        probabilities: { safe: 0, unsafe: 1 },
        flaggedWords: profanityResult.matches,
        timestamp: new Date().toISOString()
      }
    }

    // Medium severity = needs review
    if (profanityResult.severity === 'medium') {
      return {
        approved: false,
        status: 'pending_review',
        message: 'Content contains potentially inappropriate language. It will be reviewed by an administrator.',
        confidence: 0.8,
        category: profanityResult.category,
        detectedIssues: profanityResult.matches,
        filterType: 'profanity_filter',
        probabilities: { safe: 0.2, unsafe: 0.8 },
        flaggedWords: profanityResult.matches,
        timestamp: new Date().toISOString()
      }
    }
  }

  // LAYER 2: Naive Bayes classification for spam and subtle unsafe content
  const result = moderationClassifier.classify(fullText)

  // Determine action based on classification
  // Lower thresholds to reduce false "pending review" cases
  let status, message

  if (result.category === 'safe') {
    // If classified as safe with any reasonable confidence, approve it
    // Most legitimate announcements should pass through
    if (result.confidence >= 0.5) {
      status = 'approved'
      message = 'Content approved! Your announcement is now published.'
    } else {
      // Very low confidence = needs review (rare edge case)
      status = 'pending_review'
      message = 'Content sent for manual review. An administrator will review it shortly.'
    }
  } else {
    // Classified as unsafe
    if (result.confidence > 0.75) {
      status = 'rejected'
      message = 'Content flagged as potentially inappropriate. It will be reviewed by an administrator.'
    } else if (result.confidence > 0.6) {
      status = 'pending_review'
      message = 'Content sent for manual review. An administrator will review it shortly.'
    } else {
      // Low confidence unsafe = probably safe, approve it
      status = 'approved'
      message = 'Content approved! Your announcement is now published.'
    }
  }

  return {
    approved: status === 'approved',
    status,
    message,
    confidence: result.confidence,
    category: result.category,
    filterType: 'naive_bayes',
    probabilities: result.probabilities,
    flaggedWords: result.category === 'unsafe' ? moderationClassifier.getFlaggedWords(fullText) : [],
    timestamp: new Date().toISOString()
  }
}

/**
 * Add feedback to improve the classifier
 * Call this when admin manually reviews content
 * 
 * HOW THE SYSTEM ADAPTS:
 * 1. Admin reviews flagged content
 * 2. Admin marks it as safe or unsafe
 * 3. This function adds the text as a training example
 * 4. Future similar content will be classified more accurately
 */
export const addModerationFeedback = (text, isActuallySafe) => {
  moderationClassifier.addDocument(text, isActuallySafe ? 'safe' : 'unsafe')
}

/**
 * Add a custom banned word to the profanity filter
 * Admin can add school-specific terms to block
 */
export const addBannedWord = (word) => {
  profanityFilter.addBannedWord(word)
}

/**
 * Remove a custom banned word
 */
export const removeBannedWord = (word) => {
  profanityFilter.removeBannedWord(word)
}

/**
 * Get all custom banned words
 */
export const getCustomBannedWords = () => {
  return profanityFilter.getCustomBannedWords()
}

/**
 * Validate comment content for quality
 * Rejects spam-like comments: single letters, repeated characters, gibberish
 * @param {string} comment - The comment text to validate
 * @returns {Object} { isValid: boolean, reason: string|null }
 */
export const validateComment = (comment) => {
  if (!comment || typeof comment !== 'string') {
    return { isValid: false, reason: 'Comment cannot be empty.' }
  }
  
  const trimmed = comment.trim()
  
  // Check minimum length
  if (trimmed.length < 2) {
    return { isValid: false, reason: 'Comment is too short. Please write a meaningful comment.' }
  }
  
  // Reject single letter words (just "h", "n", "a", etc.)
  if (/^[a-zA-Z]$/.test(trimmed)) {
    return { isValid: false, reason: 'Please write a meaningful comment, not just a single letter.' }
  }
  
  // Reject comments that are just single letters with spaces ("h h h", "n n n")
  if (/^([a-zA-Z](\s+|$))+$/.test(trimmed) && trimmed.replace(/\s+/g, '').length <= 5) {
    return { isValid: false, reason: 'Please write a meaningful comment, not just single letters.' }
  }
  
  // Check if it's just a single character repeated (h, hh, hhh, hhhhhh)
  const singleCharRepeated = /^(.)\1*$/i.test(trimmed)
  if (singleCharRepeated) {
    return { isValid: false, reason: 'Please write a meaningful comment, not just repeated characters.' }
  }
  
  // Check if it's just repeated short patterns (haha, lol repeated, etc. is OK, but "nn nn nn" is not)
  // This catches patterns like "nn", "nnn", "nnnn", "n n n", "h h h"
  const withoutSpaces = trimmed.replace(/\s+/g, '')
  if (withoutSpaces.length > 0 && /^(.)\1*$/i.test(withoutSpaces)) {
    return { isValid: false, reason: 'Please write a meaningful comment, not just repeated characters.' }
  }
  
  // Check for very short repeated patterns like "ab ab ab" or "xy xy xy"
  const repeatedShortPattern = /^(.{1,3})\s*(\1\s*){2,}$/i.test(trimmed)
  if (repeatedShortPattern) {
    return { isValid: false, reason: 'Please write a meaningful comment, not just repeated patterns.' }
  }
  
  // Check if comment is just whitespace or special characters
  const hasActualContent = /[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/.test(trimmed)
  if (!hasActualContent) {
    return { isValid: false, reason: 'Comment must contain actual words or numbers.' }
  }
  
  // Check for keyboard spam patterns (like "asdfgh", "qwerty", "zxcvbn")
  const keyboardPatterns = [
    /^[qwerty]{4,}$/i,
    /^[asdfgh]{4,}$/i,
    /^[zxcvbn]{4,}$/i,
    /^[qwertyuiop]{6,}$/i,
    /^[asdfghjkl]{6,}$/i,
    /^[zxcvbnm]{5,}$/i
  ]
  
  const wordsOnly = trimmed.replace(/[^a-zA-Z]/g, '')
  for (const pattern of keyboardPatterns) {
    if (pattern.test(wordsOnly)) {
      return { isValid: false, reason: 'Please write a meaningful comment.' }
    }
  }
  
  // Check for just numbers repeated
  const justNumbers = /^\d+$/.test(trimmed)
  if (justNumbers && trimmed.length < 4) {
    return { isValid: false, reason: 'Please write a meaningful comment, not just numbers.' }
  }
  
  // Check for gibberish - random consonants without vowels (for longer text)
  if (wordsOnly.length >= 5) {
    const vowelCount = (wordsOnly.match(/[aeiouAEIOU]/g) || []).length
    const vowelRatio = vowelCount / wordsOnly.length
    if (vowelRatio < 0.1) {
      return { isValid: false, reason: 'Please write a meaningful comment with actual words.' }
    }
  }
  
  return { isValid: true, reason: null }
}

/**
 * Check text for profanity only (without full moderation)
 * Useful for real-time input validation
 * Uses both legacy filter and new dynamic regex-based filter
 */
export const checkProfanity = (text) => {
  // Use both the legacy filter and the new dynamic filter
  const legacyResult = profanityFilter.check(text)
  const newResult = checkProfanityFilter(text)
  
  // Combine results - return true if either detects profanity
  return {
    hasProfanity: legacyResult.hasProfanity || newResult.hasProfanity,
    matches: [...new Set([...legacyResult.matches, ...newResult.matches])],
    severity: legacyResult.severity || (newResult.hasProfanity ? 'medium' : 'none'),
    language: newResult.language || null
  }
}

/**
 * Fast profanity check for real-time validation
 * Returns boolean only
 */
export const quickCheckProfanity = (text) => {
  return fastCheckProfanity(text) || profanityFilter.check(text).hasProfanity
}

/**
 * Censor profanity in text (replace with asterisks)
 * Useful for displaying flagged content to admins
 */
export { censorText }

// Re-export profanity filter utilities for external use
export {
  generateRegexFromWord,
  normalizeProfanityText as normalizeTextForProfanity,
  BAD_WORD_ROOTS,
  LEETSPEAK_MAP
}

export { profanityFilter, normalizeText }
export default moderationClassifier
