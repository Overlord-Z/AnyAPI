// UI event bindings and DOM manipulation for EndpointTester
// Exported as ES6 module
import { showNotification } from './notifications.js';

export function initEndpointUI() {
    // Wait for the global endpointTester instance to be available
    const checkEndpointTester = () => {
        if (!window.endpointTester) {
            console.warn('⚠️ EndpointTester not available yet, retrying...');
            setTimeout(checkEndpointTester, 50);
            return;
        }
        
        console.log('🎨 Setting up endpoint UI event handlers...');
        setupEventHandlers();
    };
    
    checkEndpointTester();
}

function setupEventHandlers() {
    const endpointTester = window.endpointTester;

    // Send button
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
            const valid = endpointTester.validateRequest();
            if (!valid) {
                showNotification('Invalid request', 'error');
                return;
            }
            try {
                endpointTester.showResponseLoading();
                await endpointTester.sendRequest();
            } catch (err) {
                showNotification('Request failed', 'error');
            }
        });
    }

    // Clear request button
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => endpointTester.clearRequest());
    }

    // Export history button
    const exportBtn = document.getElementById('export-history-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const data = endpointTester.exportHistory();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `anyapi-history-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            showNotification('History exported successfully', 'success');
        });
    }

    // Import history button
    const importBtn = document.getElementById('import-history-btn');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    if (endpointTester.importHistory(data)) {
                        showNotification(`Imported ${data.history.length} history items`, 'success');
                        endpointTester.updateHistoryDisplay();
                    } else {
                        showNotification('Invalid history file format', 'error');
                    }
                } catch (error) {
                    showNotification('Failed to import history file', 'error');
                }
            };
            input.click();
        });
    }

    // Clear history button
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all request history? This action cannot be undone.')) {
                endpointTester.clearHistory();
                endpointTester.updateHistoryDisplay();
                showNotification('Request history cleared', 'success');
            }
        });
    }

    // History item click (delegated)
    const historyList = document.getElementById('history-list');
    if (historyList) {
        historyList.addEventListener('click', (e) => {
            const item = e.target.closest('.history-item');
            if (item) {
                const index = parseInt(item.dataset.index, 10);
                endpointTester.loadFromHistory(index);
            }
        });
    }

    // Profile selection
    const profileSelect = document.getElementById('test-profile');
    if (profileSelect) {
        profileSelect.addEventListener('change', (e) => {
            const profileName = e.target.value;
            console.log('🔄 Profile selector changed to:', profileName);
            
            // Update endpoint tester
            endpointTester.onProfileChange(profileName);
            
            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('profileChanged', {
                detail: { 
                    profileName, 
                    source: 'endpointTester' 
                }
            }));
        });
    }

    // Endpoint input validation
    const endpointInput = document.getElementById('endpoint-url');
    if (endpointInput) {
        let validationTimeout;
        endpointInput.addEventListener('input', (e) => {
            clearTimeout(validationTimeout);
            validationTimeout = setTimeout(() => {
                endpointTester.validateEndpoint();
            }, 300);
        });
        endpointInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                endpointTester.sendRequest();
            }
        });
    }

    // Method selector
    const methodButtons = document.querySelectorAll('.method-btn, .method-btn-compact');
    methodButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            methodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            endpointTester.currentMethod = btn.dataset.method || btn.textContent.trim();
            // Show/hide body section as needed
            // ...
            window.dispatchEvent(new CustomEvent('methodChanged', {
                detail: { method: endpointTester.currentMethod }
            }));
        });
    });

    // Tab switcher
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const targetPane = document.getElementById(`${targetTab}-tab`);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // Initial load
    endpointTester.loadRequestHistory();
    endpointTester.updateHistoryDisplay();
}
