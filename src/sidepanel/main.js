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
    
    // Check minimum length (also catches empty strings)
    if (trimmedName.length < VALIDATION_RULES.MIN_LENGTH) {
        return { valid: false, error: 'Persona name cannot be empty' };
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
        const inputValue = newPersonaInput.value;
        const personas = await StorageService.getPersonas();
        
        // Validate the persona name
        const validation = validatePersonaName(inputValue, personas);
        
        if (!validation.valid) {
            showError(validation.error);
            return;
        }
        
        // Clear any previous errors
        clearError();
        
        // Create and save the new persona (use trimmed name from validation)
        const trimmedName = inputValue.trim();
        const newPersona = {
            id: crypto.randomUUID(),
            name: trimmedName,
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
            div.className = `p-3 rounded border flex justify-between items-center ${persona.id === activeId ? 'bg-blue-100 border-blue-300' : 'bg-white hover:bg-gray-50'}`;

            const leftSection = document.createElement('div');
            leftSection.className = 'flex-1 cursor-pointer';
            leftSection.addEventListener('click', () => switchPersona(persona.id));

            const nameSpan = document.createElement('span');
            nameSpan.className = 'font-medium';
            nameSpan.textContent = persona.name;
            leftSection.appendChild(nameSpan);

            div.appendChild(leftSection);

            const rightSection = document.createElement('div');
            rightSection.className = 'flex items-center gap-2';

            if (persona.id === activeId) {
                const activeSpan = document.createElement('span');
                activeSpan.className = 'text-blue-600 text-sm font-bold';
                activeSpan.textContent = 'Active';
                rightSection.appendChild(activeSpan);
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'text-red-500 hover:text-red-700 px-2 py-1 text-sm';
            deleteBtn.textContent = '×';
            deleteBtn.title = 'Delete persona';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deletePersona(persona.id);
            });
            rightSection.appendChild(deleteBtn);

            div.appendChild(rightSection);
            personaList.appendChild(div);
        });
    }

    async function switchPersona(id) {
        await StorageService.setActivePersonaId(id);
        // The background script listens to storage changes and handles the actual isolation
        await renderPersonas();
    }

    async function deletePersona(id) {
        if (!confirm('Are you sure you want to delete this persona? This will also remove all associated data.')) {
            return;
        }

        const personas = await StorageService.getPersonas();
        const filteredPersonas = personas.filter(p => p.id !== id);
        await StorageService.savePersonas(filteredPersonas);

        // Clean up cookies for this persona
        await StorageService.deleteCookies(id);

        // If this was the active persona, clear the active selection
        const activeId = await StorageService.getActivePersonaId();
        if (activeId === id) {
            await StorageService.setActivePersonaId(null);
        }

        await renderPersonas();
    }

    // Listen for changes from other contexts (like if multiple windows open)
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes.personas || changes.activePersonaId)) {
            renderPersonas();
        }
    });
});
