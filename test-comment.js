// Direct test of validateComment logic
const validateComment = (comment) => {
  if (!comment || typeof comment !== 'string') {
    return { isValid: false, reason: 'Comment cannot be empty.' }
  }
  
  const trimmed = comment.trim()
  
  if (trimmed.length < 2) {
    return { isValid: false, reason: 'Comment is too short.' }
  }
  
  const singleCharRepeated = /^(.)\1*$/i.test(trimmed)
  if (singleCharRepeated) {
    return { isValid: false, reason: 'Not just repeated characters.' }
  }
  
  const withoutSpaces = trimmed.replace(/\s+/g, '')
  if (withoutSpaces.length > 0 && /^(.)\1*$/i.test(withoutSpaces)) {
    return { isValid: false, reason: 'Not just repeated characters.' }
  }
  
  const repeatedShortPattern = /^(.{1,3})\s*(\1\s*){2,}$/i.test(trimmed)
  if (repeatedShortPattern) {
    return { isValid: false, reason: 'Not just repeated patterns.' }
  }
  
  const hasActualContent = /[a-zA-Z0-9]/.test(trimmed)
  if (!hasActualContent) {
    return { isValid: false, reason: 'Must contain actual words.' }
  }
  
  return { isValid: true, reason: null }
}

const tests = [
  'h', 'n', 'hhh', 'nnnn', 'hhhhhhhh',
  'h h h h', 'n n n n', 'ab ab ab',
  'Hello!', 'Nice post!', 'Salamat po!',
  'haha', 'lol', 'ok', 'Great work!'
];

console.log('=== Comment Validation Tests ===\n');
tests.forEach(test => {
  const result = validateComment(test);
  const status = result.isValid ? '✓ VALID' : '✗ INVALID';
  console.log(`${status}: "${test}" ${result.reason ? '- ' + result.reason : ''}`);
});
