/**
 * AnyAPI GUI - API Client
 * Handles all communication with the PowerShell backend
 */

class ApiClient {
    constructor() {
        this.baseUrl = '';
        this.isConnected = false;
        this.secretStorePassword = null;
        this.connectionCheckInterval = null;
        
        // --- Add: Load cached password from sessionStorage if available ---
        const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('anyapi_secretstore_password') : null;
        if (cached) {
            this.secretStorePassword = cached;
        }

        // Start connection monitoring
        this.startConnectionMonitoring();
    }

    /**
     * Start monitoring connection to backend
     */
    startConnectionMonitoring() {
        // Initial connection check
        this.checkConnection();
        
        // Check connection every 30 seconds
        this.connectionCheckInterval = setInterval(() => {
            this.checkConnection();
        }, 30000);
    }

    /**
     * Stop connection monitoring
     */
    stopConnectionMonitoring() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
    }

    /**
 * Get detailed profile information
 */
async getProfileDetails(profileName, includeSecrets = false) {
    const encodedName = encodeURIComponent(profileName);
    const url = `/api/profiles/${encodedName}/details?includeSecrets=${includeSecrets}`;
    return await this.fetch(url);
}

/**
 * Update custom authentication script
 */
async updateCustomScript(profileName, script, requiredSecrets = []) {
    const encodedName = encodeURIComponent(profileName);
    return await this.fetch(`/api/profiles/${encodedName}/script`, {
        method: 'PUT',
        body: JSON.stringify({ 
            script: script,
            requiredSecrets: requiredSecrets 
        })
    });
}

/**
 * Test secret storage access
 */
async testSecretAccess() {
    return await this.fetch('/api/secrets/test', {
        method: 'POST'
    });
}

    /**
     * Check connection to backend
     */
    async checkConnection() {
        try {
            const response = await this.fetch('/api/health', {
                method: 'GET',
                timeout: 5000
            });
            
            if (response.success) {
                this.setConnectionStatus(true);
                return true;
            } else {
                this.setConnectionStatus(false);
                return false;
            }
        } catch (error) {
            console.warn('Connection check failed:', error.message);
            this.setConnectionStatus(false);
            return false;
        }
    }

    /**
     * Set connection status and update UI
     */
    setConnectionStatus(connected) {
        this.isConnected = connected;
        
        const indicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        
        if (indicator && statusText) {
            indicator.className = 'status-indicator ' + (connected ? 'connected' : 'disconnected');
            statusText.textContent = connected ? 'Connected' : 'Disconnected';
        }

        // Emit custom event for other components
        window.dispatchEvent(new CustomEvent('connectionStatusChanged', {
            detail: { connected }
        }));
    }

    /**
     * Set SecretStore password for authenticated requests
     */
    setSecretStorePassword(password) {
        this.secretStorePassword = password;
        // --- Also update sessionStorage for consistency ---
        if (typeof sessionStorage !== 'undefined') {
            if (password) {
                sessionStorage.setItem('anyapi_secretstore_password', password);
            } else {
                sessionStorage.removeItem('anyapi_secretstore_password');
            }
        }
    }

    /**
     * Get default headers for requests
     */
    getDefaultHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        // Add SecretStore password if available
        if (this.secretStorePassword) {
            headers['X-SecretStore-Password'] = this.secretStorePassword;
        }

        return headers;
    }

    /**
     * Enhanced fetch with timeout, retries, and error handling
     */
    async fetch(endpoint, options = {}) {
        const {
            timeout = 30000,
            retries = 3,
            retryDelay = 1000,
            ...fetchOptions
        } = options;

        const url = `${this.baseUrl}${endpoint}`;
        
        // Merge headers
        const headers = {
            ...this.getDefaultHeaders(),
            ...fetchOptions.headers
        };

        let lastError;
        
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(url, {
                    ...fetchOptions,
                    headers,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                // Handle response
                const contentType = response.headers.get('content-type');
                let data;

                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }

                if (!response.ok) {
                    const error = new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
                    error.status = response.status;
                    error.response = data;
                    throw error;
                }

                return data;

            } catch (error) {
                lastError = error;
                
                // Don't retry for certain errors
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }
                
                if (error.status && error.status < 500 && error.status !== 429) {
                    throw error;
                }

                // Wait before retry
                if (attempt < retries - 1) {
                    await this.delay(retryDelay * Math.pow(2, attempt));
                }
            }
        }

        throw lastError;
    }

    /**
     * Utility function for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ===== API METHODS =====

    /**
     * Get all profiles
     */
    async getProfiles() {
        const response = await this.fetch('/api/profiles');
        return response.profiles || [];
    }

    /**
     * Create a new profile
     */
    async createProfile(profileData) {
        return await this.fetch('/api/profiles', {
            method: 'POST',
            body: JSON.stringify(profileData)
        });
    }

    /**
     * Update an existing profile
     */
    async updateProfile(profileName, profileData) {
        return await this.fetch(`/api/profiles/${encodeURIComponent(profileName)}`, {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    /**
     * Delete a profile
     */
    async deleteProfile(profileName) {
        return await this.fetch(`/api/profiles/${encodeURIComponent(profileName)}`, {
            method: 'DELETE'
        });
    }

    /**
     * Test an API endpoint
     */
    async testEndpoint(testData) {
        return await this.fetch('/api/test', {
            method: 'POST',
            body: JSON.stringify(testData),
            timeout: 60000 // Longer timeout for API tests
        });
    }

    /**
     * Get secret storage information
     */
    async getSecretInfo() {
        return await this.fetch('/api/secrets/info');
    }

    /**
     * Unlock SecretStore with password
     */
    async unlockSecretStore(password) {
        const response = await this.fetch('/api/secrets/unlock', {
            method: 'POST',
            body: JSON.stringify({ password })
        });
        
        if (response.success) {
            this.setSecretStorePassword(password);
        }
        
        return response;
    }

    /**
     * Get available templates
     */
    async getTemplates() {
        const response = await this.fetch('/api/templates');
        return response.templates || [];
    }

    /**
     * Export profiles
     */
    async exportProfiles(includeSecrets = false) {
        return await this.fetch('/api/export', {
            method: 'POST',
            body: JSON.stringify({ includeSecrets })
        });
    }

    /**
     * Import profiles
     */
    async importProfiles(content, mergeStrategy = 'Skip') {
        return await this.fetch('/api/import', {
            method: 'POST',
            body: JSON.stringify({ content, mergeStrategy })
        });
    }

    /**
     * Test profile connection
     */
    async testProfile(profileName) {
        return await this.fetch('/api/test', {
            method: 'POST',
            body: JSON.stringify({
                profileName: profileName,
                endpoint: '/health',
                method: 'GET'
            }),
            timeout: 10000
        });
    }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Show notification to user
 */
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notifications');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-title">${getNotificationTitle(type)}</div>
        <div class="notification-message">${message}</div>
    `;

    container.appendChild(notification);

    // Auto remove
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, duration);

    return notification;
}

/**
 * Get notification title based on type
 */
function getNotificationTitle(type) {
    switch (type) {
        case 'success': return '✅ Success';
        case 'error': return '❌ Error';
        case 'warning': return '⚠️ Warning';
        case 'info': 
        default: return 'ℹ️ Info';
    }
}

/**
 * Show loading state
 */
function showLoading(element, message = 'Loading...') {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }
    
    if (element) {
        element.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
    }
}

/**
 * Hide loading state
 */
function hideLoading(elementId) {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
    
    if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
        }
    }
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Copied to clipboard', 'success', 2000);
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        showNotification('Failed to copy to clipboard', 'error');
        return false;
    }
}

/**
 * Format JSON for display
 */
function formatJson(obj, spaces = 2) {
    try {
        return JSON.stringify(obj, null, spaces);
    } catch (error) {
        return String(obj);
    }
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration
 */
function formatDuration(milliseconds) {
    if (milliseconds < 1000) {
        return `${Math.round(milliseconds)}ms`;
    } else if (milliseconds < 60000) {
        return `${(milliseconds / 1000).toFixed(1)}s`;
    } else {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }
}

/**
 * Safe HTML escaping function
 */
function escapeHtml(unsafe) {
    // Handle null, undefined, or non-string values
    if (unsafe === null || unsafe === undefined) {
        return '';
    }
    
    try {
        // Convert to string safely
        const str = String(unsafe);
        
        // Perform HTML escaping
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    } catch (error) {
        console.error('Error in escapeHtml:', error, 'Value:', unsafe);
        // Return safe fallback
        return String(unsafe || '');
    }
}

/**
 * Debounce function
 */
function debounce(func, wait, immediate) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function() {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

/**
 * Generate unique ID
 */
function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate URL
 */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Validate JSON
 */
function isValidJson(string) {
    try {
        JSON.parse(string);
        return true;
    } catch (_) {
        return false;
    }
}



// Initialize global API client
const apiClient = new ApiClient();