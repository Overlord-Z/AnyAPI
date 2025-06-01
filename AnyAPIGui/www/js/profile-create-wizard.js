// profile-create-wizard.js
// ES6 Profile Create Wizard for AnyAPI GUI
// Place in www/js/profile-create-wizard.js

import {
    AUTH_TYPES,
    HEADER_TEMPLATES,
    getMerakiHeaderOptions,
    maskSecret,
    validateProfileFields,
    buildProfileObject
} from './core/profile-wizard-utils.js';

// Note: secret utils functions are now available globally via window object
// import { isSecretStoreUnlocked, unlockSecretStoreAndRefresh, showSecretStorePasswordPrompt } from './core/secret-utils.js';

class ProfileCreateWizard {
    constructor() {
        this.state = {
            step: 1,
            fields: {
                name: '',
                baseUrl: '',
                authType: '',
                apiKeyValue: '',
                apiKeyHeader: '',
                tokenValue: '',
                customScript: '',
                merakiStyle: 'apiKey',
                defaultHeaders: {},
                pagination: {},
                customSettings: {},
                isSessionOnly: false,
                description: '',
            },            errors: {},
        };
        this.modal = null;
    }

    show() {
        this.renderModal();
    }

    renderModal() {
        // Remove existing modal if present
        const existing = document.getElementById('profile-wizard-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'profile-wizard-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = this.renderContent();
        document.body.appendChild(modal);
        this.modal = modal;
        this.attachEvents();
    }

    // Helper to mask secrets in header previews and review
    maskSecret(value) {
        if (!value) return '';
        // Show only first and last char, mask the rest
        if (typeof value === 'string' && value.length > 4) {
            return value[0] + '***' + value[value.length - 1];
        }
        return '***';
    }

    renderContent() {
        // Step 1: Basic Info, Step 2: Auth, Step 3: Headers/Advanced, Step 4: Review
        const { step, fields, errors } = this.state;
        let content = '';
        // Show global error if present
        let errorHtml = '';
        if (this.state.errors && this.state.errors.create) {
            errorHtml = `<div class="wizard-error">${this.state.errors.create}</div>`;
        }
        if (step === 1) {
            // Step 1: Basic Info
            content = `
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>Create API Profile (Wizard)</h3>
                        <button class="modal-close" onclick="window.profileCreateWizard.close()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Profile Name</label>
                            <input type="text" id="wizard-profile-name" class="form-control" value="${fields.name}" />
                            ${errors.name ? `<div class="form-error">${errors.name}</div>` : ''}
                        </div>
                        <div class="form-group">
                            <label>Base URL</label>
                            <input type="url" id="wizard-profile-baseurl" class="form-control" value="${fields.baseUrl}" placeholder="https://api.example.com" />
                            ${errors.baseUrl ? `<div class="form-error">${errors.baseUrl}</div>` : ''}
                        </div>                        <div class="form-group">
                            <label>Authentication Type</label>
                            <select id="wizard-profile-authtype" class="form-control">
                                <option value="">Select...</option>
                                <option value="None">None (No Authentication)</option>
                                <option value="ApiKey">API Key</option>
                                <option value="BearerToken">Bearer Token</option>
                                <option value="CustomScript">Custom Script</option>
                                <option value="Meraki">Meraki (API Key or Bearer)</option>
                            </select>
                            ${errors.authType ? `<div class="form-error">${errors.authType}</div>` : ''}
                        </div>
                        <div class="form-group">
                            <label style="font-weight: normal; color: var(--text-secondary);">Or start from a template:</label>
                            <button type="button" id="wizard-select-template-btn" class="btn btn-outline" style="width: 100%;">
                                📋 Browse Templates
                            </button>
                            <small class="form-help">Choose from predefined API configurations</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" id="wizard-next-btn">Next</button>
                        <button class="btn btn-outline" onclick="window.profileCreateWizard.close()">Cancel</button>
                    </div>
                </div>
            `;        } else if (step === 2) {
            // Step 2: Auth & Header Config
            // Use the single source of truth for SecretStore status
            const isSecretStoreUnlockedVal = window.isSecretStoreUnlocked();
            console.log('[ProfileWizard] Step 2 render - SecretStore status:', isSecretStoreUnlockedVal);
            const secretStoreStatus = isSecretStoreUnlockedVal
                ? '<span style="font-weight:bold; color:#27d645;">🔓 SecretStore Unlocked</span>'
                : '<span style="font-weight:bold; color:#e74c3c;">🔒 SecretStore Locked</span>';
            const unlockLink = !isSecretStoreUnlockedVal
                ? '<li><a href="#" id="wizard-unlock-secretstore-link">Unlock SecretStore</a> for persistent secure storage.</li>'
                : '';
            content = `
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>Step 2: Authentication & Headers</h3>
                        <button class="modal-close" onclick="window.profileCreateWizard.close()">&times;</button>
                    </div>
                    <div class="modal-body">                        <div class="form-group">
                            <label>Authentication Type</label>
                            <select id="wizard-auth-type" class="form-control">
                                <option value="None" ${fields.authType === 'None' ? 'selected' : ''}>None (No Authentication)</option>
                                <option value="ApiKey" ${fields.authType === 'ApiKey' ? 'selected' : ''}>API Key</option>
                                <option value="BearerToken" ${fields.authType === 'BearerToken' ? 'selected' : ''}>Bearer Token</option>
                                <option value="CustomScript" ${fields.authType === 'CustomScript' ? 'selected' : ''}>Custom Script</option>
                                <option value="Meraki" ${fields.authType === 'Meraki' ? 'selected' : ''}>Meraki (API Key or Bearer)</option>
                            </select>
                        </div>
                        <div id="wizard-auth-fields">
                            ${this.renderAuthFields()}
                        </div>
                        <div class="form-group">
                            <label>Header Preview</label>
                            <pre id="wizard-header-preview" class="code-block" style="min-height:2.5em;">${this.renderHeaderPreview()}</pre>
                        </div>
                        <div class="form-group">
                            <div class="auth-help">
                                <strong>🔒 Secure Secret Handling:</strong>
                                <ul style="margin:0.5em 0 0 1.5em;">
                                    <li>Secrets are stored using the most secure method available (SecretStore, OS Keychain, or in-memory).</li>
                                    <li>Status: ${secretStoreStatus}</li>
                                    ${unlockLink}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" id="wizard-back-btn">Back</button>
                        <button class="btn btn-primary" id="wizard-next-btn">Next</button>
                        <button class="btn btn-outline" onclick="window.profileCreateWizard.close()">Cancel</button>
                    </div>
                </div>
            `;
        } else if (step === 3) {
            // Step 3: Headers & Advanced Config
            content = `
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>Step 3: Headers & Advanced</h3>
                        <button class="modal-close" onclick="window.profileCreateWizard.close()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Default Headers (JSON)</label>
                            <textarea id="wizard-default-headers" class="form-control code-input" rows="3" placeholder='{"Content-Type": "application/json"}'>${fields.defaultHeadersRaw || ''}</textarea>
                            <small class="form-help">Optional: Headers to include with every request</small>
                            ${errors.defaultHeaders ? `<div class="form-error">${errors.defaultHeaders}</div>` : ''}
                        </div>
                        <div class="form-group">
                            <label>Pagination Details (JSON)</label>
                            <textarea id="wizard-pagination-details" class="form-control code-input" rows="2" placeholder='{"PageParameter": "page", "PageSizeParameter": "pageSize"}'>${fields.paginationRaw || ''}</textarea>
                            <small class="form-help">Optional: Advanced pagination configuration</small>
                            ${errors.pagination ? `<div class="form-error">${errors.pagination}</div>` : ''}
                        </div>
                        <div class="form-group">
                            <label>Custom Settings</label>
                            <div id="wizard-customsettings-list" class="dynamic-list"></div>
                            <button type="button" id="wizard-add-customsetting-btn" class="btn btn-outline btn-sm btn-add" style="margin-top:0.5em;">
                                <span class="btn-icon">➕</span> Add Setting
                            </button>
                            <small class="form-help">Custom settings are sent with every request and may be required by some APIs.</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" id="wizard-back-btn">Back</button>
                        <button class="btn btn-primary" id="wizard-next-btn">Next</button>
                        <button class="btn btn-outline" onclick="window.profileCreateWizard.close()">Cancel</button>
                    </div>
                </div>
            `;
        } else if (step === 4) {
            // Step 4: Review & Create
            const mergedHeaders = this.getMergedHeadersPreview();
            content = `
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>Step 4: Review & Create</h3>
                        <button class="modal-close" onclick="window.profileCreateWizard.close()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="review-section">
                            <h4>Profile Summary</h4>
                            <table class="review-table">
                                <tr><th>Name</th><td>${fields.name}</td></tr>
                                <tr><th>Base URL</th><td>${fields.baseUrl}</td></tr>
                                <tr><th>Auth Type</th><td>${fields.authType}</td></tr>
                                <tr><th>Description</th><td>${fields.description || '<em>(none)</em>'}</td></tr>
                                <tr><th>Session Only</th><td>${fields.isSessionOnly ? 'Yes' : 'No'}</td></tr>
                                <tr><th>Default Headers</th><td><pre class="code-block">${fields.defaultHeaders && Object.keys(fields.defaultHeaders).length ? JSON.stringify(fields.defaultHeaders, null, 2) : '<em>(none)</em>'}</pre></td></tr>
                                <tr><th>Auth Headers</th><td><pre class="code-block">${(() => { const h = this.getMergedHeadersPreview(); return Object.keys(h).length ? JSON.stringify(h, null, 2) : '<em>(none)</em>'; })()}</pre></td></tr>
                                <tr><th>Pagination</th><td><pre class="code-block">${fields.pagination && Object.keys(fields.pagination).length ? JSON.stringify(fields.pagination, null, 2) : '<em>(none)</em>'}</pre></td></tr>
                                <tr><th>Custom Settings</th><td><pre class="code-block">${fields.customSettings && Object.keys(fields.customSettings).length ? JSON.stringify(fields.customSettings, null, 2) : '<em>(none)</em>'}</pre></td></tr>
                                ${fields.authType === 'ApiKey' ? `<tr><th>API Key</th><td>${fields.apiKeyValue ? '••••••••' : '<em>(none)</em>'}</td></tr><tr><th>Header Name</th><td>${fields.apiKeyHeader}</td></tr>` : ''}
                                ${fields.authType === 'BearerToken' ? `<tr><th>Bearer Token</th><td>${fields.tokenValue ? '••••••••' : '<em>(none)</em>'}</td></tr>` : ''}
                                ${fields.authType === 'CustomScript' ? `<tr><th>Custom Script</th><td><pre class="code-block">${fields.customScript ? fields.customScript : '<em>(none)</em>'}</pre></td></tr>` : ''}
                                ${fields.authType === 'Meraki' ? `<tr><th>Meraki Style</th><td>${fields.merakiStyle}</td></tr><tr><th>API Key</th><td>${fields.apiKeyValue ? '••••••••' : '<em>(none)</em>'}</td></tr>` : ''}
                            </table>
                        </div>
                        <div class="review-section">
                            <h4>Headers Sent With Requests</h4>
                            <pre class="code-block" style="margin-bottom:0;">${(() => { const h = this.getMergedHeadersPreview(); return Object.keys(h).length ? JSON.stringify(h, null, 2) : '// No headers'; })()}</pre>
                        </div>
                        ${errors.create ? `<div class="form-error" style="margin-top:1em;">${errors.create}</div>` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" id="wizard-back-btn">Back</button>
                        <button class="btn btn-primary" id="wizard-create-btn">Create Profile</button>
                        <button class="btn btn-outline" onclick="window.profileCreateWizard.close()">Cancel</button>
                    </div>
                </div>
            `;
        } else {
            content = `<div style="padding:2em;">(Wizard step ${step} coming soon...)</div>`;
        }
        // For each field, show inline error if present
        const fieldError = (field) => {
            return this.state.errors && this.state.errors[field] ? `<div class="wizard-error-inline">${this.state.errors[field]}</div>` : '';
        };
        // Add errorHtml to the top of the modal
        return errorHtml + content;
    }    // Render dynamic auth fields for step 2
    renderAuthFields() {
        const { authType, apiKeyValue, apiKeyHeader, tokenValue, customScript, merakiStyle } = this.state.fields;
        // Help text and dynamic fields per auth type
        switch (authType) {
            case 'None':
                return `
                    <div class="auth-help">
                        <strong>No Authentication</strong><br>
                        This API does not require authentication. Requests will be sent without authentication headers.
                    </div>
                `;
            case 'ApiKey':
                // Ensure apiKeyHeader is set in state if empty
                if (!this.state.fields.apiKeyHeader) {
                    this.state.fields.apiKeyHeader = 'X-API-Key';
                }
                return `
                    <div class="auth-help">
                        <strong>API Key Authentication</strong><br>
                        Enter your API key and header name (default: X-API-Key).
                    </div>
                    <form id="wizard-apikey-form" autocomplete="off" style="margin:0;" onsubmit="return false;">
                        <input type="text" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;" tabindex="-1" aria-hidden="true" autocomplete="username" />
                        <div class="form-group">
                            <label>API Key</label>
                            <input type="password" id="wizard-apikey-value" class="form-control" value="${apiKeyValue || ''}" autocomplete="new-password" />
                        </div>
                        <div class="form-group">
                            <label>Header Name</label>
                            <input type="text" id="wizard-apikey-header" class="form-control" value="${this.state.fields.apiKeyHeader}" />
                        </div>
                    </form>
                `;
            case 'BearerToken':
                return `
                    <div class="auth-help">
                        <strong>Bearer Token Authentication</strong><br>
                        Enter your bearer token. It will be sent as an Authorization header.
                    </div>
                    <form id="wizard-bearer-form" autocomplete="off" style="margin:0;" onsubmit="return false;">
                        <input type="text" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;" tabindex="-1" aria-hidden="true" autocomplete="username" />
                        <div class="form-group">
                            <label>Bearer Token</label>
                            <input type="password" id="wizard-token-value" class="form-control" value="${tokenValue || ''}" autocomplete="new-password" />
                        </div>
                    </form>
                `;
            case 'CustomScript':
                return `
                    <div class="auth-help">
                        <strong>Custom Authentication Script</strong><br>
                        Provide a PowerShell script to generate authentication headers. Use <code>$RequestContext.GetPlainTextSecret.Invoke('credentialName')</code> to access credentials.
                    </div>
                    <div class="form-group">
                        <label>Script</label>
                        <textarea id="wizard-custom-script" class="form-control code-input" rows="7">${customScript || ''}</textarea>
                    </div>
                `;
            case 'Meraki':
                return `
                    <div class="auth-help">
                        <strong>Meraki Authentication</strong><br>
                        Choose style and enter your Meraki API key.
                    </div>
                    <form id="wizard-meraki-form" autocomplete="off" style="margin:0;" onsubmit="return false;">
                        <input type="text" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;" tabindex="-1" aria-hidden="true" autocomplete="username" />
                        <div class="form-group">
                            <label>Style</label>
                            <select id="wizard-meraki-style" class="form-control">
                                <option value="apiKey" ${merakiStyle === 'apiKey' ? 'selected' : ''}>X-Cisco-Meraki-API-Key header</option>
                                <option value="bearer" ${merakiStyle === 'bearer' ? 'selected' : ''}>Bearer Token header</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>API Key</label>
                            <input type="password" id="wizard-meraki-apikey" class="form-control" value="${apiKeyValue || ''}" autocomplete="new-password" />
                        </div>
                    </form>
                `;
            default:
                return `<div class="auth-help">Select an authentication type above.</div>`;
        }
    }    // Render live header preview for step 2
    renderHeaderPreview() {
        const { authType, apiKeyValue, apiKeyHeader, tokenValue, merakiStyle } = this.state.fields;
        let headers = {};
        switch (authType) {
            case 'None':
                // No authentication headers
                break;
            case 'ApiKey':
                if (apiKeyHeader && apiKeyValue) headers[apiKeyHeader] = maskSecret(apiKeyValue);
                break;
            case 'BearerToken':
                if (tokenValue) headers['Authorization'] = 'Bearer ' + maskSecret(tokenValue);
                break;
            case 'Meraki':
                if (merakiStyle === 'bearer' && apiKeyValue) {
                    headers['Authorization'] = 'Bearer ' + maskSecret(apiKeyValue);
                    headers['Content-Type'] = 'application/json';
                } else if (apiKeyValue) {
                    headers['X-Cisco-Meraki-API-Key'] = maskSecret(apiKeyValue);
                    headers['Content-Type'] = 'application/json';
                }
                break;
            default:
                break;
        }
        return Object.keys(headers).length ? JSON.stringify(headers, null, 2) : '// No auth headers yet';
    }    // Utility: Merge default headers and auth headers for preview (step 4)
    getMergedHeadersPreview() {
        // Build auth headers (same logic as renderHeaderPreview, but unmasked for backend, masked for UI)
        const { authType, apiKeyValue, apiKeyHeader, tokenValue, merakiStyle, defaultHeaders } = this.state.fields;
        let authHeaders = {};
        switch (authType) {
            case 'None':
                // No authentication headers
                break;
            case 'ApiKey':
                if (apiKeyHeader && apiKeyValue) authHeaders[apiKeyHeader] = maskSecret(apiKeyValue);
                break;
            case 'BearerToken':
                if (tokenValue) authHeaders['Authorization'] = 'Bearer ' + maskSecret(tokenValue);
                break;
            case 'Meraki':
                if (merakiStyle === 'bearer' && apiKeyValue) {
                    authHeaders['Authorization'] = 'Bearer ' + maskSecret(apiKeyValue);
                    authHeaders['Content-Type'] = 'application/json';
                } else if (apiKeyValue) {
                    authHeaders['X-Cisco-Meraki-API-Key'] = maskSecret(apiKeyValue);
                    authHeaders['Content-Type'] = 'application/json';
                }
                break;
            default:
                break;
        }
        // Merge with default headers (defaultHeaders may be undefined)
        return { ...(defaultHeaders || {}), ...authHeaders };
    }

    updateHeaderPreview() {
        // Always update the header preview in the DOM for step 2
        const preview = document.getElementById('wizard-header-preview');
        if (preview) preview.textContent = this.renderHeaderPreview();
    }

    attachEvents() {
        const { step } = this.state;        if (step === 1) {
            document.getElementById('wizard-next-btn').onclick = () => this.handleNext();
            document.getElementById('wizard-profile-name').oninput = (e) => {
                this.state.fields.name = e.target.value;
            };
            document.getElementById('wizard-profile-baseurl').oninput = (e) => {
                this.state.fields.baseUrl = e.target.value;
            };
            document.getElementById('wizard-profile-authtype').onchange = (e) => {
                this.state.fields.authType = e.target.value;
            };
            // Template selection button handler
            document.getElementById('wizard-select-template-btn').onclick = () => {
                this.showTemplateSelection();
            };        } else if (step === 2) {
            document.getElementById('wizard-back-btn').onclick = () => {
                this.state.step = 1;
                this.renderModal();
            };
            document.getElementById('wizard-next-btn').onclick = () => this.handleStep2Next();
            document.getElementById('wizard-auth-type').onchange = (e) => {
                this.state.fields.authType = e.target.value;
                this.renderModal();
            };
            // Dynamic field events (ensure all update header preview)
            if (this.state.fields.authType === 'ApiKey') {
                document.getElementById('wizard-apikey-value').oninput = (e) => {
                    this.state.fields.apiKeyValue = e.target.value;
                    this.updateHeaderPreview();
                };
                document.getElementById('wizard-apikey-header').oninput = (e) => {
                    this.state.fields.apiKeyHeader = e.target.value;
                    this.updateHeaderPreview();
                };
            } else if (this.state.fields.authType === 'BearerToken') {
                document.getElementById('wizard-token-value').oninput = (e) => {
                    this.state.fields.tokenValue = e.target.value;
                    this.updateHeaderPreview();
                };
            } else if (this.state.fields.authType === 'CustomScript') {
                document.getElementById('wizard-custom-script').oninput = (e) => {
                    this.state.fields.customScript = e.target.value;
                    this.updateHeaderPreview();
                };
            } else if (this.state.fields.authType === 'Meraki') {
                document.getElementById('wizard-meraki-style').onchange = (e) => {
                    this.state.fields.merakiStyle = e.target.value;
                    this.updateHeaderPreview();
                };
                document.getElementById('wizard-meraki-apikey').oninput = (e) => {
                    this.state.fields.apiKeyValue = e.target.value;
                    this.updateHeaderPreview();
                };
            }
            // Also update header preview on any change in auth type
            document.getElementById('wizard-auth-type').onchange = (e) => {
                this.state.fields.authType = e.target.value;
                this.renderModal();
                this.updateHeaderPreview();
            };            // SecretStore unlock link - use existing global functions (DRY principle)
            const unlockLink = document.getElementById('wizard-unlock-secretstore-link');
            if (unlockLink) {
                unlockLink.onclick = async (e) => {
                    e.preventDefault();
                    console.log('[ProfileWizard] SecretStore unlock clicked - using existing global unlock');
                    
                    // Simply call the existing global SecretStore unlock
                    if (window.secretManager && typeof window.secretManager.promptForSecretStorePassword === 'function') {
                        window.secretManager.promptForSecretStorePassword();
                        // The global status indicator will update automatically
                        // No need for complex event handling - just use a simple polling check
                        const checkAndRefresh = () => {
                            if (this.isSecretStoreUnlockedGlobally()) {
                                console.log('[ProfileWizard] Status indicator shows unlocked, refreshing wizard');
                                this.renderModal();
                            } else {
                                // Check again in 500ms (simple and reliable)
                                setTimeout(checkAndRefresh, 500);
                            }
                        };
                        setTimeout(checkAndRefresh, 500);
                    } else {
                        console.warn('[ProfileWizard] SecretManager not available, using fallback');
                        alert('SecretStore unlock not available. Please use the header unlock button.');
                    }
                };
            }
            // Always update header preview on initial render
            this.updateHeaderPreview();        } else if (step === 3) {
            // Step 3: Headers & Advanced Config
            setTimeout(() => this.renderCustomSettingsList(), 0);
            document.getElementById('wizard-back-btn').onclick = () => {
                // Go back to step 1 if authType is "None", otherwise step 2
                this.state.step = this.state.fields.authType === 'None' ? 1 : 2;
                this.renderModal();
            };
            document.getElementById('wizard-next-btn').onclick = () => this.handleStep3Next();
            document.getElementById('wizard-default-headers').oninput = (e) => {
                this.state.fields.defaultHeadersRaw = e.target.value;
            };
            document.getElementById('wizard-pagination-details').oninput = (e) => {
                this.state.fields.paginationRaw = e.target.value;
            };
            document.getElementById('wizard-add-customsetting-btn').onclick = () => {
                this.addCustomSettingRow();
            };
        } else if (step === 4) {
            document.getElementById('wizard-back-btn').onclick = () => {
                this.state.step = 3;
                this.renderModal();
            };
            document.getElementById('wizard-create-btn').onclick = () => this.handleCreateProfile();
        }
    }

    // Render dynamic custom settings list for step 3
    renderCustomSettingsList() {
        const container = document.getElementById('wizard-customsettings-list');
        if (!container) return;
        container.innerHTML = '';
        const settings = this.state.fields.customSettingsList || [{ key: '', value: '' }];
        settings.forEach((item, idx) => {
            const row = document.createElement('div');
            row.className = 'dynamic-row customsetting-row';
            row.innerHTML = `
                <input type="text" class="form-control customsetting-key" placeholder="Setting Key" value="${item.key || ''}">
                <input type="text" class="form-control customsetting-value" placeholder="Setting Value" value="${item.value || ''}">
                <button type="button" class="btn-remove" title="Remove">🗑️</button>
            `;
            row.querySelector('.customsetting-key').oninput = (e) => {
                this.state.fields.customSettingsList[idx].key = e.target.value;
            };
            row.querySelector('.customsetting-value').oninput = (e) => {
                this.state.fields.customSettingsList[idx].value = e.target.value;
            };
            row.querySelector('.btn-remove').onclick = () => {
                this.state.fields.customSettingsList.splice(idx, 1);
                this.renderCustomSettingsList();
            };
            container.appendChild(row);
        });
    }

    addCustomSettingRow() {
        if (!this.state.fields.customSettingsList) this.state.fields.customSettingsList = [];
        this.state.fields.customSettingsList.push({ key: '', value: '' });
        this.renderCustomSettingsList();
    }

    handleStep3Next() {
        // Validate JSON fields and custom settings
        const { defaultHeadersRaw, paginationRaw, customSettingsList } = this.state.fields;
        const errors = {};
        let defaultHeaders = {};
        let pagination = {};
        if (defaultHeadersRaw && defaultHeadersRaw.trim()) {
            try {
                defaultHeaders = JSON.parse(defaultHeadersRaw);
            } catch {
                errors.defaultHeaders = 'Invalid JSON for headers.';
            }
        }
        if (paginationRaw && paginationRaw.trim()) {
            try {
                pagination = JSON.parse(paginationRaw);
            } catch {
                errors.pagination = 'Invalid JSON for pagination.';
            }
        }
        // Validate custom settings (no duplicate keys)
        const keys = (customSettingsList || []).map(s => s.key).filter(k => k);
        if (new Set(keys).size !== keys.length) {
            errors.customSettings = 'Duplicate custom setting keys.';
        }
        this.state.errors = errors;
        if (Object.keys(errors).length > 0) {
            this.renderModal();
            return;
        }
        // Save parsed values
        this.state.fields.defaultHeaders = defaultHeaders;
        this.state.fields.pagination = pagination;
        // Convert custom settings list to object
        const customSettings = {};
        (customSettingsList || []).forEach(({ key, value }) => {
            if (key) customSettings[key] = value;
        });
        this.state.fields.customSettings = customSettings;
        // Proceed to review step
        this.state.step = 4;
        this.renderModal();
    }    handleNext() {
        const { step } = this.state;
        if (step === 1) {
            // Validate step 1 fields
            const errors = validateProfileFields(this.state.fields, step);
            this.state.errors = errors;
            if (Object.keys(errors).length > 0) {
                this.renderModal();
                return;
            }
            // Skip authentication step if authType is "None"
            if (this.state.fields.authType === 'None') {
                this.state.step = 3; // Skip to Step 3: Headers & Advanced
            } else {
                this.state.step = 2; // Go to Step 2: Authentication
            }
            this.renderModal();
        } else if (step === 2) {
            this.handleStep2Next();
        } else if (step === 3) {
            this.handleStep3Next();
        }
    }validateStep() {
        // Use global SecretStore state from secretManager
        if (this.state.step === 2 && !this.state.fields.isSessionOnly && !this.isSecretStoreUnlockedGlobally()) {
            this.state.errors.secretStore = 'SecretStore must be unlocked for persistent profiles.';
            return false;
        }
        return true;
    }    // Helper method to check global SecretStore state (DRY principle)
    // Simply reads the existing status indicator instead of duplicating logic
    isSecretStoreUnlockedGlobally() {
        const statusText = document.getElementById('secretstore-status-text');
        if (statusText) {
            const status = statusText.textContent || '';
            console.log('[ProfileWizard] Reading existing status indicator:', status);
            return status.includes('Unlocked') || status.includes('unlocked');
        }
        // Fallback to global function if indicator not available
        return window.isSecretStoreUnlocked ? window.isSecretStoreUnlocked() : false;
    }    handleStep2Next() {
        const { fields } = this.state;
        // Validate auth fields based on auth type
        let authErrors = {};
        switch (fields.authType) {
            case 'None':
                // No validation needed for None authentication
                break;
            case 'ApiKey':
                if (!fields.apiKeyValue) authErrors.apiKeyValue = 'API Key is required.';
                if (!fields.apiKeyHeader) authErrors.apiKeyHeader = 'Header name is required.';
                break;
            case 'BearerToken':
                if (!fields.tokenValue) authErrors.tokenValue = 'Bearer token is required.';
                break;
            case 'CustomScript':
                if (!fields.customScript) authErrors.customScript = 'Custom script is required.';
                break;
            case 'Meraki':
                if (!fields.apiKeyValue) authErrors.apiKeyValue = 'API Key is required.';
                break;
            default:
                break;
        }
        this.state.errors = authErrors;
        if (Object.keys(authErrors).length > 0) {
            this.renderModal();
            return;
        }
        // Proceed to step 3
        this.state.step = 3;
        this.renderModal();
    }    async handleCreateProfile() {
        // Use global SecretStore state instead of duplicating logic
        if (!this.state.fields.isSessionOnly && !this.isSecretStoreUnlockedGlobally()) {
            // Use the existing global SecretManager to handle unlock if needed
            if (window.secretManager && typeof window.secretManager.ensureSecretStoreAccess === 'function') {
                const hasAccess = await window.secretManager.ensureSecretStoreAccess();
                if (!hasAccess) {
                    this.state.errors.create = 'SecretStore access is required to create a persistent profile. Unlock it or choose Session Only.';
                    this.renderModal();
                    return;
                }
            } else {
                this.state.errors.create = 'SecretStore must be unlocked to create a persistent profile. Unlock it or choose Session Only.';
                this.renderModal();
                return;
            }
        }
        
        // Build the profile object using shared utility (DRY)
        const profileData = buildProfileObject(this.state.fields);
        // Log payload for debugging
        if (window.console && window.console.log) {
            console.log('[ProfileCreateWizard] Creating profile with payload:', profileData);
        }
        try {
            const response = await window.apiClient.createProfile(profileData);
            if (window.console && window.console.log) {
                console.log('[ProfileCreateWizard] Backend response:', response);
            }
            if (response && response.success) {
                if (window.showNotification) window.showNotification('Profile created successfully', 'success');
                this.close();
                // Optionally reload profiles in the main app
                if (window.profileManager && typeof window.profileManager.loadProfiles === 'function') {
                    window.profileManager.loadProfiles();
                }
            } else {
                this.state.errors.create = response && response.error ? response.error : 'Failed to create profile.';
                this.renderModal();
            }
        } catch (err) {
            this.state.errors.create = err && err.message ? err.message : 'Failed to create profile.';
            this.renderModal();
        }
    }

    // Static method to create profile from template (DRY principle)
    static async createProfileFromTemplate(template, userInput) {
        const { name, description, baseUrl, isSessionOnly, secrets } = userInput;
        
        // Validate using existing utility
        const errors = validateProfileFields({
            name: name,
            baseUrl: baseUrl,
            authType: template.authType
        }, 1);
        
        if (Object.keys(errors).length > 0) {
            throw new Error(Object.values(errors)[0]);
        }

        // Build profile using existing utility with template data
        const fields = {
            name: name,
            description: description || template.description,
            baseUrl: baseUrl,
            authType: template.authType || 'None',
            isSessionOnly: isSessionOnly,
            defaultHeaders: template.defaultHeaders || {},
            customSettings: template.customSettings || {},
            pagination: template.paginationDetails || {},
        };        // Handle auth-specific fields based on template and secrets
        if (template.authType === 'BearerToken') {
            // Look for token in secrets - try common keys
            const tokenKeys = ['token', 'bearerToken', 'access_token', 'auth_token'];
            const tokenKey = tokenKeys.find(key => secrets[key]) || Object.keys(secrets)[0];
            if (tokenKey && secrets[tokenKey]) {
                fields.tokenValue = secrets[tokenKey];
            }
        } else if (template.authType === 'ApiKey') {
            // Look for API key in secrets - try common keys
            const apiKeyKeys = ['apiKey', 'api_key', 'key', 'token'];
            const apiKeyKey = apiKeyKeys.find(key => secrets[key]) || Object.keys(secrets)[0];
            if (apiKeyKey && secrets[apiKeyKey]) {
                fields.apiKeyValue = secrets[apiKeyKey];
                // Use template's preferred header or default
                fields.apiKeyHeader = template.apiKeyHeader || template.credentials?.headerName || 'X-API-Key';
            }
        } else if (template.authType === 'Meraki') {
            // For Meraki, use the API key from secrets
            const apiKeyKeys = ['apiKey', 'api_key', 'key', 'token'];
            const apiKeyKey = apiKeyKeys.find(key => secrets[key]) || Object.keys(secrets)[0];
            if (apiKeyKey && secrets[apiKeyKey]) {
                fields.apiKeyValue = secrets[apiKeyKey];
                fields.merakiStyle = template.merakiStyle || 'apiKey';
                fields.authType = 'Meraki'; // Keep Meraki as auth type for proper handling
            }
        } else if (template.authType === 'BasicAuth') {
            fields.username = secrets.username || secrets.user || '';
            fields.password = secrets.password || secrets.pass || '';
        } else if (template.authType === 'CustomScript') {
            fields.customScript = template.customAuthScript || '';
            // Store all secrets for custom script access
            fields.templateSecrets = secrets;
        } else if (template.authType === 'None') {
            // No authentication setup needed
            fields.authType = 'None';
        }

        // Add UI customization from template
        if (template.ui) {
            fields.ui = template.ui;
        }

        console.log('[ProfileCreateWizard] Template fields mapped:', fields);

        // Use existing buildProfileObject utility
        const profileData = buildProfileObject(fields);
        
        // Add template reference for tracking
        profileData.templateId = template.id;
        profileData.templateVersion = template.version;

        // If template has custom headers, merge them
        if (template.headers) {
            profileData.headers = { ...profileData.headers, ...template.headers };
        }

        return profileData;
    }    close() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }    // Show template selection modal
    showTemplateSelection() {
        // Ensure template manager and modal are available
        const templateManagerInstance = window.templateManager || (typeof templateManager !== 'undefined' ? templateManager : null);
        
        if (!templateManagerInstance) {
            console.error('[ProfileWizard] TemplateManager not available');
            alert('Template management is not available');
            return;
        }

        // Initialize template modal if needed
        if (!window.templateModal) {
            if (templateManagerInstance.initializeModal) {
                templateManagerInstance.initializeModal();
            }
        }

        if (!window.templateModal) {
            console.error('[ProfileWizard] TemplateModal not available');
            alert('Template modal is not available');
            return;
        }

        // Show a compact template picker modal
        this.showCompactTemplatePicker(templateManagerInstance);
    }    // Show compact template picker that leverages existing TemplateModal
    showCompactTemplatePicker(templateManagerInstance) {
        const templates = templateManagerInstance.templates || [];
        
        if (templates.length === 0) {
            alert('No templates available');
            return;
        }

        // Remove any existing modals
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>Select Template</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="template-picker-search" style="margin-bottom: 1rem;">
                        <input type="text" id="template-picker-search" placeholder="Search templates..." 
                               style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
                    </div>
                    <div class="template-picker-list" style="max-height: 400px; overflow-y: auto;">
                        ${templates.map(template => `
                            <div class="template-picker-item" data-template-id="${template.id}" 
                                 style="padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 0.5rem; cursor: pointer; transition: all 0.2s ease;"
                                 onmouseover="this.style.backgroundColor='var(--bg-hover)'" 
                                 onmouseout="this.style.backgroundColor=''"
                                 onclick="window.profileCreateWizard.useTemplateFromPicker('${template.id}')">
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <div style="font-size: 1.5rem;">${template.icon || '📦'}</div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">${template.name}</div>
                                        <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.3;">${template.description || 'No description available'}</div>
                                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                                            ${template.authType ? `Auth: ${template.authType}` : 'No Auth'} • 
                                            ${template.category || 'Uncategorized'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add search functionality
        const searchInput = modal.querySelector('#template-picker-search');
        searchInput.addEventListener('input', (e) => {
            this.filterCompactTemplateList(e.target.value);
        });        // Focus search input
        setTimeout(() => searchInput.focus(), 100);
    }

    // Filter compact template list based on search query
    filterCompactTemplateList(query) {
        const items = document.querySelectorAll('.template-picker-item');
        const searchQuery = query.toLowerCase();

        items.forEach(item => {
            const name = item.querySelector('div[style*="font-weight: 600"]')?.textContent?.toLowerCase() || '';
            const description = item.querySelector('div[style*="font-size: 0.85rem"]')?.textContent?.toLowerCase() || '';
            const category = item.querySelector('div[style*="font-size: 0.75rem"]')?.textContent?.toLowerCase() || '';
            
            const matches = name.includes(searchQuery) || 
                           description.includes(searchQuery) || 
                           category.includes(searchQuery);
            
            item.style.display = matches ? 'block' : 'none';
        });
    }

    // Use template from compact picker - connects to existing TemplateModal
    useTemplateFromPicker(templateId) {
        // Close the compact picker modal first
        const pickerModal = document.querySelector('.modal-overlay');
        if (pickerModal) pickerModal.remove();

        // Get the template
        const templateManagerInstance = window.templateManager || (typeof templateManager !== 'undefined' ? templateManager : null);
        if (!templateManagerInstance) {
            console.error('[ProfileWizard] TemplateManager not available');
            alert('Template management is not available');
            return;
        }

        const template = templateManagerInstance.templates.find(t => t.id === templateId);
        if (!template) {
            console.error('[ProfileWizard] Template not found:', templateId);
            alert('Template not found');
            return;
        }

        // Use the existing TemplateModal's "Use Template" functionality
        if (window.templateModal) {
            // The TemplateModal's 'use' mode will handle profile creation
            window.templateModal.show({ 
                template: template, 
                mode: 'use',
                onSave: (profileData) => {
                    console.log('[ProfileWizard] Template modal completed profile creation:', profileData);
                    // The template modal handles the profile creation, so we just close our wizard
                    this.close();
                    // Refresh profiles if needed
                    if (window.profileManager && typeof window.profileManager.loadProfiles === 'function') {
                        window.profileManager.loadProfiles();
                    }
                }
            });
        } else {
            console.error('[ProfileWizard] TemplateModal not available');
            alert('Template modal is not available');
        }
    }
}

// Auto-instantiate wizard for convenience
window.profileCreateWizard = new ProfileCreateWizard();

// Make the class available globally for static methods
window.ProfileCreateWizard = ProfileCreateWizard;