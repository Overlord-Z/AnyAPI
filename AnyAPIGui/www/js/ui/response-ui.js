// UI for EnhancedResponseViewer
// Exported as ES6 module
import EnhancedResponseViewer from '../core/response-viewer.js';

let enhancedViewer;

export function initResponseUI() {
    enhancedViewer = new EnhancedResponseViewer();
    window.enhancedViewer = enhancedViewer;

    // Tab switching for response viewer
    document.addEventListener('click', (e) => {
        if (e.target.closest('.response-tab')) {
            const tab = e.target.closest('.response-tab');
            const view = tab.dataset.view;
            document.querySelectorAll('.response-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            enhancedViewer.currentView = view;
            enhancedViewer.renderCurrentView();
        }
    });

    // Search input for response viewer
    const searchInput = document.querySelector('.response-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            enhancedViewer.searchQuery = e.target.value;
            if (enhancedViewer.currentView === 'search' || enhancedViewer.searchQuery) {
                enhancedViewer.performSearch();
            }
        });
    }

    // Action buttons (copy, expand, collapse, export)
    document.querySelectorAll('.response-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            enhancedViewer.handleAction(action);
        });
    });

    // Initial render
    enhancedViewer.renderCurrentView();
}
