/**
 * AnyAPI GUI - Enhanced Endpoint Tester
 * Handles API endpoint testing, request building, and response handling
 * Enhanced with GitHub API specific debugging and validation
 */

class EndpointTester {
    constructor() {
        this.currentMethod = 'GET';
        this.currentProfile = '';
        this.requestHistory = JSON.parse(localStorage.getItem('anyapi_request_history') || '[]');
        this.maxHistoryItems = 50;
        
        // GitHub API specific patterns for validation
        this.githubPatterns = {
            repos: /^\/repos\/[^\/]+\/[^\/]+\/?.*$/,
            search: /^\/search\/(repositories|code|commits|issues|users)/,
            user: /^\/user\/?.*$/,
            users: /^\/users\/[^\/]+\/?.*$/,
            orgs: /^\/orgs\/[^\/]+\/?.*$/
        };
        
        // Initialize endpoint tester
        this.init();
    }

    /**
     * Initialize endpoint tester
     */
    init() {
        this.setupEventListeners();
        this.setupMethodSelector();
        this.setupTabSwitcher();
        this.loadRequestHistory();
        this.setupEndpointValidation();
    }

    /**
     * Set up endpoint validation for real-time feedback
     */
    setupEndpointValidation() {
        const endpointInput = document.getElementById('endpoint-url');
        if (endpointInput) {
            // Create validation feedback element
            const feedbackElement = document.createElement('div');
            feedbackElement.id = 'endpoint-validation-feedback';
            feedbackElement.style.cssText = `
                margin-top: 0.5rem;
                padding: 0.5rem;
                border-radius: 4px;
                font-size: 0.875rem;
                display: none;
            `;
            endpointInput.parentNode.insertBefore(feedbackElement, endpointInput.nextSibling);
            
            // Add real-time validation
            endpointInput.addEventListener('input', () => {
                this.validateEndpoint();
            });
            
            endpointInput.addEventListener('blur', () => {
                this.validateEndpoint();
            });
        }
    }

    /**
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
        const profile = profileManager?.getProfile(profileName);
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
        feedbackElement.style.display = 'block';
        
        // Set CSS classes based on validation level for proper dark mode support
        feedbackElement.className = `endpoint-feedback endpoint-feedback-${validation.level}`;
        feedbackElement.style.cssText = `
            margin-top: 0.5rem;
            padding: 0.75rem;
            border-radius: 4px;
            font-size: 0.875rem;
            display: block;
        `;
        
        // Add CSS classes for proper theming
        if (!document.getElementById('endpoint-feedback-styles')) {
            const style = document.createElement('style');
            style.id = 'endpoint-feedback-styles';
            style.textContent = `
                .endpoint-feedback {
                    border: 1px solid var(--border-color, #e9ecef);
                }
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
            `;
            document.head.appendChild(style);
        }
        
        let content = `<div><strong>${validation.message}</strong></div>`;
        
        if (validation.suggestions.length > 0) {
            content += '<div style="margin-top: 0.5rem;"><strong>Suggestions:</strong><ul style="margin: 0.25rem 0 0 1rem; padding: 0;">';
            validation.suggestions.forEach(suggestion => {
                content += `<li style="margin-bottom: 0.25rem;">${suggestion}</li>`;
            });
            content += '</ul></div>';
        }
        
        feedbackElement.innerHTML = content;
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for Enter key in endpoint input
        const endpointInput = document.getElementById('endpoint-url');
        if (endpointInput) {
            endpointInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendRequest();
                }
            });
        }

        // Listen for profile selection changes
        const profileSelect = document.getElementById('test-profile');
        if (profileSelect) {
            profileSelect.addEventListener('change', (e) => {
                this.currentProfile = e.target.value;
                this.updateProfileContext();
                this.updateBaseUrlPreview();
                this.validateEndpoint(); // Re-validate when profile changes
            });
        }

        // Listen for method changes
        window.addEventListener('methodChanged', (e) => {
            this.currentMethod = e.detail.method;
            this.updateMethodContext();
        });
    }

    /**
     * Set up method selector
     */
    setupMethodSelector() {
        const methodButtons = document.querySelectorAll('.method-btn');
        methodButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                methodButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update current method
                this.currentMethod = btn.dataset.method;
                
                // Emit event
                window.dispatchEvent(new CustomEvent('methodChanged', {
                    detail: { method: this.currentMethod }
                }));
            });
        });
    }

    /**
     * Set up tab switcher for request sections
     */
    setupTabSwitcher() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                
                // Update active states
                tabButtons.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));
                
                btn.classList.add('active');
                const targetPane = document.getElementById(`${targetTab}-tab`);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            });
        });
    }

    /**
     * Update method context (show/hide body tab, etc.)
     */
    updateMethodContext() {
        const bodyTab = document.querySelector('.tab-btn[data-tab="body"]');
        const bodyPane = document.getElementById('body-tab');
        
        if (bodyTab && bodyPane) {
            if (['POST', 'PUT', 'PATCH'].includes(this.currentMethod)) {
                bodyTab.style.display = 'block';
            } else {
                bodyTab.style.display = 'none';
                
                // Switch to params tab if body tab was active
                if (bodyTab.classList.contains('active')) {
                    const paramsTab = document.querySelector('.tab-btn[data-tab="params"]');
                    const paramsPane = document.getElementById('params-tab');
                    
                    if (paramsTab && paramsPane) {
                        bodyTab.classList.remove('active');
                        bodyPane.classList.remove('active');
                        paramsTab.classList.add('active');
                        paramsPane.classList.add('active');
                    }
                }
            }
        }
    }

    /**
     * Update base URL preview with enhanced information
     */
    updateBaseUrlPreview() {
        const preview = document.getElementById('base-url-preview');
        if (!preview) return;

        if (this.currentProfile && profileManager && profileManager.profiles) {
            const profile = profileManager.profiles.find(p => p.name === this.currentProfile);
            if (profile && profile.baseUrl) {
                const isGitHubAPI = profile.baseUrl.includes('api.github.com') || 
                                   profile.baseUrl.includes('github.com/api');
                
                let previewText = profile.baseUrl;
                if (isGitHubAPI) {
                    previewText += ' 🐙 (GitHub API - validation enabled)';
                }
                
                preview.textContent = previewText;
                preview.style.color = 'var(--text-secondary)';
            } else {
                preview.textContent = 'Profile not found';
                preview.style.color = 'var(--color-danger)';
            }
        } else {
            preview.textContent = this.currentProfile ? 'Loading profile...' : 'Select a profile...';
            preview.style.color = 'var(--text-muted)';
        }
    }

    /**
     * Update profile context with GitHub-specific helpers
     */
    updateProfileContext() {
        console.log('Profile context updated:', this.currentProfile);
        this.updateBaseUrlPreview();
        this.validateEndpoint();
        
        // Show GitHub-specific helper for GitHub API profiles
        const profile = profileManager?.getProfile(this.currentProfile);
        if (profile && (profile.baseUrl?.includes('api.github.com') || 
                       profile.baseUrl?.includes('github.com/api'))) {
            this.showGitHubHelper();
        } else {
            this.hideGitHubHelper();
        }
    }

    /**
     * Show GitHub API helper panel
     */
    showGitHubHelper() {
        let helperPanel = document.getElementById('github-helper-panel');
        
        if (!helperPanel) {
            helperPanel = document.createElement('div');
            helperPanel.id = 'github-helper-panel';
            helperPanel.className = 'github-helper-panel';
            
            // Add CSS for proper dark mode support
            if (!document.getElementById('github-helper-styles')) {
                const style = document.createElement('style');
                style.id = 'github-helper-styles';
                style.textContent = `
                    .github-helper-panel {
                        margin-top: 1rem;
                        padding: 1rem;
                        background: var(--bg-secondary, #f8f9fa);
                        border: 1px solid var(--border-color, #e9ecef);
                        border-radius: 6px;
                        font-size: 0.875rem;
                    }
                    .github-helper-title {
                        display: flex;
                        align-items: center;
                        margin-bottom: 0.5rem;
                        color: var(--text-primary, inherit);
                        font-weight: 600;
                    }
                    .github-helper-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 0.5rem;
                        font-family: var(--font-mono, 'SF Mono', monospace);
                        font-size: 0.8rem;
                    }
                    .github-helper-btn {
                        text-align: left;
                        padding: 0.4rem 0.6rem;
                        background: var(--bg-primary, white);
                        border: 1px solid var(--border-color, #dee2e6);
                        border-radius: 4px;
                        color: var(--text-primary, inherit);
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    .github-helper-btn:hover {
                        background: var(--bg-hover, #e9ecef);
                        border-color: var(--border-hover, #adb5bd);
                    }
                    .github-helper-note {
                        margin-top: 0.5rem;
                        color: var(--text-muted, #6c757d);
                        font-size: 0.8rem;
                    }
                `;
                document.head.appendChild(style);
            }
            
            helperPanel.innerHTML = `
                <div class="github-helper-title">
                    <span style="font-size: 1.2rem; margin-right: 0.5rem;">🐙</span>
                    GitHub API Quick Reference
                </div>
                <div class="github-helper-grid">
                    <button class="github-helper-btn" onclick="endpointTester.fillGitHubEndpoint('/user')">
                        /user
                    </button>
                    <button class="github-helper-btn" onclick="endpointTester.fillGitHubEndpoint('/repos/microsoft/vscode')">
                        /repos/owner/repo
                    </button>
                    <button class="github-helper-btn" onclick="endpointTester.fillGitHubEndpoint('/search/repositories?q=javascript')">
                        /search/repositories
                    </button>
                    <button class="github-helper-btn" onclick="endpointTester.fillGitHubEndpoint('/users/octocat')">
                        /users/username
                    </button>
                </div>
                <div class="github-helper-note">
                    Click any endpoint above to fill the form automatically
                </div>
            `;
            
            // Insert after the endpoint input
            const endpointInput = document.getElementById('endpoint-url');
            if (endpointInput && endpointInput.parentNode) {
                endpointInput.parentNode.insertBefore(helperPanel, endpointInput.nextSibling);
            }
        }
        
        helperPanel.style.display = 'block';
    }

    /**
     * Hide GitHub API helper panel
     */
    hideGitHubHelper() {
        const helperPanel = document.getElementById('github-helper-panel');
        if (helperPanel) {
            helperPanel.style.display = 'none';
        }
    }

    /**
     * Fill GitHub endpoint from helper buttons
     */
    fillGitHubEndpoint(endpoint) {
        const endpointInput = document.getElementById('endpoint-url');
        if (endpointInput) {
            endpointInput.value = endpoint;
            endpointInput.focus();
            this.validateEndpoint();
            
            // If it's a search endpoint, ensure we're using GET method
            if (endpoint.includes('/search/')) {
                const getMethodBtn = document.querySelector('.method-btn[data-method="GET"]');
                if (getMethodBtn) {
                    document.querySelectorAll('.method-btn').forEach(btn => btn.classList.remove('active'));
                    getMethodBtn.classList.add('active');
                    this.currentMethod = 'GET';
                }
            }
        }
    }

    /**
     * Add key-value pair to a container
     */
    addKeyValuePair(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const pair = document.createElement('div');
        pair.className = 'key-value-pair';
        pair.innerHTML = `
            <input type="text" class="form-control" placeholder="Key">
            <input type="text" class="form-control" placeholder="Value">
            <button class="btn btn-sm btn-danger" onclick="this.closest('.key-value-pair').remove()">✕</button>
        `;
        
        container.appendChild(pair);
        
        // Focus on the first input
        const firstInput = pair.querySelector('input');
        if (firstInput) {
            firstInput.focus();
        }
    }

    /**
     * Collect key-value pairs from a container
     */
    collectKeyValuePairs(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return {};

        const pairs = {};
        const keyValuePairs = container.querySelectorAll('.key-value-pair');
        
        keyValuePairs.forEach(pair => {
            const inputs = pair.querySelectorAll('input');
            if (inputs.length >= 2) {
                const key = inputs[0].value.trim();
                const value = inputs[1].value.trim();
                if (key && value) {
                    pairs[key] = value;
                }
            }
        });

        return pairs;
    }

    /**
     * Send API request - ENHANCED with GitHub-specific error handling
     */
    async sendRequest() {
        if (!this.validateRequest()) {
            return;
        }

        const requestData = this.buildRequestData();
        const sendBtn = document.querySelector('.send-btn');
        
        try {
            // Update button state
            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.innerHTML = '<div class="loading-spinner" style="width: 16px; height: 16px; display: inline-block; margin-right: 8px;"></div>Sending...';
            }

            // Show loading in response panel
            this.showResponseLoading();

            const startTime = Date.now();
            const response = await apiClient.testEndpoint(requestData);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Add to history with enhanced GitHub error detection
            const historyItem = {
                profile: requestData.profileName,
                method: requestData.method,
                endpoint: requestData.endpoint,
                timestamp: new Date().toISOString(),
                duration: duration,
                success: response.success,
                status: response.result ? 'Success' : 'Error'
            };

            // Enhanced error detection for GitHub API
            if (!response.success && response.error) {
                const githubError = this.parseGitHubError(response.error, requestData.endpoint);
                historyItem.status = githubError.category;
                historyItem.error = githubError.message;
                historyItem.suggestions = githubError.suggestions;
            }

            this.addToHistory(historyItem);

            // Display response with enhanced GitHub error handling
            this.displayResponse(response, duration, requestData);

            if (response.success) {
                showNotification('Request completed successfully', 'success');
            } else {
                const profile = profileManager?.getProfile(requestData.profileName);
                const isGitHubAPI = profile && 
                    (profile.baseUrl?.includes('api.github.com') || 
                     profile.baseUrl?.includes('github.com/api'));
                
                if (isGitHubAPI) {
                    const githubError = this.parseGitHubError(response.error, requestData.endpoint);
                    showNotification(`GitHub API Error: ${githubError.message}`, 'error', 8000);
                } else {
                    showNotification('Request completed with errors', 'warning');
                }
            }

        } catch (error) {
            console.error('Request failed:', error);
            
            this.displayError(error);
            this.addToHistory({
                profile: requestData.profileName,
                method: requestData.method,
                endpoint: requestData.endpoint,
                timestamp: new Date().toISOString(),
                duration: 0,
                success: false,
                status: 'Network Error',
                error: error.message
            });

            showNotification(`Request failed: ${error.message}`, 'error');
        } finally {
            // Reset button state
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.innerHTML = '🚀 Send';
            }
        }
    }

    /**
     * Parse GitHub-specific errors and provide helpful guidance
     */
    parseGitHubError(error, endpoint) {
        const result = {
            category: 'GitHub API Error',
            message: 'Unknown error',
            suggestions: []
        };

        try {
            // Try to parse error as JSON if it's a string
            let errorData = error;
            if (typeof error === 'string') {
                try {
                    errorData = JSON.parse(error);
                } catch {
                    errorData = { message: error };
                }
            }

            const status = errorData.status || 'unknown';
            const message = errorData.message || 'Unknown error';

            switch (status) {
                case '404':
                case 404:
                    result.category = '404 Not Found';
                    result.message = 'Repository or resource not found';
                    result.suggestions = [
                        'Check if the repository name is spelled correctly',
                        'Verify the repository exists and is public',
                        'For private repos, ensure your token has access',
                        'Example format: /repos/owner/repository-name'
                    ];
                    
                    // Specific suggestions based on endpoint
                    if (endpoint.includes('/repos/')) {
                        const repoMatch = endpoint.match(/\/repos\/([^\/]+)\/([^\/]+)/);
                        if (repoMatch) {
                            result.suggestions.push(`Trying to access: ${repoMatch[1]}/${repoMatch[2]}`);
                        }
                    }
                    break;

                case '401':
                case 401:
                    result.category = '401 Unauthorized';
                    result.message = 'Authentication required or token invalid';
                    result.suggestions = [
                        'Check if your GitHub token is valid',
                        'Verify token permissions/scopes',
                        'Token may have expired - generate a new one',
                        'For private repos, ensure token has repo access'
                    ];
                    break;

                case '403':
                case 403:
                    result.category = '403 Forbidden';
                    result.message = 'Access denied or rate limited';
                    result.suggestions = [
                        'You might have hit GitHub\'s rate limit',
                        'Repository may be private without access',
                        'Token may lack required permissions',
                        'Wait a few minutes if rate limited'
                    ];
                    break;

                case '422':
                case 422:
                    result.category = '422 Validation Error';
                    result.message = message || 'Request validation failed';
                    result.suggestions = [
                        'Check request parameters and format',
                        'Verify required fields are included',
                        'Review GitHub API documentation for this endpoint'
                    ];
                    break;

                default:
                    result.message = message;
                    result.suggestions = [
                        'Check GitHub API status page',
                        'Verify endpoint URL format',
                        'Review GitHub API documentation'
                    ];
            }

        } catch (parseError) {
            result.message = String(error);
            result.suggestions = ['Unable to parse error details', 'Check request format and try again'];
        }

        return result;
    }

    // ... Rest of the methods remain the same as the original EndpointTester
    // (validateRequest, buildRequestData, showResponseLoading, displayResponse, etc.)

    /**
     * Validate request before sending - ENHANCED
     */
    validateRequest() {
        const profile = document.getElementById('test-profile')?.value;
        const endpoint = document.getElementById('endpoint-url')?.value?.trim();

        if (!profile) {
            showNotification('Please select a profile', 'error');
            return false;
        }

        if (!endpoint) {
            showNotification('Please enter an endpoint', 'error');
            return false;
        }

        // Enhanced GitHub validation
        const profileObj = profileManager?.getProfile(profile);
        const isGitHubAPI = profileObj && 
            (profileObj.baseUrl?.includes('api.github.com') || 
             profileObj.baseUrl?.includes('github.com/api'));
        
        if (isGitHubAPI) {
            const validation = this.validateGitHubEndpoint(endpoint);
            if (!validation.isValid && validation.level === 'error') {
                showNotification(`GitHub API: ${validation.message}`, 'error');
                return false;
            }
        }

        // Validate JSON body if present
        const requestBody = document.getElementById('request-body')?.value?.trim();
        const contentType = document.getElementById('content-type')?.value;
        
        if (requestBody && contentType === 'application/json') {
            if (!isValidJson(requestBody)) {
                showNotification('Request body contains invalid JSON', 'error');
                return false;
            }
        }

        return true;
    }

    /**
     * Build request data from form
     */
    buildRequestData() {
        const data = {
            profileName: document.getElementById('test-profile').value,
            endpoint: document.getElementById('endpoint-url').value.trim(),
            method: this.currentMethod,
            queryParameters: this.collectKeyValuePairs('query-params'),
            headers: this.collectKeyValuePairs('request-headers')
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

        // Add pagination options
        const getAllPages = document.getElementById('get-all-pages')?.checked;
        if (getAllPages) {
            data.getAllPages = true;
            
            const pageSize = document.getElementById('page-size')?.value;
            const maxPages = document.getElementById('max-pages')?.value;
            
            if (pageSize && parseInt(pageSize) > 0) {
                data.pageSize = parseInt(pageSize);
            }
            if (maxPages && parseInt(maxPages) > 0) {
                data.maxPages = parseInt(maxPages);
            }
        }

        return data;
    }

    /**
     * Show loading state in response panel
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
     * Display successful response - ENHANCED with GitHub-specific formatting
     */
    displayResponse(response, duration, requestData) {
        const responseViewer = document.getElementById('response-viewer');
        const responseMeta = document.getElementById('response-meta');
        
        // Update meta information
        if (responseMeta) {
            const status = response.success ? 'Success' : 'Error';
            const statusClass = response.success ? 'text-success' : 'text-danger';
            
            responseMeta.innerHTML = `
                <span class="${statusClass}">Status: ${status}</span>
                <span class="text-muted"> • Duration: ${formatDuration(duration)}</span>
            `;
        }

        // Display response data with enhanced GitHub error handling
        if (responseViewer) {
            let content = '';
            
            if (response.success && response.result) {
                content = this.formatResponseData(response.result);
            } else if (response.error) {
                // Enhanced GitHub error formatting
                const profile = profileManager?.getProfile(requestData?.profileName);
                const isGitHubAPI = profile && 
                    (profile.baseUrl?.includes('api.github.com') || 
                     profile.baseUrl?.includes('github.com/api'));
                
                if (isGitHubAPI) {
                    content = this.formatGitHubError(response.error, requestData?.endpoint);
                } else {
                    content = this.formatErrorData(response.error);
                }
            } else {
                content = 'No response data';
            }

            responseViewer.innerHTML = `<pre>${content}</pre>`;
        }
    }

    /**
     * Format GitHub-specific errors with helpful guidance
     */
    formatGitHubError(error, endpoint) {
        const githubError = this.parseGitHubError(error, endpoint);
        
        // Add CSS for GitHub error formatting if not already present
        if (!document.getElementById('github-error-styles')) {
            const style = document.createElement('style');
            style.id = 'github-error-styles';
            style.textContent = `
                .github-error-title { color: var(--color-danger, #dc3545); font-weight: bold; }
                .github-error-category { color: var(--color-danger, #dc3545); }
                .github-error-message { color: var(--color-danger, #dc3545); }
                .github-error-suggestions { color: var(--color-warning, #856404); font-weight: bold; }
                .github-error-suggestion { color: var(--color-warning, #856404); }
                .github-error-raw { color: var(--text-muted, #6c757d); font-weight: bold; }
            `;
            document.head.appendChild(style);
        }
        
        let formatted = `<div class="github-error-title">🐙 GitHub API Error</div>\n`;
        formatted += `<div class="github-error-category">Category: ${githubError.category}</div>\n`;
        formatted += `<div class="github-error-message">Message: ${githubError.message}</div>\n\n`;
        
        if (githubError.suggestions.length > 0) {
            formatted += `<div class="github-error-suggestions">💡 Suggestions:</div>\n`;
            githubError.suggestions.forEach((suggestion, index) => {
                formatted += `<div class="github-error-suggestion">${index + 1}. ${suggestion}</div>\n`;
            });
            formatted += '\n';
        }
        
        formatted += `<div class="github-error-raw">📄 Raw Error Response:</div>\n`;
        formatted += formatJson(typeof error === 'string' ? error : JSON.stringify(error, null, 2));
        
        return formatted;
    }

    /**
     * Display error response
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
     * Format response data for display
     */
    formatResponseData(data) {
        try {
            if (typeof data === 'string') {
                // Try to parse as JSON first
                try {
                    const parsed = JSON.parse(data);
                    return formatJson(parsed);
                } catch {
                    return escapeHtml(data);
                }
            } else {
                return formatJson(data);
            }
        } catch (error) {
            return escapeHtml(String(data));
        }
    }

    /**
     * Format error data for display
     */
    formatErrorData(error) {
        if (typeof error === 'object') {
            return formatJson(error);
        } else {
            return escapeHtml(String(error));
        }
    }

    // Clear, generate code, and history methods remain the same...
    // (Keeping them for brevity but they're identical to original)

    /**
     * Clear request form
     */
    clearRequest() {
        // Clear endpoint
        const endpointInput = document.getElementById('endpoint-url');
        if (endpointInput) endpointInput.value = '';

        // Clear validation feedback
        const feedbackElement = document.getElementById('endpoint-validation-feedback');
        if (feedbackElement) feedbackElement.style.display = 'none';

        // Clear body
        const requestBody = document.getElementById('request-body');
        if (requestBody) requestBody.value = '';

        // Reset method to GET
        const getMethod = document.querySelector('.method-btn[data-method="GET"]');
        if (getMethod) {
            document.querySelectorAll('.method-btn').forEach(btn => btn.classList.remove('active'));
            getMethod.classList.add('active');
            this.currentMethod = 'GET';
        }

        // Clear query parameters (keep one empty pair)
        const queryContainer = document.getElementById('query-params');
        if (queryContainer) {
            queryContainer.innerHTML = `
                <div class="key-value-pair">
                    <input type="text" class="form-control" placeholder="Key">
                    <input type="text" class="form-control" placeholder="Value">
                    <button class="btn btn-sm btn-danger" onclick="this.closest('.key-value-pair').remove()">✕</button>
                </div>
            `;
        }

        // Clear headers (keep one empty pair)
        const headersContainer = document.getElementById('request-headers');
        if (headersContainer) {
            headersContainer.innerHTML = `
                <div class="key-value-pair">
                    <input type="text" class="form-control" placeholder="Header Name">
                    <input type="text" class="form-control" placeholder="Header Value">
                    <button class="btn btn-sm btn-danger" onclick="this.closest('.key-value-pair').remove()">✕</button>
                </div>
            `;
        }

        // Clear pagination options
        const getAllPages = document.getElementById('get-all-pages');
        if (getAllPages) getAllPages.checked = false;

        const pageSize = document.getElementById('page-size');
        if (pageSize) pageSize.value = '50';

        const maxPages = document.getElementById('max-pages');
        if (maxPages) maxPages.value = '10';

        // Clear response
        this.clearResponse();

        showNotification('Request form cleared', 'info');
    }

    /**
     * Clear response panel
     */
    clearResponse() {
        const responseViewer = document.getElementById('response-viewer');
        const responseMeta = document.getElementById('response-meta');
        
        if (responseViewer) {
            responseViewer.innerHTML = `
                <div class="empty-response">
                    <div class="empty-icon">📡</div>
                    <p>Send a request to see the response</p>
                </div>
            `;
        }

        if (responseMeta) {
            responseMeta.innerHTML = '';
        }
    }

    /**
     * Generate PowerShell code for current request
     */
    generateCode() {
        if (!this.validateRequest()) {
            return;
        }

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
     * Generate PowerShell code from request data
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
                // Format JSON body nicely
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

        // Add content type
        if (requestData.contentType && requestData.contentType !== 'application/json') {
            code += ` \\\n    -ContentType "${requestData.contentType}"`;
        }

        // Add pagination options
        if (requestData.getAllPages) {
            code += ' \\\n    -GetAllPages';
            
            if (requestData.pageSize && requestData.pageSize !== 50) {
                code += ` \\\n    -PageSize ${requestData.pageSize}`;
            }
            
            if (requestData.maxPages && requestData.maxPages !== 10) {
                code += ` \\\n    -MaxPages ${requestData.maxPages}`;
            }
        }

        return code;
    }

    /**
     * Add request to history
     */
    addToHistory(historyItem) {
        // Add to beginning of array
        this.requestHistory.unshift(historyItem);
        
        // Limit history size
        if (this.requestHistory.length > this.maxHistoryItems) {
            this.requestHistory = this.requestHistory.slice(0, this.maxHistoryItems);
        }

        // Save to localStorage
        localStorage.setItem('anyapi_request_history', JSON.stringify(this.requestHistory));
        
        // Update history display if visible
        this.updateHistoryDisplay();
    }

    /**
     * Load request history
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
     * Update history display - ENHANCED with GitHub-specific information
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
            
            // Add CSS for history styling if not present
            if (!document.getElementById('history-styles')) {
                const style = document.createElement('style');
                style.id = 'history-styles';
                style.textContent = `
                    .history-suggestion {
                        margin-top: 0.25rem;
                        font-size: 0.75rem;
                        color: var(--color-warning, #856404);
                    }
                    .history-status-success { color: var(--color-success, #28a745); }
                    .history-status-error { color: var(--color-danger, #dc3545); }
                `;
                document.head.appendChild(style);
            }
            
            return `
                <div class="history-item" onclick="endpointTester.loadFromHistory(${index})">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <span class="history-method ${item.method}">${item.method}</span>
                            <span class="history-url">${escapeHtml(item.endpoint)}</span>
                        </div>
                        <div class="history-meta">
                            ${new Date(item.timestamp).toLocaleString()}
                        </div>
                    </div>
                    <div class="history-meta">
                        Profile: ${escapeHtml(item.profile)} • 
                        Status: <span class="${statusClass}">${statusIcon} ${item.status}</span> • 
                        ${item.duration ? formatDuration(item.duration) : 'N/A'}
                        ${item.error ? ` • Error: ${escapeHtml(item.error)}` : ''}
                    </div>
                    ${suggestionHtml}
                </div>
            `;
        }).join('');
    }

    /**
     * Load request from history
     */
    loadFromHistory(index) {
        const historyItem = this.requestHistory[index];
        if (!historyItem) return;

        // Switch to tester section
        if (typeof app !== 'undefined' && app.showSection) {
            app.showSection('tester');
        }

        // Fill form with history data
        const profileSelect = document.getElementById('test-profile');
        if (profileSelect) profileSelect.value = historyItem.profile;

        const endpointInput = document.getElementById('endpoint-url');
        if (endpointInput) {
            endpointInput.value = historyItem.endpoint;
            // Trigger validation
            this.validateEndpoint();
        }

        // Set method
        const methodBtn = document.querySelector(`.method-btn[data-method="${historyItem.method}"]`);
        if (methodBtn) {
            document.querySelectorAll('.method-btn').forEach(btn => btn.classList.remove('active'));
            methodBtn.classList.add('active');
            this.currentMethod = historyItem.method;
        }

        // Update profile context
        this.currentProfile = historyItem.profile;
        this.updateProfileContext();

        showNotification('Request loaded from history', 'success');
    }

    /**
     * Clear request history
     */
    clearHistory() {
        if (confirm('Are you sure you want to clear all request history? This action cannot be undone.')) {
            this.requestHistory = [];
            localStorage.removeItem('anyapi_request_history');
            this.updateHistoryDisplay();
            showNotification('Request history cleared', 'success');
        }
    }

    /**
     * Export request history
     */
    exportHistory() {
        if (this.requestHistory.length === 0) {
            showNotification('No history to export', 'warning');
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
        showNotification('History exported successfully', 'success');
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
                    this.updateHistoryDisplay();
                    
                    showNotification(`Imported ${data.history.length} history items`, 'success');
                } else {
                    showNotification('Invalid history file format', 'error');
                }
            } catch (error) {
                console.error('Failed to import history:', error);
                showNotification('Failed to import history file', 'error');
            }
        };
        
        input.click();
    }
}

// Initialize global endpoint tester
console.log('🧪 Initializing Enhanced EndpointTester with GitHub API support...');
const endpointTester = new EndpointTester();