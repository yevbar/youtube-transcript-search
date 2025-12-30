import { CONFIG } from './config.js';
import { state, getCurrentVideoId, resetState } from './state.js';
import { scheduleFallbackCheck } from './fallback.js';

export function onVideoChange(videoId) {
  console.log('[Injected Script] Video changed to:', videoId);

  // Reset state for new video
  resetState();

  state.currentVideoId = videoId;

  // Schedule fallback check
  scheduleFallbackCheck();
}

export function initializeForCurrentVideo() {
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

export function setupNavigationListeners() {
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
}
