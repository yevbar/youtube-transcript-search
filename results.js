console.log('[Results Page] Loaded');

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Results Page] DOMContentLoaded');

  const query = getSearchQuery();

  if (!query) {
    displayError('No search query provided');
    return;
  }

  document.getElementById('searchQuery').textContent = `"${query}"`;
  await performSearch(query);
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
    const thumbnailUrl = `https://i.ytimg.com/vi/${result.videoId}/mqdefault.jpg`;

    result.matches.forEach(match => {
      html += `
        <div class="result-card">
          <a href="${result.url}&t=${match.timeSeconds}s" target="_blank" class="result-link">
            <img src="${thumbnailUrl}" alt="${escapeHtml(result.title)}" class="thumbnail">
            <div class="result-info">
              <h3 class="video-title">${escapeHtml(result.title)}</h3>
              <p class="video-author">${escapeHtml(result.author)}</p>
              <p class="video-timestamp">${formatTime(match.timestamp)}</p>
              <p class="match-text">${highlightText(escapeHtml(match.text), query)}</p>
            </div>
          </a>
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
