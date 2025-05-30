/**
 * AnyAPI GUI - API Client
 * Handles all communication with the PowerShell backend
 */

// Inline crypto utilities to avoid module import issues
const CryptoUtils = {
    /**
     * Generate a secure random salt/IV
     */
    generateSalt(length = 16) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode.apply(null, array));
    },

    /**
     * Check if Web Crypto API is available
     */
    isCryptoAvailable() {
        return typeof crypto !== 'undefined' && 
               typeof crypto.subtle !== 'undefined' && 
               typeof crypto.getRandomValues !== 'undefined';
    },    /**
     * Simple session-based encryption for SecretStore passwords using AES-GCM
     */
    async encryptSessionPassword(password) {
        if (!this.isCryptoAvailable()) {
            throw new Error('Web Crypto API not available');
        }

        // Capture actual browser characteristics
        const browserData = {
            userAgent: navigator.userAgent,
            screenResolution: window.screen.width + 'x' + window.screen.height,
            language: navigator.language,
            timestamp: Date.now().toString()
        };

        // Generate a session-specific encryption key from browser characteristics
        const sessionSeed = [
            browserData.userAgent,
            browserData.screenResolution,
            browserData.language,
            browserData.timestamp
        ].join('|');
        
        // Generate session key (SHA-256 hash)
        const encoder = new TextEncoder();
        const data = encoder.encode(sessionSeed);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const sessionKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Generate session fingerprint (without timestamp)
        const baseSeed = sessionSeed.substring(0, sessionSeed.lastIndexOf('|'));
        const fingerprintData = encoder.encode(baseSeed);
        const fingerprintBuffer = await crypto.subtle.digest('SHA-256', fingerprintData);
        const fingerprintArray = Array.from(new Uint8Array(fingerprintBuffer));
        const sessionFingerprint = fingerprintArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Generate salt and IV for AES-GCM
        const salt = crypto.getRandomValues(new Uint8Array(16)); // 16 bytes salt
        const iv = crypto.getRandomValues(new Uint8Array(12));   // 12 bytes IV for GCM
        
        // Derive AES key using PBKDF2
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(sessionKey.substring(0, 32)), // Use first 32 chars of session key
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        
        const aesKey = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
        
        // Encrypt the password using AES-GCM
        const passwordBytes = encoder.encode(password);
        const encryptedBuffer = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            aesKey,
            passwordBytes
        );
        
        // Convert encrypted data to base64
        const encryptedArray = new Uint8Array(encryptedBuffer);
        const encryptedBase64 = btoa(String.fromCharCode.apply(null, encryptedArray));
        
        return {
            encrypted: encryptedBase64,
            metadata: btoa(JSON.stringify({
                salt: btoa(String.fromCharCode.apply(null, salt)),
                iv: btoa(String.fromCharCode.apply(null, iv)),
                sessionFingerprint: sessionFingerprint,
                // Include actual browser data for backend reconstruction
                browserData: browserData
            }))
        };
    }
};

class ApiClient {
    constructor() {
        this.baseUrl = ''; // Set baseUrl for same-origin or cross-origin as needed
        // Use '' if frontend and backend are same origin/port
        // If frontend is served from a different port, use:
        // this.baseUrl = 'http://localhost:8080';

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
                    // --- Add detailed logging for debugging 500 errors ---
                    console.error(`API fetch error: ${url}`, {
                        status: response.status,
                        statusText: response.statusText,
                        request: fetchOptions,
                        response: data
                    });
                    // --- Ensure error message is always a string ---
                    let errorMsg = '';
                    if (typeof data === 'object' && data !== null) {
                        if (data.error) {
                            errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
                        } else {
                            errorMsg = JSON.stringify(data);
                        }
                    } else {
                        errorMsg = String(data);
                    }
                    const error = new Error(errorMsg || `HTTP ${response.status}: ${response.statusText}`);
                    error.status = response.status;
                    error.response = data;
                    throw error;
                }

                return data;

            } catch (error) {
                lastError = error;
                // --- Add error logging for debugging ---
                console.error(`Fetch attempt failed for ${url}:`, error && error.message ? error.message : error);

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

        // --- Final error log before throwing ---
        console.error(`All fetch attempts failed for ${url}:`, lastError && lastError.message ? lastError.message : lastError);
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
     * Make API request - alias for testEndpoint for compatibility
     */
    async makeRequest(requestData) {
        return await this.testEndpoint(requestData);
    }

    /**
     * Get secret storage information
     */
    async getSecretInfo() {
        return await this.fetch('/api/secrets/info');
    }    /**
     * Unlock SecretStore with password
     */
    async unlockSecretStore(password) {
        // Check if Web Crypto API is available
        if (!CryptoUtils.isCryptoAvailable()) {
            console.warn('🔓 Web Crypto API not available, sending password in plain text (insecure)');
            // Fallback to original method for compatibility
            const response = await this.fetch('/api/secrets/unlock', {
                method: 'POST',
                body: JSON.stringify({ password })
            });
            
            if (response.success) {
                this.setSecretStorePassword(password);
            }
            
            return response;
        }

        try {
            // Encrypt the password using session-based encryption
            const { encrypted, metadata } = await CryptoUtils.encryptSessionPassword(password);
            
            console.log('🔐 Attempting encrypted password authentication');
            
            const response = await this.fetch('/api/secrets/unlock', {
                method: 'POST',
                body: JSON.stringify({ 
                    encryptedPassword: encrypted,
                    encryptionMetadata: metadata,
                    isEncrypted: true
                })
            });
            
            if (response.success) {
                this.setSecretStorePassword(password);
                return response;
            }
            
            // Check if backend requires fallback to plain text
            if (response.requiresFallback) {
                console.log('🔄 Backend requires fallback authentication, retrying with plain text');
                const fallbackResponse = await this.fetch('/api/secrets/unlock', {
                    method: 'POST',
                    body: JSON.stringify({ password })
                });
                
                if (fallbackResponse.success) {
                    this.setSecretStorePassword(password);
                }
                
                return fallbackResponse;
            }
            
            return response;
        } catch (error) {
            console.error('🔓 Encrypted authentication failed, falling back to plain text:', error);
            
            // Fallback to original method if encryption fails
            const response = await this.fetch('/api/secrets/unlock', {
                method: 'POST',
                body: JSON.stringify({ password })
            });
            
            if (response.success) {
                this.setSecretStorePassword(password);
            }
            
            return response;
        }
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
window.apiClient = new ApiClient();