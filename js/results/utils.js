export function extractContext(text, query) {
  // Find the position of the match
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) {
    return text; // Return full text if no match found
  }

  // Split text into sentences (split by . ! ? followed by space or end of string)
  const sentencePattern = /[.!?]+(?:\s+|$)/g;
  const sentences = [];
  let lastIndex = 0;
  let match;

  // Extract sentences with their positions
  while ((match = sentencePattern.exec(text)) !== null) {
    sentences.push({
      text: text.substring(lastIndex, match.index + match[0].length).trim(),
      start: lastIndex,
      end: match.index + match[0].length
    });
    lastIndex = match.index + match[0].length;
  }

  // Add the last sentence if there's remaining text
  if (lastIndex < text.length) {
    sentences.push({
      text: text.substring(lastIndex).trim(),
      start: lastIndex,
      end: text.length
    });
  }

  // If no sentences were found, return the full text
  if (sentences.length === 0) {
    return text;
  }

  // Find which sentence contains the match
  let matchingSentenceIndex = -1;
  for (let i = 0; i < sentences.length; i++) {
    if (matchIndex >= sentences[i].start && matchIndex < sentences[i].end) {
      matchingSentenceIndex = i;
      break;
    }
  }

  // If we couldn't find the sentence, return full text
  if (matchingSentenceIndex === -1) {
    return text;
  }

  // Extract context: 1 sentence before, matching sentence, 1 sentence after
  const startIndex = Math.max(0, matchingSentenceIndex - 1);
  const endIndex = Math.min(sentences.length - 1, matchingSentenceIndex + 1);

  // Build context string
  let context = '';
  for (let i = startIndex; i <= endIndex; i++) {
    context += sentences[i].text;
    if (i < endIndex && !sentences[i].text.match(/[.!?]$/)) {
      context += ' '; // Add space between sentences if not already ending with punctuation
    } else if (i < endIndex) {
      context += ' '; // Add space after punctuation
    }
  }

  return context.trim();
}

export function highlightText(text, query) {
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
