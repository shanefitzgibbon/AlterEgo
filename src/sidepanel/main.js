import { StorageService } from '../utils/storage.js';
import '../styles/main.css';

// Validation constants
const VALIDATION_RULES = {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    ALLOWED_PATTERN: /^[a-zA-Z0-9\s\-_]+$/
};

/**
 * Validate persona name
 * @param {string} name - The persona name to validate
 * @param {Array} existingPersonas - Array of existing personas
 * @returns {{valid: boolean, error: string|null}}
 */
function validatePersonaName(name, existingPersonas) {
    const trimmedName = name.trim();
    
    // Check if empty after trim
    if (trimmedName.length === 0) {
        return { valid: false, error: 'Persona name cannot be empty' };
    }
    
    // Check minimum length
    if (trimmedName.length < VALIDATION_RULES.MIN_LENGTH) {
        return { valid: false, error: `Persona name must be at least ${VALIDATION_RULES.MIN_LENGTH} character(s)` };
    }
    
    // Check maximum length
    if (trimmedName.length > VALIDATION_RULES.MAX_LENGTH) {
        return { valid: false, error: `Persona name must not exceed ${VALIDATION_RULES.MAX_LENGTH} characters` };
    }
    
    // Check for allowed characters
    if (!VALIDATION_RULES.ALLOWED_PATTERN.test(trimmedName)) {
        return { valid: false, error: 'Persona name can only contain letters, numbers, spaces, hyphens, and underscores' };
    }
    
    // Check for duplicate names (case-insensitive)
    const isDuplicate = existingPersonas.some(
        persona => persona.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
        return { valid: false, error: 'A persona with this name already exists' };
    }
    
    return { valid: true, error: null };
}

/**
 * Display error message to user
 * @param {string} message - Error message to display
 */
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 3000);
}

/**
 * Clear error message
 */
function clearError() {
    const errorDiv = document.getElementById('error-message');
    errorDiv.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', async () => {
    const personaList = document.getElementById('persona-list');
    const createBtn = document.getElementById('create-persona-btn');
    const newPersonaInput = document.getElementById('new-persona-name');
    const currentPersonaName = document.getElementById('current-persona-name');

    // Load initial state
    await renderPersonas();

    createBtn.addEventListener('click', async () => {
        const name = newPersonaInput.value.trim();
        const personas = await StorageService.getPersonas();
        
        // Validate the persona name
        const validation = validatePersonaName(name, personas);
        
        if (!validation.valid) {
            showError(validation.error);
            return;
        }
        
        // Clear any previous errors
        clearError();
        
        // Create and save the new persona
        const newPersona = {
            id: crypto.randomUUID(),
            name: name,
            created: Date.now()
        };
        personas.push(newPersona);
        await StorageService.savePersonas(personas);
        newPersonaInput.value = '';
        await renderPersonas();
    });

    async function renderPersonas() {
        const personas = await StorageService.getPersonas();
        const activeId = await StorageService.getActivePersonaId();

        const activePersona = personas.find(p => p.id === activeId);
        currentPersonaName.textContent = activePersona ? activePersona.name : 'Default / None';

        personaList.innerHTML = '';
        personas.forEach(persona => {
            const div = document.createElement('div');
            div.className = `p-3 rounded border cursor-pointer flex justify-between items-center ${persona.id === activeId ? 'bg-blue-100 border-blue-300' : 'bg-white hover:bg-gray-50'}`;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'font-medium';
            nameSpan.textContent = persona.name;
            div.appendChild(nameSpan);

            if (persona.id === activeId) {
                const activeSpan = document.createElement('span');
                activeSpan.className = 'text-blue-600 text-sm font-bold';
                activeSpan.textContent = 'Active';
                div.appendChild(activeSpan);
            }
            // Prevent rapid clicking or handle it gracefully
            div.addEventListener('click', () => switchPersona(persona.id));
            personaList.appendChild(div);
        });
    }

    async function switchPersona(id) {
        await StorageService.setActivePersonaId(id);
        // The background script listens to storage changes and handles the actual isolation
        await renderPersonas();
    }

    // Listen for changes from other contexts (like if multiple windows open)
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes.personas || changes.activePersonaId)) {
            renderPersonas();
        }
    });
});
