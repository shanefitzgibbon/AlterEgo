
// Mock Chrome API
global.chrome = {
    cookies: {
        set: async (details) => {
            console.log('chrome.cookies.set called with:', JSON.stringify(details, null, 2));
            return details;
        }
    }
};

/**
 * Check if a cookie's domain matches any of the allowed hosts
 */
function isCookieDomainAllowed(cookieDomain, allowedHosts) {
    const normalized = cookieDomain.startsWith('.') ? cookieDomain.substring(1) : cookieDomain;
    return allowedHosts.some(host => {
        return normalized === host || normalized.endsWith('.' + host);
    });
}

// Mock StorageService
const StorageService = {
    getCookies: async (personaId) => {
        return [
            {
                name: 'session_id',
                value: '12345',
                domain: '.example.com',
                path: '/',
                secure: true,
                httpOnly: true,
                sameSite: 'no_restriction',
                hostOnly: false,
                expirationDate: 1234567890
            },
            {
                name: 'local_pref',
                value: 'dark_mode',
                domain: 'sub.example.com',
                path: '/',
                secure: false,
                httpOnly: false,
                sameSite: 'lax',
                hostOnly: true,
                expirationDate: 1234567890
            },
            {
                name: 'other_cookie',
                value: 'value',
                domain: '.otherdomain.com',
                path: '/',
                secure: true,
                httpOnly: false,
                sameSite: 'lax',
                hostOnly: false,
                expirationDate: 1234567890
            }
        ];
    }
};

// Function logic mirroring the FIX (extracted from background/index.js)
async function restoreCookies(newPersonaId, allowedHosts, activeTabHost) {
    console.log(`Allowed hosts: ${JSON.stringify(allowedHosts)}`);
    console.log(`Active tab host: ${activeTabHost}`);

    // Only proceed if the active tab host is in the allowed list
    if (!activeTabHost || !isCookieDomainAllowed(activeTabHost, allowedHosts)) {
        console.log(`Active tab host "${activeTabHost}" is not in the allowed hosts list. Skipping.`);
        return;
    }

    const hostsToManage = [activeTabHost];
    const savedCookies = await StorageService.getCookies(newPersonaId);

    // Filter cookies to only those matching the active tab's host
    const filteredCookies = savedCookies.filter(
        cookie => isCookieDomainAllowed(cookie.domain, hostsToManage)
    );
    console.log(`Restoring ${filteredCookies.length} of ${savedCookies.length} cookies for persona ${newPersonaId} (filtered to ${activeTabHost})`);

    for (const cookie of filteredCookies) {
        const prefix = cookie.secure ? 'https://' : 'http://';
        const domain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
        const url = `${prefix}${domain}${cookie.path}`;

        try {
            // FIXED LOGIC
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
            if (!cookie.hostOnly) {
                cookieDetails.domain = cookie.domain;
            }

            await chrome.cookies.set(cookieDetails);
        } catch (err) {
            console.warn(`Failed to set cookie ${cookie.name} for ${domain}:`, err);
        }
    }
}

console.log('--- Simulating FIXED Logic with Host Filtering ---');
console.log('\n=== Test 1: Active tab on example.com (allowed) ===');
await restoreCookies('test-persona', ['example.com'], 'example.com');

console.log('\n=== Test 2: Active tab on otherdomain.com (not allowed) ===');
await restoreCookies('test-persona', ['example.com'], 'otherdomain.com');

console.log('\n=== Test 3: No allowed hosts configured ===');
await restoreCookies('test-persona', [], 'example.com');
