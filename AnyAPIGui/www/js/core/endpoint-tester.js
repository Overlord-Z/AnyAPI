/**
 * Core EndpointTester class - Business logic only, no DOM manipulation
 * Exported as ES6 module for use by UI components
 */
import { formatJson, escapeHtml, isValidJson, formatDuration } from './utils.js';
import { HistoryManager } from './history-manager.js';

class EndpointTester {
    constructor() {
        this.requestHistory = [];
        this.maxHistoryItems = 50;
        this.currentProfile = null;
        this.currentMethod = 'GET';
        this.historyManager = new HistoryManager(this.maxHistoryItems);
        
        // GitHub API specific patterns for validation
        this.githubPatterns = {
            repos: /^\/repos\/[^\/]+\/[^\/]+\/?.*$/,
            search: /^\/search\/(repositories|code|commits|issues|users)/,
            user: /^\/user\/?.*$/,
            users: /^\/users\/[^\/]+\/?.*$/,
            orgs: /^\/orgs\/[^\/]+\/?.*$/
        };
        
        this.init();
    }

    /**
     * Initialize endpoint tester
     */
    init() {
        this.loadRequestHistory();
    }

    /**
     * Load request history from localStorage
     */
    loadRequestHistory() {
        try {
            const stored = localStorage.getItem('anyapi_request_history');
            if (stored) {
                this.requestHistory = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to load request history:', error);
            this.requestHistory = [];
        }
    }

    /**
     * Save request history to localStorage
     */
    saveRequestHistory() {
        try {
            localStorage.setItem('anyapi_request_history', JSON.stringify(this.requestHistory.slice(-this.maxHistoryItems)));
        } catch (error) {
            console.warn('Failed to save request history:', error);
        }
    }

    /**
     * Add request to history
     */
    addToHistory(historyItem) {
        historyItem.id = Date.now().toString();
        this.requestHistory.unshift(historyItem);
        if (this.requestHistory.length > this.maxHistoryItems) {
            this.requestHistory = this.requestHistory.slice(0, this.maxHistoryItems);
        }
        this.saveRequestHistory();
    }

    /**
     * Clear all request history
     */
    clearHistory() {
        this.requestHistory = [];
        this.saveRequestHistory();
    }

    /**
     * Export history data
     */
    exportHistory() {
        return {
            version: '1.0',
            exported: new Date().toISOString(),
            history: this.requestHistory
        };
    }

    /**
     * Validate current request - returns boolean for UI compatibility
     */
    validateRequest() {
        const profile = document.getElementById('test-profile')?.value;
        const endpoint = document.getElementById('endpoint-url')?.value?.trim();
        
        if (!profile) {
            if (typeof showNotification !== 'undefined') {
                showNotification('Please select a profile', 'error');
            }
            return false;
        }
        
        if (!endpoint) {
            if (typeof showNotification !== 'undefined') {
                showNotification('Please enter an endpoint', 'error');
            }
            return false;
        }
        
        // Additional validation can be added here
        return true;
    }

    /**
     * Build request data object from form inputs
     */
    buildRequestData() {
        const endpointInput = document.getElementById('endpoint-url');
        const endpoint = endpointInput ? endpointInput.value.trim() : '';
        
        const data = {
            profileName: document.getElementById('test-profile')?.value || this.currentProfile,
            method: this.currentMethod,
            endpoint: endpoint,
            headers: this.collectKeyValuePairs('request-headers'),
            timestamp: new Date().toISOString()
        };

        // Add body for methods that support it
        if (['POST', 'PUT', 'PATCH'].includes(this.currentMethod)) {
            const requestBody = document.getElementById('request-body')?.value?.trim();
            const contentType = document.getElementById('content-type')?.value;
            if (requestBody) {
                data.body = requestBody;
                data.contentType = contentType;
            }
        }

        return data;
    }

    /**
     * Collect key-value pairs from a container
     */
    collectKeyValuePairs(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return {};
        
        const pairs = container.querySelectorAll('.key-value-pair');
        const result = {};
        
        pairs.forEach(pair => {
            const key = pair.querySelector('.key-input')?.value?.trim();
            const value = pair.querySelector('.value-input')?.value?.trim();
            if (key) result[key] = value || '';
        });
        
        return result;
    }

    /**
     * Send API request
     */
    async sendRequest() {
        if (!this.validateRequest()) return;
        
        const requestData = this.buildRequestData();
        
        try {
            this.showResponseLoading();
            const startTime = Date.now();
            
            // Use apiClient if available
            const response = window.apiClient 
                ? await window.apiClient.testEndpoint(requestData)
                : { success: false, error: 'API client not available' };
                
            const duration = Date.now() - startTime;
            
            // Create history item
            const historyItem = {
                profile: requestData.profileName,
                method: requestData.method,
                endpoint: requestData.endpoint,
                timestamp: new Date().toISOString(),
                duration,
                success: response.success,
                status: response.success ? 'Success' : 'Error'
            };

            if (!response.success && response.error) {
                historyItem.error = response.error;
            }

            this.addToHistory(historyItem);
            this.displayResponse(response, duration, requestData);

        } catch (error) {
            console.error('Request failed:', error);
            
            const historyItem = {
                profile: requestData.profileName,
                method: requestData.method,
                endpoint: requestData.endpoint,
                timestamp: new Date().toISOString(),
                duration: 0,
                success: false,
                status: 'Network Error',
                error: error.message
            };
            
            this.addToHistory(historyItem);
            this.displayError(error);
        }
    }

    /**
     * Show loading state in response viewer
     */
    showResponseLoading() {
        const responseViewer = document.getElementById('response-viewer');
        const responseMeta = document.getElementById('response-meta');
        
        if (responseViewer) {
            responseViewer.innerHTML = `
                <div class="loading-container" style="text-align: center; padding: 2rem;">
                    <div class="loading-spinner" style="margin: 0 auto 1rem;"></div>
                    <p>Sending request...</p>
                </div>
            `;
        }
        
        if (responseMeta) {
            responseMeta.innerHTML = '<span class="text-muted">Sending request...</span>';
        }
    }

    /**
     * Display API response
     */
    displayResponse(response, duration, requestData) {
        const responseMeta = document.getElementById('response-meta');
        if (responseMeta) {
            const status = response.success ? 'Success' : 'Error';
            const statusClass = response.success ? 'text-success' : 'text-danger';
            responseMeta.innerHTML = `
                <span class="${statusClass}">Status: ${status}</span>
                <span class="text-muted"> • Duration: ${formatDuration(duration)}</span>
            `;
        }

        const responseViewer = document.getElementById('response-viewer');
        if (responseViewer) {
            if (response.success && response.result) {
                responseViewer.innerHTML = `<pre>${formatJson(response.result)}</pre>`;
            } else if (response.error) {
                responseViewer.innerHTML = `
                    <div class="error-response">
                        <h4>Error Response</h4>
                        <pre>${escapeHtml(response.error)}</pre>
                    </div>
                `;
            } else {
                responseViewer.innerHTML = `
                    <div class="empty-response">
                        <div class="empty-icon">📡</div>
                        <p>No response data</p>
                    </div>
                `;
            }
        }
    }

    /**
     * Display error in response viewer
     */
    displayError(error) {
        const responseViewer = document.getElementById('response-viewer');
        const responseMeta = document.getElementById('response-meta');
        
        if (responseMeta) {
            responseMeta.innerHTML = '<span class="text-danger">Status: Network Error</span>';
        }
        
        if (responseViewer) {
            const errorData = {
                error: error.message,
                type: 'NetworkError',
                timestamp: new Date().toISOString()
            };
            responseViewer.innerHTML = `<pre>${formatJson(errorData)}</pre>`;
        }
    }

    /**
     * Clear request form
     */
    clearRequest() {
        const endpointInput = document.getElementById('endpoint-url');
        if (endpointInput) endpointInput.value = '';

        const requestBody = document.getElementById('request-body');
        if (requestBody) requestBody.value = '';

        // Reset method to GET
        const getMethod = document.querySelector('.method-btn[data-method="GET"]');
        if (getMethod) {
            document.querySelectorAll('.method-btn').forEach(btn => btn.classList.remove('active'));
            getMethod.classList.add('active');
            this.currentMethod = 'GET';
        }

        // Clear key-value pairs
        const containers = ['request-headers', 'query-params'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="key-value-pair">
                        <input class="key-input" placeholder="${containerId.includes('headers') ? 'Header' : 'Key'}">
                        <input class="value-input" placeholder="Value">
                    </div>
                `;
            }
        });
    }

    /**
     * Generate PowerShell code for current request
     */
    generateCode() {
        if (!this.validateRequest()) return;
        
        const requestData = this.buildRequestData();
        const code = this.generatePowerShellCode(requestData);
        
        const codeElement = document.getElementById('generated-code');
        const modal = document.getElementById('code-modal');
        
        if (codeElement) codeElement.textContent = code;
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
        }
    }

    /**
     * Generate PowerShell code string
     */
    generatePowerShellCode(requestData) {
        let code = '# Generated PowerShell code for AnyAPI\n\n';
        code += `Invoke-AnyApiEndpoint -ProfileName "${requestData.profileName}" \\\n`;
        code += `    -Endpoint "${requestData.endpoint}" \\\n`;
        code += `    -Method "${requestData.method}"`;

        if (requestData.headers && Object.keys(requestData.headers).length > 0) {
            code += ' \\\n    -Headers @{\n';
            Object.entries(requestData.headers).forEach(([key, value]) => {
                code += `        "${key}" = "${value}"\n`;
            });
            code += '    }';
        }

        if (requestData.body) {
            if (requestData.contentType === 'application/json') {
                try {
                    const parsed = JSON.parse(requestData.body);
                    const formatted = JSON.stringify(parsed, null, 4);
                    code += ' \\\n    -Body @\'\n' + formatted + '\n\'@';
                } catch {
                    code += ` \\\n    -Body '${requestData.body.replace(/'/g, "''")}'`;
                }
            } else {
                code += ` \\\n    -Body '${requestData.body.replace(/'/g, "''")}'`;
            }
        }

        return code;
    }

    /**
     * Update history display
     */
    updateHistoryDisplay() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        if (this.requestHistory.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📚</div>
                    <h3>No requests yet</h3>
                    <p>Your API request history will appear here</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = this.requestHistory.map((item, index) => {
            const statusIcon = item.success ? '✅' : '❌';
            const statusClass = item.success ? 'history-status-success' : 'history-status-error';
            
            return `
                <div class="history-item" data-index="${index}">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <span class="history-method ${item.method}">${item.method}</span>
                            <span class="history-url">${escapeHtml(item.endpoint)}</span>
                        </div>
                        <div class="history-meta">${new Date(item.timestamp).toLocaleString()}</div>
                    </div>
                    <div class="history-meta">
                        Profile: ${escapeHtml(item.profile)} • 
                        Status: <span class="${statusClass}">${statusIcon} ${item.status}</span> • 
                        ${item.duration ? formatDuration(item.duration) : 'N/A'}
                        ${item.error ? ` • Error: ${escapeHtml(item.error)}` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Update profile context when profile changes
     */
    updateProfileContext() {
        // Update base URL preview if element exists
        const baseUrlPreview = document.getElementById('base-url-preview');
        if (baseUrlPreview && this.currentProfile) {
            const profile = window.profileManager?.getProfile(this.currentProfile);
            if (profile) {
                baseUrlPreview.textContent = profile.baseUrl || 'No base URL';
            }
        }
    }

    /**
     * Add a new key-value pair to the specified container
     */
    addKeyValuePair(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const keyValuePair = document.createElement('div');
        keyValuePair.className = 'key-value-pair';
        
        const placeholder = containerId.includes('headers') ? 'Header' : 'Key';
        keyValuePair.innerHTML = `
            <input class="key-input" placeholder="${placeholder}" type="text">
            <input class="value-input" placeholder="Value" type="text">
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()">
                <i data-feather="x"></i>
            </button>
        `;
        
        container.appendChild(keyValuePair);
        
        // Refresh feather icons if available
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    /**
     * Save current request to history without sending
     */
    saveRequest() {
        if (!this.validateRequest()) return;
        
        const requestData = this.buildRequestData();
        const historyItem = {
            profile: requestData.profileName,
            method: requestData.method,
            endpoint: requestData.endpoint,
            headers: requestData.headers,
            body: requestData.body,
            timestamp: new Date().toISOString(),
            duration: 0,
            success: null,
            status: 'Saved'
        };
        
        this.addToHistory(historyItem);
          if (typeof showNotification !== 'undefined') {
            showNotification('Request saved to history', 'success');
        }
    }

    /**
     * Clear request history
     */
    clearHistory() {
        if (confirm('Are you sure you want to clear all request history? This action cannot be undone.')) {
            this.requestHistory = [];
            localStorage.removeItem('anyapi_request_history');
            this.historyManager.updateHistoryDisplay();
            
            if (typeof showNotification !== 'undefined') {
                showNotification('Request history cleared', 'success');
            }
        }
    }

    /**
     * Export request history
     */
    exportHistory() {
        if (this.requestHistory.length === 0) {
            if (typeof showNotification !== 'undefined') {
                showNotification('No history to export', 'warning');
            }
            return;
        }

        const data = {
            exported: new Date().toISOString(),
            version: '1.0',
            history: this.requestHistory
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

    /**
     * Import request history
     */
    importHistory() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                if (data.history && Array.isArray(data.history)) {
                    // Merge with existing history
                    const merged = [...data.history, ...this.requestHistory];
                    this.requestHistory = merged.slice(0, this.maxHistoryItems);
                    
                    localStorage.setItem('anyapi_request_history', JSON.stringify(this.requestHistory));
                    this.historyManager.updateHistoryDisplay();
                    
                    if (typeof showNotification !== 'undefined') {
                        showNotification(`Imported ${data.history.length} history items`, 'success');
                    }
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
}

export default EndpointTester;
