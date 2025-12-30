// Track the results tab ID for reuse
let resultsTabId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRANSCRIPT_CAPTURED') {
    saveTranscript(message.videoId, message.transcript, message.metadata);
    // No response needed for this message type
  } else if (message.type === 'OPEN_SEARCH_RESULTS') {
    handleSearchRequest(message.query);
    sendResponse({ success: true });
    return true; // Only return true when we're sending an async response
  }
});

async function saveTranscript(videoId, transcript, metadata) {
  try {
    const result = await chrome.storage.local.get('videos');
    const videos = result.videos || {};

    videos[videoId] = {
      videoId: videoId,
      title: metadata.title || 'Unknown Title',
      author: metadata.author || 'Unknown Author',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      timestamp: Date.now(),
      transcript: transcript
    };

    await chrome.storage.local.set({ videos: videos });
    console.log(`[Background] Transcript saved for video: ${videoId}`);
  } catch (error) {
    console.error('[Background] Error saving transcript:', error);
  }
}

async function handleSearchRequest(query) {
  console.log('[Background] Handling search request for:', query);

  // Check if results tab still exists and is valid
  if (resultsTabId !== null) {
    try {
      const tab = await chrome.tabs.get(resultsTabId);

      // Tab exists, update it with new search
      console.log('[Background] Reusing existing results tab');
      await chrome.tabs.update(resultsTabId, {
        active: true,
        url: chrome.runtime.getURL(`html/results.html?q=${encodeURIComponent(query)}`)
      });

      // Focus the window containing the tab
      await chrome.windows.update(tab.windowId, { focused: true });
      return;
    } catch (error) {
      // Tab no longer exists, will create new one
      console.log('[Background] Previous results tab no longer exists');
      resultsTabId = null;
    }
  }

  // Create new results tab
  console.log('[Background] Creating new results tab');
  const tab = await chrome.tabs.create({
    url: chrome.runtime.getURL(`html/results.html?q=${encodeURIComponent(query)}`),
    active: true
  });

  resultsTabId = tab.id;
}

// Clean up when results tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === resultsTabId) {
    console.log('[Background] Results tab closed');
    resultsTabId = null;
  }
});
