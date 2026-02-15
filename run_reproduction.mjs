
// Mock Chrome API
global.chrome = {
    cookies: {
        set: async (details) => {
            console.log('chrome.cookies.set called with:', JSON.stringify(details, null, 2));
            return details;
        }
    }
};

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
            }
        ];
    }
};

// Function logic mirroring the FIX (extracted from background/index.js)
async function restoreCookies(newPersonaId) {
    const savedCookies = await StorageService.getCookies(newPersonaId);
    console.log(`Restoring ${savedCookies.length} cookies for persona ${newPersonaId}`);

    for (const cookie of savedCookies) {
        // ... (URL construction remains same for now)
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

console.log('--- Simulating FIXED Logic ---');
restoreCookies('test-persona');
