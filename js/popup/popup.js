document.getElementById('searchButton').addEventListener('click', performSearch);

document.getElementById('searchInput').addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    performSearch();
  }
});

async function performSearch() {
  const query = document.getElementById('searchInput').value;
  console.log('[Popup] Search query:', query);

  if (!query.trim()) {
    console.log('[Popup] Empty query, aborting');
    return;
  }

  chrome.runtime.sendMessage({
    type: 'OPEN_SEARCH_RESULTS',
    query: query
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Popup] Error:', chrome.runtime.lastError.message);
      alert('Error opening search results');
    } else {
      console.log('[Popup] Search request sent successfully');
    }
  });

  window.close();
}
