/**
 * Core EndpointTester class - Business logic only, no DOM manipulation
 * Available globally for use by UI components
 */

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
        console.log('🚀 Initializing EndpointTester...');
        
        this.loadRequestHistory();
        
        // Listen for profile changes from other components
        window.addEventListener('profileChanged', (e) => {
            if (e.detail?.source !== 'endpointTester') {
                this.onProfileChange(e.detail?.profileName);
            }
        });
        
        // Restore saved profile
        const savedProfile = localStorage.getItem('anyapi_current_profile');
        if (savedProfile) {
            this.currentProfile = savedProfile;
            this.updateProfileContext();
        }
        
        // Initial validation
        setTimeout(() => {
            this.validateEndpoint();
        }, 100);
        
        // Setup body section visibility
        this.setupBodySection();
        
        console.log('✅ EndpointTester initialized');
    }

    /**
     * Load request history from localStorage
     */
    loadRequestHistory() {
        try {
            const stored = localStorage.getItem('anyapi_request_history');
            if (stored) {
                this.requestHistory = JSON.parse(stored);
                console.log(`📚 Loaded ${this.requestHistory.length} history items`);
            }
        } catch (error) {
            console.error('Failed to load request history:', error);
            this.requestHistory = [];
        }
    }

    /**
     * Save request history to localStorage
     */
    saveRequestHistory() {
        try {
            localStorage.setItem('anyapi_request_history', JSON.stringify(this.requestHistory));
        } catch (error) {
            console.error('Failed to save request history:', error);
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
     * Validate endpoint and provide feedback
     */
    validateEndpoint() {
        const endpointInput = document.getElementById('endpoint-url');
        const feedbackElement = document.getElementById('endpoint-validation-feedback');
        // Use global profile selector
        const profileSelect = document.getElementById('global-profile-selector');
        
        if (!endpointInput || !feedbackElement) return;
        
        const endpoint = endpointInput.value.trim();
        const profileName = profileSelect?.value;
        
        if (!endpoint) {
            feedbackElement.style.display = 'none';
            return;
        }
        
        // Check if this looks like a GitHub API profile
        const profile = window.profileManager?.getProfile(profileName);
        const isGitHubAPI = profile && 
            (profile.baseUrl?.includes('api.github.com') || 
             profile.baseUrl?.includes('github.com/api'));
        
        if (isGitHubAPI) {
            const validation = this.validateGitHubEndpoint(endpoint);
            this.showValidationFeedback(feedbackElement, validation);
        } else {
            feedbackElement.style.display = 'none';
        }
    }

    /**
     * Validate GitHub-specific endpoint patterns
     */
    validateGitHubEndpoint(endpoint) {
        const validation = {
            isValid: false,
            level: 'error',
            message: '',
            suggestions: []
        };
        
        // Remove leading slash for consistency
        const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
        
        // Check for common GitHub patterns
        if (this.githubPatterns.repos.test(normalizedEndpoint)) {
            validation.isValid = true;
            validation.level = 'success';
            validation.message = 'Valid GitHub repository endpoint';
        } else if (this.githubPatterns.search.test(normalizedEndpoint)) {
            validation.isValid = true;
            validation.level = 'success';
            validation.message = 'Valid GitHub search endpoint';
        } else if (this.githubPatterns.user.test(normalizedEndpoint)) {
            validation.isValid = true;
            validation.level = 'success';
            validation.message = 'Valid GitHub user endpoint';
        } else if (this.githubPatterns.users.test(normalizedEndpoint)) {
            validation.isValid = true;
            validation.level = 'success';
            validation.message = 'Valid GitHub users endpoint';
        } else if (this.githubPatterns.orgs.test(normalizedEndpoint)) {
            validation.isValid = true;
            validation.level = 'success';
            validation.message = 'Valid GitHub organization endpoint';
        } else {
            validation.level = 'warning';
            validation.message = 'Endpoint pattern not recognized for GitHub API';
            validation.suggestions = [
                'Try: /repos/owner/repo',
                'Try: /user',
                'Try: /users/username',
                'Try: /search/repositories?q=query'
            ];
        }
        
        return validation;
    }

    /**
     * Show validation feedback to user
     */
    showValidationFeedback(feedbackElement, validation) {
        if (!feedbackElement) return;
        
        // Add CSS if not already present
        if (!document.getElementById('endpoint-feedback-styles')) {
            const style = document.createElement('style');
            style.id = 'endpoint-feedback-styles';
            style.textContent = `
                .endpoint-feedback-success { color: #16a34a; background: rgba(34, 197, 94, 0.1); border-color: #16a34a; }
                .endpoint-feedback-warning { color: #f97316; background: rgba(249, 115, 22, 0.1); border-color: #f97316; }
                .endpoint-feedback-error { color: #dc2626; background: rgba(239, 68, 68, 0.1); border-color: #dc2626; }
            `;
            document.head.appendChild(style);
        }

        // Clear previous classes
        feedbackElement.className = `endpoint-feedback-${validation.level}`;
        feedbackElement.style.cssText = `
            margin-top: 0.5rem;
            padding: 0.75rem;
            border: 1px solid;
            border-radius: 4px;
            font-size: 0.875rem;
            display: block;
        `;

        let content = `<div>${validation.message}</div>`;
        
        if (validation.suggestions && validation.suggestions.length > 0) {
            content += '<div style="margin-top: 0.5rem;"><strong>Suggestions:</strong>';
            content += '<ul style="margin: 0.25rem 0 0 1rem;">';
            validation.suggestions.forEach(suggestion => {
                content += `<li>${suggestion}</li>`;
            });
            content += '</ul></div>';
        }
        
        feedbackElement.innerHTML = content;
    }

    /**
     * Validate current request - returns boolean for UI compatibility
     */
    validateRequest() {
        // Use global profile selector
        const profile = document.getElementById('global-profile-selector')?.value;
        const endpoint = document.getElementById('endpoint-url')?.value?.trim();
        
        if (!profile) {
            if (typeof showNotification !== 'undefined') {
                showNotification('Please select a profile first', 'error');
            }
            return false;
        }
        
        if (!endpoint) {
            if (typeof showNotification !== 'undefined') {
                showNotification('Please enter an endpoint', 'error');
            }
            return false;
        }
        
        return true;
    }

    /**
     * Build request data object from form inputs
     */
    buildRequestData() {
        const endpointInput = document.getElementById('endpoint-url');
        const endpoint = endpointInput ? endpointInput.value.trim() : '';
        
        const data = {
            // Use global profile selector
            profileName: document.getElementById('global-profile-selector')?.value || this.currentProfile,
            method: this.currentMethod,
            endpoint: endpoint,
            queryParameters: this.collectKeyValuePairs('query-params'),
            headers: this.collectKeyValuePairs('request-headers'),
            timestamp: new Date().toISOString()
        };

        // Add body for methods that support it
        if (['POST', 'PUT', 'PATCH'].includes(this.currentMethod)) {
            const requestBody = document.getElementById('request-body');
            const contentType = document.getElementById('content-type');
            
            if (requestBody?.value?.trim()) {
                data.body = requestBody.value.trim();
            }
            
            if (contentType?.value) {
                data.contentType = contentType.value;
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
        
        const pairs = container.querySelectorAll('.key-value-pair, .key-value-pair-compact');
        const result = {};
        
        pairs.forEach(pair => {
            const inputs = pair.querySelectorAll('input');
            if (inputs.length >= 2) {
                const key = inputs[0].value.trim();
                const value = inputs[1].value.trim();
                if (key && value) {
                    result[key] = value;
                }
            }
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
            
            // ✅ FIXED: Direct API client readiness check
            console.log('🔍 Checking API client readiness...');
            
            // Check if global API client exists and is connected
            if (!window.apiClient) {
                throw new Error('API Client is not initialized. Please refresh the page and try again.');
            }
            
            // Check connection status
            if (!window.apiClient.isConnected) {
                console.log('⏳ API client not connected, attempting connection check...');
                const isConnected = await window.apiClient.checkConnection();
                if (!isConnected) {
                    throw new Error('Cannot connect to AnyAPI backend server. Please ensure the PowerShell server is running on the correct port.');
                }
            }
            
            console.log('✅ API Client is ready, making request...');
            
            // Make the request using the API client
            const response = await window.apiClient.makeRequest(requestData);
            
            const duration = Date.now() - startTime;
            
            console.log('📊 Response received:', response);
            
            // Display response
            this.displayResponse(response, duration, requestData);
            
            // Add to history
            const historyItem = {
                ...requestData,
                duration,
                success: response.success,
                status: response.status || (response.success ? 'Success' : 'Error'),
                responseSize: response.result ? JSON.stringify(response.result).length : 0
            };
            
            this.addToHistory(historyItem);
            
        } catch (error) {
            console.error('❌ Request failed:', error);
            this.displayError(error);
            
            // Add failed request to history
            const historyItem = {
                ...requestData,
                duration: 0,
                success: false,
                status: 'Error',
                error: error.message
            };
            
            this.addToHistory(historyItem);
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
                <div class="empty-state">
                    <div class="loading-spinner"></div>
                    <h3>Sending Request...</h3>
                    <p>Please wait while we process your request</p>
                </div>
            `;
        }
        
        if (responseMeta) {
            responseMeta.innerHTML = `
                <span class="status-badge status-loading">
                    <i data-feather="loader"></i>
                    Sending...
                </span>
            `;
        }
    }

    /**
     * Display API response using enhanced response viewer
     */
    displayResponse(response, duration, requestData) {
        const responseMeta = document.getElementById('response-meta');
        if (responseMeta) {
            const statusClass = response.success ? 'status-success' : 'status-error';
            responseMeta.innerHTML = `
                <span class="status-badge ${statusClass}">
                    <i data-feather="${response.success ? 'check-circle' : 'x-circle'}"></i>
                    ${response.status || (response.success ? 'Success' : 'Error')}
                </span>
                <span class="response-time">${duration}ms</span>
            `;
        }

        if (window.responseViewer && response.success && response.result) {
            window.responseViewer.displayResponse(response.result);
        } else {
            const responseViewer = document.getElementById('response-viewer');
            if (responseViewer) {
                responseViewer.innerHTML = `
                    <div class="response-content">
                        <pre>${JSON.stringify(response, null, 2)}</pre>
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
            responseMeta.innerHTML = `
                <span class="status-badge status-error">
                    <i data-feather="x-circle"></i>
                    Error
                </span>
            `;
        }
        
        if (responseViewer) {
            responseViewer.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">
                        <i data-feather="alert-triangle"></i>
                    </div>
                    <h3>Request Failed</h3>
                    <p>${error.message || 'An unknown error occurred'}</p>
                    <pre class="error-details">${error.stack || error.toString()}</pre>
                </div>
            `;
        }
    }

    /**
     * Setup body section visibility based on HTTP method
     */
    setupBodySection() {
        console.log('🔄 Setting up body section visibility handler...');
        
        // Listen for method changes
        window.addEventListener('methodChanged', (e) => {
            console.log('🔄 Method changed event received:', e.detail.method);
            this.updateBodySectionVisibility();
        });
        
        // Initial setup
        this.updateBodySectionVisibility();
    }

    /**
     * Update body section visibility based on current method
     */
    updateBodySectionVisibility() {
        const bodySection = document.getElementById('body-section');
        if (!bodySection) {
            console.warn('⚠️ Body section not found');
            return;
        }
        
        const methodsWithBody = ['POST', 'PUT', 'PATCH'];
        const shouldShow = methodsWithBody.includes(this.currentMethod);
        
        console.log(`🔄 Updating body section visibility: ${shouldShow ? 'show' : 'hide'} for method ${this.currentMethod}`);
        
        if (shouldShow) {
            bodySection.style.display = 'block';
            // Auto-expand if it exists and is collapsed
            if (!bodySection.classList.contains('expanded')) {
                bodySection.classList.add('expanded');
                const content = bodySection.querySelector('.collapsible-content');
                const icon = bodySection.querySelector('.collapse-icon');
                
                if (content) {
                    content.style.maxHeight = content.scrollHeight + 'px';
                }
                if (icon) {
                    icon.style.transform = 'rotate(180deg)';
                }
            }
        } else {
            bodySection.style.display = 'none';
        }
    }

    /**
     * Set HTTP method and update UI/body section
     */
    setMethod(method) {
        console.log('🔄 EndpointTester.setMethod called with:', method);
        this.currentMethod = method;
        
        // Update method button states
        document.querySelectorAll('.method-btn, .method-btn-compact').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.method === method || btn.textContent.trim() === method) {
                btn.classList.add('active');
            }
        });
        
        // Update body section visibility
        this.updateBodySectionVisibility();
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('methodChanged', {
            detail: { method: this.currentMethod }
        }));
    }

    /**
     * Add key-value pair to a container
     */
    addKeyValuePair(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }
        
        console.log(`Adding key-value pair to: ${containerId}`);
        const pair = document.createElement('div');
        pair.className = 'key-value-pair-compact';
        
        let keyPlaceholder = 'Name';
        let valuePlaceholder = 'Value';
        
        if (containerId === 'query-params') {
            keyPlaceholder = 'Parameter Name';
            valuePlaceholder = 'Parameter Value';
        } else if (containerId === 'request-headers') {
            keyPlaceholder = 'Header Name';
            valuePlaceholder = 'Header Value';
        }
        
        pair.innerHTML = `
            <input type="text" class="kv-input-compact" placeholder="${keyPlaceholder}" autocomplete="off">
            <input type="text" class="kv-input-compact" placeholder="${valuePlaceholder}" autocomplete="off">
            <button class="kv-remove-btn" onclick="this.closest('.key-value-pair-compact').remove()" type="button" title="Remove this ${containerId === 'request-headers' ? 'header' : 'parameter'}">×</button>
        `;
        
        container.appendChild(pair);
        console.log(`Appended new pair to ${containerId}. Current children: ${container.children.length}`);
        
        // Auto-expand the section
        const sectionId = container.closest('.collapsible-section')?.id;
        if (sectionId) {
            this.autoExpandSection(sectionId);
        }
        
        // Focus the first input
        const firstInput = pair.querySelector('input');
        if (firstInput) {
            firstInput.focus();
        }
    }

    /**
     * Auto-expand a collapsible section
     */
    autoExpandSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;

        const content = section.querySelector('.collapsible-content');
        if (!content) return;

        const icon = section.querySelector('.collapse-icon');

        if (!section.classList.contains('expanded')) {
            section.classList.add('expanded');
            content.style.maxHeight = content.scrollHeight + 'px';
            if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
            // Refresh height if already expanded
            content.style.maxHeight = content.scrollHeight + 'px';
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
        this.setMethod('GET');

        // Clear key-value pairs
        const containers = ['request-headers', 'query-params'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '';
                this.addKeyValuePair(containerId); // Add one empty pair
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
        if (modal) modal.style.display = 'flex';
    }

    /**
     * Generate PowerShell code string
     */
    generatePowerShellCode(requestData) {
        let code = '# Generated PowerShell code for AnyAPI\n\n';
        code += `Invoke-AnyApiEndpoint -ProfileName "${requestData.profileName}" \\\n`;
        code += `    -Endpoint "${requestData.endpoint}" \\\n`;
        code += `    -Method "${requestData.method}"`;

        // Add query parameters
        if (requestData.queryParameters && Object.keys(requestData.queryParameters).length > 0) {
            const params = Object.entries(requestData.queryParameters)
                .map(([key, value]) => `"${key}"="${value}"`)
                .join(',');
            code += ` \\\n    -QueryParameters @{${params}}`;
        }

        // Add headers
        if (requestData.headers && Object.keys(requestData.headers).length > 0) {
            const headers = Object.entries(requestData.headers)
                .map(([key, value]) => `"${key}"="${value}"`)
                .join(',');
            code += ` \\\n    -Headers @{${headers}}`;
        }

        // Add body
        if (requestData.body) {
            code += ` \\\n    -Body '${requestData.body.replace(/'/g, "''")}'`;
        }

        return code;
    }

    /**
     * Update profile context when profile changes
     */
    updateProfileContext() {
        console.log('🔄 Updating profile context for:', this.currentProfile);
        
        // Update base URL preview if element exists
        const baseUrlPreview = document.getElementById('base-url-preview');
        const compactPreview = document.querySelector('.base-url-preview-compact');
        // Use global profile selector
        const profileSelect = document.getElementById('global-profile-selector');
        let profileName = this.currentProfile;
        if (profileSelect && profileSelect.value) {
            profileName = profileSelect.value;
        }
        
        if (profileName) {
            const profile = window.profileManager?.getProfile(profileName);
            const baseUrl = profile?.baseUrl || 'No URL';
            
            if (baseUrlPreview) {
                baseUrlPreview.textContent = baseUrl;
            }
            if (compactPreview) {
                compactPreview.textContent = baseUrl;
                compactPreview.classList.remove('empty');
            }
        } else {
            const placeholder = 'Select a profile...';
            if (baseUrlPreview) {
                baseUrlPreview.textContent = placeholder;
            }
            if (compactPreview) {
                compactPreview.textContent = placeholder;
                compactPreview.classList.add('empty');
            }
        }
    }

    /**
     * Handle profile selection change
     */
    onProfileChange(profileName) {
        console.log('🔄 Profile changed to:', profileName);
        
        this.currentProfile = profileName;
        this.updateProfileContext();
        
        // Save to localStorage for persistence
        if (profileName) {
            localStorage.setItem('anyapi_current_profile', profileName);
        } else {
            localStorage.removeItem('anyapi_current_profile');
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
                    this.requestHistory = [...data.history, ...this.requestHistory];
                    if (this.requestHistory.length > this.maxHistoryItems) {
                        this.requestHistory = this.requestHistory.slice(0, this.maxHistoryItems);
                    }
                    this.saveRequestHistory();
                    
                    if (typeof showNotification !== 'undefined') {
                        showNotification(`Imported ${data.history.length} history items`, 'success');
                    }
                } else {
                    throw new Error('Invalid history file format');
                }
            } catch (error) {
                console.error('Import failed:', error);
                if (typeof showNotification !== 'undefined') {
                    showNotification('Failed to import history', 'error');
                }
            }
        };
        
        input.click();
    }
}

// Make EndpointTester available globally
window.EndpointTester = EndpointTester;

// Initialize function for app.js
window.initializeEndpointTester = function() {
    console.log('🚀 Initializing EndpointTester...');
    
    if (!window.endpointTester) {
        window.endpointTester = new EndpointTester();
        console.log('✅ EndpointTester created and available globally');
    } else {
        console.log('✅ EndpointTester already initialized');
    }
    
    return window.endpointTester;
};

// Make functions globally available for onclick handlers
window.addQueryParam = function() {
    console.log('🔄 Global addQueryParam called');
    if (window.endpointTester && window.endpointTester.addKeyValuePair) {
        window.endpointTester.addKeyValuePair('query-params');
    } else {
        console.error('EndpointTester not available for addQueryParam');
    }
};

window.addHeader = function() {
    console.log('🔄 Global addHeader called');
    if (window.endpointTester && window.endpointTester.addKeyValuePair) {
        window.endpointTester.addKeyValuePair('request-headers');
    } else {
        console.error('EndpointTester not available for addHeader');
    }
};

window.selectMethod = function(method) {
    console.log('🔄 Global selectMethod called with:', method);
    if (window.endpointTester && window.endpointTester.setMethod) {
        window.endpointTester.setMethod(method);
    } else {
        console.error('EndpointTester not available for selectMethod');
    }
};

// At the end of the file, add a listener to keep EndpointTester in sync with the global selector
document.addEventListener('DOMContentLoaded', () => {
    const globalProfileSelector = document.getElementById('global-profile-selector');
    if (globalProfileSelector) {
        globalProfileSelector.addEventListener('change', (e) => {
            if (window.endpointTester && typeof window.endpointTester.onProfileChange === 'function') {
                window.endpointTester.onProfileChange(e.target.value);
            }
        });
    }
});

console.log('📦 EndpointTester module loaded');