import { StorageService } from '../utils/storage.js';

console.log('AlterEgo Background Service Worker Started');

/**
 * Check if a cookie's domain matches any of the allowed hosts
 * @param {string} cookieDomain - Cookie domain (may start with '.')
 * @param {string[]} allowedHosts - List of allowed hostnames
 * @returns {boolean}
 */
function isCookieDomainAllowed(cookieDomain, allowedHosts) {
    const normalized = cookieDomain.startsWith('.') ? cookieDomain.substring(1) : cookieDomain;
    return allowedHosts.some(host => {
        return normalized === host || normalized.endsWith('.' + host);
    });
}

// Listen for installation
chrome.runtime.onInstalled.addListener(async () => {
    console.log('AlterEgo Installed');
    // Initialize default storage if empty
    const personas = await StorageService.getPersonas();
    if (personas.length === 0) {
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

        // Get configured allowed hosts
        const allowedHosts = await StorageService.getAllowedHosts();

        if (allowedHosts.length === 0) {
            console.log('No allowed hosts configured. Skipping cookie isolation.');
            return;
        }

        // Get the current active tab to scope cookie operations
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        let activeTabHost = null;

        if (activeTab && activeTab.url) {
            try {
                activeTabHost = new URL(activeTab.url).hostname;
            } catch (e) {
                console.warn('Could not parse active tab URL:', e);
            }
        }

        // Only proceed if the active tab's host is in the allowed list
        if (!activeTabHost || !isCookieDomainAllowed(activeTabHost, allowedHosts)) {
            console.log(`Active tab host "${activeTabHost}" is not in the allowed hosts list. Skipping.`);
            return;
        }

        // Determine hosts to manage: only the active tab's host (scoped to current tab)
        const hostsToManage = [activeTabHost];

        // 1. Save current cookies for the active tab's host to the old persona
        if (oldPersonaId) {
            const allCookies = await chrome.cookies.getAll({});
            const currentHostCookies = allCookies.filter(
                cookie => isCookieDomainAllowed(cookie.domain, hostsToManage)
            );

            // Merge with any previously saved cookies for other hosts
            const existingSavedCookies = await StorageService.getCookies(oldPersonaId);
            const otherHostCookies = existingSavedCookies.filter(
                cookie => !isCookieDomainAllowed(cookie.domain, hostsToManage)
            );
            const mergedCookies = [...otherHostCookies, ...currentHostCookies];

            await StorageService.saveCookies(oldPersonaId, mergedCookies);
            console.log(`Saved ${currentHostCookies.length} cookies for host ${activeTabHost} (persona ${oldPersonaId})`);
        }

        // 2. Clear cookies only for the active tab's host
        const origins = hostsToManage.flatMap(host => [`https://${host}`, `http://${host}`]);
        await chrome.browsingData.remove(
            { origins: origins },
            {
                cookies: true,
                localStorage: true,
                cache: true
            }
        );
        console.log(`Cleared browsing data for ${activeTabHost}`);

        // 3. Restore cookies for the new persona (only for the active tab's host)
        if (newPersonaId) {
            const savedCookies = await StorageService.getCookies(newPersonaId);
            const filteredCookies = savedCookies.filter(
                cookie => isCookieDomainAllowed(cookie.domain, hostsToManage)
            );
            console.log(`Restoring ${filteredCookies.length} cookies for host ${activeTabHost} (persona ${newPersonaId})`);

            for (const cookie of filteredCookies) {
                const prefix = cookie.secure ? 'https://' : 'http://';
                const domain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
                const url = `${prefix}${domain}${cookie.path}`;

                try {
                    const cookieDetails = {
                        url: url,
                        name: cookie.name,
                        value: cookie.value,
                        path: cookie.path,
                        secure: cookie.secure,
                        httpOnly: cookie.httpOnly,
                        expirationDate: cookie.expirationDate,
                        storeId: cookie.storeId,
                        sameSite: cookie.sameSite
                    };

                    // key fix: Do NOT set domain for hostOnly cookies
                    if (cookie.hostOnly === false) {
                        cookieDetails.domain = cookie.domain;
                    }

                    await chrome.cookies.set(cookieDetails);
                } catch (err) {
                    console.warn(`Failed to set cookie ${cookie.name} for ${domain}:`, err);
                }
            }
        }

        console.log('Persona switch complete.');
    }
});
