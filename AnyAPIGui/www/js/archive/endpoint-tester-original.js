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
        this.interfaceVersion = this.detectInterfaceVersion ? this.detectInterfaceVersion() : 'legacy';
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

        // Always expand headers and options sections and remove borders
        this.alwaysExpandSections(['headers-section', 'options-section']);
        this.removeSectionBorders(['headers-section', 'options-section']);
        this.setupBodySection();
        this.fixMethodSelector();
    }

    /**
     * Always expand specified sections and remove collapse controls
     */
    alwaysExpandSections(sectionIds) {
        sectionIds.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('expanded');
                // Remove collapse icon/button if present
                const icon = section.querySelector('.collapsible-icon, .collapse-icon');
                if (icon) icon.style.display = 'none';
                // Expand content
                const content = section.querySelector('.collapsible-content');
                if (content) content.style.maxHeight = 'none';
            }
        });
    }

    /**
     * Remove borders and background for specified sections
     */
    removeSectionBorders(sectionIds) {
        sectionIds.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.border = 'none';
                section.style.background = 'transparent';
                // Remove background/border from content as well
                const content = section.querySelector('.collapsible-content');
                if (content) {
                    content.style.border = 'none';
                    content.style.background = 'transparent';
                }
            }
        });
        // Add CSS to further ensure no borders
        if (!document.getElementById('section-border-fix')) {
            const style = document.createElement('style');
            style.id = 'section-border-fix';
            style.textContent = `
                #headers-section, #options-section {
                    border: none !important;
                    background: transparent !important;
                    box-shadow: none !important;
                }
                #headers-section .collapsible-content,
                #options-section .collapsible-content {
                    border: none !important;
                    background: transparent !important;
                    box-shadow: none !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Dynamically adjust headers section height on add/remove
     */
    adjustHeadersSectionHeight() {
        const section = document.getElementById('headers-section');
        if (section) {
            const content = section.querySelector('.collapsible-content');
            if (content) {
                // Let content grow naturally, but can force minHeight if needed
                content.style.maxHeight = 'none';
            }
        }
    }

    /**
     * Setup body section (always visible for POST/PUT/PATCH)
     */
    setupBodySection() {
        const bodySection = document.getElementById('body-section');
        if (bodySection) {
            bodySection.style.display = ['POST', 'PUT', 'PATCH'].includes(this.currentMethod) ? 'block' : 'none';
            bodySection.classList.add('expanded');
            // Remove collapse icon if present
            const icon = bodySection.querySelector('.collapsible-icon, .collapse-icon');
            if (icon) icon.style.display = 'none';
            const content = bodySection.querySelector('.collapsible-content');
            if (content) content.style.maxHeight = 'none';
        }
    }

    /**
     * Fix method selector so active button updates and currentMethod is set
     */
    fixMethodSelector() {
        const methodButtons = document.querySelectorAll('.method-btn, .method-btn-compact');
        methodButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                methodButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentMethod = btn.dataset.method || btn.textContent.trim();
                // Show/hide body section as needed
                this.setupBodySection();
                // Emit event for other listeners
                window.dispatchEvent(new CustomEvent('methodChanged', {
                    detail: { method: this.currentMethod }
                }));
            });
        });
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

        // Listen for header remove button clicks
        const headersContainer = document.getElementById('request-headers');
        if (headersContainer) {
            headersContainer.addEventListener('click', (e) => {
                if (e.target && e.target.closest('button')) {
                    setTimeout(() => this.adjustHeadersSectionHeight(), 50);
                }
            });
        }
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
        if (!container) {
            console.warn(`Container not found: ${containerId}`);
            return;
        }
        
        // Detect interface version and create appropriate pair
        const isOptimized = this.interfaceVersion === 'optimized';
        const pairClass = isOptimized ? 'key-value-pair-compact' : 'key-value-pair';
        const inputClass = isOptimized ? 'kv-input-compact' : 'form-control';
        const btnClass = isOptimized ? 'kv-remove-btn' : 'btn btn-sm btn-danger';
        
        const pair = document.createElement('div');
        pair.className = pairClass;
        
        // Enhanced styling for better visual appearance with proper sizing
        pair.innerHTML = `
            <input type="text" class="${inputClass}" placeholder="Name" autocomplete="off" 
                   style="font-family: var(--font-mono, 'SF Mono', monospace); width: 100%; box-sizing: border-box;">
            <input type="text" class="${inputClass}" placeholder="Value" autocomplete="off"
                   style="width: 100%; box-sizing: border-box;">
            <button class="${btnClass}" onclick="this.closest('.${pairClass}').remove()" type="button" 
                    title="Remove this ${containerId.includes('header') ? 'header' : 'parameter'}" 
                    style="flex-shrink: 0;">×</button>
        `;
        
        // Add enhanced styling for headers vs parameters
        if (containerId.includes('header')) {
            const keyInput = pair.querySelector('input:first-child');
            if (keyInput) {
                keyInput.placeholder = 'Header Name';
                keyInput.setAttribute('list', 'common-headers');
                
                // Add common headers datalist if it doesn't exist
                if (!document.getElementById('common-headers')) {
                    const datalist = document.createElement('datalist');
                    datalist.id = 'common-headers';
                    datalist.innerHTML = `
                        <option value="Authorization">
                        <option value="Content-Type">
                        <option value="Accept">
                        <option value="User-Agent">
                        <option value="X-API-Key">
                        <option value="Cache-Control">
                        <option value="Origin">
                        <option value="Referer">
                    `;
                    document.head.appendChild(datalist);
                }
            }
            
            const valueInput = pair.querySelector('input:last-of-type');
            if (valueInput) {
                valueInput.placeholder = 'Header Value';
            }
        } else if (containerId.includes('param')) {
            const keyInput = pair.querySelector('input:first-child');
            const valueInput = pair.querySelector('input:last-of-type');
            
            if (keyInput) keyInput.placeholder = 'Parameter Name';
            if (valueInput) valueInput.placeholder = 'Parameter Value';
        }
        
        container.appendChild(pair);
        
        // Focus on the first input with better UX
        const firstInput = pair.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        // Dynamically adjust headers section height if needed
        if (containerId.includes('header')) {
            this.adjustHeadersSectionHeight();
        }
        
        console.log(`Added enhanced key-value pair to: ${containerId}`);
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

    displayResponse(response, duration, requestData) {
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

        // Create enhanced viewer only once
        if (!window.enhancedViewer) {
            window.enhancedViewer = new EnhancedResponseViewer();
        }

        // Pass the actual data to enhanced viewer
        let dataToDisplay = null;
        
        if (response.success && response.result) {
            dataToDisplay = response.result;
        } else if (response.error) {
            dataToDisplay = {
                error: true,
                message: response.error,
                timestamp: new Date().toISOString()
            };
        }

        // Display the data
        if (dataToDisplay) {
            window.enhancedViewer.displayResponse(dataToDisplay);
        } else {
            // Clear the viewer
            const responseViewer = document.getElementById('response-viewer');
            if (responseViewer) {
                responseViewer.innerHTML = `
                    <div class="empty-response">
                        <div class="empty-icon">📡</div>
                        <p>Send a request to see the response</p>
                    </div>
                `;
            }
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
window.endpointTester = new EndpointTester(); // <-- Make globally accessible

/**
 * Enhanced Response Viewer - Advanced data visualization for API responses
 * Provides multiple view modes: Raw JSON, Table, List, Tree, and Search
 */

class EnhancedResponseViewer {
    constructor() {
        this.currentData = null;
        this.currentView = 'raw';
        this.searchQuery = '';
        this.selectedPath = [];
        this.expandedNodes = new Set();
        
        // View configurations
        this.viewModes = {
            raw: { name: 'Raw JSON', icon: '📝' },
            table: { name: 'Table', icon: '📊' },
            list: { name: 'List', icon: '📋' },
            tree: { name: 'Tree', icon: '🌳' },
            search: { name: 'Search', icon: '🔍' }
        };
        
        this.init();
    }

    /**
     * Initialize the enhanced response viewer
     */
    init() {
        this.injectStyles();
        this.setupResponseViewer();
    }

    /**
     * Inject CSS styles for the enhanced viewer
     */
    injectStyles() {
        if (document.getElementById('enhanced-response-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'enhanced-response-styles';
        style.textContent = `
            .response-viewer-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                max-height: 70vh;
                min-height: 300px;
                overflow: hidden;
            }
            
            .response-tabs {
                display: flex;
                background: var(--bg-secondary, #f8f9fa);
                border-bottom: 1px solid var(--border-color, #dee2e6);
                border-radius: 6px 6px 0 0;
                overflow-x: auto;
            }
            
            .response-tab {
                padding: 0.5rem 1rem;
                background: none;
                border: none;
                cursor: pointer;
                color: var(--text-secondary, #6c757d);
                white-space: nowrap;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }
            
            .response-tab:hover {
                background: var(--bg-hover, rgba(0,0,0,0.05));
                color: var(--text-primary, inherit);
            }
            
            .response-tab.active {
                background: var(--bg-primary, white);
                color: var(--color-primary, #007bff);
                border-bottom: 2px solid var(--color-primary, #007bff);
            }
            
            .response-content {
                flex: 1;
                overflow: auto;
                background: var(--bg-primary, white);
                border-radius: 0 0 6px 6px;
            }
            
            .response-toolbar {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                background: var(--bg-secondary, #f8f9fa);
                border-bottom: 1px solid var(--border-color, #dee2e6);
                font-size: 0.875rem;
            }
            
            .response-search {
                flex: 1;
                max-width: 300px;
                padding: 0.25rem 0.5rem;
                border: 1px solid var(--border-color, #dee2e6);
                border-radius: 4px;
                background: var(--bg-primary, white);
                color: var(--text-primary, inherit);
            }
            
            .response-stats {
                color: var(--text-muted, #6c757d);
                font-size: 0.8rem;
            }
            
            .response-actions {
                display: flex;
                gap: 0.25rem;
            }
            
            .response-action-btn {
                padding: 0.25rem 0.5rem;
                background: var(--bg-primary, white);
                border: 1px solid var(--border-color, #dee2e6);
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
                color: var(--text-secondary, #6c757d);
                transition: all 0.2s ease;
            }
            
            .response-action-btn:hover {
                background: var(--bg-hover, #e9ecef);
                color: var(--text-primary, inherit);
            }
            
            /* Table View Styles */
            .response-table-container {
                overflow: auto;
                max-height: 500px;
            }
            
            .response-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.875rem;
            }
            
            .response-table th,
            .response-table td {
                padding: 0.5rem;
                text-align: left;
                border-bottom: 1px solid var(--border-color, #dee2e6);
                vertical-align: top;
            }
            
            .response-table th {
                background: var(--bg-secondary, #f8f9fa);
                font-weight: 600;
                position: sticky;
                top: 0;
                z-index: 1;
            }
            
            .response-table tr:hover {
                background: var(--bg-hover, rgba(0,0,0,0.02));
            }
            
            .table-cell-complex {
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                cursor: pointer;
                color: var(--color-primary, #007bff);
            }
            
            .table-cell-complex:hover {
                text-decoration: underline;
            }
            
            /* List View Styles */
            .response-list-container {
                padding: 1rem;
            }
            
            .response-list-item {
                border: 1px solid var(--border-color, #dee2e6);
                border-radius: 6px;
                margin-bottom: 0.75rem;
                overflow: hidden;
                transition: all 0.2s ease;
            }
            
            .response-list-item:hover {
                border-color: var(--color-primary, #007bff);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .list-item-header {
                padding: 0.75rem 1rem;
                background: var(--bg-secondary, #f8f9fa);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-weight: 600;
            }
            
            .list-item-summary {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                flex: 1;
            }
            
            .list-item-badge {
                padding: 0.125rem 0.5rem;
                background: var(--color-primary, #007bff);
                color: white;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 500;
            }
            
            .list-item-expand {
                color: var(--text-secondary, #6c757d);
                transition: transform 0.2s ease;
            }
            
            .list-item-expand.expanded {
                transform: rotate(90deg);
            }
            
            .list-item-details {
                padding: 1rem;
                background: var(--bg-primary, white);
                border-top: 1px solid var(--border-color, #dee2e6);
                display: none;
            }
            
            .list-item-details.expanded {
                display: block;
            }
            
            /* Tree View Styles */
            .response-tree-container {
                padding: 1rem;
                font-family: var(--font-mono, 'SF Mono', monospace);
                font-size: 0.875rem;
                line-height: 1.5;
            }
            
            .tree-node {
                margin-left: 1rem;
            }
            
            .tree-line {
                display: flex;
                align-items: center;
                padding: 0.125rem 0;
                cursor: pointer;
                border-radius: 4px;
                transition: background-color 0.15s ease;
            }
            
            .tree-line:hover {
                background: var(--bg-hover, rgba(0,0,0,0.02));
            }
            
            .tree-line.selected {
                background: var(--color-primary-bg, rgba(0,123,255,0.1));
                border-left: 3px solid var(--color-primary, #007bff);
                padding-left: 0.5rem;
            }
            
            .tree-toggle {
                width: 1rem;
                text-align: center;
                color: var(--text-secondary, #6c757d);
                cursor: pointer;
            }
            
            .tree-key {
                color: var(--color-info, #17a2b8);
                font-weight: 600;
                margin-right: 0.5rem;
            }
            
            .tree-value {
                color: var(--text-primary, inherit);
            }
            
            .tree-value-string {
                color: var(--color-success, #28a745);
            }
            
            .tree-value-number {
                color: var(--color-warning, #ffc107);
            }
            
            .tree-value-boolean {
                color: var(--color-primary, #007bff);
            }
            
            .tree-value-null {
                color: var(--text-muted, #6c757d);
                font-style: italic;
            }
            
            .tree-type-badge {
                margin-left: 0.5rem;
                padding: 0.125rem 0.375rem;
                background: var(--bg-secondary, #e9ecef);
                color: var(--text-secondary, #6c757d);
                border-radius: 8px;
                font-size: 0.7rem;
                font-weight: 500;
            }
            
            /* Search View Styles */
            .response-search-container {
                padding: 1rem;
            }
            
            .search-results {
                margin-top: 1rem;
            }
            
            .search-result-item {
                padding: 0.75rem;
                border: 1px solid var(--border-color, #dee2e6);
                border-radius: 4px;
                margin-bottom: 0.5rem;
                background: var(--bg-primary, white);
            }
            
            .search-result-path {
                font-family: var(--font-mono, 'SF Mono', monospace);
                font-size: 0.8rem;
                color: var(--color-info, #17a2b8);
                margin-bottom: 0.25rem;
            }
            
            .search-result-value {
                font-family: var(--font-mono, 'SF Mono', monospace);
                font-size: 0.875rem;
                background: var(--bg-secondary, #f8f9fa);
                padding: 0.5rem;
                border-radius: 4px;
                word-break: break-all;
            }
            
            .search-highlight {
                background: yellow;
                padding: 0.125rem;
                border-radius: 2px;
            }
            
            /* Empty State */
            .response-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 3rem;
                color: var(--text-muted, #6c757d);
                text-align: center;
            }
            
            .response-empty-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
                opacity: 0.5;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .response-tabs {
                    font-size: 0.8rem;
                }
                
                .response-tab {
                    padding: 0.375rem 0.5rem;
                }
                
                .response-toolbar {
                    flex-wrap: wrap;
                    gap: 0.25rem;
                }
                
                .response-search {
                    max-width: none;
                    flex: 1;
                    min-width: 150px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup the enhanced response viewer structure
     */
    setupResponseViewer() {
        // Check if already enhanced to prevent duplicates
        if (document.querySelector('.response-viewer-container')) {
            return;
        }
        
        const existingViewer = document.getElementById('response-viewer');
        if (!existingViewer) return;
        
        const parentContainer = existingViewer.parentNode;
        
        // Create constrained container with explicit overflow handling
        const enhancedContainer = document.createElement('div');
        enhancedContainer.className = 'response-viewer-container';
        enhancedContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            height: 100%;
            max-height: 60vh;
            min-height: 250px;
            overflow: hidden;
            border: 1px solid var(--border-color, #dee2e6);
            border-radius: 6px;
            background: var(--bg-primary, white);
            box-sizing: border-box;
            width: 100%;
        `;
        
        enhancedContainer.innerHTML = `
            <div class="response-tabs" style="
                display: flex; 
                overflow-x: auto; 
                flex-shrink: 0;
                background: var(--bg-secondary, #f8f9fa);
                border-bottom: 1px solid var(--border-color, #dee2e6);
                scrollbar-width: none;
                -ms-overflow-style: none;
            ">
                <button class="response-tab active" data-view="raw" style="
                    padding: 0.5rem 0.75rem;
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: var(--text-secondary, #6c757d);
                    white-space: nowrap;
                    flex-shrink: 0;
                    border-bottom: 2px solid transparent;
                    font-size: 0.875rem;
                ">📝 Raw</button>
                <button class="response-tab" data-view="table" style="
                    padding: 0.5rem 0.75rem;
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: var(--text-secondary, #6c757d);
                    white-space: nowrap;
                    flex-shrink: 0;
                    border-bottom: 2px solid transparent;
                    font-size: 0.875rem;
                ">📊 Table</button>
                <button class="response-tab" data-view="tree" style="
                    padding: 0.5rem 0.75rem;
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: var(--text-secondary, #6c757d);
                    white-space: nowrap;
                    flex-shrink: 0;
                    border-bottom: 2px solid transparent;
                    font-size: 0.875rem;
                ">🌳 Tree</button>
            </div>
            <div class="response-content" style="
                flex: 1; 
                overflow: auto; 
                min-height: 0;
                background: var(--bg-primary, white);
            ">
                <div id="response-viewer" style="
                    height: 100%;
                    overflow: auto;
                    padding: 0;
                    margin: 0;
                ">${existingViewer.innerHTML}</div>
            </div>
        `;
        
        parentContainer.replaceChild(enhancedContainer, existingViewer);
        
        // Add CSS to hide scrollbars on tabs
        const style = document.createElement('style');
        style.textContent = `
            .response-tabs::-webkit-scrollbar { display: none; }
            .response-tab.active {
                background: var(--bg-primary, white) !important;
                color: var(--color-primary, #007bff) !important;
                border-bottom-color: var(--color-primary, #007bff) !important;
            }
            .response-tab:hover:not(.active) {
                background: var(--bg-hover, rgba(0,0,0,0.05)) !important;
                color: var(--text-primary, inherit) !important;
            }
        `;
        document.head.appendChild(style);
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for the enhanced viewer
     */
    setupEventListeners() {
        // Remove any existing listeners first
        document.querySelectorAll('.response-tab').forEach(tab => {
        tab.replaceWith(tab.cloneNode(true));
        });
        
        // Tab switching - use event delegation to ensure it works
        document.addEventListener('click', (e) => {
            if (e.target.closest('.response-tab')) {
                const tab = e.target.closest('.response-tab');
                const view = tab.dataset.view;
                
                // Update active state
                document.querySelectorAll('.response-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Switch view
                this.currentView = view;
                this.renderCurrentView();
            }
        });
        
        // Search functionality
        const searchInput = document.querySelector('.response-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                if (this.currentView === 'search' || this.searchQuery) {
                    this.performSearch();
                }
            });
        }
        
        // Action buttons
        document.querySelectorAll('.response-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleAction(action);
            });
        });
    }

    /**
     * Display response data with enhanced visualization
     */
    displayResponse(data, meta = {}) {
        console.log('Enhanced viewer displaying data:', data);
        
        // Store the data - this is crucial for tab switching
        this.currentData = data;
        
        // Update stats
        this.updateStats(data);
        
        // Show toolbar if we have data
        const toolbar = document.querySelector('.response-toolbar');
        if (toolbar) {
            toolbar.style.display = data ? 'flex' : 'none';
        }
        
        // Always render the current view with the new data
        this.renderCurrentView();
    }

    /**
     * Switch between view modes
     */
    switchView(viewName) {
        // Update active tab
        document.querySelectorAll('.response-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === viewName);
        });
        
        this.currentView = viewName;
        this.renderCurrentView();
    }

    /**
     * Render the current view mode
     */
    renderCurrentView() {
        const viewer = document.getElementById('response-viewer');
        if (!viewer) return;
        
        if (!this.currentData) {
            viewer.innerHTML = `
                <div class="response-empty">
                    <div class="response-empty-icon">📡</div>
                    <h3>No Response Data</h3>
                    <p>Send a request to see the response visualization</p>
                </div>
            `;
            return;
        }
        
        switch (this.currentView) {
            case 'raw':
                this.renderRawView(viewer);
                break;
            case 'table':
                this.renderTableView(viewer);
                break;
            case 'list':
                this.renderListView(viewer);
                break;
            case 'tree':
                this.renderTreeView(viewer);
                break;
            case 'search':
                this.renderSearchView(viewer);
                break;
            default:
                this.renderRawView(viewer);
        }
    }

    /**
     * Render raw JSON view
     */
    renderRawView(container) {
        const formatted = this.formatJson(this.currentData);
        container.innerHTML = `<pre style="margin: 1rem; font-family: var(--font-mono, 'SF Mono', monospace);">${formatted}</pre>`;
    }

    /**
     * Render table view
     */
    renderTableView(container) {
        const data = this.currentData;
        
        if (Array.isArray(data)) {
            container.innerHTML = this.createTableFromArray(data);
        } else if (typeof data === 'object' && data !== null) {
            // Convert single object to single-row table
            container.innerHTML = this.createTableFromArray([data]);
        } else {
            container.innerHTML = `
                <div class="response-empty">
                    <div class="response-empty-icon">📊</div>
                    <h3>Cannot Display as Table</h3>
                    <p>Table view requires array or object data</p>
                </div>
            `;
        }
    }

    /**
     * Create table HTML from array data
     */
    createTableFromArray(array) {
        if (!array.length) {
            return `
                <div class="response-empty">
                    <div class="response-empty-icon">📊</div>
                    <h3>Empty Array</h3>
                    <p>No items to display in table view</p>
                </div>
            `;
        }
        
        // Get all unique keys from all objects
        const allKeys = new Set();
        array.forEach(item => {
            if (typeof item === 'object' && item !== null) {
                Object.keys(item).forEach(key => allKeys.add(key));
            }
        });
        
        const keys = Array.from(allKeys);
        
        let html = `
            <div class="response-table-container">
                <table class="response-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;">#</th>
                            ${keys.map(key => `<th>${this.escapeHtml(key)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        array.forEach((item, index) => {
            html += '<tr>';
            html += `<td style="font-weight: 600; color: var(--color-primary, #007bff);">${index + 1}</td>`;
            
            keys.forEach(key => {
                const value = item && typeof item === 'object' ? item[key] : undefined;
                html += `<td>${this.renderTableCell(value, `${index}.${key}`)}</td>`;
            });
            
            html += '</tr>';
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        return html;
    }

    /**
     * Render individual table cell
     */
    renderTableCell(value, path) {
        if (value === null || value === undefined) {
            return '<span class="tree-value-null">null</span>';
        }
        
        if (typeof value === 'object') {
            const preview = Array.isArray(value) 
                ? `Array[${value.length}]` 
                : `Object{${Object.keys(value).length}}`;
            
            return `<span class="table-cell-complex" onclick="enhancedViewer.showObjectDetails('${path}')" title="Click to view details">${preview}</span>`;
        }
        
        if (typeof value === 'string') {
            const truncated = value.length > 50 ? value.substring(0, 50) + '...' : value;
            return `<span title="${this.escapeHtml(value)}">${this.escapeHtml(truncated)}</span>`;
        }
        
        return `<span class="tree-value-${typeof value}">${this.escapeHtml(String(value))}</span>`;
    }

    /**
     * Render list view
     */
    renderListView(container) {
        const data = this.currentData;
        
        if (Array.isArray(data)) {
            container.innerHTML = `
                <div class="response-list-container">
                    ${data.map((item, index) => this.createListItem(item, index)).join('')}
                </div>
            `;
            
            // Add click handlers for expand/collapse
           
            container.querySelectorAll('.list-item-header').forEach(header => {
                header.addEventListener('click', (e) => {
                    const item = e.currentTarget.closest('.response-list-item');
                    const details = item.querySelector('.list-item-details');
                    const expand = item.querySelector('.list-item-expand');
                    
                    details.classList.toggle('expanded');
                    expand.classList.toggle('expanded');
                });
            });
        } else if (typeof data === 'object' && data !== null) {
            container.innerHTML = `
                <div class="response-list-container">
                    ${this.createListItem(data, 0)}
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="response-empty">
                    <div class="response-empty-icon">📋</div>
                    <h3>Cannot Display as List</h3>
                    <p>List view requires array or object data</p>
                </div>
            `;
        }
    }

    /**
     * Create individual list item
     */
    createListItem(item, index) {
        const summary = this.getItemSummary(item);
        const itemCount = typeof item === 'object' && item !== null ? Object.keys(item).length : 0;
        
        return `
            <div class="response-list-item">
                <div class="list-item-header">
                    <div class="list-item-summary">
                        <span class="list-item-badge">${index + 1}</span>
                        <span>${summary}</span>
                        ${itemCount > 0 ? `<span class="tree-type-badge">${itemCount} properties</span>` : ''}
                    </div>
                    <span class="list-item-expand">▶</span>
                </div>
                <div class="list-item-details">
                    <pre style="font-family: var(--font-mono, 'SF Mono', monospace); font-size: 0.875rem; margin: 0; white-space: pre-wrap;">${this.formatJson(item)}</pre>
                </div>
            </div>
        `;
    }

    /**
     * Get summary text for list item
     */
    getItemSummary(item) {
        if (!item || typeof item !== 'object') {
            return String(item);
        }
        
        // Try to find a good representative field
        const titleFields = ['title', 'name', 'id', 'key', 'label', 'summary'];
        for (const field of titleFields) {
            if (item[field]) {
                return String(item[field]);
            }
        }
        
        // Fallback to first string value
        const firstStringValue = Object.values(item).find(v => typeof v === 'string');
        if (firstStringValue) {
            return firstStringValue.length > 40 ? firstStringValue.substring(0, 40) + '...' : firstStringValue;
        }
        
        return Array.isArray(item) ? `Array[${item.length}]` : `Object{${Object.keys(item).length}}`;
    }

    /**
     * Render tree view
     */
    renderTreeView(container) {
        container.innerHTML = `
            <div class="response-tree-container">
                ${this.createTreeNode(this.currentData, '', 0)}
            </div>
        `;
        
        // Add click handlers for tree navigation
        container.querySelectorAll('.tree-line').forEach(line => {
            line.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Update selection
                container.querySelectorAll('.tree-line').forEach(l => l.classList.remove('selected'));
                line.classList.add('selected');
                
                // Handle expand/collapse
                const toggle = line.querySelector('.tree-toggle');
                const path = line.dataset.path;
                
                if (toggle && toggle.textContent === '▶') {
                    toggle.textContent = '▼';
                    this.expandedNodes.add(path);
                } else if (toggle && toggle.textContent === '▼') {
                    toggle.textContent = '▶';
                    this.expandedNodes.delete(path);
                }
                
                // Re-render tree to show/hide children
                this.renderTreeView(container);
            });
        });
    }

    /**
     * Create tree node HTML
     */
    createTreeNode(data, path, depth) {
        let html = '';
        
        if (Array.isArray(data)) {
            const isExpanded = this.expandedNodes.has(path);
            html += `
                <div class="tree-line" data-path="${path}" style="margin-left: ${depth * 1}rem;">
                    <span class="tree-toggle">${data.length > 0 ? (isExpanded ? '▼' : '▶') : ''}</span>
                    <span class="tree-key">Array</span>
                    <span class="tree-type-badge">[${data.length}]</span>
                </div>
            `;
            
            if (isExpanded) {
                data.forEach((item, index) => {
                    const itemPath = path ? `${path}[${index}]` : `[${index}]`;
                    html += this.createTreeNode(item, itemPath, depth + 1);
                });
            }
        } else if (typeof data === 'object' && data !== null) {
            const keys = Object.keys(data);
            const isExpanded = this.expandedNodes.has(path);
            
            if (path) {
                html += `
                    <div class="tree-line" data-path="${path}" style="margin-left: ${depth * 1}rem;">
                        <span class="tree-toggle">${keys.length > 0 ? (isExpanded ? '▼' : '▶') : ''}</span>
                        <span class="tree-key">Object</span>
                        <span class="tree-type-badge">{${keys.length}}</span>
                    </div>
                `;
            } else {
                // Root object - expand by default
                this.expandedNodes.add('');
                html += `
                    <div class="tree-line" data-path="" style="margin-left: ${depth * 1}rem;">
                        <span class="tree-toggle">▼</span>
                        <span class="tree-key">Root Object</span>
                        <span class="tree-type-badge">{${keys.length}}</span>
                    </div>
                `;
            }
            
            if (isExpanded || !path) {
                keys.forEach(key => {
                    const keyPath = path ? `${path}.${key}` : key;
                    const value = data[key];
                    
                    if (typeof value === 'object' && value !== null) {
                        html += this.createTreeNode(value, keyPath, depth + 1);
                    } else {
                        html += `
                            <div class="tree-line" data-path="${keyPath}" style="margin-left: ${(depth + 1) * 1}rem;">
                                <span class="tree-toggle"></span>
                                <span class="tree-key">${this.escapeHtml(key)}:</span>
                                <span class="tree-value tree-value-${typeof value}">${this.escapeHtml(String(value))}</span>
                            </div>
                        `;
                    }
                });
            }
        } else {
            html += `
                <div class="tree-line" data-path="${path}" style="margin-left: ${depth * 1}rem;">
                    <span class="tree-toggle"></span>
                    <span class="tree-value tree-value-${typeof data}">${this.escapeHtml(String(data))}</span>
                </div>
            `;
        }
        
        return html;
    }

    /**
     * Render search view
     */
    renderSearchView(container) {
        container.innerHTML = `
            <div class="response-search-container">
                <div class="search-results" id="search-results-container">
                    ${this.searchQuery ? '' : `
                        <div class="response-empty">
                            <div class="response-empty-icon">🔍</div>
                            <h3>Search Response Data</h3>
                            <p>Type in the search box above to find values in the response</p>
                        </div>
                    `}
                </div>
            </div>
        `;
        
        if (this.searchQuery) {
            this.performSearch();
        }
    }

    /**
     * Perform search in response data
     */
    performSearch() {
        if (!this.searchQuery || !this.currentData) return;
        
        const results = this.searchInData(this.currentData, '', this.searchQuery.toLowerCase());
        const container = document.getElementById('search-results-container');
        
        if (!container) return;
        
        if (results.length === 0) {
            container.innerHTML = `
                <div class="response-empty">
                    <div class="response-empty-icon">🔍</div>
                    <h3>No Results Found</h3>
                    <p>No matches found for "${this.escapeHtml(this.searchQuery)}"</p>
                </div>
            `;
        } else {
            container.innerHTML = results.map(result => `
                <div class="search-result-item">
                    <div class="search-result-path">${result.path}</div>
                    <div class="search-result-value">${this.highlightSearchTerm(result.value, this.searchQuery)}</div>
                </div>
            `).join('');
        }
        
        // Update stats
        const statsEl = document.querySelector('.response-stats');
        if (statsEl) {
            statsEl.textContent = `${results.length} search results`;
        }
    }

    /**
     * Search recursively in data
     */
    searchInData(data, path, query) {
        const results = [];
        
        const searchRecursive = (obj, currentPath) => {
            if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                    const itemPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
                    searchRecursive(item, itemPath);
                });
            } else if (typeof obj === 'object' && obj !== null) {
                Object.entries(obj).forEach(([key, value]) => {
                    const keyPath = currentPath ? `${currentPath}.${key}` : key;
                    
                    // Search in key name
                    if (key.toLowerCase().includes(query)) {
                        results.push({
                            path: keyPath,
                            value: `${key}: ${String(value)}`,
                            type: 'key'
                        });
                    }
                    
                    // Search in value
                    if (typeof value === 'string' && value.toLowerCase().includes(query)) {
                        results.push({
                            path: keyPath,
                            value: value,
                            type: 'value'
                        });
                    } else if (typeof value === 'number' && String(value).includes(query)) {
                        results.push({
                            path: keyPath,
                            value: String(value),
                            type: 'value'
                        });
                    }
                    
                    // Recursively search in nested objects/arrays
                    if (typeof value === 'object' && value !== null) {
                        searchRecursive(value, keyPath);
                    }
                });
            } else {
                // Primitive value
                const strValue = String(obj);
                if (strValue.toLowerCase().includes(query)) {
                    results.push({
                        path: currentPath || 'root',
                        value: strValue,
                        type: 'value'
                    });
                }
            }
        };
        
        searchRecursive(data, path);
        return results;
    }

    /**
     * Highlight search term in text
     */
    highlightSearchTerm(text, term) {
        const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
        return this.escapeHtml(text).replace(regex, '<span class="search-highlight">$1</span>');
    }

    /**
     * Update statistics display
     */
    updateStats(data) {
        const statsEl = document.querySelector('.response-stats');
        if (!statsEl || !data) return;
        
        const stats = this.analyzeData(data);
        statsEl.textContent = `${stats.type} • ${stats.size} • ${stats.depth} levels`;
    }

    /**
     * Analyze data structure
     */
    analyzeData(data) {
        const getDepth = (obj) => {
            if (typeof obj !== 'object' || obj === null) return 1;
            return 1 + Math.max(0, ...Object.values(obj).map(getDepth));
        };
        
        const getSize = (obj) => {
            if (Array.isArray(obj)) return obj.length;
            if (typeof obj === 'object' && obj !== null) return Object.keys(obj).length;
            return 1;
        };
        
        const getType = (obj) => {
            if (Array.isArray(obj)) return `Array[${obj.length}]`;
            if (typeof obj === 'object' && obj !== null) return `Object{${Object.keys(obj).length}}`;
            return typeof obj;
        };
        
        return {
            type: getType(data),
            size: `${getSize(data)} items`,
            depth: getDepth(data)
        };
    }

    /**
     * Handle action button clicks
     */
    handleAction(action) {
        switch (action) {
            case 'copy':
                this.copyToClipboard();
                break;
            case 'expand':
                this.expandAll();
                break;
            case 'collapse':
                this.collapseAll();
                break;
            case 'export':
                this.exportData();
                break;
        }
    }

    /**
     * Copy response data to clipboard
     */
    async copyToClipboard() {
        try {
            const text = JSON.stringify(this.currentData, null, 2);
            await navigator.clipboard.writeText(text);
            
            // Show temporary feedback (if notification system exists)
            if (typeof showNotification === 'function') {
                showNotification('Response data copied to clipboard!', 'success');
            }
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    }

    /**
     * Expand all tree nodes
     */
    expandAll() {
        this.addAllPaths(this.currentData, '', this.expandedNodes);
        if (this.currentView === 'tree') {
            this.renderCurrentView();
        }
    }

    /**
     * Collapse all tree nodes
     */
    collapseAll() {
        this.expandedNodes.clear();
        if (this.currentView === 'tree') {
            this.renderCurrentView();
        }
    }

    /**
     * Add all possible paths to expanded nodes
     */
    addAllPaths(data, path, pathSet) {
        pathSet.add(path);
        
        if (Array.isArray(data)) {
            data.forEach((item, index) => {
                const itemPath = path ? `${path}[${index}]` : `[${index}]`;
                if (typeof item === 'object' && item !== null) {
                    this.addAllPaths(item, itemPath, pathSet);
                }
            });
        } else if (typeof data === 'object' && data !== null) {
            Object.entries(data).forEach(([key, value]) => {
                const keyPath = path ? `${path}.${key}` : key;
                if (typeof value === 'object' && value !== null) {
                    this.addAllPaths(value, keyPath, pathSet);
                }
            });
        }
    }

    /**
     * Export response data
     */
    exportData() {
        if (!this.currentData) return;
        
        const dataStr = JSON.stringify(this.currentData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `api-response-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        if (typeof showNotification === 'function') {
            showNotification('Response data exported!', 'success');
        }
    }

    /**
     * Show object details in modal/popup
     */
    showObjectDetails(path) {
        // This could open a modal with detailed view
        console.log('Show details for path:', path);
        // Implementation would depend on your modal system
    }

    /**
     * Format JSON with syntax highlighting
     */
    formatJson(data) {
        try {
            return JSON.stringify(data, null, 2);
        } catch (error) {
            return String(data);
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Escape regex special characters
     */
    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Initialize the enhanced viewer
console.log('🎨 Initializing Enhanced Response Viewer...');
const enhancedViewer = new EnhancedResponseViewer();

(function() {
    'use strict';
    
    // Store reference to original init method for backward compatibility
    const originalInit = EndpointTester.prototype.init;
    const originalSetupEventListeners = EndpointTester.prototype.setupEventListeners;
    const originalSetupMethodSelector = EndpointTester.prototype.setupMethodSelector;
    
    /**
     * Enhanced initialization with interface detection and progressive enhancement
     */
    EndpointTester.prototype.init = function() {
        // Call original initialization
        originalInit.call(this);
        
        // Detect interface version and apply enhancements
        this.interfaceVersion = this.detectInterfaceVersion();
        
        if (this.interfaceVersion === 'optimized') {
            console.log('🚀 Initializing Optimized Endpoint Tester Interface');
            this.initializeOptimizedInterface();
        } else {
            console.log('📊 Using Legacy Interface Mode');
        }
        
        // Initialize common enhancements regardless of interface version
        this.initializeCommonEnhancements();
    };
    
    /**
     * Detect which interface version is active
     */
    EndpointTester.prototype.detectInterfaceVersion = function() {
        return document.querySelector('.tester-container-optimized') ? 'optimized' : 'legacy';
    };
    
    /**
     * Initialize optimized interface specific features
     */
    EndpointTester.prototype.initializeOptimizedInterface = function() {
        this.setupOptimizedEventListeners();
        this.setupCollapsibleSections();
        this.setupCompactMethodSelector();
        this.setupEnhancedValidation();
        this.initializeResponseViewer();
        
        // Initialize GitHub helper if applicable
        this.setupGitHubHelper();
        
        console.log('✅ Optimized interface initialized successfully');
    };
    
    /**
     * Setup event listeners for optimized interface
     */
    EndpointTester.prototype.setupOptimizedEventListeners = function() {
        // Profile selection with enhanced context updates
        const profileSelect = document.getElementById('test-profile');
        if (profileSelect) {
            profileSelect.addEventListener('change', (e) => {
                this.currentProfile = e.target.value;
                this.updateOptimizedProfileContext();
                this.validateEndpoint();
            });
        }
        
        // Endpoint input with real-time validation
        const endpointInput = document.getElementById('endpoint-url');
        if (endpointInput) {
            // Debounced validation for performance
            let validationTimeout;
            endpointInput.addEventListener('input', (e) => {
                clearTimeout(validationTimeout);
                validationTimeout = setTimeout(() => {
                    this.validateEndpoint();
                }, 300);
            });
            
            // Enter key to send request
            endpointInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendRequest();
                }
            });
        }
        
        // Enhanced method selection change events
        window.addEventListener('methodChanged', (e) => {
            this.currentMethod = e.detail.method;
            this.updateOptimizedMethodContext();
        });
    };
    
    /**
     * Setup collapsible sections with intelligent state management
     */
    EndpointTester.prototype.setupCollapsibleSections = function() {
        // Global function for HTML onclick handlers
        window.toggleSection = (sectionId) => {
            const section = document.getElementById(sectionId);
            if (!section) return;
            
            const content = section.querySelector('.collapsible-content');
            const icon = section.querySelector('.collapsible-icon, .collapse-icon');
            
            if (section.classList.contains('expanded')) {
                section.classList.remove('expanded');
                content.style.maxHeight = '0px';
                if (icon) {
                    icon.style.transform = 'rotate(0deg)';
                }
                
                // Store collapsed state
                localStorage.setItem(`section_${sectionId}`, 'collapsed');
                localStorage.setItem(`anyapi_${sectionId}_expanded`, 'false');
            } else {
                section.classList.add('expanded');
                content.style.maxHeight = 'none'; // Allow natural height
                if (icon) {
                    icon.style.transform = 'rotate(90deg)';
                }
                
                // Store expanded state
                localStorage.setItem(`section_${sectionId}`, 'expanded');
                localStorage.setItem(`anyapi_${sectionId}_expanded`, 'true');
            }
        };
        
        // Restore section states from localStorage with improved defaults
        const sections = ['params-section', 'headers-section', 'body-section', 'options-section'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (!section) return;
            
            const savedState = localStorage.getItem(`section_${sectionId}`) || 
                              localStorage.getItem(`anyapi_${sectionId}_expanded`);
            
            // Default to expanded for headers and options sections
            const shouldExpand = savedState === 'expanded' || savedState === 'true' || 
                               (savedState === null && ['headers-section', 'options-section'].includes(sectionId));
            
            if (shouldExpand) {
                section.classList.add('expanded');
                const content = section.querySelector('.collapsible-content');
                const icon = section.querySelector('.collapsible-icon, .collapse-icon');
                
                if (content) {
                    content.style.maxHeight = 'none';
                }
                if (icon) {
                    icon.style.transform = 'rotate(90deg)';
                }
                
                // Ensure state is saved
                localStorage.setItem(`section_${sectionId}`, 'expanded');
                localStorage.setItem(`anyapi_${sectionId}_expanded`, 'true');
            }
        });
        
        console.log('✅ Optimized collapsible sections with improved defaults');
    };
    
    /**
     * Setup compact method selector with enhanced state management
     */
    EndpointTester.prototype.setupCompactMethodSelector = function() {
        const methodButtons = document.querySelectorAll('.method-btn-compact');
        
        methodButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Update active state
                methodButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update current method
                const newMethod = btn.dataset.method || btn.textContent.trim();
                this.currentMethod = newMethod;
                
                // Emit method changed event for other components
                window.dispatchEvent(new CustomEvent('methodChanged', {
                    detail: { method: this.currentMethod }
                }));
                
                console.log(`Method changed to: ${this.currentMethod}`);
            });
        });
    };
    
    /**
     * Update method context for optimized interface
     */
    EndpointTester.prototype.updateOptimizedMethodContext = function() {
        const bodySection = document.getElementById('body-section');
        
        if (bodySection) {
            if (['POST', 'PUT', 'PATCH'].includes(this.currentMethod)) {
                bodySection.style.display = 'block';
            } else {
                bodySection.style.display = 'none';
                // Collapse if expanded
                if (bodySection.classList.contains('expanded')) {
                    window.toggleSection('body-section');
                }
            }
        }
    };
    
    /**
     * Update profile context with optimized interface elements
     */
    EndpointTester.prototype.updateOptimizedProfileContext = function() {
        console.log('Updating optimized profile context:', this.currentProfile);
        
        // Update base URL preview
        const preview = document.querySelector('.base-url-preview-compact');
        if (preview && this.currentProfile && profileManager && profileManager.profiles) {
            const profile = profileManager.profiles.find(p => p.name === this.currentProfile);
            if (profile && profile.baseUrl) {
                const isGitHubAPI = profile.baseUrl.includes('api.github.com') || 
                                   profile.baseUrl.includes('github.com/api');
                
                let previewText = profile.baseUrl;
                if (isGitHubAPI) {
                    previewText += ' 🐙';
                }
                
                preview.textContent = previewText;
                preview.style.color = 'var(--text-secondary)';
                
                // Show GitHub helper if applicable
                this.toggleGitHubHelper(isGitHubAPI);
            } else {
                preview.textContent = 'Profile not found';
                preview.style.color = 'var(--color-danger)';
                this.toggleGitHubHelper(false);
            }
        } else if (preview) {
            preview.textContent = this.currentProfile ? 'Loading profile...' : 'Select a profile...';
            preview.style.color = 'var(--text-muted)';
            this.toggleGitHubHelper(false);
        }
        
        // Trigger validation
        this.validateEndpoint();
    };
    
    /**
     * Setup GitHub helper functionality
     */
    EndpointTester.prototype.setupGitHubHelper = function() {
        // Global function for GitHub endpoint buttons
        window.fillGitHubEndpoint = (endpoint) => {
            const endpointInput = document.getElementById('endpoint-url');
            if (endpointInput) {
                endpointInput.value = endpoint;
                endpointInput.focus();
                this.validateEndpoint();
                
                // Auto-select GET method for search endpoints
                if (endpoint.includes('/search/')) {
                    const getMethodBtn = document.querySelector('.method-btn-compact[data-method="GET"], .method-btn-compact:first-child');
                    if (getMethodBtn) {
                        getMethodBtn.click();
                    }
                }
                
                console.log(`GitHub endpoint filled: ${endpoint}`);
            }
        };
    };
    
    /**
     * Toggle GitHub helper visibility
     */
    EndpointTester.prototype.toggleGitHubHelper = function(show) {
        const helper = document.getElementById('github-helper-compact');
        if (helper) {
            helper.style.display = show ? 'block' : 'none';
        }
    };
    
    /**
     * Enhanced key-value pair management for optimized interface
     */
    EndpointTester.prototype.addKeyValuePair = function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Container not found: ${containerId}`);
            return;
        }
        
        // Detect interface version and create appropriate pair
        const isOptimized = this.interfaceVersion === 'optimized';
        const pairClass = isOptimized ? 'key-value-pair-compact' : 'key-value-pair';
        const inputClass = isOptimized ? 'kv-input-compact' : 'form-control';
        const btnClass = isOptimized ? 'kv-remove-btn' : 'btn btn-sm btn-danger';
        
        const pair = document.createElement('div');
        pair.className = pairClass;
        
        // Enhanced styling for better visual appearance with proper sizing
        pair.innerHTML = `
            <input type="text" class="${inputClass}" placeholder="Name" autocomplete="off" 
                   style="font-family: var(--font-mono, 'SF Mono', monospace); width: 100%; box-sizing: border-box;">
            <input type="text" class="${inputClass}" placeholder="Value" autocomplete="off"
                   style="width: 100%; box-sizing: border-box;">
            <button class="${btnClass}" onclick="this.closest('.${pairClass}').remove()" type="button" 
                    title="Remove this ${containerId.includes('header') ? 'header' : 'parameter'}" 
                    style="flex-shrink: 0;">×</button>
        `;
        
        // Add enhanced styling for headers vs parameters
        if (containerId.includes('header')) {
            const keyInput = pair.querySelector('input:first-child');
            if (keyInput) {
                keyInput.placeholder = 'Header Name';
                keyInput.setAttribute('list', 'common-headers');
                
                // Add common headers datalist if it doesn't exist
                if (!document.getElementById('common-headers')) {
                    const datalist = document.createElement('datalist');
                    datalist.id = 'common-headers';
                    datalist.innerHTML = `
                        <option value="Authorization">
                        <option value="Content-Type">
                        <option value="Accept">
                        <option value="User-Agent">
                        <option value="X-API-Key">
                        <option value="Cache-Control">
                        <option value="Origin">
                        <option value="Referer">
                    `;
                    document.head.appendChild(datalist);
                }
            }
            
            const valueInput = pair.querySelector('input:last-of-type');
            if (valueInput) {
                valueInput.placeholder = 'Header Value';
            }
        } else if (containerId.includes('param')) {
            const keyInput = pair.querySelector('input:first-child');
            const valueInput = pair.querySelector('input:last-of-type');
            
            if (keyInput) keyInput.placeholder = 'Parameter Name';
            if (valueInput) valueInput.placeholder = 'Parameter Value';
        }
        
        container.appendChild(pair);
        
        // Focus on the first input with better UX
        const firstInput = pair.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        // Dynamically adjust headers section height if needed
        if (containerId.includes('header')) {
            this.adjustHeadersSectionHeight();
        }
        
        console.log(`Added enhanced key-value pair to: ${containerId}`);
    };

    /**
     * Enhanced validation with visual feedback
     */
    EndpointTester.prototype.setupEnhancedValidation = function() {
        // Create validation feedback element if it doesn't exist
        const endpointInput = document.getElementById('endpoint-url');
        if (endpointInput && !document.getElementById('endpoint-validation-feedback')) {
            const feedbackElement = document.createElement('div');
            feedbackElement.id = 'endpoint-validation-feedback';
            feedbackElement.className = 'validation-feedback-compact';
            feedbackElement.style.display = 'none';
            
            // Insert after endpoint input
            endpointInput.parentNode.insertBefore(feedbackElement, endpointInput.nextSibling);
        }
    };
    
    /**
     * Initialize enhanced response viewer integration
     */
    EndpointTester.prototype.initializeResponseViewer = function() {
        // Ensure enhanced viewer is initialized
        if (!window.enhancedViewer) {
            console.log('Initializing enhanced response viewer...');
            
            // Wait for DOM to be ready
            setTimeout(() => {
                if (typeof EnhancedResponseViewer !== 'undefined') {
                    window.enhancedViewer = new EnhancedResponseViewer();
                    console.log('✅ Enhanced response viewer initialized');
                } else {
                    console.warn('EnhancedResponseViewer not available, using fallback');
                }
            }, 100);
        }
    };
    
    /**
     * Common enhancements that apply to both interface versions
     */
    EndpointTester.prototype.initializeCommonEnhancements = function() {
        // Enhanced error handling
        window.addEventListener('error', (e) => {
            console.error('EndpointTester Error:', e.error);
            this.handleGlobalError(e.error);
        });
        
        // Performance monitoring
        if (window.performance && window.performance.mark) {
            window.performance.mark('endpoint-tester-init-complete');
        }
        
        // Auto-save form state
        this.setupAutoSave();
        
        console.log('✅ Common enhancements initialized');
    };
    
    /**
     * Auto-save form state for better UX
     */
    EndpointTester.prototype.setupAutoSave = function() {
        const inputs = ['test-profile', 'endpoint-url', 'request-body'];
        
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                // Restore saved value
                const savedValue = localStorage.getItem(`autosave_${inputId}`);
                if (savedValue && !input.value) {
                    input.value = savedValue;
                }
                
                // Save on change
                input.addEventListener('input', () => {
                    localStorage.setItem(`autosave_${inputId}`, input.value);
                });
            }
        });
    };
    
    /**
     * Global error handler with user-friendly messages
     */
    EndpointTester.prototype.handleGlobalError = function(error) {
        const errorMessage = error.message || 'An unexpected error occurred';
        
        // Show user-friendly notification if available
        if (typeof showNotification === 'function') {
            showNotification(`Error: ${errorMessage}`, 'error');
        } else {
            console.error('EndpointTester Error:', errorMessage);
        }
    };
    
    /**
     * Override the original displayResponse method to work with both interfaces
     */
    const originalDisplayResponse = EndpointTester.prototype.displayResponse;
    EndpointTester.prototype.displayResponse = function(response, duration, requestData) {
        // Call original method first
        if (originalDisplayResponse) {
            originalDisplayResponse.call(this, response, duration, requestData);
        }
        
        // Enhanced handling for optimized interface
        if (this.interfaceVersion === 'optimized' && window.enhancedViewer) {
            const responseData = response.success ? response.result : {
                error: true,
                message: response.error || 'Unknown error',
                timestamp: new Date().toISOString()
            };
            
            if (responseData) {
                window.enhancedViewer.displayResponse(responseData);
            }
        }
    };
    
    console.log('🔧 EndpointTester enhancements loaded successfully');
})();