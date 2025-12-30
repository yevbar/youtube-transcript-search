export const state = {
  currentVideoId: null,           // Track current video
  transcriptCaptured: false,      // Whether transcript was captured
  fallbackTimer: null,            // Timer for triggering fallback
  fallbackInProgress: false,      // Prevent concurrent fallbacks
  originalCaptionState: null,     // User's original caption preference
  captionRestoreTimer: null,      // Timer for restoring state
  navigationTimer: null           // Timer for pending navigation
};

export function getCurrentVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

export function resetState() {
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
