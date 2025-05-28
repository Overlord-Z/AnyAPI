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
        // Other initialization will be handled by UI modules
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
     * Import history data
     */
    importHistory(data) {
        if (data && Array.isArray(data.history)) {
            this.requestHistory = data.history;
            this.saveRequestHistory();
            return true;
        }
        return false;
    }

    /**
     * Validate current request
     */
    validateRequest() {
        if (!this.currentProfile) {
            return { valid: false, message: 'Please select a profile' };
        }
        
        const endpointInput = document.getElementById('endpoint-url');
        if (!endpointInput || !endpointInput.value.trim()) {
            return { valid: false, message: 'Please enter an endpoint' };
        }
        
        return { valid: true };
    }

    /**
     * Build request data object
     */
    buildRequestData() {
        const endpointInput = document.getElementById('endpoint-url');
        const endpoint = endpointInput ? endpointInput.value.trim() : '';
        
        return {
            profileName: this.currentProfile,
            method: this.currentMethod,
            endpoint: endpoint,
            headers: this.collectKeyValuePairs('request-headers'),
            body: this.getRequestBody(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get request body based on current settings
     */
    getRequestBody() {
        const bodyTypeSelect = document.getElementById('body-type');
        const bodyType = bodyTypeSelect ? bodyTypeSelect.value : 'none';
        
        if (bodyType === 'none') return null;
        
        const bodyTextarea = document.getElementById('request-body');
        if (!bodyTextarea) return null;
        
        const bodyContent = bodyTextarea.value.trim();
        if (!bodyContent) return null;
        
        if (bodyType === 'json') {
            try {
                return JSON.parse(bodyContent);
            } catch {
                return bodyContent;
            }
        }
        
        return bodyContent;
    }

    /**
     * Show loading state in response viewer
     */
    showResponseLoading() {
        const responseViewer = document.getElementById('response-viewer');
        if (responseViewer) {
            responseViewer.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Sending request...</p>
                </div>
            `;
        }
    }

    /**
     * Parse GitHub API specific errors
     */
    parseGitHubError(errorText, endpoint) {
        const result = {
            category: 'Error',
            message: errorText,
            suggestions: []
        };

        if (errorText.includes('401') || errorText.includes('Unauthorized')) {
            result.category = 'Authentication Error';
            result.suggestions = [
                'Check your API token',
                'Verify token has required permissions',
                'Ensure token is not expired'
            ];
        } else if (errorText.includes('403') || errorText.includes('Forbidden')) {
            result.category = 'Permission Error';
            result.suggestions = [
                'Check if your token has required scopes',
                'Verify repository access permissions',
                'Check rate limits'
            ];
        } else if (errorText.includes('404') || errorText.includes('Not Found')) {
            result.category = 'Resource Not Found';
            result.suggestions = [
                'Verify the repository/resource exists',
                'Check spelling in endpoint path',
                'Ensure you have access to the resource'
            ];
        }

        return result;
    }

    // Utility: Collect key-value pairs from a container
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

    async sendRequest() {
        if (!this.validateRequest()) return;
        const requestData = this.buildRequestData();
        try {
            this.showResponseLoading();
            const startTime = Date.now();
            const response = await apiClient.testEndpoint(requestData);
            const duration = Date.now() - startTime;
            const historyItem = {
                profile: requestData.profileName,
                method: requestData.method,
                endpoint: requestData.endpoint,
                timestamp: new Date().toISOString(),
                duration,
                success: response.success,
                status: response.result ? 'Success' : 'Error'
            };
            if (!response.success && response.error) {
                const githubError = this.parseGitHubError(response.error, requestData.endpoint);
                historyItem.status = githubError.category;
                historyItem.error = githubError.message;
                historyItem.suggestions = githubError.suggestions;
            }
            this.addToHistory(historyItem);
            this.displayResponse(response, duration, requestData);
            if (response.success) {
                showNotification('Request completed successfully', 'success');
            } else {
                const profile = profileManager?.getProfile(requestData.profileName);
                const isGitHubAPI = profile && (profile.baseUrl?.includes('api.github.com') || profile.baseUrl?.includes('github.com/api'));
                if (isGitHubAPI) {
                    const githubError = this.parseGitHubError(response.error, requestData.endpoint);
                    showNotification(`GitHub API Error: ${githubError.message}`, 'error', 8000);
                } else {
                    showNotification('Request completed with errors', 'warning');
                }
            }
        } catch (error) {
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
        }
    }

    parseGitHubError(error, endpoint) {
        const result = { category: 'GitHub API Error', message: 'Unknown error', suggestions: [] };
        try {
            let errorData = error;
            if (typeof error === 'string') {
                try { errorData = JSON.parse(error); } catch { errorData = { message: error }; }
            }
            const status = errorData.status || 'unknown';
            const message = errorData.message || 'Unknown error';
            switch (status) {
                case '404': case 404:
                    result.category = '404 Not Found';
                    result.message = 'Repository or resource not found';
                    result.suggestions = [
                        'Check if the repository name is spelled correctly',
                        'Verify the repository exists and is public',
                        'For private repos, ensure your token has access',
                        'Example format: /repos/owner/repository-name'
                    ];
                    if (endpoint.includes('/repos/')) {
                        const repoMatch = endpoint.match(/\/repos\/([^\/]+)\/([^\/]+)/);
                        if (repoMatch) result.suggestions.push(`Trying to access: ${repoMatch[1]}/${repoMatch[2]}`);
                    }
                    break;
                case '401': case 401:
                    result.category = '401 Unauthorized';
                    result.message = 'Authentication required or token invalid';
                    result.suggestions = [
                        'Check if your GitHub token is valid',
                        'Verify token permissions/scopes',
                        'Token may have expired - generate a new one',
                        'For private repos, ensure token has repo access'
                    ];
                    break;
                case '403': case 403:
                    result.category = '403 Forbidden';
                    result.message = 'Access denied or rate limited';
                    result.suggestions = [
                        'You might have hit GitHub\'s rate limit',
                        'Repository may be private without access',
                        'Token may lack required permissions',
                        'Wait a few minutes if rate limited'
                    ];
                    break;
                case '422': case 422:
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

    validateRequest() {
        const profile = document.getElementById('test-profile')?.value;
        const endpoint = document.getElementById('endpoint-url')?.value?.trim();
        if (!profile) { showNotification('Please select a profile', 'error'); return false; }
        if (!endpoint) { showNotification('Please enter an endpoint', 'error'); return false; }
        const profileObj = profileManager?.getProfile(profile);
        const isGitHubAPI = profileObj && (profileObj.baseUrl?.includes('api.github.com') || profileObj.baseUrl?.includes('github.com/api'));
        if (isGitHubAPI) {
            const validation = this.validateGitHubEndpoint(endpoint);
            if (!validation.isValid && validation.level === 'error') {
                showNotification(`GitHub API: ${validation.message}`, 'error');
                return false;
            }
        }
        // Optionally validate JSON body
        if (['POST', 'PUT', 'PATCH'].includes(this.currentMethod)) {
            const requestBody = document.getElementById('request-body')?.value?.trim();
            if (requestBody && !isValidJson(requestBody)) {
                showNotification('Request body is not valid JSON', 'error');
                return false;
            }
        }
        return true;
    }

    buildRequestData() {
        const data = {
            profileName: document.getElementById('test-profile').value,
            endpoint: document.getElementById('endpoint-url').value.trim(),
            method: this.currentMethod,
            queryParameters: this.collectKeyValuePairs('query-params'),
            headers: this.collectKeyValuePairs('request-headers')
        };
        if (['POST', 'PUT', 'PATCH'].includes(this.currentMethod)) {
            const requestBody = document.getElementById('request-body')?.value?.trim();
            const contentType = document.getElementById('content-type')?.value;
            if (requestBody) {
                data.body = requestBody;
                data.contentType = contentType;
            }
        }
        const getAllPages = document.getElementById('get-all-pages')?.checked;
        if (getAllPages) {
            data.getAllPages = true;
            const pageSize = document.getElementById('page-size')?.value;
            const maxPages = document.getElementById('max-pages')?.value;
            if (pageSize && parseInt(pageSize) > 0) data.pageSize = parseInt(pageSize);
            if (maxPages && parseInt(maxPages) > 0) data.maxPages = parseInt(maxPages);
        }
        return data;
    }

    showResponseLoading() {
        const responseViewer = document.getElementById('response-viewer');
        const responseMeta = document.getElementById('response-meta');
        if (responseViewer) {
            responseViewer.innerHTML = `<div class="loading-container" style="text-align: center; padding: 2rem;"><div class="loading-spinner" style="margin: 0 auto 1rem;"></div><p>Sending request...</p></div>`;
        }
        if (responseMeta) {
            responseMeta.innerHTML = '<span class="text-muted">Sending request...</span>';
        }
    }

    displayResponse(response, duration, requestData) {
        const responseMeta = document.getElementById('response-meta');
        if (responseMeta) {
            const status = response.success ? 'Success' : 'Error';
            const statusClass = response.success ? 'text-success' : 'text-danger';
            responseMeta.innerHTML = `<span class="${statusClass}">Status: ${status}</span><span class="text-muted"> • Duration: ${formatDuration(duration)}</span>`;
        }
        if (!window.enhancedViewer) {
            window.enhancedViewer = new EnhancedResponseViewer();
        }
        let dataToDisplay = null;
        if (response.success && response.result) {
            dataToDisplay = response.result;
        } else if (response.error) {
            dataToDisplay = { error: true, message: response.error, timestamp: new Date().toISOString() };
        }
        if (dataToDisplay) {
            window.enhancedViewer.displayResponse(dataToDisplay);
        } else {
            const responseViewer = document.getElementById('response-viewer');
            if (responseViewer) {
                responseViewer.innerHTML = `<div class="empty-response"><div class="empty-icon">📡</div><p>Send a request to see the response</p></div>`;
            }
        }
    }

    formatGitHubError(error, endpoint) {
        const githubError = this.parseGitHubError(error, endpoint);
        if (!document.getElementById('github-error-styles')) {
            const style = document.createElement('style');
            style.id = 'github-error-styles';
            style.textContent = `.github-error-title { color: var(--color-danger, #dc3545); font-weight: bold; } .github-error-category { color: var(--color-danger, #dc3545); } .github-error-message { color: var(--color-danger, #dc3545); } .github-error-suggestions { color: var(--color-warning, #856404); font-weight: bold; } .github-error-suggestion { color: var(--color-warning, #856404); } .github-error-raw { color: var(--text-muted, #6c757d); font-weight: bold; }`;
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

    displayError(error) {
        const responseViewer = document.getElementById('response-viewer');
        const responseMeta = document.getElementById('response-meta');
        if (responseMeta) {
            responseMeta.innerHTML = '<span class="text-danger">Status: Network Error</span>';
        }
        if (responseViewer) {
            const errorData = { error: error.message, type: 'NetworkError', timestamp: new Date().toISOString() };
            responseViewer.innerHTML = `<pre>${formatJson(errorData)}</pre>`;
        }
    }

    formatResponseData(data) {
        try {
            if (typeof data === 'string') {
                try { const parsed = JSON.parse(data); return formatJson(parsed); } catch { return escapeHtml(data); }
            } else {
                return formatJson(data);
            }
        } catch (error) {
            return escapeHtml(String(data));
        }
    }

    formatErrorData(error) {
        if (typeof error === 'object') {
            return formatJson(error);
        } else {
            return escapeHtml(String(error));
        }
    }

    clearRequest() {
        const endpointInput = document.getElementById('endpoint-url');
        if (endpointInput) endpointInput.value = '';
        const feedbackElement = document.getElementById('endpoint-validation-feedback');
        if (feedbackElement) feedbackElement.style.display = 'none';
        const requestBody = document.getElementById('request-body');
        if (requestBody) requestBody.value = '';
        const getMethod = document.querySelector('.method-btn[data-method="GET"]');
        if (getMethod) {
            document.querySelectorAll('.method-btn').forEach(btn => btn.classList.remove('active'));
            getMethod.classList.add('active');
            this.currentMethod = 'GET';
        }
        const queryContainer = document.getElementById('query-params');
        if (queryContainer) {
            queryContainer.innerHTML = `<div class="key-value-pair"><input class="key-input" placeholder="Key"><input class="value-input" placeholder="Value"></div>`;
        }
        const headersContainer = document.getElementById('request-headers');
        if (headersContainer) {
            headersContainer.innerHTML = `<div class="key-value-pair"><input class="key-input" placeholder="Header"><input class="value-input" placeholder="Value"></div>`;
        }
    }

    clearResponse() {
        const responseViewer = document.getElementById('response-viewer');
        const responseMeta = document.getElementById('response-meta');
        if (responseViewer) {
            responseViewer.innerHTML = `<div class="empty-response"><div class="empty-icon">📡</div><p>Send a request to see the response</p></div>`;
        }
        if (responseMeta) {
            responseMeta.innerHTML = '';
        }
    }

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

    generatePowerShellCode(requestData) {
        let code = '# Generated PowerShell code for AnyAPI\n\n';
        code += `Invoke-AnyApiEndpoint -ProfileName "${requestData.profileName}" \\\n`;
        code += `    -Endpoint "${requestData.endpoint}" \\\n`;
        code += `    -Method "${requestData.method}"`;
        if (requestData.queryParameters && Object.keys(requestData.queryParameters).length > 0) {
            code += ' \\\n    -QueryParameters @{\n';
            Object.entries(requestData.queryParameters).forEach(([key, value]) => {
                code += `        "${key}" = "${value}"\n`;
            });
            code += '    }';
        }
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
        if (requestData.contentType && requestData.contentType !== 'application/json') {
            code += ` \\\n    -ContentType "${requestData.contentType}"`;
        }
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

    updateHistoryDisplay() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        if (this.requestHistory.length === 0) {
            historyList.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><h3>No requests yet</h3><p>Your API request history will appear here</p></div>`;
            return;
        }
        historyList.innerHTML = this.requestHistory.map((item, index) => {
            const isGitHubError = item.status?.includes('GitHub') || item.status?.includes('404') || item.status?.includes('401') || item.status?.includes('403');
            const statusIcon = item.success ? '✅' : (isGitHubError ? '🐙' : '❌');
            const statusClass = item.success ? 'history-status-success' : 'history-status-error';
            let suggestionHtml = '';
            if (item.suggestions && item.suggestions.length > 0) {
                suggestionHtml = `<div class="history-suggestion">💡 ${item.suggestions[0]}</div>`;
            }
            if (!document.getElementById('history-styles')) {
                const style = document.createElement('style');
                style.id = 'history-styles';
                style.textContent = `.history-suggestion { margin-top: 0.25rem; font-size: 0.75rem; color: var(--color-warning, #856404); } .history-status-success { color: var(--color-success, #28a745); } .history-status-error { color: var(--color-danger, #dc3545); }`;
                document.head.appendChild(style);
            }
            return `<div class="history-item" data-index="${index}"><div style="display: flex; align-items: center; justify-content: space-between;"><div><span class="history-method ${item.method}">${item.method}</span><span class="history-url">${escapeHtml(item.endpoint)}</span></div><div class="history-meta">${new Date(item.timestamp).toLocaleString()}</div></div><div class="history-meta">Profile: ${escapeHtml(item.profile)} • Status: <span class="${statusClass}">${statusIcon} ${item.status}</span> • ${item.duration ? formatDuration(item.duration) : 'N/A'}${item.error ? ` • Error: ${escapeHtml(item.error)}` : ''}</div>${suggestionHtml}</div>`;
        }).join('');
    }

    loadFromHistory(index) {
        const historyItem = this.requestHistory[index];
        if (!historyItem) return;
        if (typeof app !== 'undefined' && app.showSection) app.showSection('tester');
        const profileSelect = document.getElementById('test-profile');
        if (profileSelect) profileSelect.value = historyItem.profile;
        const endpointInput = document.getElementById('endpoint-url');
        if (endpointInput) { endpointInput.value = historyItem.endpoint; this.validateEndpoint(); }
        const methodBtn = document.querySelector(`.method-btn[data-method="${historyItem.method}"]`);
        if (methodBtn) {
            document.querySelectorAll('.method-btn').forEach(btn => btn.classList.remove('active'));
            methodBtn.classList.add('active');
            this.currentMethod = historyItem.method;
        }
        const requestBody = document.getElementById('request-body');
        if (requestBody) requestBody.value = historyItem.body || '';
        // Query params
        const queryContainer = document.getElementById('query-params');
        if (queryContainer) {
            queryContainer.innerHTML = '';
            if (historyItem.queryParameters) {
                Object.entries(historyItem.queryParameters).forEach(([key, value]) => {
                    const div = document.createElement('div');
                    div.className = 'key-value-pair';
                    div.innerHTML = `<input class="key-input" placeholder="Key" value="${escapeHtml(key)}"><input class="value-input" placeholder="Value" value="${escapeHtml(value)}">`;
                    queryContainer.appendChild(div);
                });
            }
        }
        // Headers
        const headersContainer = document.getElementById('request-headers');
        if (headersContainer) {
            headersContainer.innerHTML = '';
            if (historyItem.headers) {
                Object.entries(historyItem.headers).forEach(([key, value]) => {
                    const div = document.createElement('div');
                    div.className = 'key-value-pair';
                    div.innerHTML = `<input class="key-input" placeholder="Header" value="${escapeHtml(key)}"><input class="value-input" placeholder="Value" value="${escapeHtml(value)}">`;
                    headersContainer.appendChild(div);
                });
            }
        }
        this.currentProfile = historyItem.profile;
        this.updateProfileContext();
        showNotification('Request loaded from history', 'success');
    }

    updateProfileContext() {
        this.updateBaseUrlPreview();
        this.validateEndpoint();
        const profile = profileManager?.getProfile(this.currentProfile);
        if (profile && (profile.baseUrl?.includes('api.github.com') || profile.baseUrl?.includes('github.com/api'))) {
            this.showGitHubHelper();
        } else {
            this.hideGitHubHelper();
        }
    }
}

export default EndpointTester;
