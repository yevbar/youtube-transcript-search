import { CONFIG } from './config.js';
import { state } from './state.js';
import {
  getCaptionButton,
  isCaptionButtonAvailable,
  getCaptionState,
  waitForCaptionButton,
  restoreOriginalCaptionState
} from './caption-control.js';

export async function attemptCaptionToggleFallback() {
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

    // If captions already enabled, wait a bit more then try toggling
    if (state.originalCaptionState) {
      console.log('[Injected Script] Captions already enabled, waiting for transcript');
      setTimeout(() => {
        if (!state.transcriptCaptured) {
          console.log('[Injected Script] Still no transcript, toggling off and on');
          toggleCaptionsOffAndOn(button);
        } else {
          console.log('[Injected Script] Transcript captured while waiting');
          state.fallbackInProgress = false;
        }
      }, 1000);
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

export function toggleCaptionsOffAndOn(button) {
  if (!button) return;

  try {
    // Toggle off
    console.log('[Injected Script] Toggling captions off');
    button.click();

    // Wait a bit then toggle back on
    setTimeout(() => {
      console.log('[Injected Script] Toggling captions back on');
      button.click();
      scheduleRestoration();
    }, CONFIG.TOGGLE_RETRY_DELAY_MS);
  } catch (error) {
    console.error('[Injected Script] Error toggling captions:', error);
  }
}

export function scheduleRestoration() {
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

export function scheduleFallbackCheck() {
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
