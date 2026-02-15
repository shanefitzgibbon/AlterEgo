# AlterEgo

A browser extension for managing multiple browsing personas with session isolation.

## Overview

AlterEgo allows you to create and switch between different browsing personas, each with their own isolated cookies and browsing data. This is useful for:
- Testing different user accounts on the same website
- Separating work and personal browsing sessions
- Managing multiple social media accounts
- Web development and testing

## Permissions

This extension requires the following permissions:

### Standard Permissions
- **cookies**: To save and restore cookies for each persona
- **storage**: To store persona data and settings
- **tabs**: To manage browser tabs when switching personas
- **browsingData**: To clear cookies and cache when switching between personas
- **sidePanel**: To display the persona management interface

### Host Permissions

**`host_permissions: ["<all_urls>"]`**

This extension requires access to all URLs (`<all_urls>`) for the following reasons:

1. **Cookie Management Across All Sites**: The extension needs to save and restore cookies from any website you visit. Without access to all URLs, it would only be able to manage cookies for a predefined list of sites, defeating the purpose of persona-based session isolation.

2. **Domain-Wide Cookie Handling**: When you switch personas, the extension must:
   - Save all cookies from the current browsing session (regardless of which websites you visited)
   - Clear all existing cookies and browsing data
   - Restore cookies for the new persona across all domains

3. **Technical Requirement**: The Chrome Cookies API (`chrome.cookies.set`) requires a valid URL parameter to set cookies. The extension constructs these URLs based on the cookie's domain and path to properly restore your saved sessions.

**Privacy Note**: While this permission allows the extension to access all websites, AlterEgo:
- Only reads and writes cookie data, not page content
- Stores all data locally in your browser using Chrome's storage API
- Does not transmit any data to external servers
- Is open source, so you can verify the code yourself

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click the AlterEgo icon in your browser toolbar to open the side panel
2. Create a new persona or switch between existing ones
3. Your cookies and browsing data will be automatically saved and restored when switching personas
