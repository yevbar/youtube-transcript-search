// Common English stop words for transcript trimming
export const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'cannot', 'could', 'did', 'do', 'does',
  'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has',
  'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his',
  'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me',
  'might', 'more', 'most', 'must', 'my', 'myself', 'no', 'nor', 'not', 'now',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves',
  'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
  'why', 'will', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
  'yeah', 'yes', 'ok', 'okay', 'um', 'uh', 'oh', 'ah', 'hmm', 'well', 'like',
  'you know', 'i mean', 'kind of', 'sort of', 'going to', 'want to', 'got', 'get',
  'also', 'back', 'even', 'go', 'good', 'know', 'make', 'new', 'one', 'see',
  'take', 'think', 'time', 'two', 'use', 'way', 'work', 'first', 'give', 'day',
  'find', 'long', 'little', 'come', 'look', 'may', 'part', 'over', 'place', 'right',
  'thing', 'tell', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
]);

/**
 * Check if a word is a stop word
 * @param {string} word - Word to check
 * @returns {boolean} - True if stop word
 */
export function isStopWord(word) {
  if (!word || typeof word !== 'string') return false;
  return STOP_WORDS.has(word.toLowerCase().trim());
}

/**
 * Trim stop words from a text segment
 * @param {string} text - Text segment
 * @returns {string} - Text with stop words removed, or empty string if only stop words
 */
export function removeStopWords(text) {
  if (!text || typeof text !== 'string') return '';

  // Split into words, filter out stop words, rejoin
  const words = text.split(/\s+/);
  const filtered = words.filter(word => {
    // Keep punctuation-only "words"
    if (word.match(/^[^\w]+$/)) return true;
    // Remove punctuation for checking if it's a stop word
    const cleanWord = word.replace(/[^\w]/g, '');
    if (!cleanWord) return true; // Keep if only punctuation after cleaning
    return !isStopWord(cleanWord);
  });

  return filtered.join(' ').trim();
}

/**
 * Trim transcript by removing stop words from segments
 * Preserves structure and timestamps
 * @param {Object} transcript - Original transcript object
 * @returns {Object} - Trimmed transcript
 */
export function trimTranscript(transcript) {
  if (!transcript || !transcript.events) {
    return transcript;
  }

  // Deep clone to avoid mutating original
  const trimmed = JSON.parse(JSON.stringify(transcript));

  // Process each event
  trimmed.events = trimmed.events.map(event => {
    if (!event.segs) return event;

    // Filter segments: remove those that contain only stop words
    event.segs = event.segs.map(seg => {
      if (!seg.utf8) return seg;

      const trimmedText = removeStopWords(seg.utf8);

      // Return segment with trimmed text
      return {
        ...seg,
        utf8: trimmedText
      };
    }).filter(seg => {
      // Remove completely empty segments
      return seg.utf8 && seg.utf8.trim().length > 0;
    });

    return event;
  }).filter(event => {
    // Remove events with no segments left
    return event.segs && event.segs.length > 0;
  });

  return trimmed;
}
