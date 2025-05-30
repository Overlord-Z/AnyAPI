// secret-utils.js
// Utilities for SecretStore and secure storage integration
// Place in www/js/core/secret-utils.js

/**
 * Returns true if SecretStore is available and unlocked, false otherwise.
 * Checks both info endpoint and secretManager singleton.
 */
function isSecretStoreUnlocked() {
    const info = window.info && window.info.storageInfo ? window.info.storageInfo : null;
    // Prefer explicit unlocked property if present
    if (info && typeof info.isSecretStoreUnlocked === 'boolean') {
        return info.isSecretStoreAvailable && info.isSecretStoreUnlocked;
    }
    // Fallback: check secretManager singleton if available
    if (window.secretManager && typeof window.secretManager.isSecretStoreUnlocked === 'boolean') {
        return info && info.isSecretStoreAvailable && window.secretManager.isSecretStoreUnlocked;
    }
    // Fallback: only available
    return !!(info && info.isSecretStoreAvailable);
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
    const statusDiv = document.getElementById('secretstore-status');
    const icon = document.getElementById('secretstore-status-icon');
    const text = document.getElementById('secretstore-status-text');
    if (!statusDiv || !icon || !text) {
        console.log('❌ Status indicator elements not found');
        return;
    }    // If SecretManager is not yet initialized, show checking status
    if (window.secretManager && !window.secretManager.initialized) {
        console.log('⏳ SecretManager not yet initialized, showing checking status');
        icon.setAttribute('data-feather', 'clock');
        text.textContent = 'SecretStore Checking...';
        statusDiv.style.color = '#ffa500';
        if (window.feather) window.feather.replace();
        return;
    }
    
    // If SecretManager doesn't exist at all, show N/A
    if (!window.secretManager) {
        console.log('❌ SecretManager not available, showing N/A');
        icon.setAttribute('data-feather', 'slash');
        text.textContent = 'SecretStore N/A';
        statusDiv.style.color = '#aaa';
        if (window.feather) window.feather.replace();
        return;
    }
    
    let available = false;
    let unlocked = false;
      // Primary source: secretManager (which has the actual data from the API)
    if (window.secretManager && window.secretManager.secretStoreInfo && window.secretManager.initialized) {
        const info = window.secretManager.secretStoreInfo;
        console.log('🔍 SecretManager info found:', info);
        available = info.isSecretStoreAvailable === true || info.isSecretStoreAvailable === 'true';
        unlocked = window.secretManager.isSecretStoreUnlocked === true;
        console.log(`🔍 From SecretManager - available: ${available}, unlocked: ${unlocked}`);
    } else {
        console.log('❌ SecretManager not initialized or secretStoreInfo not available');
    }
    
    // Fallback: check window.info if secretManager not available
    if (!available) {
        const info = window.info && window.info.storageInfo ? window.info.storageInfo : null;
        console.log('🔍 Fallback to window.info:', info);
        if (info) {
            available = info.isSecretStoreAvailable === true || info.isSecretStoreAvailable === 'true';
            // Accept both boolean and string true
            unlocked = (typeof info.isSecretStoreUnlocked === 'boolean' && info.isSecretStoreUnlocked) ||
                       (typeof info.isSecretStoreUnlocked === 'string' && info.isSecretStoreUnlocked.toLowerCase() === 'true');
            console.log(`🔍 From window.info - available: ${available}, unlocked: ${unlocked}`);
        }
    }    if (!available) {
        console.log('🔒 Setting status to N/A');
        icon.setAttribute('data-feather', 'slash');
        text.textContent = 'SecretStore N/A';
        statusDiv.style.color = '#aaa';
    } else if (unlocked) {
        console.log('🔓 Setting status to Unlocked');
        icon.setAttribute('data-feather', 'unlock');
        text.textContent = 'SecretStore Unlocked';
        statusDiv.style.color = '#27d645';
    } else {
        console.log('🔒 Setting status to Locked');
        icon.setAttribute('data-feather', 'lock');
        text.textContent = 'SecretStore Locked';
        statusDiv.style.color = '#e74c3c';    }
    if (window.feather) window.feather.replace();
}

// Make functions globally available
window.isSecretStoreUnlocked = isSecretStoreUnlocked;
window.unlockSecretStoreAndRefresh = unlockSecretStoreAndRefresh;
window.showSecretStorePasswordPrompt = showSecretStorePasswordPrompt;
window.updateSecretStoreStatusIndicator = updateSecretStoreStatusIndicator;
