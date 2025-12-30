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

async function performSearch() {
  const query = document.getElementById('searchInput').value;
  console.log('[Popup] Search query:', query);

  if (!query.trim()) {
    console.log('[Popup] Empty query, aborting');
    return;
  }

  // Check which tab is selected
  const currentVideoSelected = document.getElementById('current-video').getAttribute('aria-selected') === 'true';

  if (currentVideoSelected) {
    // Search in current video (this would need to be implemented)
    console.log('[Popup] Searching current video for:', query);
    // TODO: Implement current video search
    alert('Current video search not yet implemented');
  } else {
    // Search all transcripts
    performTranscriptSearch(query);
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
  } else {
    document.getElementById("searchInputLabel").innerHTML = "Search current video:";
  }
}

checkForCaptionsAndUpdatePopup();
