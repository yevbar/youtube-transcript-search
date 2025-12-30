import { state } from './state.js';
import { scheduleRestoration } from './fallback.js';
import { restoreOriginalCaptionState } from './caption-control.js';

export function onTranscriptCaptured(videoId, transcript) {
  console.log('[Injected Script] Transcript captured for video:', videoId);

  // Update state
  state.transcriptCaptured = true;

  // Cancel fallback timer if still pending
  if (state.fallbackTimer) {
    clearTimeout(state.fallbackTimer);
    state.fallbackTimer = null;
    console.log('[Injected Script] Cancelled fallback timer');
  }

  // If transcript captured early, cancel restoration immediately
  // This handles cases where API responds faster than expected
  if (state.captionRestoreTimer && !state.userChangedCaptionsDuringFallback) {
    console.log('[Injected Script] Transcript captured, triggering immediate restoration');
    clearTimeout(state.captionRestoreTimer);
    state.captionRestoreTimer = null;

    // Trigger immediate restoration
    restoreOriginalCaptionState();
  } else if (state.userChangedCaptionsDuringFallback) {
    console.log('[Injected Script] User changed captions, cancelling restoration');
    if (state.captionRestoreTimer) {
      clearTimeout(state.captionRestoreTimer);
      state.captionRestoreTimer = null;
    }
  }

  // Post message to content script
  console.log('[Injected Script] Posting transcript message');
  window.postMessage({
    type: 'TRANSCRIPT_CAPTURED',
    videoId: videoId,
    transcript: transcript
  }, '*');

  state.fallbackInProgress = false;
}

export function setupNetworkInterception() {
  // Wrap existing fetch
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = args[0];

    if (typeof url === 'string' && url.includes('youtube.com/api/timedtext')) {
      console.log('[Injected Script] Detected timedtext request:', url);
      try {
        const clone = response.clone();
        const data = await clone.json();
        const urlObj = new URL(url);
        const videoId = urlObj.searchParams.get('v');

        onTranscriptCaptured(videoId, data);
      } catch (error) {
        console.error('[Injected Script] Error capturing transcript from fetch:', error);
      }
    }

    return response;
  };

  // Wrap existing XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    if (this._url && this._url.includes('youtube.com/api/timedtext')) {
      this.addEventListener('load', function() {
        try {
          const data = JSON.parse(this.responseText);
          const urlObj = new URL(this._url);
          const videoId = urlObj.searchParams.get('v');

          onTranscriptCaptured(videoId, data);
        } catch (error) {
          console.error('[Injected Script] Error capturing transcript from XHR:', error);
        }
      });
    }
    return originalSend.apply(this, arguments);
  };
}
