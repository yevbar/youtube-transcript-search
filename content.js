console.log('[Content Script] Loaded on YouTube page');

const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = function() {
  this.remove();
  console.log('[Content Script] Injected script loaded');
};
(document.head || document.documentElement).appendChild(script);

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
