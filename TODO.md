## Basic storage
- Update the browser extension to be able to listen to network requests on youtube.com
- When the timedtext endpoint is noticed, capture the data received, it will in the format shown in transcript.json.
  - A URL looks like `https://www.youtube.com/api/timedtext?v=K2QbmSDt2kc&<more query parameters...>`
- Save transcript to chrome.storage.sync (query the document for video title/author)

## UX
- When the pinned icon is clicked, show a small HTML form with an input and search icon beside it.
- When a search query is provided and submitted, open a new tab with a custom HTML page containing 'search results' which are obtained by looping over the data in chrome.storage.sync and using a basic `includes`
- Each search result displayed should include the timestamp in the provided URLs and display highlighted the relevant text
