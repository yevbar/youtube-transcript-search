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

export function restoreOriginalCaptionState() {
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
