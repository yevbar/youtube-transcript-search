(function() {
  console.log('[Injected Script] Loaded and running');
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

        console.log('[Injected Script] Posting transcript for video:', videoId);
        window.postMessage({
          type: 'TRANSCRIPT_CAPTURED',
          videoId: videoId,
          transcript: data
        }, '*');
      } catch (error) {
        console.error('[Injected Script] Error capturing transcript:', error);
      }
    }

    return response;
  };

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

          window.postMessage({
            type: 'TRANSCRIPT_CAPTURED',
            videoId: videoId,
            transcript: data
          }, '*');
        } catch (error) {
          console.error('Error capturing transcript from XHR:', error);
        }
      });
    }
    return originalSend.apply(this, arguments);
  };
})();
