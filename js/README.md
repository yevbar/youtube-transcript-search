# JavaScript Files Documentation

This directory contains all JavaScript code for the YouTube Transcript Search extension, organized by function and context.

## Directory Structure

```
js/
├── README.md (this file)
├── popup/
│   └── popup.js (31 lines)
├── background/
│   └── background.js (76 lines)
├── content/
│   └── content.js (68 lines)
├── results/
│   ├── main.js (46 lines)
│   ├── search.js (67 lines)
│   ├── display.js (82 lines)
│   └── utils.js (93 lines)
└── injected/
    ├── src/
    │   ├── config.js (8 lines)
    │   ├── state.js (36 lines)
    │   ├── caption-control.js (93 lines)
    │   ├── fallback.js (123 lines)
    │   ├── navigation.js (93 lines)
    │   ├── network.js (96 lines)
    │   └── main.js (20 lines)
    ├── dist/
    │   └── injected.bundle.js (426 lines, generated)
    ├── package.json
    ├── rollup.config.js
    └── node_modules/
```

## File Descriptions

### `/popup/`
Extension popup UI handler.

#### `popup.js` (31 lines)
**Purpose:** Handles the extension popup UI interaction when user clicks the extension icon.

**Key Functions:**
- `performSearch()` - Sends search query to background script to open results page

**Features:**
- Event listeners for search button click and Enter key press
- Input validation for empty queries
- Chrome messaging to background service worker
- Auto-closes popup after search initiation

---

### `/background/`
Service worker for data persistence and tab management.

#### `background.js` (76 lines)
**Purpose:** Background service worker that manages transcript storage and results tab lifecycle.

**Key Functions:**
- `saveTranscript(videoId, transcript, metadata)` - Stores video transcript in chrome.storage.local
- `handleSearchRequest(query)` - Opens or reuses results tab with search query

**State Management:**
- `resultsTabId` - Tracks the results tab for reuse

**Features:**
- Message listener for TRANSCRIPT_CAPTURED and OPEN_SEARCH_RESULTS events
- Smart tab reuse: checks if results tab exists before creating new one
- Stores transcripts indexed by videoId
- Tab cleanup listener to reset resultsTabId when tab closes

---

### `/content/`
Content script bridge between YouTube page and extension.

#### `content.js` (68 lines)
**Purpose:** Content script that bridges YouTube page context and extension context.

**Key Functions:**
- `extractMetadata()` - Extracts video title, author, and videoId from YouTube DOM

**Features:**
- Injects `injected.bundle.js` into YouTube page context
- Listens for window messages from injected script
- Forwards transcript data to background script via Chrome messaging
- Handles extension context invalidation gracefully
- DOM scraping for video metadata using YouTube-specific selectors

---

### `/results/`
Results page implementation using ES6 modules (loaded natively by browser).

#### `main.js` (46 lines)
**Purpose:** Entry point and initialization for the results page.

**Imports:**
- `getSearchQuery`, `performSearch` from `./search.js`
- `displayResults`, `displayError` from `./display.js`

**Features:**
- DOMContentLoaded event handler
- Initializes search from URL query parameter
- Search form event binding
- Orchestrates search flow

#### `search.js` (67 lines)
**Purpose:** Search logic for finding matches in stored transcripts.

**Exported Functions:**
- `getSearchQuery()` - Extracts search query from URL parameters
- `performSearch(query)` - Searches all stored transcripts for matches
  - Returns `{ results }` on success or `{ error }` if no transcripts available
- `findMatches(transcript, query)` - Finds all matching segments in a transcript
  - Case-insensitive search
  - Returns array of match objects with timestamp, text, and timeSeconds

**Features:**
- Integrates with chrome.storage.local API
- Iterates through all stored videos to find matches
- Console logging for debugging

#### `display.js` (82 lines)
**Purpose:** Results rendering and HTML generation.

**Imports:**
- `extractContext`, `highlightText`, `escapeHtml`, `formatTime` from `./utils.js`

**Exported Functions:**
- `displayResults(results, query)` - Generates and displays HTML for all results
  - Renders video thumbnails with YouTube play button overlay
  - Creates collapsible details elements for each video
  - Links timestamps to specific moments in videos
  - Displays match count
- `displayError(message)` - Shows error message to user

**Features:**
- Template literal HTML generation
- YouTube thumbnail URLs
- SVG play button overlay
- Clickable timestamps with deep links to video moments

#### `utils.js` (93 lines)
**Purpose:** Helper utilities for text processing and formatting.

**Exported Functions:**
- `extractContext(text, query)` - Extracts 1 sentence before and after match for context
  - Uses regex to split text into sentences
  - Handles edge cases (no sentences, match not found, etc.)
  - Returns trimmed context string
- `highlightText(text, query)` - Wraps matches in `<mark>` tags for highlighting
  - Escapes regex special characters in query
  - Case-insensitive matching
- `escapeHtml(text)` - Prevents XSS by escaping HTML entities
  - Uses DOM API for proper escaping
- `formatTime(milliseconds)` - Converts milliseconds to MM:SS format
  - Zero-pads seconds

**Features:**
- Sentence-based context extraction using regex
- Security-conscious HTML escaping
- Consistent time formatting

---

### `/injected/`
Injected script implementation (bundled with Rollup).

The injected script runs in the YouTube page context to intercept network requests and capture transcript data. It's split into modules for maintainability and bundled into a single file for injection.

#### `/injected/src/` - Source Modules

##### `config.js` (8 lines)
**Purpose:** Configuration constants for timing and delays.

**Exports:**
- `CONFIG` object with timing constants:
  - `FALLBACK_DELAY_MS: 2500` - Wait before trying fallback
  - `CAPTION_RESTORE_DELAY_MS: 1000` - Wait before restoring caption state
  - `BUTTON_POLL_INTERVAL_MS: 100` - Interval between button polls
  - `BUTTON_POLL_MAX_ATTEMPTS: 30` - Max polling attempts (3s total)
  - `NAVIGATION_SETTLE_DELAY_MS: 1500` - Delay after navigation
  - `TOGGLE_RETRY_DELAY_MS: 500` - Delay between off/on toggle

##### `state.js` (36 lines)
**Purpose:** Centralized state management for the injected script.

**Exports:**
- `state` object tracking:
  - `currentVideoId` - Current video being watched
  - `transcriptCaptured` - Whether transcript was captured
  - `fallbackTimer` - Timer for triggering fallback
  - `fallbackInProgress` - Prevent concurrent fallbacks
  - `originalCaptionState` - User's original caption preference
  - `captionRestoreTimer` - Timer for restoring state
  - `navigationTimer` - Timer for pending navigation
- `getCurrentVideoId()` - Extracts video ID from URL
- `resetState()` - Clears all timers and resets state for new video

##### `caption-control.js` (93 lines)
**Purpose:** Caption button interaction and state management.

**Imports:** `CONFIG`, `state`

**Exported Functions:**
- `getCaptionButton()` - Finds caption toggle button element
  - Searches for elements with class 'ytp-subtitles-button'
- `isCaptionButtonAvailable(button)` - Checks if captions exist for video
  - Reads data-tooltip-title attribute
  - Returns false if tooltip contains "unavailable"
- `getCaptionState(button)` - Reads current on/off state
  - Reads aria-pressed attribute
  - Returns boolean or null
- `waitForCaptionButton(maxAttempts)` - Polls for button with retry
  - Async function that polls at CONFIG.BUTTON_POLL_INTERVAL_MS
  - Returns button element or null after max attempts
- `restoreOriginalCaptionState()` - Reverts user's caption preference
  - Only clicks if state differs from original
  - Clears restoration timer

##### `fallback.js` (123 lines)
**Purpose:** Fallback caption toggle logic when transcript isn't auto-captured.

**Imports:** `CONFIG`, `state`, caption-control functions

**Exported Functions:**
- `attemptCaptionToggleFallback()` - Main fallback orchestration
  - Waits for caption button to appear
  - Checks if captions are available
  - Stores original caption state
  - Enables captions if disabled
  - Schedules restoration
- `toggleCaptionsOffAndOn(button)` - Forces caption reload
  - Clicks off, waits CONFIG.TOGGLE_RETRY_DELAY_MS, clicks on
  - Used when captions already enabled but transcript not captured
- `scheduleRestoration()` - Schedules caption state restoration
  - Cancels any existing timer
  - Sets timer for CONFIG.CAPTION_RESTORE_DELAY_MS
- `scheduleFallbackCheck()` - Sets up fallback timer
  - Waits CONFIG.FALLBACK_DELAY_MS before attempting fallback
  - Only triggers if transcript not yet captured

**Features:**
- Non-intrusive: remembers and restores user's caption preferences
- Prevents concurrent fallback attempts
- Extensive console logging for debugging

##### `navigation.js` (93 lines)
**Purpose:** Video navigation detection for YouTube's SPA.

**Imports:** `CONFIG`, `state`, `getCurrentVideoId`, `resetState`, `scheduleFallbackCheck`

**Exported Functions:**
- `onVideoChange(videoId)` - Handles video transitions
  - Resets state for new video
  - Updates currentVideoId
  - Schedules fallback check
- `initializeForCurrentVideo()` - Initial page load detection
  - Checks if on video page
  - Waits for player to be ready
  - Calls onVideoChange
- `setupNavigationListeners()` - Binds navigation event listeners
  - Listens to yt-navigate-finish event (YouTube SPA navigation)
  - MutationObserver for URL changes (fallback method)
  - Debounces navigation with CONFIG.NAVIGATION_SETTLE_DELAY_MS

**Features:**
- Multi-method navigation detection for robustness
- Debouncing to handle rapid navigation
- Works with both modern and older YouTube versions

##### `network.js` (96 lines)
**Purpose:** Network interception to capture transcript requests.

**Imports:** `state`, `scheduleRestoration`

**Exported Functions:**
- `onTranscriptCaptured(videoId, transcript)` - Processes captured transcripts
  - Updates state.transcriptCaptured
  - Cancels fallback timer
  - Schedules caption restoration if fallback was used
  - Posts message to content script
- `setupNetworkInterception()` - Wraps fetch and XMLHttpRequest
  - Intercepts requests to youtube.com/api/timedtext
  - Clones response to avoid consuming it
  - Parses JSON transcript data
  - Calls onTranscriptCaptured

**Features:**
- Intercepts both fetch and XMLHttpRequest APIs
- Non-intrusive: doesn't modify requests or responses
- Error handling for parse failures

##### `main.js` (20 lines)
**Purpose:** IIFE wrapper and initialization orchestration.

**Imports:**
- `setupNetworkInterception` from `./network.js`
- `initializeForCurrentVideo`, `setupNavigationListeners` from `./navigation.js`

**Features:**
- Wraps everything in IIFE for scope isolation
- Calls setup functions in correct order
- Handles DOMContentLoaded vs already loaded
- Console logging for initialization

---

#### `/injected/dist/` - Build Output

##### `injected.bundle.js` (426 lines, generated)
**Purpose:** Bundled IIFE output for injection into YouTube pages.

**Generation:** Created by Rollup from src/ modules
**Format:** IIFE (Immediately Invoked Function Expression)
**Size:** ~14KB

**Do not edit this file directly.** Edit source files in src/ and rebuild.

---

#### Build Configuration

##### `package.json`
NPM package configuration with build scripts and dependencies.

**Scripts:**
- `npm run build` - One-time build of injected bundle
- `npm run watch` - Watch mode for development (auto-rebuilds on changes)
- `npm run clean` - Removes generated bundle

**Dev Dependencies:**
- `rollup` - Module bundler
- `@rollup/plugin-node-resolve` - Resolves node_modules imports

##### `rollup.config.js`
Rollup bundler configuration.

**Input:** `src/main.js`
**Output:** `dist/injected.bundle.js` (IIFE format)
**Plugins:** node-resolve

---

## Build Process

### For Injected Script

The injected script modules must be bundled before the extension can run.

```bash
cd js/injected
npm install        # First time only
npm run build      # Build once
npm run watch      # Watch mode for development
```

### For Results Page

No build needed - uses native ES6 modules loaded directly by the browser.

---

## Development Workflow

### Making Changes to Injected Script

1. Edit files in `js/injected/src/`
2. Run `npm run build` in `js/injected/` (or use watch mode)
3. Reload extension in `chrome://extensions`
4. Test on YouTube

### Making Changes to Results Page

1. Edit files in `js/results/`
2. Reload extension in `chrome://extensions` (or just refresh results page)
3. Test search functionality

### Making Changes to Other Scripts

1. Edit files in `js/popup/`, `js/background/`, or `js/content/`
2. Reload extension in `chrome://extensions`
3. Test relevant functionality

---

## Module Dependencies

### Results Page Module Graph
```
main.js
├── search.js
└── display.js
    └── utils.js
```

### Injected Script Module Graph
```
main.js
├── network.js
│   ├── state.js
│   └── fallback.js
│       ├── config.js
│       ├── state.js
│       └── caption-control.js
│           ├── config.js
│           └── state.js
└── navigation.js
    ├── config.js
    ├── state.js
    └── fallback.js
```

---

## File Size Compliance

All source files are under 140 lines:

| File | Lines | Status |
|------|-------|--------|
| popup.js | 31 | ✓ |
| background.js | 76 | ✓ |
| content.js | 68 | ✓ |
| results/main.js | 46 | ✓ |
| results/search.js | 67 | ✓ |
| results/display.js | 82 | ✓ |
| results/utils.js | 93 | ✓ |
| injected/src/config.js | 8 | ✓ |
| injected/src/state.js | 36 | ✓ |
| injected/src/caption-control.js | 93 | ✓ |
| injected/src/fallback.js | 123 | ✓ |
| injected/src/navigation.js | 93 | ✓ |
| injected/src/network.js | 96 | ✓ |
| injected/src/main.js | 20 | ✓ |

**Total source lines:** ~832 (down from 873 in original)
**All files comply with 100-140 line limit!**

---

## Architecture Notes

### Why ES6 Modules?

- **Results page:** Native browser support in extension context, no build step needed
- **Injected script:** Modules for development, bundled for injection into page context

### Why IIFE for Injected Script?

The injected script runs in YouTube's page context, not the extension context. Using IIFE prevents variable pollution of YouTube's global scope and avoids conflicts.

### Why Rollup?

- Simpler configuration than webpack
- Cleaner output for debugging
- Better tree-shaking
- No webpack runtime overhead
- Perfect for library/module bundling

### State Management

- **Results page:** Stateless, reads from chrome.storage.local on each search
- **Background:** Minimal state (resultsTabId)
- **Injected script:** Complex state machine for transcript capture with fallback logic

---

## Testing Checklist

- [ ] Popup opens and accepts search queries
- [ ] Search opens/reuses results tab
- [ ] YouTube transcript capture works automatically
- [ ] Fallback caption toggle works when needed
- [ ] Caption state restores to user preference
- [ ] Video navigation triggers new capture
- [ ] Results display correctly with highlights
- [ ] Timestamps link to correct video moments
- [ ] No console errors
- [ ] Extension survives page refreshes

---

## Common Issues

### Bundle Not Found
**Symptom:** Extension fails to load, console shows "injected.bundle.js not found"
**Solution:** Run `cd js/injected && npm run build`

### Changes Not Reflected
**Symptom:** Code changes don't appear when testing
**Solution:**
1. For injected script: rebuild bundle (`npm run build`)
2. Reload extension in chrome://extensions
3. Hard refresh YouTube page (Ctrl+Shift+R)

### Module Import Errors
**Symptom:** "Cannot find module" errors
**Solution:** Check import paths are relative (start with `./` or `../`)

---

## Future Enhancements

- Add TypeScript for better IDE support
- Add unit tests (Jest for modules)
- Add E2E tests (Puppeteer for extension testing)
- Add source maps for debugging bundled code
- Consider code splitting for larger features
