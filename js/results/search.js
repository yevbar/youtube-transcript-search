export function getSearchQuery() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('q') || '';
}

export async function performSearch(query) {
  console.log('[Results Page] Performing search for:', query);

  const result = await chrome.storage.local.get('videos');
  const videos = result.videos || {};

  console.log('[Results Page] Loaded videos from storage:', Object.keys(videos).length, 'videos');

  if (Object.keys(videos).length === 0) {
    return {
      error: 'No transcripts available yet. Visit YouTube videos with captions to start building your search index.'
    };
  }

  const results = [];

  for (const [videoId, videoData] of Object.entries(videos)) {
    const matches = findMatches(videoData.transcript, query);

    if (matches.length > 0) {
      results.push({
        videoId: videoId,
        title: videoData.title,
        author: videoData.author,
        url: videoData.url,
        isTrimmed: videoData.isTrimmed || false,
        matches: matches
      });
    }
  }

  console.log('[Results Page] Found', results.length, 'videos with matches');
  return { results };
}

export function findMatches(transcript, query) {
  const matches = [];
  const lowerQuery = query.toLowerCase();

  if (!transcript || !transcript.events) {
    return matches;
  }

  for (const event of transcript.events) {
    if (!event.segs) continue;

    const text = event.segs.map(seg => seg.utf8 || '').join('');

    if (text.toLowerCase().includes(lowerQuery)) {
      matches.push({
        timestamp: event.tStartMs,
        text: text,
        timeSeconds: Math.floor(event.tStartMs / 1000)
      });
    }
  }

  return matches;
}
