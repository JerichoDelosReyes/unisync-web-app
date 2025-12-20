/**
 * Profanity Filter Utility
 * 
 * Uses leetspeak-aware regex generation to detect profanity variations.
 * Works with the Naive Bayes moderation system.
 */

// Leetspeak character substitution map for regex generation
const LEETSPEAK_MAP = {
  'a': ['a', '4', '@', 'e'],
  'b': ['b', '8', '6'],
  'c': ['c', '(', '<', 'k', 's'],
  'e': ['e', '3', 'a'],
  'g': ['g', '6', '9', 'q'],
  'i': ['i', '1', '!', 'l', '|'],
  'k': ['k', 'c', 'x'],
  'l': ['l', '1', '|', 'i'],
  'o': ['o', '0', '()', '@'],
  's': ['s', '5', '$', 'z'],
  't': ['t', '7', '+'],
  'u': ['u', 'v', 'w'],
  'y': ['y', 'j']
}

// Root word database - only base forms, variations generated dynamically
const BAD_WORD_ROOTS = {
  tagalog: [
    "putangina", "tangina", "tngina", "pota", "puta", "gago", "gagu",
    "tanga", "bobo", "vovo", "bubu", "tarantado", "trntado",
    "ulol", "olul", "ulul", "leche", "letse", "piste", "pisti",
    "hindot", "kantot", "tite", "titi", "pepek", "puki", "kiki",
    "kepyas", "jakol", "jabol", "bayag", "suso", "bilat", "burat", "kupal"
  ],
  english: [
    "fuck", "fck", "shit", "shet", "bitch", "btch", "asshole",
    "bastard", "bullshit", "crap", "damn", "dick", "pussy",
    "cock", "cunt", "whore", "slut", "motherfucker",
    "nigga", "nigger", "faggot", "retard", "idiot", "stupid"
  ]
}

// Reverse map for normalization (leetspeak to standard letter)
const REVERSE_LEETSPEAK_MAP = {
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
  '|': 'l',
  '+': 't',
  '(': 'c',
  '<': 'c'
}

/**
 * Escape special regex characters in a string
 * @param {string} char - Character to escape
 * @returns {string} - Escaped character
 */
const escapeRegexChar = (char) => {
  const specialChars = ['(', ')', '[', ']', '{', '}', '|', '\\', '^', '$', '.', '*', '+', '?']
  if (specialChars.includes(char)) {
    return '\\' + char
  }
  return char
}

/**
 * Generate a regex pattern from a root word using leetspeak substitutions
 * @param {string} word - The root word (e.g., "tite")
 * @returns {RegExp} - A regex that matches leetspeak variations (e.g., /[t7+][i1!l|]+[t7+][e3a]+/gi)
 */
export const generateRegexFromWord = (word) => {
  let pattern = ''
  
  for (const char of word.toLowerCase()) {
    const substitutions = LEETSPEAK_MAP[char]
    
    if (substitutions) {
      // Create character class with all substitutions, properly escaped
      const escapedSubs = substitutions.map(escapeRegexChar)
      pattern += `[${escapedSubs.join('')}]+`
    } else {
      // No substitutions, use the character as-is (escaped if needed)
      pattern += escapeRegexChar(char) + '+'
    }
  }
  
  // Add word boundary awareness with optional separators (spaces, dots, dashes, etc.)
  // This catches things like "f.u.c.k" or "f u c k"
  const separatorAwarePattern = pattern.replace(/\]\+\[/g, ']+[\\s.\\-_]*[')
  
  return new RegExp(separatorAwarePattern, 'gi')
}

/**
 * Generate regex patterns with separator tolerance
 * Catches words with characters like "f.u.c.k" or "s h i t"
 * @param {string} word - The root word
 * @returns {RegExp} - Regex with separator tolerance
 */
export const generateSeparatorTolerantRegex = (word) => {
  let pattern = ''
  const chars = word.toLowerCase().split('')
  
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    const substitutions = LEETSPEAK_MAP[char]
    
    if (substitutions) {
      const escapedSubs = substitutions.map(escapeRegexChar)
      pattern += `[${escapedSubs.join('')}]`
    } else {
      pattern += escapeRegexChar(char)
    }
    
    // Add optional separator between characters (but not after last char)
    if (i < chars.length - 1) {
      pattern += '[\\s.\\-_*]*'
    }
  }
  
  return new RegExp(pattern, 'gi')
}

/**
 * Normalize text by converting leetspeak to standard letters
 * and cleaning up for Naive Bayes classification
 * @param {string} text - The input text to normalize
 * @returns {string} - Normalized text
 */
export const normalizeText = (text) => {
  if (!text || typeof text !== 'string') return ''
  
  let normalized = text.toLowerCase()
  
  // Step 1: Remove excessive repeated characters (more than 2)
  // "fuuuuuck" -> "fuuck"
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1')
  
  // Step 2: Convert leetspeak characters to standard letters
  let result = ''
  for (const char of normalized) {
    result += REVERSE_LEETSPEAK_MAP[char] || char
  }
  
  // Step 3: Remove separators that might be used to evade detection
  // "f.u.c.k" or "f u c k" -> "fuck"
  result = result.replace(/[\s.\\-_*]+/g, '')
  
  // Step 4: Remove non-alphanumeric characters except spaces
  result = result.replace(/[^a-z0-9\s]/g, '')
  
  return result.trim()
}

/**
 * Check if text contains profanity using generated regex patterns
 * @param {string} text - The text to check
 * @returns {object} - { hasProfanity: boolean, matches: string[], language: string }
 */
export const checkProfanity = (text) => {
  if (!text || typeof text !== 'string') {
    return { hasProfanity: false, matches: [], language: null }
  }
  
  const matches = []
  let detectedLanguage = null
  
  // Check against Tagalog words
  for (const word of BAD_WORD_ROOTS.tagalog) {
    const regex = generateRegexFromWord(word)
    const separatorRegex = generateSeparatorTolerantRegex(word)
    
    const match = text.match(regex) || text.match(separatorRegex)
    if (match) {
      matches.push(...match)
      detectedLanguage = 'tagalog'
    }
  }
  
  // Check against English words
  for (const word of BAD_WORD_ROOTS.english) {
    const regex = generateRegexFromWord(word)
    const separatorRegex = generateSeparatorTolerantRegex(word)
    
    const match = text.match(regex) || text.match(separatorRegex)
    if (match) {
      matches.push(...match)
      if (!detectedLanguage) detectedLanguage = 'english'
      else if (detectedLanguage === 'tagalog') detectedLanguage = 'mixed'
    }
  }
  
  // Also check normalized text for additional detection
  const normalizedText = normalizeText(text)
  
  // Simple substring check on normalized text as fallback
  const allRoots = [...BAD_WORD_ROOTS.tagalog, ...BAD_WORD_ROOTS.english]
  for (const word of allRoots) {
    if (normalizedText.includes(word)) {
      if (!matches.includes(word)) {
        matches.push(word)
      }
    }
  }
  
  return {
    hasProfanity: matches.length > 0,
    matches: [...new Set(matches)], // Remove duplicates
    language: detectedLanguage
  }
}

/**
 * Censor profanity in text by replacing with asterisks
 * @param {string} text - The text to censor
 * @returns {string} - Censored text
 */
export const censorText = (text) => {
  if (!text || typeof text !== 'string') return text
  
  let censored = text
  
  // Censor Tagalog words
  for (const word of BAD_WORD_ROOTS.tagalog) {
    const regex = generateRegexFromWord(word)
    censored = censored.replace(regex, (match) => '*'.repeat(match.length))
  }
  
  // Censor English words
  for (const word of BAD_WORD_ROOTS.english) {
    const regex = generateRegexFromWord(word)
    censored = censored.replace(regex, (match) => '*'.repeat(match.length))
  }
  
  return censored
}

/**
 * Get profanity severity level
 * @param {string} text - The text to analyze
 * @returns {string} - 'none' | 'mild' | 'moderate' | 'severe'
 */
export const getProfanitySeverity = (text) => {
  const { matches } = checkProfanity(text)
  
  if (matches.length === 0) return 'none'
  if (matches.length === 1) return 'mild'
  if (matches.length <= 3) return 'moderate'
  return 'severe'
}

/**
 * Pre-compile all regex patterns for better performance
 * Call this once at startup to cache patterns
 */
let compiledPatterns = null

export const compilePatterns = () => {
  if (compiledPatterns) return compiledPatterns
  
  compiledPatterns = {
    tagalog: BAD_WORD_ROOTS.tagalog.map(word => ({
      word,
      regex: generateRegexFromWord(word),
      separatorRegex: generateSeparatorTolerantRegex(word)
    })),
    english: BAD_WORD_ROOTS.english.map(word => ({
      word,
      regex: generateRegexFromWord(word),
      separatorRegex: generateSeparatorTolerantRegex(word)
    }))
  }
  
  return compiledPatterns
}

/**
 * Fast profanity check using pre-compiled patterns
 * @param {string} text - Text to check
 * @returns {boolean} - true if profanity detected
 */
export const fastCheckProfanity = (text) => {
  if (!text || typeof text !== 'string') return false
  
  const patterns = compilePatterns()
  
  // Check all compiled patterns
  for (const pattern of [...patterns.tagalog, ...patterns.english]) {
    if (pattern.regex.test(text) || pattern.separatorRegex.test(text)) {
      // Reset regex lastIndex for global patterns
      pattern.regex.lastIndex = 0
      pattern.separatorRegex.lastIndex = 0
      return true
    }
    // Reset regex lastIndex
    pattern.regex.lastIndex = 0
    pattern.separatorRegex.lastIndex = 0
  }
  
  // Fallback: check normalized text
  const normalizedText = normalizeText(text)
  const allRoots = [...BAD_WORD_ROOTS.tagalog, ...BAD_WORD_ROOTS.english]
  
  for (const word of allRoots) {
    if (normalizedText.includes(word)) {
      return true
    }
  }
  
  return false
}

// Export constants for external use
export { BAD_WORD_ROOTS, LEETSPEAK_MAP, REVERSE_LEETSPEAK_MAP }

export default {
  generateRegexFromWord,
  normalizeText,
  checkProfanity,
  censorText,
  getProfanitySeverity,
  compilePatterns,
  fastCheckProfanity,
  BAD_WORD_ROOTS,
  LEETSPEAK_MAP
}
