import { CONFIG } from './config.js';
import { state } from './state.js';

export function getCaptionButton() {
  try {
    const buttons = Array.from(document.getElementsByClassName('ytp-subtitles-button'));
    return buttons.length > 0 ? buttons[0] : null;
  } catch (error) {
    console.error('[Injected Script] Error accessing caption button:', error);
    return null;
  }
}

export function isCaptionButtonAvailable(button) {
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

export function getCaptionState(button) {
  if (!button) return null;

  try {
    const ariaPressed = button.getAttribute('aria-pressed');
    return ariaPressed === 'true';
  } catch (error) {
    console.error('[Injected Script] Error reading caption state:', error);
    return null;
  }
}

export async function waitForCaptionButton(maxAttempts = CONFIG.BUTTON_POLL_MAX_ATTEMPTS) {
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

export function startMonitoringCaptionChanges() {
  const button = getCaptionButton();
  if (!button || state.captionStateObserver) {
    return; // Already monitoring or button unavailable
  }

  console.log('[Injected Script] Starting caption change monitoring');

  // Track the current state
  let lastKnownState = getCaptionState(button);

  // Create observer to watch for aria-pressed changes
  state.captionStateObserver = new MutationObserver((mutations) => {
    const currentState = getCaptionState(button);

    // Check if state actually changed
    if (currentState !== lastKnownState) {
      const timeSinceLastExtensionToggle = Date.now() - (state.lastExtensionToggleTime || 0);

      // If change occurred outside extension's toggle window, it's a user action
      if (timeSinceLastExtensionToggle > CONFIG.EXTENSION_TOGGLE_WINDOW_MS) {
        console.log('[Injected Script] User manually changed captions during fallback window');
        state.userChangedCaptionsDuringFallback = true;

        // Cancel pending restoration since user has expressed preference
        if (state.captionRestoreTimer) {
          console.log('[Injected Script] Cancelling restoration due to user action');
          clearTimeout(state.captionRestoreTimer);
          state.captionRestoreTimer = null;
        }
      }

      lastKnownState = currentState;
    }
  });

  // Observe changes to attributes on the button
  state.captionStateObserver.observe(button, {
    attributes: true,
    attributeFilter: ['aria-pressed']
  });
}

export function stopMonitoringCaptionChanges() {
  if (state.captionStateObserver) {
    console.log('[Injected Script] Stopping caption change monitoring');
    state.captionStateObserver.disconnect();
    state.captionStateObserver = null;
  }
}

export function restoreOriginalCaptionState() {
  try {
    // Stop monitoring before we potentially click
    stopMonitoringCaptionChanges();

    const button = getCaptionButton();

    if (!button) {
      console.log('[Injected Script] Cannot restore: button not found');
      return;
    }

    if (state.originalCaptionState === null) {
      console.log('[Injected Script] No original state to restore');
      return;
    }

    // Check if user manually changed captions during fallback
    if (state.userChangedCaptionsDuringFallback) {
      console.log('[Injected Script] User changed captions manually, respecting user preference');
      state.captionRestoreTimer = null;
      state.userChangedCaptionsDuringFallback = false;
      return;
    }

    const currentState = getCaptionState(button);

    // Only click if we need to change state
    if (currentState !== state.originalCaptionState) {
      console.log('[Injected Script] Restoring caption state to:', state.originalCaptionState);

      // Record timestamp before clicking
      state.lastExtensionToggleTime = Date.now();
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
