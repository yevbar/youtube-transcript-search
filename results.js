console.log('[Results Page] Loaded');

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Results Page] DOMContentLoaded');

  const query = getSearchQuery();

  if (!query) {
    displayError('No search query provided');
    return;
  }

  // Pre-populate the search input with the current query
  const searchInput = document.getElementById('searchInput');
  searchInput.value = query;

  document.getElementById('searchQuery').textContent = `Searching for: "${query}"`;
  await performSearch(query);

  // Handle search form submission
  const searchForm = document.getElementById('searchForm');
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newQuery = searchInput.value.trim();

    if (!newQuery) {
      return;
    }

    // Update URL and reload the page with the new query
    const newUrl = `${window.location.pathname}?q=${encodeURIComponent(newQuery)}`;
    window.location.href = newUrl;
  });
});

function getSearchQuery() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('q') || '';
}

async function performSearch(query) {
  console.log('[Results Page] Performing search for:', query);

  const result = await chrome.storage.local.get('videos');
  const videos = result.videos || {};

  console.log('[Results Page] Loaded videos from storage:', Object.keys(videos).length, 'videos');

  if (Object.keys(videos).length === 0) {
    displayError('No transcripts available yet. Visit YouTube videos with captions to start building your search index.');
    return;
  }

  const results = [];

  for (const [videoId, videoData] of Object.entries(videos)) {
    const matches = findMatches(videoData.transcript, query);

    if (matches.length > 0) {
      results.push({
        videoId: videoId,
        title: videoData.title,
        author: videoData.author,
        url: videoData.url,
        matches: matches
      });
    }
  }

  console.log('[Results Page] Found', results.length, 'videos with matches');
  displayResults(results, query);
}

function findMatches(transcript, query) {
  const matches = [];
  const lowerQuery = query.toLowerCase();

  if (!transcript || !transcript.events) {
    return matches;
  }

  for (const event of transcript.events) {
    if (!event.segs) continue;

    const text = event.segs.map(seg => seg.utf8 || '').join('');

    if (text.toLowerCase().includes(lowerQuery)) {
      matches.push({
        timestamp: event.tStartMs,
        text: text,
        timeSeconds: Math.floor(event.tStartMs / 1000)
      });
    }
  }

  return matches;
}

function displayResults(results, query) {
  const countElement = document.getElementById('resultsCount');
  const contentElement = document.getElementById('resultsContent');

  if (results.length === 0) {
    countElement.textContent = '';
    contentElement.innerHTML = '<p class="no-results">No results found.</p>';
    return;
  }

  let totalMatches = 0;
  results.forEach(result => {
    totalMatches += result.matches.length;
  });

  countElement.textContent = `Found ${totalMatches} match${totalMatches !== 1 ? 'es' : ''} in ${results.length} video${results.length !== 1 ? 's' : ''}`;

  let html = '';

  results.forEach(result => {
    result.matches.forEach(match => {
      const thumbnailUrl = `https://img.youtube.com/vi/${result.videoId}/mqdefault.jpg`;
      const videoUrl = `${result.url}&t=${match.timeSeconds}s`;

      html += `
        <div class="result-card">
          <div class="result-content">
            <div class="video-player">
              <a href="${videoUrl}" target="_blank" class="thumbnail-link">
                <img src="${thumbnailUrl}" alt="${escapeHtml(result.title)}" class="video-thumbnail">
                <div class="play-overlay">
                  <svg viewBox="0 0 68 48" class="play-icon">
                    <path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path>
                    <path d="M 45,24 27,14 27,34" fill="#fff"></path>
                  </svg>
                </div>
              </a>
            </div>
            <div class="result-info">
              <a href="${videoUrl}" target="_blank" class="video-title-link">
                <h3 class="video-title">${escapeHtml(result.title)}</h3>
              </a>
              <p class="video-author">${escapeHtml(result.author)}</p>
              <p class="video-timestamp">${formatTime(match.timestamp)}</p>
              <p class="match-text">${highlightText(escapeHtml(extractContext(match.text, query)), query)}</p>
            </div>
          </div>
        </div>
      `;
    });
  });

  contentElement.innerHTML = html;
}

function displayError(message) {
  document.getElementById('searchQuery').textContent = '';
  document.getElementById('resultsCount').textContent = '';
  document.getElementById('resultsContent').innerHTML = `<p class="no-results">${escapeHtml(message)}</p>`;
}

function extractContext(text, query) {
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

function highlightText(text, query) {
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
