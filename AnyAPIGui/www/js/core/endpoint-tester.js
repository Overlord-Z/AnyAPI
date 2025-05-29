/**
 * Core EndpointTester class - Business logic only, no DOM manipulation
 * Available globally for use by UI components
 */
// Functions from utils.js are now available globally

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
            if (e.detail.profileName !== this.currentProfile) {
                this.onProfileChange(e.detail.profileName);
                
                // Update the profile selector if it exists
                const profileSelect = document.getElementById('test-profile');
                if (profileSelect && profileSelect.value !== e.detail.profileName) {
                    profileSelect.value = e.detail.profileName || '';
                }
            }
        });
        
        // Restore saved profile
        const savedProfile = localStorage.getItem('anyapi_current_profile');
        if (savedProfile) {
            this.onProfileChange(savedProfile);
        }
        
        // Initialize sections if the function exists
        if (typeof this.initializeSections === 'function') {
            this.initializeSections();
        }
        
        // Initial validation
        setTimeout(() => {
            this.validateEndpoint();
            this.initializeWithSavedProfile();
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
    }    /**
     * Validate endpoint and provide feedback
     */
    validateEndpoint() {
        const endpointInput = document.getElementById('endpoint-url');
        const feedbackElement = document.getElementById('endpoint-validation-feedback');
        const profileSelect = document.getElementById('test-profile');
        
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
            const repoMatch = normalizedEndpoint.match(/^\/repos\/([^\/]+)\/([^\/]+)(?:\/(.*))?/);
            if (repoMatch) {
                const [, owner, repo, path] = repoMatch;
                
                if (owner && repo) {
                    validation.isValid = true;
                    validation.level = 'success';
                    validation.message = `✅ Valid GitHub repository endpoint: ${owner}/${repo}`;
                    
                    if (path) {
                        validation.message += ` (accessing: ${path})`;
                    }
                } else {
                    validation.message = '❌ Repository endpoint needs both owner and repository name';
                    validation.suggestions.push('Format: /repos/owner/repository-name');
                    validation.suggestions.push('Example: /repos/microsoft/vscode');
                }
            }
        } else if (this.githubPatterns.search.test(normalizedEndpoint)) {
            validation.isValid = true;
            validation.level = 'success';
            validation.message = '✅ Valid GitHub search endpoint';
        } else if (this.githubPatterns.user.test(normalizedEndpoint)) {
            validation.isValid = true;
            validation.level = 'success';
            validation.message = '✅ Valid GitHub user endpoint (authenticated user)';
        } else if (this.githubPatterns.users.test(normalizedEndpoint)) {
            const userMatch = normalizedEndpoint.match(/^\/users\/([^\/]+)/);
            if (userMatch) {
                validation.isValid = true;
                validation.level = 'success';
                validation.message = `✅ Valid GitHub user endpoint: ${userMatch[1]}`;
            }
        } else if (this.githubPatterns.orgs.test(normalizedEndpoint)) {
            const orgMatch = normalizedEndpoint.match(/^\/orgs\/([^\/]+)/);
            if (orgMatch) {
                validation.isValid = true;
                validation.level = 'success';
                validation.message = `✅ Valid GitHub organization endpoint: ${orgMatch[1]}`;
            }
        } else {
            // Provide helpful suggestions for common mistakes
            validation.level = 'warning';
            validation.message = '⚠️ Endpoint format may not be correct for GitHub API';
            
            // Common mistake patterns
            if (normalizedEndpoint.includes('/api/v3/')) {
                validation.suggestions.push('Remove "/api/v3" - your base URL should handle the API version');
                validation.suggestions.push('Use: /repos/owner/repo instead of /api/v3/repos/owner/repo');
            }
            
            if (normalizedEndpoint.includes('github.com/') && !normalizedEndpoint.includes('/api/')) {
                validation.suggestions.push('This looks like a web URL, not an API endpoint');
                validation.suggestions.push('For repo info, use: /repos/owner/repo');
            }
            
            // Provide common GitHub endpoint examples
            validation.suggestions.push('Common patterns:');
            validation.suggestions.push('• /repos/owner/repo - Get repository info');
            validation.suggestions.push('• /repos/owner/repo/issues - Get repository issues');
            validation.suggestions.push('• /search/repositories?q=javascript - Search repositories');
            validation.suggestions.push('• /user - Get authenticated user info');
            validation.suggestions.push('• /users/username - Get specific user info');
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
                .endpoint-feedback-success {
                    background-color: var(--color-success-bg, rgba(40, 167, 69, 0.1));
                    border-color: var(--color-success-border, rgba(40, 167, 69, 0.3));
                    color: var(--color-success-text, #28a745);
                }
                .endpoint-feedback-warning {
                    background-color: var(--color-warning-bg, rgba(255, 193, 7, 0.1));
                    border-color: var(--color-warning-border, rgba(255, 193, 7, 0.3));
                    color: var(--color-warning-text, #ffc107);
                }
                .endpoint-feedback-error {
                    background-color: var(--color-danger-bg, rgba(220, 53, 69, 0.1));
                    border-color: var(--color-danger-border, rgba(220, 53, 69, 0.3));
                    color: var(--color-danger-text, #dc3545);
                }
                .endpoint-feedback-suggestions {
                    margin-top: 0.5rem;
                    font-size: 0.8rem;
                    opacity: 0.9;
                }
                .endpoint-feedback-suggestions ul {
                    margin: 0.25rem 0 0 1rem;
                    padding: 0;
                }
                .endpoint-feedback-suggestions li {
                    margin-bottom: 0.125rem;
                }
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
            content += '<div class="endpoint-feedback-suggestions">';
            content += '<ul>';
            validation.suggestions.forEach(suggestion => {
                content += `<li>${escapeHtml(suggestion)}</li>`;
            });
            content += '</ul></div>';
        }
        
        feedbackElement.innerHTML = content;
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
            queryParameters: this.collectKeyValuePairs('query-params'),
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
    }    /**
     * Collect key-value pairs from a container
     */
    collectKeyValuePairs(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return {};
        
        // Support both .key-value-pair and .key-value-pair-compact
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
    }    /**
     * Display API response using enhanced response viewer
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
        }        // Use enhanced response viewer if available
        if (window.responseViewer && response.success && response.result) {
            // Use the enhanced UI function that handles tabs and metadata
            if (window.displayResponseData) {
                window.displayResponseData(response.result, {
                    url: requestData?.url,
                    method: requestData?.method,
                    timestamp: new Date().toISOString()
                });
            } else {
                // Fallback to direct viewer call
                window.responseViewer.displayResponse(response.result);
            }
        } else {
            // Fallback to simple display
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
    }    /**
     * Generate PowerShell code string
     */
    generatePowerShellCode(requestData) {
        let code = '# Generated PowerShell code for AnyAPI\n\n';
        code += `Invoke-AnyApiEndpoint -ProfileName "${requestData.profileName}" \\\n`;
        code += `    -Endpoint "${requestData.endpoint}" \\\n`;
        code += `    -Method "${requestData.method}"`;

        // Add query parameters
        if (requestData.queryParameters && Object.keys(requestData.queryParameters).length > 0) {
            code += ' \\\n    -QueryParameters @{\n';
            Object.entries(requestData.queryParameters).forEach(([key, value]) => {
                code += `        "${key}" = "${value}"\n`;
            });
            code += '    }';
        }

        // Add headers
        if (requestData.headers && Object.keys(requestData.headers).length > 0) {
            code += ' \\\n    -Headers @{\n';
            Object.entries(requestData.headers).forEach(([key, value]) => {
                code += `        "${key}" = "${value}"\n`;
            });
            code += '    }';
        }

        // Add body
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
        console.log('🔄 Updating profile context for:', this.currentProfile);
        
        // Update base URL preview if element exists
        const baseUrlPreview = document.getElementById('base-url-preview');
        const compactPreview = document.querySelector('.base-url-preview-compact');
        
        if (this.currentProfile) {
            const profile = window.profileManager?.getProfile(this.currentProfile);
            if (profile && profile.baseUrl) {
                const baseUrl = profile.baseUrl.replace(/\/$/, ''); // Remove trailing slash
                
                // Update both preview elements
                if (baseUrlPreview) {
                    baseUrlPreview.textContent = baseUrl;
                    baseUrlPreview.style.display = 'block';
                }
                
                if (compactPreview) {
                    compactPreview.textContent = baseUrl;
                    compactPreview.style.display = 'block';
                }
                
                console.log('✅ Profile context updated with base URL:', baseUrl);
            } else {
                console.warn('⚠️ Profile not found or missing base URL:', this.currentProfile);
                this.clearProfileContext();
            }
        } else {
            this.clearProfileContext();
        }
    }

    /**
     * Clear profile context displays
     */
    clearProfileContext() {
        const baseUrlPreview = document.getElementById('base-url-preview');
        const compactPreview = document.querySelector('.base-url-preview-compact');
        
        if (baseUrlPreview) {
            baseUrlPreview.textContent = 'No profile selected';
            baseUrlPreview.style.display = 'block';
        }
        
        if (compactPreview) {
            compactPreview.textContent = 'No profile selected';
            compactPreview.style.display = 'block';
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
     * Initialize with enhanced profile handling
     */
    init() {
        console.log('🚀 Initializing EndpointTester...');
        
        this.loadRequestHistory();
        
        // Listen for profile changes from other components
        window.addEventListener('profileChanged', (e) => {
            if (e.detail.profileName !== this.currentProfile) {
                this.onProfileChange(e.detail.profileName);
                
                // Update the profile selector if it exists
                const profileSelect = document.getElementById('test-profile');
                if (profileSelect && profileSelect.value !== e.detail.profileName) {
                    profileSelect.value = e.detail.profileName || '';
                }
            }
        });
        
        // Restore saved profile
        const savedProfile = localStorage.getItem('anyapi_current_profile');
        if (savedProfile) {
            this.onProfileChange(savedProfile);
        }
        
        // Initialize sections if the function exists
        if (typeof this.initializeSections === 'function') {
            this.initializeSections();
        }
        
        // Initial validation
        setTimeout(() => {
            this.validateEndpoint();
            this.initializeWithSavedProfile();
        }, 100);
        
        // Setup body section visibility
        this.setupBodySection();
        
        console.log('✅ EndpointTester initialized');
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

    /**
     * Auto-expand a collapsible section
     */
    autoExpandSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section && !section.classList.contains('expanded')) {
            if (typeof toggleSection === 'function') {
                toggleSection(sectionId);
            } else {
                // Fallback manual toggle
                section.classList.add('expanded');
                const content = section.querySelector('.collapsible-content');
                const icon = section.querySelector('.collapse-icon');
                if (content) {
                    content.style.maxHeight = content.scrollHeight + 'px';
                }
                if (icon) {
                    icon.style.transform = 'rotate(180deg)';
                }
            }
        }
    }

    /**
     * Add key-value pair to a container
     */
    addKeyValuePair(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Container not found: ${containerId}`);
            return;
        }
        
        const pair = document.createElement('div');
        pair.className = 'key-value-pair-compact';
        
        // Set appropriate placeholders based on container type
        let keyPlaceholder = 'Name';
        let valuePlaceholder = 'Value';
        
        if (containerId.includes('query-param')) {
            keyPlaceholder = 'Parameter Name';
            valuePlaceholder = 'Parameter Value';
        } else if (containerId.includes('header')) {
            keyPlaceholder = 'Header Name';
            valuePlaceholder = 'Header Value';
        }
        
        pair.innerHTML = `
            <input type="text" class="kv-input-compact" placeholder="${keyPlaceholder}" autocomplete="off">
            <input type="text" class="kv-input-compact" placeholder="${valuePlaceholder}" autocomplete="off">
            <button class="kv-remove-btn" onclick="this.closest('.key-value-pair-compact').remove()" type="button" title="Remove this ${containerId.includes('header') ? 'header' : 'parameter'}">×</button>
        `;
        
        container.appendChild(pair);
        
        // Auto-expand the section if it's not already expanded
        const sectionId = container.closest('.collapsible-section')?.id;
        if (sectionId) {
            this.autoExpandSection(sectionId);
        }
        
        // Focus on the first input
        const firstInput = pair.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        console.log(`Added key-value pair to: ${containerId}`);
    }

    /**
     * Setup body section visibility based on HTTP method
     */
    setupBodySection() {
        this.updateBodySectionVisibility();
        
        // Listen for method changes
        window.addEventListener('methodChanged', () => {
            this.updateBodySectionVisibility();
        });
    }

    /**
     * Update body section visibility based on current method
     */
    updateBodySectionVisibility() {
        const bodySection = document.getElementById('body-section');
        if (bodySection) {
            if (['POST', 'PUT', 'PATCH'].includes(this.currentMethod)) {
                bodySection.style.display = 'block';
            } else {
                bodySection.style.display = 'none';
                // Collapse the section if it's currently expanded
                if (bodySection.classList.contains('expanded')) {
                    bodySection.classList.remove('expanded');
                    const content = bodySection.querySelector('.collapsible-content');
                    if (content) {
                        content.style.maxHeight = '0px';
                    }
                    const icon = bodySection.querySelector('.collapse-icon');
                    if (icon) {
                        icon.style.transform = 'rotate(0deg)';
                    }                }
            }
        }
    }

    /**
     * Initialize with saved profile from local storage
     */
    initializeWithSavedProfile() {
        try {
            const savedProfile = localStorage.getItem('selectedProfile');
            if (savedProfile) {
                const profileSelect = document.getElementById('test-profile');
                if (profileSelect) {
                    profileSelect.value = savedProfile;
                    this.onProfileChange();
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not load saved profile:', error.message);
        }
    }
}

// Make EndpointTester globally available
window.EndpointTester = EndpointTester;

// Create global instance - will be initialized by app.js
window.initializeEndpointTester = function() {
    if (!window.endpointTester) {
        const endpointTester = new EndpointTester();
        window.endpointTester = endpointTester;
        console.log('✅ EndpointTester initialized globally');
    }
    return window.endpointTester;
};
