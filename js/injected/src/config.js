export const CONFIG = {
  FALLBACK_DELAY_MS: 2500,           // Wait before trying fallback
  CAPTION_RESTORE_DELAY_MS: 1000,    // Wait before restoring state
  BUTTON_POLL_INTERVAL_MS: 100,      // Interval between button polls
  BUTTON_POLL_MAX_ATTEMPTS: 30,      // Max polling attempts (3s total)
  NAVIGATION_SETTLE_DELAY_MS: 1500,  // Initial delay after navigation
  TOGGLE_RETRY_DELAY_MS: 500,        // Delay between off/on toggle
  EXTENSION_TOGGLE_WINDOW_MS: 200    // Window to distinguish extension vs user clicks
};
