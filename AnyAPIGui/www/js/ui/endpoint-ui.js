/**
 * Endpoint UI Module - Clean ES6 implementation
 * Handles DOM interactions for the endpoint tester
 */

import { showNotification, debounce } from '../modern-ui-utilities.js';

export class EndpointUI {
    constructor(endpointTester) {
        this.endpointTester = endpointTester;
        this.init();
    }

    /**
     * Initialize UI event handlers
     */
    init() {
        console.log('🎨 Initializing Endpoint UI...');
        
        this.setupEventHandlers();
        this.setupKeyboardShortcuts();
        
        console.log('✅ Endpoint UI initialized');
    }

    /**
     * Setup all event handlers
     */
    setupEventHandlers() {
        this.setupRequestControls();
        this.setupFormInteractions();
        this.setupHistoryControls();
        this.setupProfileSelector();
        this.setupMethodSelector();
        this.setupKeyValuePairs();
    }

    /**
     * Setup request control buttons
     */
    setupRequestControls() {
        // Send request button
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', async () => {
                this.setButtonLoading(sendBtn, true);
                try {
                    await this.endpointTester.sendRequest();
                } catch (error) {
                    console.error('Send request failed:', error);
                    showNotification('Request failed', 'error');
                } finally {
                    this.setButtonLoading(sendBtn, false);
                }
            });
        }

        // Clear request button
        const clearBtn = document.getElementById('clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.endpointTester.clearRequest();
            });
        }

        // Generate code button
        const generateBtn = document.getElementById('generate-code-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.endpointTester.generateCode();
            });
        }

        // Save request button
        const saveBtn = document.getElementById('save-request-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveCurrentRequest();
            });
        }
    }

    /**
     * Setup form interactions
     */
    setupFormInteractions() {
        // Endpoint input validation
        const endpointInput = document.getElementById('endpoint-url');
        if (endpointInput) {
            const debouncedValidation = debounce(() => {
                this.endpointTester.validateEndpoint();
            }, 300);

            endpointInput.addEventListener('input', debouncedValidation);
            
            endpointInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.endpointTester.sendRequest();
                }
            });
        }

        // Request body textarea
        const requestBody = document.getElementById('request-body');
        if (requestBody) {
            requestBody.addEventListener('input', () => {
                this.validateJsonBody(requestBody);
            });
        }

        // Content type selector
        const contentType = document.getElementById('content-type');
        if (contentType) {
            contentType.addEventListener('change', () => {
                this.handleContentTypeChange(contentType.value);
            });
        }
    }

    /**
     * Setup history controls
     */
    setupHistoryControls() {
        // Export history
        const exportBtn = document.getElementById('export-history-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.endpointTester.exportHistory();
            });
        }

        // Import history
        const importBtn = document.getElementById('import-history-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.endpointTester.importHistory();
            });
        }

        // Clear history
        const clearHistoryBtn = document.getElementById('clear-history-btn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                this.endpointTester.clearHistory();
            });
        }

        // History item clicks (delegated)
        const historyList = document.getElementById('history-list');
        if (historyList) {
            historyList.addEventListener('click', (e) => {
                const historyItem = e.target.closest('.history-item');
                if (historyItem) {
                    const index = parseInt(historyItem.dataset.index, 10);
                    this.loadFromHistory(index);
                }
            });
        }
    }

    /**
     * Setup profile selector
     */
    setupProfileSelector() {
        const profileSelect = document.getElementById('test-profile');
        if (profileSelect) {
            profileSelect.addEventListener('change', (e) => {
                const profileName = e.target.value;
                console.log('🔄 Profile selector changed to:', profileName);
                
                this.endpointTester.onProfileChange(profileName);
                
                // Dispatch event for other components
                window.dispatchEvent(new CustomEvent('profileChanged', {
                    detail: { 
                        profileName, 
                        source: 'endpointTester' 
                    }
                }));
            });
        }
    }

    /**
     * Setup method selector buttons
     */
    setupMethodSelector() {
        // Method buttons now use onclick handlers, no need for event delegation
        console.log('🎨 Method selector uses onclick handlers');
    }

    /**
     * Setup key-value pair interactions
     */
    setupKeyValuePairs() {
        // Key-value buttons now use onclick handlers, no need for event delegation
        console.log('🎨 Key-value pair buttons use onclick handlers');
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to send request
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.endpointTester.sendRequest();
            }
            
            // Ctrl/Cmd + K to clear request
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.endpointTester.clearRequest();
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });
    }

    /**
     * Set button loading state
     */
    setButtonLoading(button, isLoading, loadingText = 'Sending...') {
        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = `
                <div class="loading-spinner" style="width: 16px; height: 16px; border-width: 2px; margin-right: 8px;"></div>
                ${loadingText}
            `;
        } else {
            button.disabled = false;
            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }

    /**
     * Validate JSON body content
     */
    validateJsonBody(textarea) {
        const value = textarea.value.trim();
        if (!value) {
            this.clearJsonValidation(textarea);
            return;
        }

        try {
            JSON.parse(value);
            this.showJsonValidation(textarea, true, 'Valid JSON');
        } catch (error) {
            this.showJsonValidation(textarea, false, `Invalid JSON: ${error.message}`);
        }
    }

    /**
     * Show JSON validation feedback
     */
    showJsonValidation(textarea, isValid, message) {
        let feedback = textarea.parentElement.querySelector('.json-feedback');
        
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'json-feedback';
            textarea.parentElement.appendChild(feedback);
        }
        
        feedback.className = `json-feedback ${isValid ? 'json-valid' : 'json-invalid'}`;
        feedback.textContent = message;
        feedback.style.cssText = `
            margin-top: 0.5rem;
            padding: 0.5rem;
            border-radius: var(--border-radius, 4px);
            font-size: var(--font-size-sm, 0.875rem);
            ${isValid 
                ? 'background: rgba(34, 197, 94, 0.1); color: var(--color-success, #22c55e);'
                : 'background: rgba(239, 68, 68, 0.1); color: var(--color-danger, #ef4444);'
            }
        `;
    }

    /**
     * Clear JSON validation feedback
     */
    clearJsonValidation(textarea) {
        const feedback = textarea.parentElement.querySelector('.json-feedback');
        if (feedback) {
            feedback.remove();
        }
    }

    /**
     * Handle content type change
     */
    handleContentTypeChange(contentType) {
        const requestBody = document.getElementById('request-body');
        if (!requestBody) return;

        // Clear validation when changing content type
        this.clearJsonValidation(requestBody);

        // Set appropriate placeholder
        if (contentType === 'application/json') {
            requestBody.placeholder = '{\n  "key": "value"\n}';
        } else if (contentType === 'application/x-www-form-urlencoded') {
            requestBody.placeholder = 'key1=value1&key2=value2';
        } else if (contentType === 'text/plain') {
            requestBody.placeholder = 'Plain text content...';
        } else {
            requestBody.placeholder = 'Request body content...';
        }
    }

    /**
     * Save current request to history
     */
    saveCurrentRequest() {
        if (!this.endpointTester.validateRequest()) {
            showNotification('Cannot save invalid request', 'error');
            return;
        }
        
        const requestData = this.endpointTester.buildRequestData();
        const historyItem = {
            profile: requestData.profileName,
            method: requestData.method,
            endpoint: requestData.endpoint,
            headers: requestData.headers,
            queryParameters: requestData.queryParameters,
            body: requestData.body,
            contentType: requestData.contentType,
            timestamp: new Date().toISOString(),
            success: null,
            status: 'Saved',
            duration: 0
        };
        
        this.endpointTester.addToHistory(historyItem);
        showNotification('Request saved to history', 'success');
    }

    /**
     * Load request from history
     */
    loadFromHistory(index) {
        const historyItem = this.endpointTester.requestHistory[index];
        if (!historyItem) return;

        try {
            // Set profile
            const profileSelect = document.getElementById('test-profile');
            if (profileSelect) {
                profileSelect.value = historyItem.profile || '';
                this.endpointTester.onProfileChange(historyItem.profile);
            }

            // Set method
            this.endpointTester.setMethod(historyItem.method || 'GET');

            // Set endpoint
            const endpointInput = document.getElementById('endpoint-url');
            if (endpointInput) {
                endpointInput.value = historyItem.endpoint || '';
            }

            // Set headers
            this.populateKeyValuePairs('request-headers', historyItem.headers);

            // Set query parameters
            this.populateKeyValuePairs('query-params', historyItem.queryParameters);

            // Set body
            const requestBody = document.getElementById('request-body');
            if (requestBody && historyItem.body) {
                requestBody.value = historyItem.body;
            }

            // Set content type
            const contentType = document.getElementById('content-type');
            if (contentType && historyItem.contentType) {
                contentType.value = historyItem.contentType;
                this.handleContentTypeChange(historyItem.contentType);
            }

            showNotification('Request loaded from history', 'success');
            
        } catch (error) {
            console.error('Failed to load from history:', error);
            showNotification('Failed to load request from history', 'error');
        }
    }

    /**
     * Populate key-value pairs in a container
     */
    populateKeyValuePairs(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container || !data) return;

        // Clear existing pairs
        container.innerHTML = '';

        // Add pairs from data
        Object.entries(data).forEach(([key, value]) => {
            this.endpointTester.addKeyValuePair(containerId);
            
            const lastPair = container.lastElementChild;
            if (lastPair) {
                const inputs = lastPair.querySelectorAll('input');
                if (inputs.length >= 2) {
                    inputs[0].value = key;
                    inputs[1].value = value;
                }
            }
        });

        // Add one empty pair
        this.endpointTester.addKeyValuePair(containerId);
    }

    /**
     * Close all modals
     */
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
            modal.classList.remove('show');
        });
    }

    /**
     * Auto-format JSON in textarea
     */
    formatJsonInTextarea(textareaId) {
        const textarea = document.getElementById(textareaId);
        if (!textarea) return;

        const value = textarea.value.trim();
        if (!value) return;

        try {
            const parsed = JSON.parse(value);
            const formatted = JSON.stringify(parsed, null, 2);
            textarea.value = formatted;
            this.showJsonValidation(textarea, true, 'JSON formatted');
        } catch (error) {
            this.showJsonValidation(textarea, false, 'Cannot format invalid JSON');
        }
    }

    /**
     * Toggle section expansion
     */
    toggleSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;

        const isExpanded = section.classList.contains('expanded');
        section.classList.toggle('expanded');

        const content = section.querySelector('.collapsible-content');
        const icon = section.querySelector('.collapse-icon');

        if (content) {
            if (isExpanded) {
                content.style.maxHeight = '0px';
            } else {
                content.style.maxHeight = content.scrollHeight + 'px';
                setTimeout(() => {
                    if (section.classList.contains('expanded')) {
                        content.style.maxHeight = 'none';
                    }
                }, 300);
            }
        }

        if (icon) {
            icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
        }

        // Save state
        localStorage.setItem(`anyapi_${sectionId}_expanded`, (!isExpanded).toString());
    }
}

/**
 * Initialize endpoint UI
 */
export function initEndpointUI() {
    // Wait for endpointTester to be available
    const checkEndpointTester = () => {
        if (!window.endpointTester) {
            console.warn('⚠️ EndpointTester not available yet, retrying...');
            setTimeout(checkEndpointTester, 100);
            return;
        }
        
        console.log('🎨 Initializing Endpoint UI...');
        
        // Create UI instance
        const endpointUI = new EndpointUI(window.endpointTester);
        window.endpointUI = endpointUI;
        
        // Make format function globally available
        window.formatJsonBody = () => endpointUI.formatJsonInTextarea('request-body');
        window.toggleSection = (sectionId) => endpointUI.toggleSection(sectionId);
        
        console.log('✅ Endpoint UI initialized successfully');
    };
    
    checkEndpointTester();
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEndpointUI);
} else {
    initEndpointUI();
}

export default EndpointUI;