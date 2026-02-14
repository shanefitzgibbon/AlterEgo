import { StorageService } from '../utils/storage.js';

console.log('AlterEGo Background Service Worker Started');

// Listen for installation
chrome.runtime.onInstalled.addListener(async () => {
    console.log('AlterEGo Installed');
    // Initialize default storage if empty
    const personas = await StorageService.getPersonas();
    if (personas.length === 0) {
        // Create a default "Default" persona? Or leave empty.
        // Let's leave it empty or maybe just rely on the user to create one.
        console.log('No personas found. Initial state.');
    }
});

// Listener for side panel opening
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// Logic for session isolation
chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'local' && changes.activePersonaId) {
        const newPersonaId = changes.activePersonaId.newValue;
        const oldPersonaId = changes.activePersonaId.oldValue;

        console.log(`Switching persona from ${oldPersonaId} to ${newPersonaId}`);

        // 1. Save current cookies to the old persona (if any)
        if (oldPersonaId) {
            const currentCookies = await chrome.cookies.getAll({});
            await StorageService.saveCookies(oldPersonaId, currentCookies);
            console.log(`Saved ${currentCookies.length} cookies for persona ${oldPersonaId}`);
        }

        // 2. Clear current session (Cookies & LocalStorage)
        // Note: Clearing localStorage ensures isolation but data is lost since we don't restore it yet.
        await chrome.browsingData.remove(
            { since: 0 },
            {
                cookies: true,
                localStorage: true,
                cache: true
            }
        );
        console.log('Cleared browsing data');

        // 3. Restore cookies for the new persona
        if (newPersonaId) {
            const savedCookies = await StorageService.getCookies(newPersonaId);
            console.log(`Restoring ${savedCookies.length} cookies for persona ${newPersonaId}`);

            for (const cookie of savedCookies) {
                // chrome.cookies.set requires a URL, but the cookie object has domain/path.
                // We need to construct a valid URL.
                const prefix = cookie.secure ? 'https://' : 'http://';
                const domain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
                const url = `${prefix}${domain}${cookie.path}`;

                try {
                    await chrome.cookies.set({
                        url: url,
                        name: cookie.name,
                        value: cookie.value,
                        domain: cookie.domain,
                        path: cookie.path,
                        secure: cookie.secure,
                        httpOnly: cookie.httpOnly,
                        expirationDate: cookie.expirationDate,
                        storeId: cookie.storeId // specific to the browser instance, might need to be omitted or correct
                        // 'sameSite' might need mapping from string to enum if not matching exactly
                        // but chrome.cookies.getAll returns compatible types mostly.
                    });
                } catch (err) {
                    console.warn(`Failed to set cookie ${cookie.name} for ${domain}:`, err);
                }
            }
        }

        // Notify user (optional, maybe via badge or runtime message)
        console.log('Persona switch complete.');
    }
});
