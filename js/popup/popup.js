import { findMatches } from '../results/search.js';
import { extractContext, highlightText, escapeHtml, formatTime } from '../results/utils.js';

document.getElementById('searchButton').addEventListener('click', performSearch);

document.getElementById('searchInput').addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    performSearch();
  }
});

// Add click listeners to tabs
document.getElementById('current-video').addEventListener('click', function() {
  // Don't allow clicking if disabled
  if (this.getAttribute('aria-disabled') === 'true') {
    return;
  }
  selectTab('current-video');
});

document.getElementById('transcipts').addEventListener('click', function() {
  selectTab('transcipts');
});

document.getElementById('clearResultsButton').addEventListener('click', clearCurrentVideoResults);

async function performSearch() {
  const query = document.getElementById('searchInput').value;

  if (!query.trim()) {
    return;
  }

  const currentVideoSelected = document.getElementById('current-video').getAttribute('aria-selected') === 'true';

  if (currentVideoSelected) {
    await performCurrentVideoSearch(query);
  } else {
    await performTranscriptSearch(query);
  }
}

async function performTranscriptSearch(query) {
  chrome.runtime.sendMessage({
    type: 'OPEN_SEARCH_RESULTS',
    query: query
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Popup] Error:', chrome.runtime.lastError.message);
      alert('Error opening search results');
    } else {
      console.log('[Popup] Search request sent successfully');
    }
  });

  window.close();
}

async function performCurrentVideoSearch(query) {
  console.log('[Popup] Searching current video for:', query);

  try {
    // Get current tab to extract video ID
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const urlParams = new URLSearchParams(new URL(tab.url).search);
    const videoId = urlParams.get('v');

    if (!videoId) {
      showCurrentVideoResults([], query, 'Could not determine video ID');
      return;
    }

    // Load transcript from storage
    const result = await chrome.storage.local.get('videos');
    const videos = result.videos || {};
    const videoData = videos[videoId];

    if (!videoData || !videoData.transcript) {
      showCurrentVideoResults([], query, 'No transcript found for this video. Try enabling captions and refreshing.');
      return;
    }

    // Search using existing findMatches function
    const matches = findMatches(videoData.transcript, query);

    // Display results in popup
    showCurrentVideoResults(matches, query, null, videoId);

  } catch (error) {
    console.error('[Popup] Error searching current video:', error);
    showCurrentVideoResults([], query, 'Error searching transcript: ' + error.message);
  }
}

function showCurrentVideoResults(matches, query, errorMessage, videoId) {
  const resultsContainer = document.getElementById('currentVideoResults');
  const resultsCount = document.getElementById('currentVideoResultsCount');
  const resultsContent = document.getElementById('currentVideoResultsContent');

  // Show the results container
  resultsContainer.removeAttribute('hidden');

  // Handle error case
  if (errorMessage) {
    resultsCount.textContent = 'Error';
    resultsContent.innerHTML = `<div class="no-results-message">${escapeHtml(errorMessage)}</div>`;
    return;
  }

  // Handle no results case
  if (matches.length === 0) {
    resultsCount.textContent = 'No matches found';
    resultsContent.innerHTML = `<div class="no-results-message">No matches found for "${escapeHtml(query)}"</div>`;
    return;
  }

  // Display match count
  resultsCount.textContent = `${matches.length} match${matches.length !== 1 ? 'es' : ''}`;

  // Build results HTML
  let html = '';
  matches.forEach((match, index) => {
    const context = extractContext(match.text, query);
    const highlightedText = highlightText(escapeHtml(context), query);

    html += `
      <div class="result-item" data-timestamp="${match.timeSeconds}" data-index="${index}">
        <div class="result-timestamp">${formatTime(match.timestamp)}</div>
        <div class="result-text">${highlightedText}</div>
      </div>
    `;
  });

  resultsContent.innerHTML = html;

  // Add click handlers to result items
  const resultItems = resultsContent.querySelectorAll('.result-item');
  resultItems.forEach(item => {
    item.addEventListener('click', async () => {
      const timestamp = parseInt(item.getAttribute('data-timestamp'));
      await navigateToTimestamp(timestamp);
    });
  });
}

async function navigateToTimestamp(timeSeconds) {
  console.log('[Popup] Navigating to timestamp:', timeSeconds);

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

    // Send message to content script to navigate
    chrome.tabs.sendMessage(tab.id, {
      type: 'NAVIGATE_TO_TIMESTAMP',
      timestamp: timeSeconds
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Popup] Error navigating:', chrome.runtime.lastError.message);
        alert('Error navigating to timestamp. Try refreshing the page.');
      } else {
        console.log('[Popup] Navigation successful');
      }
    });

  } catch (error) {
    console.error('[Popup] Error in navigateToTimestamp:', error);
    alert('Error navigating to timestamp: ' + error.message);
  }
}

function clearCurrentVideoResults() {
  const resultsContainer = document.getElementById('currentVideoResults');
  resultsContainer.setAttribute('hidden', '');
  document.getElementById('currentVideoResultsContent').innerHTML = '';
  document.getElementById('currentVideoResultsCount').textContent = '';
}

async function checkForCaptionsAndUpdatePopup() {
  console.log("Checking for captions and whether to update the popup");

  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  const isWatchURL = tab.url.includes("/watch");
  const currentVideoTab = document.getElementById("current-video");
  const tooltip = document.getElementById("current-video-disabled-reason");

  if (!isWatchURL) {
    // Not on a watch page, disable current video tab and show transcripts tab
    currentVideoTab.setAttribute("aria-disabled", "true");
    tooltip.removeAttribute("hidden");
    selectTab("transcipts");
    return;
  }

  // Query the YouTube tab for caption availability
  chrome.tabs.sendMessage(tab.id, {type: 'CHECK_CAPTIONS'}, (response) => {
    if (chrome.runtime.lastError) {
      console.log('[Popup] Could not check captions:', chrome.runtime.lastError.message);
      // Default to transcripts tab if we can't check, and disable current video tab
      currentVideoTab.setAttribute("aria-disabled", "true");
      tooltip.removeAttribute("hidden");
      selectTab("transcipts");
      return;
    }

    const captionsUnavailable = !response || response.captionsUnavailable;

    // If there are no captions available on the current video
    if (captionsUnavailable) {
      // Disable current video tab, select the transcript tab
      currentVideoTab.setAttribute("aria-disabled", "true");
      tooltip.removeAttribute("hidden");
      selectTab("transcipts");
    } else {
      // Enable current video tab and select it
      currentVideoTab.removeAttribute("aria-disabled");
      tooltip.setAttribute("hidden", "");
      selectTab("current-video");
    }
  });
}

function selectTab(tabId) {
  // Remove aria-selected from all tabs
  document.getElementById("current-video").removeAttribute("aria-selected");
  document.getElementById("transcipts").removeAttribute("aria-selected");

  // Set aria-selected on the active tab
  document.getElementById(tabId).setAttribute("aria-selected", "true");

  // Update label based on selected tab
  if (tabId === "transcipts") {
    document.getElementById("searchInputLabel").innerHTML = "Search transcripts:";
    clearCurrentVideoResults();
  } else {
    document.getElementById("searchInputLabel").innerHTML = "Search current video:";
  }
}

checkForCaptionsAndUpdatePopup();
