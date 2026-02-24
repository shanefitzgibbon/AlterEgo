/**
 * Wrapper for Chrome Storage API
 * Handles saving and retrieving persona data.
 */

const STORAGE_KEYS = {
    PERSONAS: 'personas',
    ACTIVE_PERSONA_ID: 'activePersonaId',
    ALLOWED_HOSTS: 'allowedHosts'
};

/**
 * @typedef {Object} Persona
 * @property {string} id
 * @property {string} name
 * @property {string} color
 * @property {Object} [sessionData] - Placeholder for session specific data if needed
 */

export const StorageService = {
    /**
     * Get all personas
     * @returns {Promise<Persona[]>}
     */
    async getPersonas() {
        const result = await chrome.storage.local.get(STORAGE_KEYS.PERSONAS);
        return result[STORAGE_KEYS.PERSONAS] || [];
    },

    /**
     * Save personas
     * @param {Persona[]} personas 
     */
    async savePersonas(personas) {
        await chrome.storage.local.set({ [STORAGE_KEYS.PERSONAS]: personas });
    },

    /**
     * Get active persona ID
     * @returns {Promise<string|null>}
     */
    async getActivePersonaId() {
        const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_PERSONA_ID);
        return result[STORAGE_KEYS.ACTIVE_PERSONA_ID] || null;
    },

    /**
     * Set active persona ID
     * @param {string} id 
     */
    async setActivePersonaId(id) {
        await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_PERSONA_ID]: id });
    },

    /**
     * Get cookies for a persona
     * @param {string} personaId 
     * @returns {Promise<chrome.cookies.Cookie[]>}
     */
    async getCookies(personaId) {
        const key = `cookies_${personaId}`;
        const result = await chrome.storage.local.get(key);
        return result[key] || [];
    },

    /**
     * Save cookies for a persona
     * @param {string} personaId 
     * @param {chrome.cookies.Cookie[]} cookies 
     */
    async saveCookies(personaId, cookies) {
        const key = `cookies_${personaId}`;
        await chrome.storage.local.set({ [key]: cookies });
    },

    /**
     * Delete cookies for a persona
     * @param {string} personaId 
     */
    async deleteCookies(personaId) {
        const key = `cookies_${personaId}`;
        await chrome.storage.local.remove(key);
    },

    /**
     * Get allowed hosts for cookie isolation
     * @returns {Promise<string[]>}
     */
    async getAllowedHosts() {
        const result = await chrome.storage.local.get(STORAGE_KEYS.ALLOWED_HOSTS);
        return result[STORAGE_KEYS.ALLOWED_HOSTS] || [];
    },

    /**
     * Save allowed hosts for cookie isolation
     * @param {string[]} hosts
     */
    async saveAllowedHosts(hosts) {
        await chrome.storage.local.set({ [STORAGE_KEYS.ALLOWED_HOSTS]: hosts });
    }
};
