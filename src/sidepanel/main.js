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

// Available colors for personas
const PERSONA_COLORS = [
    'blue', 'green', 'purple', 'yellow', 'pink',
    'indigo', 'red', 'orange', 'teal', 'cyan'
];

/**
 * Get a random color from the predefined list
 * @returns {string} One of the available colors
 */
function getRandomColor() {
    return PERSONA_COLORS[Math.floor(Math.random() * PERSONA_COLORS.length)];
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
            color: getRandomColor(),
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
        personas.forEach((persona) => {
            // Assign a color if existing persona doesn't have one
            if (!persona.color) {
                // Deterministic color based on ID to ensure stability
                let hash = 0;
                for (let i = 0; i < persona.id.length; i++) {
                    hash = persona.id.charCodeAt(i) + ((hash << 5) - hash);
                }
                const index = Math.abs(hash) % PERSONA_COLORS.length;
                persona.color = PERSONA_COLORS[index];
            }

            const isActive = persona.id === activeId;
            const color = persona.color;

            // Card container
            const card = document.createElement('div');
            // Base classes
            let cardClasses = `relative p-4 rounded-xl border-2 hover:shadow-md transition-all duration-200 cursor-pointer group`;

            // Dynamic color classes
            const borderColorClass = isActive ? `border-${color}-500` : `border-${color}-200 hover:border-${color}-300`;
            const bgColorClass = isActive ? `bg-${color}-50` : 'bg-white';

            card.className = `${cardClasses} ${borderColorClass} ${bgColorClass}`;
            card.addEventListener('click', () => switchPersona(persona.id));

            // Inner layout
            const innerLayout = document.createElement('div');
            innerLayout.className = 'flex items-center gap-4';

            // Image
            const imgContainer = document.createElement('div');
            const img = document.createElement('img');
            img.src = `https://i.pravatar.cc/150?u=${persona.id}`;
            img.alt = persona.name;
            img.className = 'w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm';
            imgContainer.appendChild(img);
            innerLayout.appendChild(imgContainer);

            // Details section
            const details = document.createElement('div');
            details.className = 'flex-1 min-w-0'; // min-w-0 for text truncation to work

            const nameEl = document.createElement('h3');
            nameEl.className = 'font-semibold text-gray-900 truncate';
            nameEl.textContent = persona.name;
            details.appendChild(nameEl);

            if (isActive) {
                const statusSpan = document.createElement('span');
                statusSpan.className = `inline-block text-xs font-bold text-${color}-600 mt-1`;
                statusSpan.textContent = 'Active';
                details.appendChild(statusSpan);
            }

            innerLayout.appendChild(details);
            card.appendChild(innerLayout);

            // Delete button (positioned absolute top-right)
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'absolute top-2 right-2 p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity';
            deleteBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            `;
            deleteBtn.title = 'Delete persona';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deletePersona(persona.id);
            });
            card.appendChild(deleteBtn);

            personaList.appendChild(card);
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
