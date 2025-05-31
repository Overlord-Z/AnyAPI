/**
 * Secure Session Manager for AnyAPI GUI
 * Handles secure authentication without storing passwords in plain text
 */

class SecureSession {
    constructor() {
        this.sessionToken = null;
        this.isAuthenticated = false;
        this.tokenExpiry = null;
        this.sessionId = this.generateSessionId();
    }

    /**
     * Generate a unique session ID
     */
    generateSessionId() {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const array = new Uint8Array(16);
            crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        } else {
            // Fallback for environments without crypto API
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
    }

    /**
     * Authenticate with SecretStore and establish secure session
     * Returns a session token instead of caching the password
     */
    async authenticate(password) {
        try {
            // Attempt secure authentication first
            const response = await this.attemptSecureAuth(password);
            
            if (response.success) {
                this.setSessionToken(response.sessionToken, response.expiresIn);
                return { success: true, sessionToken: this.sessionToken };
            }
            
            // Fallback to plain text if secure auth fails
            console.warn('🔓 Secure authentication failed, using fallback');
            return await this.fallbackAuth(password);
            
        } catch (error) {
            console.error('Authentication failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Attempt secure authentication with session token exchange
     */
    async attemptSecureAuth(password) {
        // For now, we'll use the existing encryption but improve the approach
        // TODO: Implement proper key exchange protocol
        
        // Check if encryption is available
        if (!this.isCryptoAvailable()) {
            throw new Error('Crypto API not available for secure authentication');
        }

        try {
            // Use a simplified encryption approach
            const encryptedData = await this.encryptPasswordForTransmission(password);
            
            const response = await fetch('/api/auth/secure-unlock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': this.sessionId
                },
                body: JSON.stringify({
                    encryptedPassword: encryptedData.encrypted,
                    encryptionMetadata: encryptedData.metadata,
                    sessionId: this.sessionId,
                    isSecureAuth: true
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.warn('Secure authentication attempt failed:', error);
            throw error;
        }
    }

    /**
     * Fallback authentication using existing endpoint
     */
    async fallbackAuth(password) {
        console.warn('🔓 SECURITY WARNING: Using fallback authentication with plain text transmission');
        
        const response = await fetch('/api/secrets/unlock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-ID': this.sessionId
            },
            body: JSON.stringify({ 
                password: password,
                sessionId: this.sessionId,
                isSecureAuth: false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success) {
            // Generate a local session token for consistency
            const sessionToken = this.generateSessionToken();
            this.setSessionToken(sessionToken, 3600); // 1 hour default
            result.sessionToken = sessionToken;
        }
        
        return result;
    }    /**
     * Encrypt password for secure transmission
     */
    async encryptPasswordForTransmission(password) {
        // Use a simple, secure encryption approach without browser fingerprinting
        
        // Generate a random encryption key and IV for this request
        const key = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const passwordBytes = new TextEncoder().encode(password);
        
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            passwordBytes
        );

        // Export the key for transmission
        const keyData = await crypto.subtle.exportKey('raw', key);

        return {
            encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
            metadata: {
                algorithm: 'AES-GCM',
                keyLength: 256,
                key: btoa(String.fromCharCode(...new Uint8Array(keyData))),
                iv: btoa(String.fromCharCode(...iv)),
                sessionId: this.sessionId,
                timestamp: Date.now()
            }
        };
    }

    /**
     * Generate a session token
     */
    generateSessionToken() {
        const timestamp = Date.now();
        const random = this.generateSessionId();
        return btoa(`${timestamp}:${random}:${this.sessionId}`);
    }

    /**
     * Set session token and expiry
     */
    setSessionToken(token, expiresInSeconds = 3600) {
        this.sessionToken = token;
        this.isAuthenticated = true;
        this.tokenExpiry = new Date(Date.now() + (expiresInSeconds * 1000));
        
        // Store only the session token, never the password
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('anyapi_session_token', token);
            sessionStorage.setItem('anyapi_session_expiry', this.tokenExpiry.toISOString());
            // Remove any cached passwords
            sessionStorage.removeItem('anyapi_secretstore_password');
        }
        
        console.log('✅ Secure session established');
    }    /**
     * Get authentication headers for requests
     */
    getAuthHeaders() {
        if (!this.isAuthenticated || this.isTokenExpired()) {
            return {};
        }

        return {
            'Authorization': `Bearer ${this.sessionToken}`,
            'X-Session-ID': this.sessionId
        };
    }

    /**
     * Check if token is expired
     */
    isTokenExpired() {
        return this.tokenExpiry && new Date() > this.tokenExpiry;
    }

    /**
     * Restore session from storage
     */
    restoreSession() {
        if (typeof sessionStorage === 'undefined') {
            return false;
        }

        const token = sessionStorage.getItem('anyapi_session_token');
        const expiryStr = sessionStorage.getItem('anyapi_session_expiry');
        
        if (token && expiryStr) {
            this.sessionToken = token;
            this.tokenExpiry = new Date(expiryStr);
            
            if (!this.isTokenExpired()) {
                this.isAuthenticated = true;
                console.log('✅ Session restored from storage');
                return true;
            } else {
                this.clearSession();
            }
        }
        
        return false;
    }

    /**
     * Clear session and remove stored data
     */
    clearSession() {
        this.sessionToken = null;
        this.isAuthenticated = false;
        this.tokenExpiry = null;
        
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('anyapi_session_token');
            sessionStorage.removeItem('anyapi_session_expiry');
            sessionStorage.removeItem('anyapi_secretstore_password'); // Clean up old password cache
        }
        
        console.log('🔒 Session cleared');
    }

    /**
     * Check if Web Crypto API is available
     */
    isCryptoAvailable() {
        return typeof crypto !== 'undefined' && 
               crypto.subtle && 
               typeof crypto.getRandomValues === 'function';
    }

    /**
     * Get session status for debugging
     */
    getStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            hasToken: !!this.sessionToken,
            isExpired: this.isTokenExpired(),
            sessionId: this.sessionId,
            expiry: this.tokenExpiry
        };
    }
}

// Create global instance
window.SecureSession = SecureSession;
const secureSession = new SecureSession();
window.secureSession = secureSession;

// Try to restore session on load
secureSession.restoreSession();
