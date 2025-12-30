import { setupNetworkInterception } from './network.js';
import { initializeForCurrentVideo, setupNavigationListeners } from './navigation.js';

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
