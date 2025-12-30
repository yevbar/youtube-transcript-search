(function () {

  const state = {
    currentVideoId: null,           // Track current video
    transcriptCaptured: false,      // Whether transcript was captured
    fallbackTimer: null,            // Timer for triggering fallback
    fallbackInProgress: false,      // Prevent concurrent fallbacks
    originalCaptionState: null,     // User's original caption preference
    captionRestoreTimer: null,      // Timer for restoring state
    navigationTimer: null           // Timer for pending navigation
  };

  function getCurrentVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
  }

  function resetState() {
    if (state.fallbackTimer) {
      clearTimeout(state.fallbackTimer);
      state.fallbackTimer = null;
    }
    if (state.captionRestoreTimer) {
      clearTimeout(state.captionRestoreTimer);
      state.captionRestoreTimer = null;
    }
    if (state.navigationTimer) {
      clearTimeout(state.navigationTimer);
      state.navigationTimer = null;
    }

    state.transcriptCaptured = false;
    state.fallbackInProgress = false;
    state.originalCaptionState = null;
  }

  const CONFIG = {
    FALLBACK_DELAY_MS: 2500,           // Wait before trying fallback
    CAPTION_RESTORE_DELAY_MS: 1000,    // Wait before restoring state
    BUTTON_POLL_INTERVAL_MS: 100,      // Interval between button polls
    BUTTON_POLL_MAX_ATTEMPTS: 30,      // Max polling attempts (3s total)
    NAVIGATION_SETTLE_DELAY_MS: 1500};

  function getCaptionButton() {
    try {
      const buttons = Array.from(document.getElementsByClassName('ytp-subtitles-button'));
      return buttons.length > 0 ? buttons[0] : null;
    } catch (error) {
      console.error('[Injected Script] Error accessing caption button:', error);
      return null;
    }
  }

  function isCaptionButtonAvailable(button) {
    if (!button) return false;

    try {
      const tooltipTitle = button.getAttribute('data-tooltip-title') || '';
      const isUnavailable = tooltipTitle.toLowerCase().includes('unavailable');
      return !isUnavailable;
    } catch (error) {
      console.error('[Injected Script] Error checking button availability:', error);
      return false;
    }
  }

  function getCaptionState(button) {
    if (!button) return null;

    try {
      const ariaPressed = button.getAttribute('aria-pressed');
      return ariaPressed === 'true';
    } catch (error) {
      console.error('[Injected Script] Error reading caption state:', error);
      return null;
    }
  }

  async function waitForCaptionButton(maxAttempts = CONFIG.BUTTON_POLL_MAX_ATTEMPTS) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const button = getCaptionButton();
        if (button) {
          console.log('[Injected Script] Caption button found after', i + 1, 'attempts');
          return button;
        }
      } catch (error) {
        console.error('[Injected Script] Error during button poll:', error);
      }
      await new Promise(resolve => setTimeout(resolve, CONFIG.BUTTON_POLL_INTERVAL_MS));
    }
    console.log('[Injected Script] Caption button not found after', maxAttempts, 'attempts');
    return null;
  }

  function restoreOriginalCaptionState() {
    try {
      const button = getCaptionButton();

      if (!button) {
        console.log('[Injected Script] Cannot restore: button not found');
        return;
      }

      if (state.originalCaptionState === null) {
        console.log('[Injected Script] No original state to restore');
        return;
      }

      const currentState = getCaptionState(button);

      // Only click if we need to change state
      if (currentState !== state.originalCaptionState) {
        console.log('[Injected Script] Restoring caption state to:', state.originalCaptionState);
        button.click();
      } else {
        console.log('[Injected Script] Caption state already matches original');
      }

      // Clear the restoration timer
      state.captionRestoreTimer = null;
    } catch (error) {
      console.error('[Injected Script] Error restoring caption state:', error);
    }
  }

  async function attemptCaptionToggleFallback() {
    if (state.fallbackInProgress) {
      console.log('[Injected Script] Fallback already in progress');
      return;
    }

    state.fallbackInProgress = true;

    try {
      console.log('[Injected Script] Starting caption toggle fallback');

      // Wait for button to appear
      const button = await waitForCaptionButton();

      if (!button) {
        console.log('[Injected Script] Caption button not found after polling, aborting fallback');
        state.fallbackInProgress = false;
        return;
      }

      // Check if captions are available
      if (!isCaptionButtonAvailable(button)) {
        console.log('[Injected Script] Captions unavailable for this video, aborting fallback');
        state.fallbackInProgress = false;
        return;
      }

      // Store original state
      state.originalCaptionState = getCaptionState(button);
      console.log('[Injected Script] Original caption state:', state.originalCaptionState);

      // If captions already enabled, let natural API capture handle it
      if (state.originalCaptionState) {
        console.log('[Injected Script] Captions already enabled, transcript will be captured naturally');
        state.fallbackInProgress = false;
        return;
      }

      // Enable captions
      console.log('[Injected Script] Enabling captions to trigger transcript fetch');
      button.click();

      // Schedule restoration check
      scheduleRestoration();

    } catch (error) {
      console.error('[Injected Script] Error in fallback:', error);
      state.fallbackInProgress = false;
    }
  }

  function scheduleRestoration() {
    // Cancel any existing restoration timer
    if (state.captionRestoreTimer) {
      clearTimeout(state.captionRestoreTimer);
    }

    // Wait for transcript to be captured, then restore original state
    state.captionRestoreTimer = setTimeout(() => {
      restoreOriginalCaptionState();
    }, CONFIG.CAPTION_RESTORE_DELAY_MS);

    console.log('[Injected Script] Scheduled caption state restoration in', CONFIG.CAPTION_RESTORE_DELAY_MS, 'ms');
  }

  function scheduleFallbackCheck() {
    state.fallbackTimer = setTimeout(() => {
      if (!state.transcriptCaptured) {
        console.log('[Injected Script] No transcript captured after', CONFIG.FALLBACK_DELAY_MS, 'ms, attempting fallback');
        attemptCaptionToggleFallback();
      } else {
        console.log('[Injected Script] Transcript already captured, skipping fallback');
      }
    }, CONFIG.FALLBACK_DELAY_MS);

    console.log('[Injected Script] Scheduled fallback check in', CONFIG.FALLBACK_DELAY_MS, 'ms');
  }

  function onTranscriptCaptured(videoId, transcript) {
    console.log('[Injected Script] Transcript captured for video:', videoId);

    // Update state
    state.transcriptCaptured = true;

    // Cancel fallback timer if still pending
    if (state.fallbackTimer) {
      clearTimeout(state.fallbackTimer);
      state.fallbackTimer = null;
      console.log('[Injected Script] Cancelled fallback timer');
    }

    // Trigger restoration if fallback was used
    if (state.fallbackInProgress && state.originalCaptionState !== null) {
      console.log('[Injected Script] Fallback was active, scheduling restoration');
      // Cancel any existing restoration timer
      if (state.captionRestoreTimer) {
        clearTimeout(state.captionRestoreTimer);
      }
      // Schedule restoration
      scheduleRestoration();
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

  function setupNetworkInterception() {
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

  function onVideoChange(videoId) {
    console.log('[Injected Script] Video changed to:', videoId);

    // Reset state for new video
    resetState();

    state.currentVideoId = videoId;

    // Schedule fallback check
    scheduleFallbackCheck();
  }

  function initializeForCurrentVideo() {
    const videoId = getCurrentVideoId();
    if (videoId) {
      console.log('[Injected Script] Initial video detected:', videoId);
      // Wait for player to be ready
      setTimeout(() => {
        onVideoChange(videoId);
      }, CONFIG.NAVIGATION_SETTLE_DELAY_MS);
    } else {
      console.log('[Injected Script] Not a video page, waiting for navigation');
    }
  }

  function setupNavigationListeners() {
    // Method 1: Listen to YouTube's yt-navigate-finish event
    document.addEventListener('yt-navigate-finish', () => {
      const videoId = getCurrentVideoId();
      if (videoId && videoId !== state.currentVideoId) {
        console.log('[Injected Script] SPA navigation detected via yt-navigate-finish');

        // Clear any pending navigation timer
        if (state.navigationTimer) {
          clearTimeout(state.navigationTimer);
        }

        // Schedule navigation handling after settle delay
        state.navigationTimer = setTimeout(() => {
          state.navigationTimer = null;
          // Re-check video ID in case user navigated again during delay
          const currentVideoId = getCurrentVideoId();
          if (currentVideoId === videoId) {
            onVideoChange(videoId);
          } else {
            console.log('[Injected Script] Video changed during settle delay, skipping');
          }
        }, CONFIG.NAVIGATION_SETTLE_DELAY_MS);
      }
    });

    // Method 2: Fallback URL change detection (for older YouTube versions)
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        const videoId = getCurrentVideoId();
        if (videoId && videoId !== state.currentVideoId) {
          console.log('[Injected Script] SPA navigation detected via URL change');

          // Clear any pending navigation timer
          if (state.navigationTimer) {
            clearTimeout(state.navigationTimer);
          }

          // Schedule navigation handling after settle delay
          state.navigationTimer = setTimeout(() => {
            state.navigationTimer = null;
            // Re-check video ID in case user navigated again during delay
            const currentVideoId = getCurrentVideoId();
            if (currentVideoId === videoId) {
              onVideoChange(videoId);
            } else {
              console.log('[Injected Script] Video changed during settle delay, skipping');
            }
          }, CONFIG.NAVIGATION_SETTLE_DELAY_MS);
        }
      }
    });

    urlObserver.observe(document, {
      subtree: true,
      childList: true
    });

    // Listen for timestamp navigation requests from extension
    window.addEventListener('message', function(event) {
      if (event.source !== window) return;

      if (event.data.type === 'NAVIGATE_TO_TIMESTAMP') {
        navigateToTimestamp(event.data.timestamp);
      }
    });
  }

  function navigateToTimestamp(seconds) {
    console.log('[Injected Script] Navigating to timestamp:', seconds);

    const player = document.querySelector('video');
    if (!player) {
      console.error('[Injected Script] Video player not found');
      return;
    }

    player.currentTime = seconds;
    console.log('[Injected Script] Navigation complete');
  }

  (function() {
    console.log('[Injected Script] Loaded and running');

    // Setup network interception to capture transcript requests
    setupNetworkInterception();

    // Setup navigation listeners for SPA navigation
    setupNavigationListeners();

    // Initialize for the current video
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeForCurrentVideo);
    } else {
      initializeForCurrentVideo();
    }

    console.log('[Injected Script] Navigation detection initialized');
  })();

})();
