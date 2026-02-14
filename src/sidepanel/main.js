import { StorageService } from '../utils/storage.js';
import '../styles/main.css';

document.addEventListener('DOMContentLoaded', async () => {
    const personaList = document.getElementById('persona-list');
    const createBtn = document.getElementById('create-persona-btn');
    const newPersonaInput = document.getElementById('new-persona-name');
    const currentPersonaName = document.getElementById('current-persona-name');

    // Load initial state
    await renderPersonas();

    createBtn.addEventListener('click', async () => {
        const name = newPersonaInput.value.trim();
        if (name) {
            const personas = await StorageService.getPersonas();
            const newPersona = {
                id: crypto.randomUUID(),
                name: name,
                created: Date.now()
            };
            personas.push(newPersona);
            await StorageService.savePersonas(personas);
            newPersonaInput.value = '';
            await renderPersonas();
        }
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
