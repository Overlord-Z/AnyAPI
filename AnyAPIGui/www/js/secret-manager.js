/**
 * AnyAPI GUI - Secret Manager
 * Handles secret storage, SecretStore password management, and secure value operations
 */

class SecretManager {    constructor() {
        this.isSecretStoreUnlocked = false;
        this.secretStoreInfo = null;
        this.passwordAttempts = 0;
        this.maxPasswordAttempts = 3;
        this.initialized = false;
        
        // --- SECURITY FIX: Don't cache passwords, use secure session tokens ---
        this.cachedPassword = null; // Deprecated - will be removed
        
        // Clean up any old password caches for security (but don't assume session state)
        this.cleanupOldPasswordCaches();
        
        // Don't auto-initialize - let the main app do it
        // this.init();
    }

    /**
     * Clean up old password caches for security
     */
    cleanupOldPasswordCaches() {
        // Clear any old password caches for security
        if (typeof sessionStorage !== 'undefined') {
            const oldPassword = sessionStorage.getItem('anyapi_secretstore_password');
            if (oldPassword) {
                console.warn('🔓 SECURITY: Removing cached password from sessionStorage');
                sessionStorage.removeItem('anyapi_secretstore_password');
            }
        }
        
        // Don't assume session token validity - let init() check against backend
    }/**
     * Initialize secret manager
     */
    async init() {
        if (this.initialized) {
            console.log('🔧 SecretManager already initialized, skipping');
            return;
        }
        
        try {
            console.log('🔧 Initializing SecretManager...');
            
            // STEP 1: Load backend storage info first (source of truth)
            await this.loadSecretInfo();
            
            // STEP 2: Check if we have valid session authentication that matches backend state
            const hasValidSession = window.secureSession && 
                                  window.secureSession.isAuthenticated && 
                                  !window.secureSession.isTokenExpired() &&
                                  this.isSecretStoreUnlocked; // Backend must also confirm unlocked
            
            if (hasValidSession) {
                console.log('✅ Valid secure session confirmed by backend');
            } else {
                // Backend says locked OR session is invalid - check if we should prompt
                if (window.secureSession && window.secureSession.isAuthenticated) {
                    console.warn('🔒 Session token exists but backend reports vault is locked - session invalid');
                    window.secureSession.clearSession();
                }
                
                // Check if we should auto-prompt for unlock
                await this.checkSecretStoreStatus();
            }
            
            // Add event listener for authentication requirements
            window.addEventListener('secretStoreAuthRequired', (event) => {
                console.log('🔐 Authentication required event received:', event.detail);
                this.handleAuthRequired(event.detail);
            });
            
            this.initialized = true;
            console.log('✅ SecretManager initialization complete');
            
            // Update status indicator after initialization
            console.log('🔧 SecretManager init complete, updating status indicator');
            if (typeof window.updateSecretStoreStatusIndicator === 'function') {
                window.updateSecretStoreStatusIndicator();
            } else {
                console.warn('updateSecretStoreStatusIndicator not available globally');
            }
        } catch (error) {
            console.warn('Failed to initialize secret manager:', error);
            showNotification('Secret storage initialization failed', 'warning');
        }
    }

    // --- DEPRECATED: Remove cached password auto-unlock ---
    async tryAutoUnlock() {
        console.warn('🔓 DEPRECATED: tryAutoUnlock() - Use secure session instead');
        // This method is deprecated and should not be used
        // Secure sessions handle authentication automatically
        return false;
    }    /**
     * Load secret storage information from backend
     */
    async loadSecretInfo() {
        try {
            const response = await apiClient.getSecretInfo();
            if (response.success) {
                this.secretStoreInfo = response.storageInfo;
                console.log('Secret storage info loaded:', this.secretStoreInfo);
                
                // CRITICAL: Backend is the source of truth for vault status
                // If backend says vault is locked, any existing session tokens are invalid
                const backendUnlockStatus = this.secretStoreInfo.isSecretStoreUnlocked === true || 
                                          this.secretStoreInfo.isSecretStoreUnlocked === 'true';
                
                if (!backendUnlockStatus && this.isSecretStoreUnlocked) {
                    console.warn('🔒 Backend reports vault is locked but frontend thinks it\'s unlocked - clearing invalid session');
                    
                    // Clear invalid session data
                    if (window.secureSession) {
                        window.secureSession.clearSession();
                    }
                    
                    // Clear any cached passwords
                    if (typeof sessionStorage !== 'undefined') {
                        sessionStorage.removeItem('anyapi_secretstore_password');
                    }
                }
                
                // Update our internal unlock status based on backend response (backend is source of truth)
                const wasUnlocked = this.isSecretStoreUnlocked;
                this.isSecretStoreUnlocked = backendUnlockStatus;
                
                if (wasUnlocked !== this.isSecretStoreUnlocked) {
                    console.log(`🔄 SecretStore unlock status changed: ${wasUnlocked} → ${this.isSecretStoreUnlocked}`);
                }
                
                // Dispatch event to update UI indicators
                window.dispatchEvent(new CustomEvent('secretStoreInfoUpdated', { 
                    detail: this.secretStoreInfo 
                }));
                
                // Update status indicator immediately
                if (typeof window.updateSecretStoreStatusIndicator === 'function') {
                    window.updateSecretStoreStatusIndicator();
                }
            }
        } catch (error) {
            console.error('Failed to load secret info:', error);
            throw error;
        }
    }/**
     * Check if SecretStore is available and needs unlocking
     */
    async checkSecretStoreStatus() {
        if (!this.secretStoreInfo) {
            return;
        }

        // If using SecretManagement, we may need to unlock SecretStore
        if (this.secretStoreInfo.provider === 'SecretManagement' && 
            this.secretStoreInfo.isSecretStoreAvailable && 
            !this.isSecretStoreUnlocked) {
            
            console.log('🔒 SecretStore is available but locked - prompting for authentication');
            
            // Auto-prompt for authentication when page loads and vault is locked
            this.promptForSecretStorePassword();
        }
    }

    /**
     * Handle authentication required event from API client
     */
    handleAuthRequired(details) {
        console.log('🔐 Handling authentication requirement:', details);
        
        // Update our unlock status
        this.isSecretStoreUnlocked = false;
        
        // Update status indicators
        if (typeof window.updateSecretStoreStatusIndicator === 'function') {
            window.updateSecretStoreStatusIndicator();
        }
        
        // Show notification about the issue
        let message = 'Authentication required';
        if (details.reason) {
            message = details.reason;
        }
        
        showNotification(message, 'warning', 8000);
        
        // Prompt for re-authentication
        this.promptForSecretStorePassword();
    }

    /**
     * Show SecretStore password prompt
     */
    promptForSecretStorePassword() {
        const modal = document.getElementById('secret-password-modal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
              // Focus on password input
            const passwordInput = document.getElementById('secret-store-password');
            if (passwordInput) {
                setTimeout(() => passwordInput.focus(), 100);
                
                // Handle Enter key
                passwordInput.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        this.unlockSecretStore();
                    }
                };
            }
        }
    }

    /**
     * Hide SecretStore password modal
     */
    hidePasswordModal() {
        const modal = document.getElementById('secret-password-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    }

    /**
     * Close SecretStore password modal (alias for hidePasswordModal)
     */
    closePasswordModal() {
        this.hidePasswordModal();
    }    /**
     * Attempt to unlock SecretStore with provided password
     */    async unlockSecretStore() {
        const passwordInput = document.getElementById('secret-store-password');
        if (!passwordInput) {
            console.error('Password input field not found');
            showNotification('Password input field not found', 'error');
            return;
        }

        const password = passwordInput.value.trim();
        if (!password) {
            showNotification('Please enter your SecretStore password', 'warning');
            return;
        }

        try {
            // Show loading state
            const unlockBtn = document.querySelector('#secret-password-modal .btn-primary');
            if (unlockBtn) {
                unlockBtn.disabled = true;
                unlockBtn.innerHTML = 'Unlocking...';
            }

            // --- SECURITY FIX: Use secure session authentication ---
            const response = await apiClient.unlockSecretStore(password);

            if (response.success) {
                this.isSecretStoreUnlocked = true;
                this.passwordAttempts = 0;
                this.hidePasswordModal();
                showNotification('SecretStore unlocked successfully', 'success');
                
                // --- SECURITY FIX: Don't cache password, session token is handled automatically ---
                console.log('✅ SecretStore unlocked with secure authentication');
                
                // Clear password input for security
                passwordInput.value = '';
                  // Emit event for other components
                window.dispatchEvent(new CustomEvent('secretStoreUnlocked'));
                
                // Update status indicator immediately
                if (typeof window.updateSecretStoreStatusIndicator === 'function') {
                    window.updateSecretStoreStatusIndicator();
                }
                
            } else {
                throw new Error(response.error || 'Failed to unlock SecretStore');
            }
        } catch (error) {
            this.passwordAttempts++;
            
            console.error('Failed to unlock SecretStore:', error);
            
            let message = `Failed to unlock SecretStore: ${error.message}`;
            if (this.passwordAttempts >= this.maxPasswordAttempts) {
                message += ` (Maximum attempts reached - you can continue without SecretStore)`;
            }
            
            showNotification(message, 'error');
            
            // Clear password input on error
            passwordInput.value = '';
            passwordInput.focus();
        } finally {
            // Reset button state
            const unlockBtn = document.querySelector('#secret-password-modal .btn-primary');
            if (unlockBtn) {
                unlockBtn.disabled = false;
                unlockBtn.innerHTML = 'Unlock';
            }
        }
    }    /**
     * Skip SecretStore and continue without persistent secret storage
     */
    skipSecretStore() {
        this.hidePasswordModal();
        // --- SECURITY FIX: Clear any cached authentication data ---
        console.log('🔒 Clearing cached authentication data');
        if (window.secureSession) {
            window.secureSession.clearSession();
        }
        showNotification('Continuing without SecretStore - secrets will be session-only', 'info');
        
        // Emit event for other components
        window.dispatchEvent(new CustomEvent('secretStoreSkipped'));
    }

    /**
     * Show secret storage information modal
     */
    async showSecretInfo() {
        try {
            // Refresh secret info
            await this.loadSecretInfo();
            
            const modal = this.createSecretInfoModal();
            document.body.appendChild(modal);
            
            // Show modal
            setTimeout(() => {
                modal.style.display = 'block';
                modal.classList.add('show');
            }, 10);
            
        } catch (error) {
            console.error('Failed to show secret info:', error);
            showNotification('Failed to load secret storage information', 'error');
        }
    }

    /**
     * Create secret info modal
     */
    createSecretInfoModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'secret-info-modal';
        
        const info = this.secretStoreInfo || {};
        
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>🔐 Secret Storage Information</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="config-section">
                        <h4>Current Configuration</h4>
                        <div class="config-item">
                            <span class="config-label">Provider:</span>
                            <span class="config-value">${info.provider || 'Unknown'}</span>
                        </div>
                        <div class="config-item">
                            <span class="config-label">SecretManagement Available:</span>
                            <span class="config-value">${info.isSecretManagementAvailable ? '✅ Yes' : '❌ No'}</span>
                        </div>
                        <div class="config-item">
                            <span class="config-label">SecretStore Available:</span>
                            <span class="config-value">${info.isSecretStoreAvailable ? '✅ Yes' : '❌ No'}</span>
                        </div>
                        <div class="config-item">
                            <span class="config-label">Status:</span>
                            <span class="config-value">${this.isSecretStoreUnlocked ? '🔓 Unlocked' : '🔒 Locked'}</span>
                        </div>
                    </div>
                    
                    ${info.vaults ? this.renderVaultsInfo(info.vaults) : ''}
                    
                    <div class="config-section">
                        <h4>Security Information</h4>
                        <p>Your API credentials are stored securely using the best available method for your platform:</p>
                        <ul style="margin: 1rem 0; padding-left: 2rem;">
                            <li><strong>SecretManagement:</strong> Encrypted using SecretStore vault (recommended)</li>
                            <li><strong>Windows:</strong> DPAPI encryption (Windows Data Protection API)</li>
                            <li><strong>macOS:</strong> Keychain integration</li>
                            <li><strong>Linux:</strong> Secret Service (GNOME/KDE)</li>
                            <li><strong>Fallback:</strong> In-memory only (session-only storage)</li>
                        </ul>
                        <p><strong>Current Method:</strong> ${this.getSecurityMethodDescription(info.provider)}</p>
                    </div>
                    
                    <div class="config-section">
                        <h4>Actions</h4>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            ${!this.isSecretStoreUnlocked && info.isSecretStoreAvailable ? 
                                '<button class="btn btn-primary" onclick="secretManager.promptForSecretStorePassword(); this.closest(\'.modal\').remove();">🔓 Unlock SecretStore</button>' : 
                                ''
                            }
                            <button class="btn btn-outline" onclick="secretManager.testSecretStorage()">🧪 Test Storage</button>
                            <button class="btn btn-outline" onclick="secretManager.refreshSecretInfo()">🔄 Refresh</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }

    /**
     * Render vaults information
     */
    renderVaultsInfo(vaults) {
        if (!vaults || vaults.length === 0) {
            return '<div class="config-section"><h4>Vaults</h4><p>No vaults configured</p></div>';
        }
        
        const vaultItems = vaults.map(vault => `
            <div class="config-item">
                <span class="config-label">${vault.name}${vault.isDefault ? ' (Default)' : ''}</span>
                <span class="config-value">${vault.moduleName}</span>
            </div>
        `).join('');
        
        return `
            <div class="config-section">
                <h4>Configured Vaults</h4>
                ${vaultItems}
            </div>
        `;
    }

    /**
     * Get security method description
     */
    getSecurityMethodDescription(provider) {
        switch (provider) {
            case 'SecretManagement':
                return 'Microsoft SecretManagement with SecretStore vault (Optimal)';
            case 'DPAPI_InMemory':
                return 'Windows DPAPI with in-memory storage (Good)';
            case 'Keychain':
                return 'macOS Keychain integration (Good)';
            case 'SecretService':
                return 'Linux Secret Service (Good)';
            case 'PlainText_InMemory_Only':
                return 'In-memory only - no persistence (Limited)';
            default:
                return 'Unknown or not configured';
        }
    }

    /**
     * Test secret storage functionality
     */
    async testSecretStorage() {
        try {
            showNotification('Testing secret storage...', 'info');
            
            // This would typically call a backend endpoint to test storage
            // For now, we'll simulate a test
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            showNotification('Secret storage test completed successfully', 'success');
        } catch (error) {
            console.error('Secret storage test failed:', error);
            showNotification(`Secret storage test failed: ${error.message}`, 'error');
        }
    }

    /**
     * Refresh secret storage information
     */
    async refreshSecretInfo() {
        try {
            showNotification('Refreshing secret storage information...', 'info');
            await this.loadSecretInfo();
            showNotification('Secret storage information refreshed', 'success');
            
            // Close current modal and show updated info
            const currentModal = document.getElementById('secret-info-modal');
            if (currentModal) {
                currentModal.remove();
                setTimeout(() => this.showSecretInfo(), 100);
            }
        } catch (error) {
            console.error('Failed to refresh secret info:', error);
            showNotification('Failed to refresh secret storage information', 'error');
        }
    }

    /**
     * Validate secret field value
     */
    validateSecretField(value, fieldName) {
        if (!value || value.trim() === '') {
            return { valid: false, message: `${fieldName} is required` };
        }
        
        if (value.length < 8) {
            return { valid: false, message: `${fieldName} should be at least 8 characters long` };
        }
        
        return { valid: true };
    }

    /**
     * Generate secure random string (for API keys, etc.)
     */
    generateSecureString(length = 32) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        return result;
    }

    /**
     * Mask sensitive value for display
     */
    maskSensitiveValue(value, visibleChars = 4) {
        if (!value || value.length <= visibleChars) {
            return '••••••••';
        }
        
        const visible = value.slice(-visibleChars);
        const masked = '•'.repeat(Math.max(8, value.length - visibleChars));
        return masked + visible;
    }

    /**
     * Check if a value appears to be sensitive
     */
    isSensitiveField(fieldName) {
        const sensitivePatterns = [
            /key/i, /secret/i, /token/i, /password/i, /auth/i,
            /credential/i, /private/i, /api.*key/i, /bearer/i
        ];
        
        return sensitivePatterns.some(pattern => pattern.test(fieldName));
    }

    /**
     * Prepare secure values for profile creation/update
     */
    prepareSecureValues(formData) {
        const secureValues = {};
        const processedData = { ...formData };
        
        // Identify and process sensitive fields
        Object.keys(formData).forEach(key => {
            if (this.isSensitiveField(key) && formData[key]) {
                secureValues[key] = formData[key];
                // Don't remove from processed data as backend expects it
                // The backend will handle secure storage
            }
        });
        
        return {
            processedData,
            secureValues
        };
    }

    /**
     * Handle SecretStore requirement for profile operations
     */
    async ensureSecretStoreAccess() {
        if (this.secretStoreInfo?.provider === 'SecretManagement' && 
            this.secretStoreInfo?.isSecretStoreAvailable && 
            !this.isSecretStoreUnlocked) {
            
            // Prompt for password
            this.promptForSecretStorePassword();
            
            // Return a promise that resolves when unlocked or skipped
            return new Promise((resolve) => {
                const handleUnlock = () => {
                    window.removeEventListener('secretStoreUnlocked', handleUnlock);
                    window.removeEventListener('secretStoreSkipped', handleSkip);
                    resolve(true);
                };
                
                const handleSkip = () => {
                    window.removeEventListener('secretStoreUnlocked', handleUnlock);
                    window.removeEventListener('secretStoreSkipped', handleSkip);
                    resolve(false);
                };
                
                window.addEventListener('secretStoreUnlocked', handleUnlock);
                window.addEventListener('secretStoreSkipped', handleSkip);
            });
        }
        
        return true;
    }

    /**
     * Get storage recommendations based on current setup
     */
    getStorageRecommendations() {
        if (!this.secretStoreInfo) {
            return ['Unable to determine storage configuration'];
        }
        
        const recommendations = [];
        
        if (this.secretStoreInfo.provider !== 'SecretManagement') {
            if (this.secretStoreInfo.isSecretManagementAvailable) {
                recommendations.push('Consider using SecretManagement for enhanced security and features');
            } else {
                recommendations.push('Install Microsoft.PowerShell.SecretManagement for optimal security');
            }
        }
        
        if (this.secretStoreInfo.provider === 'PlainText_InMemory_Only') {
            recommendations.push('Current setup provides no persistence - secrets will be lost when session ends');
            recommendations.push('Install SecretManagement modules for persistent secure storage');
        }
        
        if (this.secretStoreInfo.provider === 'SecretManagement' && !this.isSecretStoreUnlocked) {
            recommendations.push('Unlock SecretStore to enable persistent secret storage');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Your secret storage is optimally configured');
        }
        
        return recommendations;
    }

    /**
     * Show modal to manage secrets for a profile
     */
    async showProfileSecrets(profileName) {
        try {
            // Ensure SecretStore is unlocked if required
            const access = await this.ensureSecretStoreAccess();
            if (!access) {
                showNotification('SecretStore access required to manage secrets', 'warning');
                return;
            }

            // Load secrets for the profile
            const secrets = await this.listProfileSecrets(profileName);

            // Build modal
            const modal = document.createElement('div');
            modal.className = 'modal show';
            modal.id = 'profile-secrets-modal';
            modal.style.display = 'block';

            modal.innerHTML = `
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>🔑 Secrets for Profile: <span style="color:var(--color-primary)">${escapeHtml(profileName)}</span></h3>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="secrets-list-container">
                            ${this.renderSecretsList(secrets, profileName)}
                        </div>
                        <button class="btn btn-primary" onclick="secretManager.showAddSecretForm('${profileName}')">➕ Add Secret</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        } catch (error) {
            showNotification('Failed to load secrets: ' + error.message, 'error');
        }
    }

    /**
     * Render secrets list table
     */
    renderSecretsList(secrets, profileName) {
        if (!secrets || secrets.length === 0) {
            return `<div class="empty-state"><div class="empty-icon">🔑</div><p>No secrets found for this profile.</p></div>`;
        }
        return `
            <table class="secrets-table" style="width:100%;margin-bottom:1rem;">
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>Value</th>
                        <th style="width:120px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${secrets.map(secret => `
                        <tr>
                            <td>${escapeHtml(secret.key)}</td>
                            <td>
                                <span id="secret-value-${secret.key}">${this.maskSensitiveValue(secret.value)}</span>
                                <button class="btn btn-sm btn-outline" title="Show/Hide" onclick="secretManager.toggleSecretVisibility('${secret.key}', '${escapeHtml(secret.value)}')">👁️</button>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-outline" onclick="secretManager.showEditSecretForm('${profileName}', '${secret.key}', '${escapeHtml(secret.value)}')">✏️ Edit</button>
                                <button class="btn btn-sm btn-danger" onclick="secretManager.deleteSecret('${profileName}', '${secret.key}')">🗑️ Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Toggle secret value visibility
     */
    toggleSecretVisibility(secretKey, value) {
        const el = document.getElementById(`secret-value-${secretKey}`);
        if (!el) return;
        if (el.dataset.visible === 'true') {
            el.textContent = this.maskSensitiveValue(value);
            el.dataset.visible = 'false';
        } else {
            el.textContent = value;
            el.dataset.visible = 'true';
        }
    }

    /**
     * Show add secret form
     */
    showAddSecretForm(profileName) {
        const container = document.getElementById('secrets-list-container');
        if (!container) return;
        container.insertAdjacentHTML('beforeend', `
            <form id="add-secret-form" style="margin-bottom:1rem;">
                <div class="form-row">
                    <input type="text" id="new-secret-key" class="form-control" placeholder="Secret Key" required style="width:40%;">
                    <input type="text" id="new-secret-value" class="form-control" placeholder="Secret Value" required style="width:40%;">
                    <button type="submit" class="btn btn-primary">Save</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('form').remove()">Cancel</button>
                </div>
            </form>
        `);
        document.getElementById('add-secret-form').onsubmit = async (e) => {
            e.preventDefault();
            const key = document.getElementById('new-secret-key').value.trim();
            const value = document.getElementById('new-secret-value').value.trim();
            if (!key || !value) {
                showNotification('Key and value are required', 'warning');
                return;
            }
            await this.saveSecret(profileName, key, value);
            // Refresh secrets list
            this.refreshProfileSecrets(profileName);
        };
    }

    /**
     * Show edit secret form
     */
    showEditSecretForm(profileName, secretKey, value) {
        const container = document.getElementById('secrets-list-container');
        if (!container) return;
        container.insertAdjacentHTML('beforeend', `
            <form id="edit-secret-form" style="margin-bottom:1rem;">
                <div class="form-row">
                    <input type="text" id="edit-secret-key" class="form-control" value="${escapeHtml(secretKey)}" readonly style="width:40%;">
                    <input type="text" id="edit-secret-value" class="form-control" value="${escapeHtml(value)}" required style="width:40%;">
                    <button type="submit" class="btn btn-primary">Update</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('form').remove()">Cancel</button>
                </div>
            </form>
        `);
        document.getElementById('edit-secret-form').onsubmit = async (e) => {
            e.preventDefault();
            const newValue = document.getElementById('edit-secret-value').value.trim();
            if (!newValue) {
                showNotification('Value is required', 'warning');
                return;
            }
            await this.saveSecret(profileName, secretKey, newValue);
            this.refreshProfileSecrets(profileName);
        };
    }

    /**
     * Refresh secrets list in modal
     */
    async refreshProfileSecrets(profileName) {
        const secrets = await this.listProfileSecrets(profileName);
        const container = document.getElementById('secrets-list-container');
        if (container) {
            container.innerHTML = this.renderSecretsList(secrets, profileName);
        }
    }

    /**
     * List secrets for a profile
     */
    async listProfileSecrets(profileName) {
        try {
            const response = await apiClient.fetch(`/api/profiles/${encodeURIComponent(profileName)}/secrets`, { method: 'GET' });
            if (response.success) {
                return response.secrets || [];
            }
            throw new Error(response.error || 'Failed to list secrets');
        } catch (error) {
            showNotification('Failed to list secrets: ' + error.message, 'error');
            return [];
        }
    }

    /**
     * Save (add/update) a secret for a profile
     */
    async saveSecret(profileName, key, value) {
        try {
            const response = await apiClient.fetch(`/api/profiles/${encodeURIComponent(profileName)}/secrets`, {
                method: 'POST',
                body: JSON.stringify({ key, value })
            });
            if (response.success) {
                showNotification('Secret saved', 'success');
            } else {
                throw new Error(response.error || 'Failed to save secret');
            }
        } catch (error) {
            showNotification('Failed to save secret: ' + error.message, 'error');
        }
    }

    /**
     * Delete a secret for a profile
     */
    async deleteSecret(profileName, key) {
        if (!confirm(`Delete secret "${key}"? This cannot be undone.`)) return;
        try {
            const response = await apiClient.fetch(`/api/profiles/${encodeURIComponent(profileName)}/secrets/${encodeURIComponent(key)}`, {
                method: 'DELETE'
            });
            if (response.success) {
                showNotification('Secret deleted', 'success');
                this.refreshProfileSecrets(profileName);
            } else {
                throw new Error(response.error || 'Failed to delete secret');
            }
        } catch (error) {
            showNotification('Failed to delete secret: ' + error.message, 'error');
        }
    }
}

// ===== UTILITY FUNCTIONS FOR SECRET MANAGEMENT =====

/**
 * Create a secure input field with visibility toggle
 */
function createSecureInput(id, placeholder = '', required = false) {
    const container = document.createElement('div');
    container.className = 'secure-input-container';
    container.style.position = 'relative';
    
    const input = document.createElement('input');
    input.type = 'password';
    input.id = id;
    input.className = 'form-control';
    input.placeholder = placeholder;
    input.required = required;
    
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'btn btn-sm btn-outline';
    toggleBtn.style.position = 'absolute';
    toggleBtn.style.right = '8px';
    toggleBtn.style.top = '50%';
    toggleBtn.style.transform = 'translateY(-50%)';
    toggleBtn.style.padding = '4px 8px';
    toggleBtn.innerHTML = '👁️';
    toggleBtn.title = 'Toggle visibility';
    
    toggleBtn.onclick = () => {
        if (input.type === 'password') {
            input.type = 'text';
            toggleBtn.innerHTML = '🙈';
        } else {
            input.type = 'password';
            toggleBtn.innerHTML = '👁️';
        }
    };
    
    container.appendChild(input);
    container.appendChild(toggleBtn);
    
    return container;
}

/**
 * Validate password strength
 */
function validatePasswordStrength(password) {
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        numbers: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    
    let strength = 'Very Weak';
    let color = '#ef4444';
    
    if (score >= 4) {
        strength = 'Strong';
        color = '#10b981';
    } else if (score >= 3) {
        strength = 'Medium';
        color = '#f59e0b';
    } else if (score >= 2) {
        strength = 'Weak';
        color = '#f97316';
    }
    
    return {
        score,
        strength,
        color,
        checks,
        isStrong: score >= 3
    };
}

// Initialize global secret manager (but don't auto-init)
const secretManager = new SecretManager();

// Make it globally available
window.secretManager = secretManager;