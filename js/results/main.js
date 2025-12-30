import { getSearchQuery, performSearch } from './search.js';
import { displayResults, displayError } from './display.js';

console.log('[Results Page] Loaded');

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Results Page] DOMContentLoaded');

  const query = getSearchQuery();

  if (!query) {
    displayError('No search query provided');
    return;
  }

  // Pre-populate the search input with the current query
  const searchInput = document.getElementById('searchInput');
  searchInput.value = query;

  document.getElementById('searchQuery').textContent = `Searching for: "${query}"`;

  const searchResult = await performSearch(query);

  if (searchResult.error) {
    displayError(searchResult.error);
  } else {
    displayResults(searchResult.results, query);
  }

  // Handle search form submission
  const searchForm = document.getElementById('searchForm');
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newQuery = searchInput.value.trim();

    if (!newQuery) {
      return;
    }

    // Update URL and reload the page with the new query
    const newUrl = `${window.location.pathname}?q=${encodeURIComponent(newQuery)}`;
    window.location.href = newUrl;
  });
});
