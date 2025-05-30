// Request history management module
// Available globally

class HistoryManager {    constructor(maxItems = 50) {
        this.maxItems = maxItems;
        this.history = this.load();
        this.filteredHistory = null; // Track filtered results
        
        // Set up synchronization with EndpointTester
        this.setupSynchronization();
    }

    /**
     * Setup synchronization with EndpointTester's history system
     */
    setupSynchronization() {
        // Wait for EndpointTester to be available and set up real-time sync
        const checkForEndpointTester = () => {
            if (typeof window.endpointTester !== 'undefined') {
                this.syncWithEndpointTester();
                // Set up periodic sync to catch any changes
                setInterval(() => this.syncWithEndpointTester(), 1000);
            } else {
                // Check again in 100ms
                setTimeout(checkForEndpointTester, 100);
            }
        };
        
        checkForEndpointTester();
    }

    /**
     * Synchronize history with EndpointTester's requestHistory
     */
    syncWithEndpointTester() {
        try {
            if (window.endpointTester && window.endpointTester.requestHistory) {
                const endpointHistory = window.endpointTester.requestHistory;
                
                // Only sync if the endpoint tester has more recent data
                if (endpointHistory.length > 0) {
                    // Check if we need to update (compare lengths and latest timestamps)
                    const needsUpdate = this.history.length !== endpointHistory.length ||
                        (endpointHistory[0] && this.history[0] && 
                         endpointHistory[0].timestamp !== this.history[0].timestamp);
                    
                    if (needsUpdate) {
                        this.history = [...endpointHistory];
                        this.filteredHistory = null;
                        
                        // Update display if we're on the history section
                        if (this.isHistorySectionActive()) {
                            this.render();
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error syncing with EndpointTester:', error);
        }
    }

    add(item) {
        // Ensure item has required properties
        item.id = item.id || Date.now().toString();
        item.timestamp = item.timestamp || new Date().toISOString();
        
        this.history.unshift(item);
        if (this.history.length > this.maxItems) {
            this.history = this.history.slice(0, this.maxItems);
        }
        this.save();
        
        // Refresh display if we're on the history section
        if (this.isHistorySectionActive()) {
            this.render();
        }
    }

    load() {
        try {
            const stored = localStorage.getItem('anyapi_request_history');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    save() {
        localStorage.setItem('anyapi_request_history', JSON.stringify(this.history));
    }

    clear() {
        if (confirm('Are you sure you want to clear all request history? This action cannot be undone.')) {
            this.history = [];
            this.filteredHistory = null;
            this.save();
            this.render();
            
            if (typeof showNotification !== 'undefined') {
                showNotification('Request history cleared', 'success');
            }
        }
    }

    export() {
        if (this.history.length === 0) {
            if (typeof showNotification !== 'undefined') {
                showNotification('No history to export', 'warning');
            }
            return;
        }

        const data = {
            exported: new Date().toISOString(),
            version: '1.0',
            history: this.history
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `anyapi-history-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        if (typeof showNotification !== 'undefined') {
            showNotification('History exported successfully', 'success');
        }
    }

    import(data) {
        if (data && data.history && Array.isArray(data.history)) {
            const imported = data.history.length;
            this.history = [...data.history, ...this.history].slice(0, this.maxItems);
            this.save();
            this.render();
            
            if (typeof showNotification !== 'undefined') {
                showNotification(`Imported ${imported} history items`, 'success');
            }
            return true;
        }
        return false;
    }

    /**
     * Import history from file picker
     */
    importFromFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                if (this.import(data)) {
                    // Success handled in import method
                } else {
                    if (typeof showNotification !== 'undefined') {
                        showNotification('Invalid history file format', 'error');
                    }
                }
            } catch (error) {
                console.error('Failed to import history:', error);
                if (typeof showNotification !== 'undefined') {
                    showNotification('Failed to import history file', 'error');
                }
            }
        };
        
        input.click();
    }

    /**
     * Filter history by search term
     */
    filterHistory(searchTerm = '') {
        const historyItems = document.querySelectorAll('.history-item');
        const term = searchTerm.toLowerCase();
        
        historyItems.forEach(item => {
            if (!term) {
                // Show all items if no search term
                item.style.display = 'block';
                item.classList.remove('filtered-out');
            } else {
                const text = item.textContent.toLowerCase();
                if (text.includes(term)) {
                    item.style.display = 'block';
                    item.classList.remove('filtered-out');
                } else {
                    item.style.display = 'none';
                    item.classList.add('filtered-out');
                }
            }
        });
        
        this.updateFilterStatus(searchTerm);
    }

    /**
     * Filter by current profile selector
     */
    filterByCurrentProfile() {
        const select = document.getElementById('global-profile-selector');
        const profileName = select ? select.value : '';
        
        if (!profileName) {
            this.render(); // Show all
            return;
        }
        
        const filtered = this.history.filter(item => 
            item.profile === profileName || item.profileName === profileName
        );
        this.render(filtered);
    }

    /**
     * Main render method - displays history items
     */
    render(itemsToRender = null) {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        const items = itemsToRender || this.history;

        if (items.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i data-feather="clock"></i>
                    </div>
                    <h3>No History Yet</h3>
                    <p>Your API requests will appear here after you send them.</p>
                </div>
            `;
            
            // Refresh feather icons for the new icon
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            return;
        }

        // Add dynamic styles if not present
        this.addHistoryStyles();

        historyList.innerHTML = items.map((item, index) => {
            const isGitHubError = item.status?.includes('GitHub') || 
                                  item.status?.includes('404') || 
                                  item.status?.includes('401') || 
                                  item.status?.includes('403');
            
            const statusIcon = item.success ? '✅' : (isGitHubError ? '🐙' : '❌');
            const statusClass = item.success ? 'history-status-success' : 'history-status-error';
            
            let suggestionHtml = '';
            if (item.suggestions && item.suggestions.length > 0) {
                suggestionHtml = `
                    <div class="history-suggestion">
                        💡 ${item.suggestions[0]}
                    </div>
                `;
            }

            const actualIndex = this.history.indexOf(item);
            
            return `
                <div class="history-item" onclick="window.historyManager.loadFromHistory(${actualIndex})" data-index="${actualIndex}">
                    <div class="history-header">
                        <div class="history-main">
                            <span class="history-method ${item.method || 'GET'}">${item.method || 'GET'}</span>
                            <span class="history-url">${this.escapeHtml(item.endpoint || '')}</span>
                        </div>
                        <div class="history-meta">
                            ${new Date(item.timestamp).toLocaleString()}
                        </div>
                    </div>
                    <div class="history-details">
                        Profile: ${this.escapeHtml(item.profile || item.profileName || 'Unknown')} • 
                        Status: <span class="${statusClass}">${statusIcon} ${item.status || 'Unknown'}</span> • 
                        ${item.duration ? this.formatDuration(item.duration) : 'N/A'}
                        ${item.error ? ` • Error: ${this.escapeHtml(item.error)}` : ''}
                    </div>
                    ${suggestionHtml}
                </div>
            `;
        }).join('');
    }

    /**
     * Load request from history into the tester
     */
    loadFromHistory(index) {
        const historyItem = this.history[index];
        if (!historyItem) {
            console.warn('History item not found at index:', index);
            return;
        }

        try {
            // Switch to tester section first
            if (typeof app !== 'undefined' && app.showSection) {
                app.showSection('tester');
            }

            // Set the global profile selector and trigger profile change
            const profileName = historyItem.profile || historyItem.profileName || '';
            const globalProfileSelector = document.getElementById('global-profile-selector');
            if (globalProfileSelector && profileName) {
                globalProfileSelector.value = profileName;
                if (window.profileManager && typeof window.profileManager.handleSharedProfileChange === 'function') {
                    window.profileManager.handleSharedProfileChange(profileName, 'history');
                }
            }

            // Wait a moment for section/profile to update, then populate the form
            setTimeout(() => {
                this.populateTestForm(historyItem);
            }, 200);

        } catch (error) {
            console.error('Failed to load from history:', error);
            if (typeof showNotification !== 'undefined') {
                showNotification('Failed to load request from history', 'error');
            }
        }
    }

    /**
     * Populate the test form with history data
     */
    populateTestForm(historyItem) {
        try {
            // Set profile
            const profileSelect = document.getElementById('test-profile');
            if (profileSelect) {
                profileSelect.value = historyItem.profile || historyItem.profileName || '';
                
                // Trigger profile change if available
                if (typeof endpointTester !== 'undefined' && endpointTester.onProfileChange) {
                    endpointTester.onProfileChange(historyItem.profile || historyItem.profileName);
                }
            }

            // Set endpoint
            const endpointInput = document.getElementById('endpoint-url');
            if (endpointInput) {
                endpointInput.value = historyItem.endpoint || '';
                
                // Trigger validation if available
                if (typeof endpointTester !== 'undefined' && endpointTester.validateEndpoint) {
                    endpointTester.validateEndpoint();
                }
            }

            // Set method
            const method = historyItem.method || 'GET';
            const methodBtn = document.querySelector(`.method-btn[data-method="${method}"]`);
            if (methodBtn) {
                document.querySelectorAll('.method-btn').forEach(btn => btn.classList.remove('active'));
                methodBtn.classList.add('active');
                
                if (typeof endpointTester !== 'undefined') {
                    endpointTester.currentMethod = method;
                }
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
            }

            if (typeof showNotification !== 'undefined') {
                showNotification('Request loaded from history', 'success');
            }

        } catch (error) {
            console.error('Error populating test form:', error);
            if (typeof showNotification !== 'undefined') {
                showNotification('Error loading request details', 'error');
            }
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
            if (key && value) {
                this.addKeyValuePair(container, key, value);
            }
        });

        // Add one empty pair for new entries
        this.addKeyValuePair(container, '', '');
    }

    /**
     * Add a key-value pair to a container
     */
    addKeyValuePair(container, key = '', value = '') {
        const pair = document.createElement('div');
        pair.className = 'key-value-pair';
        
        const keyPlaceholder = container.id.includes('header') ? 'Header Name' : 'Parameter Name';
        const valuePlaceholder = container.id.includes('header') ? 'Header Value' : 'Parameter Value';
        
        pair.innerHTML = `
            <input type="text" class="form-control" placeholder="${keyPlaceholder}" value="${this.escapeHtml(key)}">
            <input type="text" class="form-control" placeholder="${valuePlaceholder}" value="${this.escapeHtml(value)}">
            <button class="btn btn-sm btn-danger" onclick="this.closest('.key-value-pair').remove()" type="button">×</button>
        `;
        
        container.appendChild(pair);
    }

    /**
     * Check if history section is currently active
     */
    isHistorySectionActive() {
        const historySection = document.getElementById('history-section');
        return historySection && historySection.classList.contains('active');
    }

    /**
     * Update filter status display
     */
    updateFilterStatus(searchTerm) {
        if (!searchTerm) return;
        
        const visibleItems = document.querySelectorAll('.history-item:not(.filtered-out)').length;
        const totalItems = document.querySelectorAll('.history-item').length;
        
        // You can implement status display here if needed
        console.log(`Showing ${visibleItems} of ${totalItems} history items`);
    }

    /**
     * Add necessary styles for history display
     */
    addHistoryStyles() {
        if (document.getElementById('history-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'history-styles';
        style.textContent = `
            .history-item {
                cursor: pointer;
                transition: all 0.2s ease;
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 8px;
                background: var(--bg-primary, #fff);
                border: 1px solid var(--border-color, #e1e5e9);
            }
            
            .history-item:hover {
                background: var(--bg-hover, #f8f9fa);
                border-color: var(--color-primary, #007bff);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .history-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 6px;
            }
            
            .history-main {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
            }
            
            .history-url {
                font-family: var(--font-mono, 'SF Mono', Consolas, monospace);
                color: var(--text-primary, #333);
                word-break: break-all;
            }
            
            .history-details {
                color: var(--text-muted, #6c757d);
                font-size: 0.875rem;
                line-height: 1.4;
            }
            
            .history-meta {
                color: var(--text-muted, #6c757d);
                font-size: 0.875rem;
                white-space: nowrap;
            }
            
            .history-suggestion {
                margin-top: 6px;
                font-size: 0.75rem;
                color: var(--color-warning, #856404);
                background: var(--bg-warning-light, #fff3cd);
                padding: 4px 8px;
                border-radius: 4px;
                border-left: 3px solid var(--color-warning, #ffc107);
            }
            
            .history-status-success { 
                color: var(--color-success, #28a745); 
            }
            
            .history-status-error { 
                color: var(--color-danger, #dc3545); 
            }
            
            .filtered-out {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Utility: Escape HTML
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return String(text || '');
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Utility: Format duration
     */
    formatDuration(ms) {
        if (!ms || ms < 0) return 'N/A';
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    }
}

// Make HistoryManager globally available
window.HistoryManager = HistoryManager;
