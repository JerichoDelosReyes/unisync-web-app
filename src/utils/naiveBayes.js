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
 * - Uses regex patterns to catch obfuscated curse words (f*ck, sh!t, etc.)
 * - Includes racial slurs, homophobic terms, Filipino curses
 * - Harassment and hate speech detection
 * - Automatic rejection for severe content, manual review for medium
 */

// ==================== PROFANITY & SLUR FILTER ====================
// Comprehensive list of offensive terms (patterns to catch variations)
const PROFANITY_PATTERNS = [
  // English curse words (with common obfuscations like * @ 1 !)
  /\bf+[u*@]+[c*]+k+/gi,
  /\bs+h+[i1!*]+t+/gi,
  /\bb+[i1!]+t+c+h+/gi,
  /\ba+s+s+h+[o0]+l+e+/gi,
  /\bd+[a@]+m+n+/gi,
  /\bh+e+l+l+\b/gi,
  /\bc+r+a+p+/gi,
  /\bb+a+s+t+[a@]+r+d+/gi,
  /\bw+h+[o0]+r+e+/gi,
  /\bs+l+u+t+/gi,
  /\bd+[i1!]+c+k+/gi,
  /\bp+[e3]+n+[i1!]+s+/gi,
  /\bc+[o0]+c+k+/gi,
  /\bp+u+s+s+y+/gi,
  /\bc+u+n+t+/gi,
  /\bt+[i1!]+t+s*\b/gi,
  /\bb+[o0]+[o0]+b+s*/gi,
  
  // Racial slurs (patterns to catch variations - NEVER acceptable)
  /\bn+[i1!]+g+g+[e3a@]+r*/gi,
  /\bn+[i1!]+g+g+[a@]+/gi,
  /\bc+h+[i1!]+n+k+/gi,
  /\bg+[o0]+[o0]+k+/gi,
  /\bs+p+[i1!]+c+\b/gi,
  /\bw+[e3]+t+b+a+c+k+/gi,
  /\bk+[i1!]+k+e+/gi,
  /\br+a+g+h+e+a+d+/gi,
  /\bt+[o0]+w+e+l+h+e+a+d+/gi,
  /\bc+a+m+e+l+j+[o0]+c+k+e+y+/gi,
  
  // Filipino slurs/curses (Tagalog)
  /\bp+u+t+[a@]+n*g*\s*[i1!]*n*[a@]*/gi,
  /\bg+[a@]+g+[o0]+/gi,
  /\bt+[a@]+n+g+[a@]*\s*[i1!]*n*[a@]*/gi,
  /\bl+[i1!]+n+t+[i1!]+k+/gi,
  /\bu+l+[o0]+l+/gi,
  /\bt+[a@]+r+[a@]+n+t+[a@]+d+[o0]+/gi,
  /\bb+[o0]+b+[o0]+\b/gi,
  /\bl+e+c+h+e+/gi,
  /\bp+u+n+y+e+t+[a@]+/gi,
  /\bh+[i1!]+n+d+[o0]+t+/gi,
  /\bk+[a@]+n+t+[o0]+t+/gi,
  /\bp+a+k+y+u+/gi,
  /\bp+u+k+[i1!]+n+[a@]+n+g+[i1!]+n+[a@]+/gi,
  
  // Homophobic slurs
  /\bf+[a@]+g+g*[o0]*t*/gi,
  /\bd+y+k+e+/gi,
  /\bt+r+[a@]+n+n+y+/gi,
  
  // Ableist slurs
  /\br+[e3]+t+[a@]+r+d+/gi,
];

// Hate speech keywords (context-sensitive phrases)
const HATE_KEYWORDS = [
  'kill all', 'death to', 'eliminate all', 'exterminate',
  'white power', 'race war', 'ethnic cleansing',
  'go back to your country', 'not belong here',
  'inferior race', 'subhuman',
  'hang them', 'burn them all', 'shoot them all',
];

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
];

/**
 * Profanity Filter - Detects explicit offensive content
 * This runs BEFORE Naive Bayes for immediate rejection of severe content
 */
class ProfanityFilter {
  constructor() {
    this.profanityPatterns = PROFANITY_PATTERNS;
    this.hateKeywords = HATE_KEYWORDS;
    this.harassmentPatterns = HARASSMENT_PATTERNS;
    this.customBannedWords = new Set();
  }

  /**
   * Add custom banned words (admin feature)
   */
  addBannedWord(word) {
    this.customBannedWords.add(word.toLowerCase());
  }

  /**
   * Check text for profanity, slurs, and harassment
   * @returns {object} { hasProfanity, matches, severity, category }
   */
  check(text) {
    const normalizedText = text.toLowerCase();
    const matches = [];
    let severity = 'none';
    let category = 'clean';

    // Check profanity patterns (curse words, slurs)
    for (const pattern of this.profanityPatterns) {
      const found = normalizedText.match(pattern);
      if (found) {
        matches.push(...found.map(m => m.replace(/./g, '*').substring(0, 3) + '***')); // Censor in results
        severity = 'severe';
        category = 'profanity';
      }
    }

    // Check hate keywords
    for (const keyword of this.hateKeywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        matches.push('[hate speech]');
        severity = 'severe';
        category = 'hate_speech';
      }
    }

    // Check harassment patterns
    for (const pattern of this.harassmentPatterns) {
      const found = normalizedText.match(pattern);
      if (found) {
        matches.push('[harassment]');
        severity = 'severe';
        category = 'harassment';
      }
    }

    // Check custom banned words
    for (const word of this.customBannedWords) {
      if (normalizedText.includes(word)) {
        matches.push(`[banned: ${word.substring(0, 2)}***]`);
        if (severity === 'none') severity = 'medium';
        if (category === 'clean') category = 'custom_banned';
      }
    }

    return {
      hasProfanity: matches.length > 0,
      matches: [...new Set(matches)],
      severity,
      category,
      count: matches.length
    };
  }

  /**
   * Censor profanity in text (replace with asterisks)
   */
  censor(text) {
    let censoredText = text;
    
    for (const pattern of this.profanityPatterns) {
      censoredText = censoredText.replace(pattern, (match) => {
        if (match.length <= 2) return '**';
        return match[0] + '*'.repeat(match.length - 2) + match[match.length - 1];
      });
    }
    
    return censoredText;
  }
}

// Create singleton profanity filter instance
const profanityFilter = new ProfanityFilter();

// ==================== NAIVE BAYES CLASSIFIER ====================

class NaiveBayesClassifier {
  constructor() {
    // Word counts per category
    this.wordCounts = {
      safe: {},
      unsafe: {}
    };
    
    // Total documents per category
    this.categoryCounts = {
      safe: 0,
      unsafe: 0
    };
    
    // Total words per category
    this.totalWords = {
      safe: 0,
      unsafe: 0
    };
    
    // Vocabulary (all unique words)
    this.vocabulary = new Set();
    
    // Laplace smoothing parameter (prevents zero probabilities)
    this.smoothing = 1;
    
    // Initialize with training data
    this.train();
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
      .filter(word => word.length > 2); // Keep words with 3+ chars
  }
  
  /**
   * Train the classifier with labeled examples
   * In production, this would use a larger dataset from a database
   */
  train() {
    // SAFE content examples (typical announcements)
    const safeExamples = [
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
      "Welcome back to school activities"
    ];
    
    // UNSAFE content examples (inappropriate, spam, offensive)
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
      "Offensive language and cursing"
    ];
    
    // Train on safe examples
    safeExamples.forEach(text => {
      this.addDocument(text, 'safe');
    });
    
    // Train on unsafe examples
    unsafeExamples.forEach(text => {
      this.addDocument(text, 'unsafe');
    });
  }
  
  /**
   * Add a document to the training set
   */
  addDocument(text, category) {
    const words = this.tokenize(text);
    
    this.categoryCounts[category]++;
    
    words.forEach(word => {
      // Add to vocabulary
      this.vocabulary.add(word);
      
      // Initialize word count if needed
      if (!this.wordCounts[category][word]) {
        this.wordCounts[category][word] = 0;
      }
      
      // Increment counts
      this.wordCounts[category][word]++;
      this.totalWords[category]++;
    });
  }
  
  /**
   * Calculate P(word|category) with Laplace smoothing
   * 
   * Formula: (count(word, category) + α) / (totalWords(category) + α × |vocabulary|)
   * 
   * Smoothing prevents zero probabilities for unseen words
   */
  wordProbability(word, category) {
    const wordCount = this.wordCounts[category][word] || 0;
    const totalWords = this.totalWords[category];
    const vocabSize = this.vocabulary.size;
    
    // Laplace smoothing
    return (wordCount + this.smoothing) / (totalWords + this.smoothing * vocabSize);
  }
  
  /**
   * Calculate P(category) - prior probability
   */
  categoryProbability(category) {
    const totalDocs = this.categoryCounts.safe + this.categoryCounts.unsafe;
    return this.categoryCounts[category] / totalDocs;
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
    const words = this.tokenize(text);
    
    // Calculate log probabilities (to avoid underflow with small numbers)
    let logProbSafe = Math.log(this.categoryProbability('safe'));
    let logProbUnsafe = Math.log(this.categoryProbability('unsafe'));
    
    // Multiply probabilities for each word (add in log space)
    words.forEach(word => {
      logProbSafe += Math.log(this.wordProbability(word, 'safe'));
      logProbUnsafe += Math.log(this.wordProbability(word, 'unsafe'));
    });
    
    // Convert back from log space
    const probSafe = Math.exp(logProbSafe);
    const probUnsafe = Math.exp(logProbUnsafe);
    
    // Normalize to get actual probabilities
    const total = probSafe + probUnsafe;
    const normalizedSafe = probSafe / total;
    const normalizedUnsafe = probUnsafe / total;
    
    // Determine category
    const isSafe = normalizedSafe > normalizedUnsafe;
    
    return {
      category: isSafe ? 'safe' : 'unsafe',
      confidence: isSafe ? normalizedSafe : normalizedUnsafe,
      probabilities: {
        safe: normalizedSafe,
        unsafe: normalizedUnsafe
      },
      // Flag for manual review if confidence is low
      needsReview: Math.max(normalizedSafe, normalizedUnsafe) < 0.7
    };
  }
  
  /**
   * Get flagged words that contributed to unsafe classification
   */
  getFlaggedWords(text) {
    const words = this.tokenize(text);
    const flaggedWords = [];
    
    words.forEach(word => {
      const safeProb = this.wordProbability(word, 'safe');
      const unsafeProb = this.wordProbability(word, 'unsafe');
      
      // Word is flagged if it's more likely in unsafe content
      if (unsafeProb > safeProb * 1.5) {
        flaggedWords.push({
          word,
          unsafeProbability: unsafeProb,
          safeProbability: safeProb
        });
      }
    });
    
    return flaggedWords;
  }
}

// Create singleton instance
const moderationClassifier = new NaiveBayesClassifier();

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
  const fullText = `${title} ${content}`;
  
  // LAYER 1: Check profanity filter first (immediate rejection for severe content)
  const profanityResult = profanityFilter.check(fullText);
  
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
      };
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
      };
    }
  }
  
  // LAYER 2: Naive Bayes classification for spam and subtle unsafe content
  const result = moderationClassifier.classify(fullText);
  
  // Determine action based on classification
  let status, message;
  
  if (result.category === 'safe' && result.confidence > 0.7) {
    status = 'approved';
    message = 'Content approved! Your announcement is now published.';
  } else if (result.category === 'unsafe' && result.confidence > 0.8) {
    status = 'rejected';
    message = 'Content flagged as potentially inappropriate. It will be reviewed by an administrator.';
  } else {
    status = 'pending_review';
    message = 'Content sent for manual review. An administrator will review it shortly.';
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
  };
};

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
  moderationClassifier.addDocument(text, isActuallySafe ? 'safe' : 'unsafe');
};

/**
 * Add a custom banned word to the profanity filter
 * Admin can add school-specific terms to block
 */
export const addBannedWord = (word) => {
  profanityFilter.addBannedWord(word);
};

/**
 * Check text for profanity only (without full moderation)
 * Useful for real-time input validation
 */
export const checkProfanity = (text) => {
  return profanityFilter.check(text);
};

/**
 * Censor profanity in text (replace with asterisks)
 * Useful for displaying flagged content to admins
 */
export const censorText = (text) => {
  return profanityFilter.censor(text);
};

export { profanityFilter };
export default moderationClassifier;
