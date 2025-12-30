console.log('[Content Script] Loaded on YouTube page');

const script = document.createElement('script');
script.src = chrome.runtime.getURL('js/injected/dist/injected.bundle.js');
script.onload = function() {
  this.remove();
  console.log('[Content Script] Injected script loaded');
};
(document.head || document.documentElement).appendChild(script);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CHECK_CAPTIONS') {
    checkCaptionsAvailability().then(result => {
      sendResponse(result);
    });
    return true; // Required to use sendResponse asynchronously
  } else if (request.type === 'NAVIGATE_TO_TIMESTAMP') {
    // Forward navigation request to injected script
    window.postMessage({
      type: 'NAVIGATE_TO_TIMESTAMP',
      timestamp: request.timestamp
    }, '*');
    sendResponse({ success: true });
    return true;
  }
});

async function checkCaptionsAvailability() {
  // Wait for the subtitle button to be available in the YouTube page DOM
  // Note: This runs in the content script context, so 'document' refers to
  // the YouTube page's document, NOT the popup's document
  let retries = 10;
  while (retries > 0) {
    const subtitleButtons = document.getElementsByClassName('ytp-subtitles-button');
    if (subtitleButtons.length > 0) {
      const subtitleButton = subtitleButtons[0];
      // Check the data-tooltip-title attribute (more reliable than aria-label)
      const tooltipTitle = subtitleButton.getAttribute('data-tooltip-title') || '';
      const captionsUnavailable = tooltipTitle.toLowerCase().includes('unavailable');
      return { captionsUnavailable };
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    retries--;
  }
  // If we couldn't find the button after retries, assume captions are unavailable
  return { captionsUnavailable: true };
}

window.addEventListener('message', function(event) {
  if (event.source !== window) return;

  if (event.data.type === 'TRANSCRIPT_CAPTURED') {
    console.log('[Content Script] Transcript captured for video:', event.data.videoId);
    const metadata = extractMetadata();

    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      console.warn('[Content Script] Extension context invalidated. Please refresh the page.');
      return;
    }

    try {
      chrome.runtime.sendMessage({
        type: 'TRANSCRIPT_CAPTURED',
        videoId: event.data.videoId,
        transcript: event.data.transcript,
        metadata: metadata
      }, (response) => {
        // Check for errors in the response
        if (chrome.runtime.lastError) {
          console.warn('[Content Script] Message failed:', chrome.runtime.lastError.message);
        }
      });
    } catch (error) {
      console.warn('[Content Script] Failed to send message:', error.message);
    }
  }
});

function extractMetadata() {
  let title = '';
  let author = '';
  let videoId = '';

  const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string') ||
                       document.querySelector('meta[name="title"]');
  if (titleElement) {
    title = titleElement.textContent || titleElement.content || '';
  }

  const authorElement = document.querySelector('ytd-channel-name a') ||
                        document.querySelector('link[itemprop="name"]');
  if (authorElement) {
    author = authorElement.textContent || authorElement.content || '';
  }

  const urlParams = new URLSearchParams(window.location.search);
  videoId = urlParams.get('v') || '';

  return {
    title: title.trim(),
    author: author.trim(),
    videoId: videoId
  };
}
