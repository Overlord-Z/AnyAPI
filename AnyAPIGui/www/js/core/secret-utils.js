// secret-utils.js
// Utilities for SecretStore and secure storage integration
// Place in www/js/core/secret-utils.js

/**
 * Returns true if SecretStore is available and unlocked, false otherwise.
 * Checks both secretManager singleton and info endpoint.
 */
function isSecretStoreUnlocked() {
    // Primary source: secretManager (which has the actual data from the API)
    if (window.secretManager && window.secretManager.secretStoreInfo && window.secretManager.initialized) {
        const secretStoreInfo = window.secretManager.secretStoreInfo;
        const available = secretStoreInfo.isSecretStoreAvailable === true || secretStoreInfo.isSecretStoreAvailable === 'true';
        const unlocked = window.secretManager.isSecretStoreUnlocked === true;
        return available && unlocked;
    }
    
    // Fallback: check window.info if secretManager not available
    const info = window.info && window.info.storageInfo ? window.info.storageInfo : null;
    if (info && typeof info.isSecretStoreUnlocked === 'boolean') {
        return info.isSecretStoreAvailable && info.isSecretStoreUnlocked;
    }
    
    // If neither source has definitive data, return false
    return false;
}

/**
 * Attempts to unlock the SecretStore and refresh info.
 * Accepts a password parameter.
 * Returns a promise that resolves to the unlock result.
 */
async function unlockSecretStoreAndRefresh(password) {
    if (window.apiClient && typeof window.apiClient.unlockSecretStore === 'function') {
        const result = await window.apiClient.unlockSecretStore(password);
        if (result && result.success) {
            if (window.apiClient.getInfo) {
                const info = await window.apiClient.getInfo();
                window.info = info;
                window.dispatchEvent(new Event('info-updated'));
            }
        }
        return result;
    } else {
        alert('SecretStore unlock API not available.');
        return { success: false };
    }
}

/**
 * Show a modal prompt for password input. Returns a Promise that resolves to the password or null if cancelled.
 */
function showSecretStorePasswordPrompt() {
    return new Promise((resolve) => {
        // Remove any existing modal
        const existing = document.getElementById('secretstore-password-modal');
        if (existing) existing.remove();
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'secretstore-password-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content small">
                <div class="modal-header">
                    <h3>Unlock SecretStore</h3>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="secretstore-password-input">Enter SecretStore Password</label>
                        <input type="password" id="secretstore-password-input" class="form-control" autocomplete="current-password" />
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="secretstore-password-ok">Unlock</button>
                    <button class="btn btn-outline" id="secretstore-password-cancel">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        // Focus input
        setTimeout(() => {
            document.getElementById('secretstore-password-input').focus();
        }, 100);
        // Handlers
        document.getElementById('secretstore-password-ok').onclick = () => {
            const val = document.getElementById('secretstore-password-input').value;
            modal.remove();
            resolve(val);
        };
        document.getElementById('secretstore-password-cancel').onclick = () => {
            modal.remove();
            resolve(null);
        };
        document.getElementById('secretstore-password-input').onkeydown = (e) => {
            if (e.key === 'Enter') {
                document.getElementById('secretstore-password-ok').click();
            }
        };
    });
}

/**
 * Update the persistent SecretStore status indicator in the header.
 */
function updateSecretStoreStatusIndicator() {
    console.log('🔧 updateSecretStoreStatusIndicator called');
    
    const statusEl = document.getElementById('secretstore-status');
    const iconEl = document.getElementById('secretstore-status-icon');
    
    if (!statusEl || !iconEl) {
        console.warn('⚠️ Secret store status elements not found');
        return;
    }
    
    // Remove all status classes and click handlers
    statusEl.classList.remove('unlocked', 'locked', 'checking', 'clickable');
    statusEl.style.cursor = 'default';
    statusEl.onclick = null;
    
    // Check if SecretManager exists and is unlocked
    if (window.secretManager) {
        if (window.secretManager.isUnlocked || window.secretManager.unlocked || window.secretManager.isSecretStoreUnlocked) {
            statusEl.classList.add('unlocked');
            iconEl.setAttribute('data-feather', 'unlock');
            statusEl.title = 'SecretStore Unlocked';
            console.log('✅ SecretStore status updated: unlocked');
        } else if (!window.secretManager.initialized) {
            statusEl.classList.add('checking');
            iconEl.setAttribute('data-feather', 'loader');
            statusEl.title = 'Checking SecretStore...';
            console.log('✅ SecretStore status updated: checking');
        } else {
            // SecretStore is locked - make it clickable
            statusEl.classList.add('locked', 'clickable');
            iconEl.setAttribute('data-feather', 'lock');
            statusEl.title = 'SecretStore Locked - Click to unlock';
            statusEl.style.cursor = 'pointer';
            statusEl.onclick = handleSecretStoreUnlock;
            console.log('✅ SecretStore status updated: locked (clickable)');
        }
    } else {
        statusEl.classList.add('checking');
        iconEl.setAttribute('data-feather', 'loader');
        statusEl.title = 'Checking SecretStore...';
        console.log('✅ SecretStore status updated: checking (no SecretManager)');
    }
    
    if (window.feather) {
        window.feather.replace({ width: 18, height: 18, 'stroke-width': 2 });
    }
}

/**
 * Handle clicking on the locked SecretStore status to unlock it
 */
function handleSecretStoreUnlock() {
    console.log('🔐 SecretStore unlock clicked');
    
    // First try to use the existing SecretManager modal
    if (window.secretManager && typeof window.secretManager.promptForSecretStorePassword === 'function') {
        console.log('✅ Using existing SecretManager password modal');
        window.secretManager.promptForSecretStorePassword();
        return;
    }
    
    // Second option: Use the existing modal in the HTML
    const existingModal = document.getElementById('secret-password-modal');
    if (existingModal) {
        console.log('✅ Using existing HTML password modal');
        existingModal.classList.add('show');
        existingModal.style.display = 'flex';
        
        // Focus the password input
        const passwordInput = document.getElementById('secret-store-password');
        if (passwordInput) {
            setTimeout(() => passwordInput.focus(), 100);
        }
        return;
    }
    
    // Last resort: Use the utility function
    console.log('⚠️ Falling back to utility password prompt');
    showSecretStorePasswordPrompt().then(password => {
        if (password) {
            unlockSecretStoreAndRefresh(password).then(result => {
                if (result && result.success) {
                    if (window.showNotification) {
                        window.showNotification('SecretStore unlocked successfully!', 'success');
                    }
                    updateSecretStoreStatusIndicator();
                } else {
                    if (window.showNotification) {
                        window.showNotification('Failed to unlock SecretStore', 'error');
                    }
                }
            }).catch(error => {
                console.error('SecretStore unlock error:', error);
                if (window.showNotification) {
                    window.showNotification('Error unlocking SecretStore', 'error');
                }
            });
        }
    });
}

// Make functions globally available immediately when this script loads
window.isSecretStoreUnlocked = isSecretStoreUnlocked;
window.unlockSecretStoreAndRefresh = unlockSecretStoreAndRefresh;
window.showSecretStorePasswordPrompt = showSecretStorePasswordPrompt;
window.updateSecretStoreStatusIndicator = updateSecretStoreStatusIndicator;
window.handleSecretStoreUnlock = handleSecretStoreUnlock;

// Mark that secret-utils is loaded
window.secretUtilsLoaded = true;
console.log('✅ Secret utilities loaded and functions made globally available');
