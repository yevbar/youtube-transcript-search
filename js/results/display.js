import { extractContext, highlightText, escapeHtml, formatTime } from './utils.js';

export function displayResults(results, query) {
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
    const thumbnailUrl = `https://img.youtube.com/vi/${result.videoId}/mqdefault.jpg`;
    const trimmedBadge = result.isTrimmed
      ? '<span class="trimmed-badge" title="Older transcript with stop words removed">Trimmed</span>'
      : '';

    // Start collapsible result card
    html += `
      <details class="result-card" open>
        <summary>${escapeHtml(result.title)} ${trimmedBadge}</summary>
        <div class="result-content">
          <div class="video-player">
            <a href="${result.url}" target="_blank" class="thumbnail-link">
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
            <p class="video-author">${escapeHtml(result.author)}</p>
            <div class="matches-section">
              <p class="matches-label">Matches:</p>
    `;

    // Render all matches
    result.matches.forEach(match => {
      const videoUrl = `${result.url}&t=${match.timeSeconds}s`;
      html += `
              <div class="match-item">
                <p class="video-timestamp"><a href="${videoUrl}" target="_blank" style="color: inherit; text-decoration: none;">${formatTime(match.timestamp)}</a></p>
                <p class="match-text">${highlightText(escapeHtml(extractContext(match.text, query)), query)}</p>
              </div>
      `;
    });

    // Close the result card
    html += `
            </div>
          </div>
        </div>
      </details>
    `;
  });

  contentElement.innerHTML = html;
}

export function displayError(message) {
  document.getElementById('searchQuery').textContent = '';
  document.getElementById('resultsCount').textContent = '';
  document.getElementById('resultsContent').innerHTML = `<p class="no-results">${escapeHtml(message)}</p>`;
}
