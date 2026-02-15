# GitHub Copilot Instructions for AlterEgo

## Project Overview

AlterEgo is a Chrome browser extension for managing multiple browsing personas with session isolation. It allows users to create and switch between different browsing personas, each with their own isolated cookies and browsing data.

## Technology Stack

- **Language**: Vanilla JavaScript (ES6+ modules)
- **Build Tool**: Vite 7.x
- **Styling**: Tailwind CSS 4.x
- **Extension Framework**: Chrome Extension Manifest V3
- **Plugin**: @crxjs/vite-plugin for building Chrome extensions with Vite
- **Module System**: ES6 modules (`type: "module"` in manifest.json)

## Project Structure

```
AlterEgo/
├── src/
│   ├── background/          # Service worker scripts
│   │   └── index.js         # Background service worker logic
│   ├── sidepanel/           # Side panel UI
│   │   ├── index.html       # Side panel HTML
│   │   └── main.js          # Side panel JavaScript
│   ├── utils/               # Shared utilities
│   │   └── storage.js       # Chrome Storage API wrapper
│   └── styles/              # CSS files
├── manifest.json            # Chrome extension manifest (v3)
├── vite.config.mjs          # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── package.json             # NPM dependencies
```

## Key Chrome Extension APIs Used

- **chrome.cookies**: For managing cookies across personas
- **chrome.storage.local**: For persisting persona data and settings
- **chrome.tabs**: For managing browser tabs during persona switches
- **chrome.browsingData**: For clearing cookies and cache when switching personas
- **chrome.sidePanel**: For displaying the persona management UI

## Development Guidelines

### Code Style

1. **Use ES6+ features**: Arrow functions, async/await, template literals, destructuring
2. **Module imports**: Always use explicit `.js` extensions in imports (e.g., `import { StorageService } from '../utils/storage.js'`)
3. **JSDoc comments**: Add JSDoc comments for functions and complex logic
4. **Validation**: Always validate user input (see `validatePersonaName` in main.js)
5. **Error handling**: Use try-catch blocks for Chrome API calls that may fail

### Chrome Extension Best Practices

1. **Service Worker**: The background script runs as a service worker (Manifest V3)
   - Keep it lightweight and stateless
   - Use chrome.storage for persistence, not global variables
   - Handle the onInstalled event for initialization

2. **Permissions**: Only use the minimal required permissions
   - Current permissions: cookies, storage, tabs, browsingData, sidePanel
   - Host permissions: `<all_urls>` (required for cookie management)

3. **Cookie Management**:
   - When setting cookies with `chrome.cookies.set`, construct proper URLs
   - Handle both secure (https) and non-secure (http) cookies
   - Respect `hostOnly` flag when setting cookies (don't set domain for hostOnly cookies)

4. **Storage**:
   - Use chrome.storage.local for persistence (not localStorage)
   - Listen to storage.onChanged for cross-context updates
   - Store cookies with keys like `cookies_${personaId}`

### Building and Testing

- **Development**: `npm run dev` - Starts Vite dev server with hot reload
- **Build**: `npm run build` - Builds the extension for production
- **Preview**: `npm run preview` - Previews the production build

### Testing the Extension

1. Run `npm run build` to build the extension
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` directory
5. Test persona creation, switching, and deletion
6. Verify cookies are properly saved and restored

## Common Tasks

### Adding New Features

1. **UI Changes**: Modify files in `src/sidepanel/`
   - Update HTML in `index.html`
   - Add JavaScript logic in `main.js`
   - Use Tailwind CSS classes for styling

2. **Background Logic**: Modify `src/background/index.js`
   - Add listeners for Chrome events
   - Implement session isolation logic

3. **Storage Changes**: Update `src/utils/storage.js`
   - Add new storage methods as needed
   - Update STORAGE_KEYS constant

### Input Validation

When adding forms or user inputs:
- Define validation rules (see VALIDATION_RULES in main.js)
- Check for required fields, length constraints, and allowed characters
- Check for duplicates if applicable
- Display clear error messages to users
- Trim user input before validation

### Error Handling

- Wrap Chrome API calls in try-catch blocks
- Log errors to console for debugging
- Display user-friendly error messages in the UI
- Don't expose technical details to users

## Important Notes

1. **Module System**: This project uses ES6 modules. Always include `.js` extensions in import paths.
2. **Chrome API**: All Chrome APIs are asynchronous and should be used with async/await.
3. **Persona Switching**: The actual session isolation happens in the background script via storage.onChanged listener.
4. **Cookie Restoration**: Requires careful URL construction and handling of cookie properties.
5. **Data Persistence**: Everything is stored locally in the browser using chrome.storage.local.

## Security Considerations

- Never expose sensitive data in console logs (production)
- Validate all user inputs
- Use secure cookies where appropriate
- Clear browsing data properly when switching personas
- Don't transmit any data to external servers

## Common Patterns

### Adding a Chrome API Listener
```javascript
chrome.someAPI.addListener(async (param) => {
    try {
        // Handle event
    } catch (error) {
        console.error('Error:', error);
    }
});
```

### Using Storage Service
```javascript
import { StorageService } from '../utils/storage.js';

// Get data
const personas = await StorageService.getPersonas();

// Save data
await StorageService.savePersonas(personas);
```

### Creating UI Elements
```javascript
const div = document.createElement('div');
div.className = 'p-3 rounded border'; // Use Tailwind classes
div.textContent = 'Content';
parentElement.appendChild(div);
```
