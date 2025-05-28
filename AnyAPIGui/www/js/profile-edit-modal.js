/**
 * AnyAPI GUI - Profile Edit Modal Component
 * Handles profile creation and editing in modal dialogs
 */

class ProfileEditModal {
    constructor(profileManager) {
        this.profileManager = profileManager;
        this.modalSaveHandler = null;
        this.currentEditProfile = null;
        this.isEditing = false;
    }

    // Get utilities from profile manager
    get domUtils() {
        return this.profileManager.domUtils;
    }

    get textUtils() {
        return this.profileManager.textUtils;
    }

    get templates() {
        return this.profileManager.templates;
    }

    // Show create modal
    showCreateModal() {
        const modalConfig = {
            title: 'Create New Profile',
            content: this.renderCreateForm(),
            width: '700px',
            onSave: () => this.handleCreateProfile(),
            saveText: 'Create Profile'
        };

        this.createModal(modalConfig);
        setTimeout(() => this.initializeModalSections(), 200);
    }

    // Show edit modal
    async showEditModal(profile) {
        try {
            this.currentEditProfile = JSON.parse(JSON.stringify(profile)); // Deep copy
            this.isEditing = true;

            const modalConfig = {
                title: 'Edit Profile',
                content: this.renderEditForm(this.currentEditProfile),
                width: '700px',
                onSave: () => this.handleEditProfile(),
                saveText: 'Save Changes'
            };

            this.createModal(modalConfig);
            setTimeout(() => {
                this.initializeModalSections();
                this.populateAllEditFields(this.currentEditProfile);
            }, 300);
        } catch (error) {
            console.error('🚨 Error showing edit modal:', error);
            showNotification('Error opening edit modal', 'error');
        }
    }

    // Enhanced modal creation
    createModal({ title, content, width = '500px', onSave, saveText = 'Save' }) {
        this.removeExistingModal();

        const modal = this.domUtils.createElement('div', {
            id: 'profile-modal',
            className: 'modal-overlay',
            style: `position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                   background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; 
                   justify-content: center; z-index: 1000;`,
            innerHTML: this.renderModalContent(title, content, width, saveText)
        });

        document.body.appendChild(modal);
        this.modalSaveHandler = onSave;
        
        // Focus first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select, textarea');
            firstInput?.focus();
        }, 100);
    }

    // Modal content rendering with fixed button styling
    renderModalContent(title, content, width, saveText) {
        const { safeEscape } = this.textUtils;
        
        return `
            <div class="modal-dialog" style="width: ${width}; max-width: 90vw; max-height: 95vh; 
                 overflow: hidden; background: var(--bg-primary); border-radius: 12px; 
                 box-shadow: 0 8px 32px rgba(0,0,0,0.3); border: 1px solid var(--border-color);
                 display: flex; flex-direction: column;">
                <div class="modal-header" style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); 
                     display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); 
                     border-radius: 12px 12px 0 0; flex-shrink: 0;">
                    <h3 style="margin: 0; color: var(--text-primary); font-weight: 600; font-size: 1.25rem;">${safeEscape(title)}</h3>
                    <button class="modal-close" onclick="window.profileEditModal.closeModal()" 
                            style="background: none; border: none; font-size: 1.25rem; cursor: pointer; 
                            padding: 0.25rem; color: var(--text-muted); border-radius: 6px; 
                            transition: all 0.2s ease; width: 32px; height: 32px; display: flex; 
                            align-items: center; justify-content: center;" 
                            onmouseover="this.style.background='var(--bg-hover)'; this.style.color='var(--text-primary)'"
                            onmouseout="this.style.background='none'; this.style.color='var(--text-muted)'">&times;</button>
                </div>
                <div class="modal-body" style="padding: 1.5rem; flex: 1; overflow-y: auto; min-height: 0;">
                    ${content}
                </div>
                <div class="modal-footer" style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); 
                     display: flex; justify-content: flex-end; gap: 0.75rem; background: var(--bg-secondary); 
                     border-radius: 0 0 12px 12px; flex-shrink: 0;">
                    <button class="btn btn-outline modal-btn" onclick="window.profileEditModal.closeModal()">Cancel</button>
                    <button class="btn btn-primary modal-btn" onclick="window.profileEditModal.modalSave()">${safeEscape(saveText)}</button>
                </div>
            </div>
            
            <style>
                .modal-btn {
                    min-width: 90px;
                    padding: 0.6rem 1.2rem;
                    font-size: 0.9rem;
                    font-weight: 500;
                }
            </style>
        `;
    }

    // Render create profile form
    renderCreateForm() {
        const templateOptions = Object.entries(this.templates)
            .map(([key, template]) => `<option value="${key}">${this.textUtils.safeEscape(template.name || key)}</option>`)
            .join('');

        return `
            <form id="create-profile-form" class="profile-form">
                <div class="form-section">
                    <div class="form-section-header">
                        <h4 class="form-section-title">📋 Template Selection</h4>
                        <small class="form-section-subtitle">Choose a pre-configured template to get started quickly</small>
                    </div>
                    <div class="form-group">
                        <label for="profile-template" class="form-label">Choose Template:</label>
                        <select id="profile-template" class="form-control" onchange="window.profileEditModal.applyTemplate()">
                            <option value="">Select a template...</option>
                            ${templateOptions}
                        </select>
                    </div>
                </div>

                <div class="form-section">
                    <div class="form-section-header">
                        <h4 class="form-section-title">⚙️ Basic Configuration</h4>
                        <small class="form-section-subtitle">Essential profile settings</small>
                    </div>
                    <div class="form-group">
                        <label for="profile-name" class="form-label required">Profile Name:</label>
                        <input type="text" id="profile-name" class="form-control" required 
                               placeholder="Enter a unique profile name">
                    </div>
                    <div class="form-group">
                        <label for="profile-baseurl" class="form-label required">Base URL:</label>
                        <input type="url" id="profile-baseurl" class="form-control" required 
                               placeholder="https://api.example.com">
                    </div>
                    <div class="form-group">
                        <label for="profile-description" class="form-label">Description:</label>
                        <textarea id="profile-description" class="form-control" rows="2" 
                                  placeholder="Optional description of this API profile"></textarea>
                    </div>
                </div>

                <div class="form-section">
                    <div class="form-section-header">
                        <h4 class="form-section-title">🔐 Authentication</h4>
                        <small class="form-section-subtitle">Configure how to authenticate with this API</small>
                    </div>
                    <div class="form-group">
                        <label for="profile-authtype" class="form-label">Authentication Type:</label>
                        <select id="profile-authtype" class="form-control" onchange="window.profileEditModal.toggleAuthFields()">
                            <option value="None">None</option>
                            <option value="Bearer">Bearer Token</option>
                            <option value="Basic">Basic Authentication</option>
                            <option value="ApiKey">API Key</option>
                            <option value="CustomScript">Custom Script</option>
                        </select>
                    </div>
                    <div id="auth-fields"></div>
                </div>

                <div class="form-section">
                    <div class="form-section-header">
                        <h4 class="form-section-title">📄 Headers & Pagination</h4>
                        <small class="form-section-subtitle">Default headers and pagination settings</small>
                    </div>
                    <div class="form-group">
                        <label for="profile-headers" class="form-label">Default Headers (JSON):</label>
                        <textarea id="profile-headers" class="form-control code-input" rows="3" 
                                  placeholder='{"Content-Type": "application/json"}'></textarea>
                        <small class="form-help">Optional: Headers to include with every request</small>
                    </div>
                    <div class="form-group">
                        <label for="profile-pagination" class="form-label">Pagination Type:</label>
                        <select id="profile-pagination" class="form-control" onchange="window.profileEditModal.updatePaginationVisibility()">
                            <option value="Auto">Auto-detect</option>
                            <option value="LinkHeader">Link Header</option>
                            <option value="NextLink">NextLink</option>
                            <option value="Cursor">Cursor-based</option>
                            <option value="PageNumber">Page Number</option>
                            <option value="None">No pagination</option>
                            <option value="Custom">Custom</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" id="show-pagination-details" onchange="window.profileEditModal.togglePaginationDetailsField()"> 
                            <span class="checkmark"></span>
                            Show Advanced Pagination Details
                        </label>
                    </div>
                    <div class="form-group" id="pagination-details-group" style="display: none;">
                        <label for="profile-pagination-details" class="form-label">Pagination Details (JSON):</label>
                        <textarea id="profile-pagination-details" class="form-control code-input" rows="3"></textarea>
                        <small class="form-help">Advanced pagination configuration</small>
                    </div>
                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" id="profile-session-only"> 
                            <span class="checkmark"></span>
                            Session only (don't save credentials)
                        </label>
                    </div>
                </div>

                <div class="form-section">
                    <div class="form-section-header">
                        <h4 class="form-section-title">🔑 Credentials</h4>
                        <small class="form-section-subtitle">Authentication credentials (stored securely)</small>
                    </div>
                    <div class="credential-info-box">
                        <p><strong>💡 Credentials work with your authentication type:</strong></p>
                        <ul>
                            <li><strong>Bearer:</strong> Add a "token" credential</li>
                            <li><strong>Basic:</strong> Add "username" and "password" credentials</li>
                            <li><strong>API Key:</strong> Add "apiKey" and optionally "headerName" credentials</li>
                            <li><strong>Custom:</strong> Add any credentials your script needs</li>
                        </ul>
                    </div>
                    <div id="profile-credentials-list" class="dynamic-list"></div>
                    <button type="button" id="add-credential-btn" class="btn btn-outline btn-sm btn-add">
                        <span class="btn-icon">➕</span> Add Credential
                    </button>
                    <small class="form-help">Credentials are stored securely on the server.</small>
                </div>

                <div class="form-section">
                    <div class="form-section-header">
                        <h4 class="form-section-title">⚙️ Custom Settings</h4>
                        <small class="form-section-subtitle">Additional configuration options</small>
                    </div>
                    <div id="profile-customsettings-list" class="dynamic-list"></div>
                    <button type="button" id="add-customsetting-btn" class="btn btn-outline btn-sm btn-add">
                        <span class="btn-icon">➕</span> Add Setting
                    </button>
                    <small class="form-help">Custom settings are sent with every request and may be required by some APIs.</small>
                </div>
            </form>
            
            <style>
                .profile-form {
                    max-width: 100%;
                }
                
                .form-section {
                    margin-bottom: 1.5rem;
                    padding: 1.25rem;
                    background: var(--bg-secondary);
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                }
                
                .form-section-header {
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .form-section-title {
                    margin: 0 0 0.25rem 0;
                    color: var(--text-primary);
                    font-size: 1rem;
                    font-weight: 600;
                }
                
                .form-section-subtitle {
                    color: var(--text-muted);
                    font-size: 0.85rem;
                    margin: 0;
                }
                
                .form-group {
                    margin-bottom: 1rem;
                }
                
                .form-group:last-child {
                    margin-bottom: 0;
                }
                
                .form-label {
                    display: block;
                    margin-bottom: 0.4rem;
                    font-weight: 500;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }
                
                .form-label.required::after {
                    content: " *";
                    color: var(--color-danger);
                }
                
                .form-control {
                    width: 100%;
                    padding: 0.65rem;
                    border: 2px solid var(--border-color);
                    border-radius: 6px;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    transition: all 0.2s ease;
                }
                
                .form-control:focus {
                    outline: none;
                    border-color: var(--color-primary);
                    box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
                }
                
                .code-input {
                    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                    font-size: 0.85rem;
                }
                
                .form-checkbox {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    user-select: none;
                    font-size: 0.9rem;
                }
                
                .form-checkbox input[type="checkbox"] {
                    margin-right: 0.6rem;
                    transform: scale(1.1);
                }
                
                .form-help {
                    display: block;
                    margin-top: 0.4rem;
                    color: var(--text-muted);
                    font-size: 0.8rem;
                    line-height: 1.3;
                }
                
                .dynamic-list {
                    margin-bottom: 0.75rem;
                }
                
                .dynamic-row {
                    display: flex;
                    gap: 0.6rem;
                    margin-bottom: 0.6rem;
                    padding: 0.65rem;
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    align-items: center;
                }
                
                .dynamic-row:last-child {
                    margin-bottom: 0;
                }
                
                .dynamic-row .form-control {
                    margin: 0;
                    flex: 1;
                    padding: 0.5rem;
                }
                
                .dynamic-row .form-control:first-child {
                    flex: 0 0 110px;
                }
                
                .credential-actions {
                    display: flex;
                    gap: 0.4rem;
                    align-items: center;
                    flex: 0 0 auto;
                }
                
                .btn-toggle-visibility {
                    padding: 0.3rem;
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s ease;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .btn-toggle-visibility:hover {
                    background: var(--bg-hover);
                    border-color: var(--color-primary);
                }
                
                .btn-remove {
                    padding: 0.4rem;
                    background: var(--color-danger);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s ease;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .btn-remove:hover {
                    background: var(--color-danger-dark);
                    transform: scale(1.05);
                }
                
                .btn-add {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    font-size: 0.9rem;
                    padding: 0.6rem 1rem;
                }
                
                .credential-info-box {
                    padding: 0.85rem;
                    background: var(--bg-info);
                    border: 1px solid var(--border-info);
                    border-radius: 6px;
                    margin-bottom: 0.75rem;
                    font-size: 0.85rem;
                }
                
                .credential-info-box p {
                    margin: 0 0 0.4rem 0;
                    color: var(--text-primary);
                }
                
                .credential-info-box ul {
                    margin: 0;
                    padding-left: 1.25rem;
                    color: var(--text-secondary);
                }
                
                .credential-info-box li {
                    margin-bottom: 0.2rem;
                }
                
                .auth-help {
                    padding: 0.85rem;
                    background: var(--bg-info);
                    border: 1px solid var(--border-info);
                    border-radius: 6px;
                    margin-bottom: 0.75rem;
                    font-size: 0.85rem;
                }
                
                .auth-help p {
                    margin: 0 0 0.4rem 0;
                }
                
                .auth-help ul {
                    margin: 0.4rem 0 0 1rem;
                    padding: 0;
                }
            </style>
        `;
    }

    // Render edit profile form
    renderEditForm(profile) {
        console.log('🎨 Rendering edit form for profile:', profile.name);
        
        // Pagination type options with proper mapping
        let paginationOptions = '';
        const paginationTypes = [
            { value: 'Auto', label: 'Auto-detect' },
            { value: 'LinkHeader', label: 'Link Header (GitHub style)' },
            { value: 'NextLink', label: 'NextLink (Microsoft style)' },
            { value: 'Cursor', label: 'Cursor-based' },
            { value: 'PageNumber', label: 'Page Number' },
            { value: 'None', label: 'No pagination' },
            { value: 'Custom', label: 'Custom' }
        ];

        let selectedPaginationType = 'Auto';
        if (profile && profile.paginationType) {
            selectedPaginationType = this.normalizePaginationType(profile.paginationType);
        }

        paginationTypes.forEach(type => {
            const selected = type.value === selectedPaginationType ? ' selected' : '';
            paginationOptions += `<option value="${type.value}"${selected}>${type.label}</option>`;
        });

        return `
            <form id="edit-profile-form" class="profile-form">
                <div class="form-section">
                    <div class="form-section-header">
                        <h4 class="form-section-title">⚙️ Basic Configuration</h4>
                        <small class="form-section-subtitle">Essential profile settings</small>
                    </div>
                    <div class="form-group">
                        <label for="profile-name" class="form-label required">Profile Name:</label>
                        <input type="text" id="profile-name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="profile-baseurl" class="form-label required">Base URL:</label>
                        <input type="url" id="profile-baseurl" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="profile-description" class="form-label">Description:</label>
                        <textarea id="profile-description" class="form-control" rows="2"></textarea>
                    </div>
                </div>

                <div class="form-section">
                    <div class="form-section-header">
                        <h4 class="form-section-title">🔐 Authentication</h4>
                        <small class="form-section-subtitle">Configure how to authenticate with this API</small>
                    </div>
                    <div class="form-group">
                        <label for="profile-authtype" class="form-label">Authentication Type:</label>
                        <select id="profile-authtype" class="form-control" onchange="window.profileEditModal.toggleAuthFields()">
                            <option value="None">None</option>
                            <option value="Bearer">Bearer Token</option>
                            <option value="Basic">Basic Authentication</option>
                            <option value="ApiKey">API Key</option>
                            <option value="CustomScript">Custom Script</option>
                        </select>
                    </div>
                    <div id="auth-fields"></div>
                </div>

                <div class="form-section">
                    <div class="form-section-header">
                        <h4 class="form-section-title">📄 Headers & Pagination</h4>
                        <small class="form-section-subtitle">Default headers and pagination settings</small>
                    </div>
                    <div class="form-group">
                        <label for="profile-headers" class="form-label">Default Headers (JSON):</label>
                        <textarea id="profile-headers" class="form-control code-input" rows="4"></textarea>
                        <small class="form-help">Optional: Default headers to include with requests</small>
                    </div>
                    <div class="form-group">
                        <label for="profile-pagination-type" class="form-label">Pagination Type:</label>
                        <select id="profile-pagination" class="form-control" onchange="window.profileEditModal.updatePaginationVisibility()">
                            ${paginationOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" id="show-pagination-details" onchange="window.profileEditModal.togglePaginationDetailsField()"> 
                            <span class="checkmark"></span>
                            Show Advanced Pagination Details
                        </label>
                        <small class="form-help">Check this to customize pagination behavior beyond the default settings</small>
                    </div>
                    <div class="form-group" id="pagination-details-group" style="display: none;">
                        <label for="profile-pagination-details" class="form-label">Pagination Details (JSON):</label>
                        <textarea id="profile-pagination-details" class="form-control code-input" rows="3" 
                                  placeholder='{"PageParameter":"page","PageSizeParameter":"pageSize","DefaultPageSize":100}'></textarea>
                        <small class="form-help">Advanced pagination configuration as JSON</small>
                    </div>
                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" id="profile-session-only"> 
                            <span class="checkmark"></span>
                            Session only (don't save credentials)
                        </label>
                    </div>
                </div>

                <div class="form-section">
                    <div class="form-section-header">
                        <h4 class="form-section-title">🔑 Credentials</h4>
                        <small class="form-section-subtitle">Authentication credentials (stored securely)</small>
                    </div>
                    <div class="credential-info-box">
                        <p><strong>💡 Credentials work with your authentication type:</strong></p>
                        <ul>
                            <li><strong>Bearer:</strong> Add a "token" credential</li>
                            <li><strong>Basic:</strong> Add "username" and "password" credentials</li>
                            <li><strong>API Key:</strong> Add "apiKey" and optionally "headerName" credentials</li>
                            <li><strong>Custom:</strong> Add any credentials your script needs</li>
                        </ul>
                    </div>
                    <div id="profile-credentials-list" class="dynamic-list"></div>
                    <button type="button" id="add-credential-btn" class="btn btn-outline btn-sm btn-add">
                        <span class="btn-icon">➕</span> Add Credential
                    </button>
                    <small class="form-help">Credentials are stored securely on the server.</small>
                </div>

                <div class="form-section">
                    <div class="form-section-header">
                        <h4 class="form-section-title">⚙️ Custom Settings</h4>
                        <small class="form-section-subtitle">Additional configuration options</small>
                    </div>
                    <div id="profile-customsettings-list" class="dynamic-list"></div>
                    <button type="button" id="add-customsetting-btn" class="btn btn-outline btn-sm btn-add">
                        <span class="btn-icon">➕</span> Add Setting
                    </button>
                    <small class="form-help">Custom settings are sent with every request and may be required by some APIs.</small>
                </div>
            </form>
            
            <style>
                .profile-form {
                    max-width: 100%;
                }
                
                .form-section {
                    margin-bottom: 1.5rem;
                    padding: 1.25rem;
                    background: var(--bg-secondary);
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                }
                
                .form-section-header {
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .form-section-title {
                    margin: 0 0 0.25rem 0;
                    color: var(--text-primary);
                    font-size: 1rem;
                    font-weight: 600;
                }
                
                .form-section-subtitle {
                    color: var(--text-muted);
                    font-size: 0.85rem;
                    margin: 0;
                }
                
                .form-group {
                    margin-bottom: 1rem;
                }
                
                .form-group:last-child {
                    margin-bottom: 0;
                }
                
                .form-label {
                    display: block;
                    margin-bottom: 0.4rem;
                    font-weight: 500;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }
                
                .form-label.required::after {
                    content: " *";
                    color: var(--color-danger);
                }
                
                .form-control {
                    width: 100%;
                    padding: 0.65rem;
                    border: 2px solid var(--border-color);
                    border-radius: 6px;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    transition: all 0.2s ease;
                }
                
                .form-control:focus {
                    outline: none;
                    border-color: var(--color-primary);
                    box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
                }
                
                .code-input {
                    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                    font-size: 0.85rem;
                }
                
                .form-checkbox {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    user-select: none;
                    font-size: 0.9rem;
                }
                
                .form-checkbox input[type="checkbox"] {
                    margin-right: 0.6rem;
                    transform: scale(1.1);
                }
                
                .form-help {
                    display: block;
                    margin-top: 0.4rem;
                    color: var(--text-muted);
                    font-size: 0.8rem;
                    line-height: 1.3;
                }
                
                .dynamic-list {
                    margin-bottom: 0.75rem;
                }
                
                .dynamic-row {
                    display: flex;
                    gap: 0.6rem;
                    margin-bottom: 0.6rem;
                    padding: 0.65rem;
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    align-items: center;
                }
                
                .dynamic-row:last-child {
                    margin-bottom: 0;
                }
                
                .dynamic-row .form-control {
                    margin: 0;
                    flex: 1;
                    padding: 0.5rem;
                }
                
                .dynamic-row .form-control:first-child {
                    flex: 0 0 110px;
                }
                
                .credential-actions {
                    display: flex;
                    gap: 0.4rem;
                    align-items: center;
                    flex: 0 0 auto;
                }
                
                .btn-toggle-visibility {
                    padding: 0.3rem;
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s ease;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .btn-toggle-visibility:hover {
                    background: var(--bg-hover);
                    border-color: var(--color-primary);
                }
                
                .btn-remove {
                    padding: 0.4rem;
                    background: var(--color-danger);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s ease;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .btn-remove:hover {
                    background: var(--color-danger-dark);
                    transform: scale(1.05);
                }
                
                .btn-add {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    font-size: 0.9rem;
                    padding: 0.6rem 1rem;
                }
                
                .credential-info-box {
                    padding: 0.85rem;
                    background: var(--bg-info);
                    border: 1px solid var(--border-info);
                    border-radius: 6px;
                    margin-bottom: 0.75rem;
                    font-size: 0.85rem;
                }
                
                .credential-info-box p {
                    margin: 0 0 0.4rem 0;
                    color: var(--text-primary);
                }
                
                .credential-info-box ul {
                    margin: 0;
                    padding-left: 1.25rem;
                    color: var(--text-secondary);
                }
                
                .credential-info-box li {
                    margin-bottom: 0.2rem;
                }
                
                .auth-help {
                    padding: 0.85rem;
                    background: var(--bg-info);
                    border: 1px solid var(--border-info);
                    border-radius: 6px;
                    margin-bottom: 0.75rem;
                    font-size: 0.85rem;
                }
                
                .auth-help p {
                    margin: 0 0 0.4rem 0;
                }
                
                .auth-help ul {
                    margin: 0.4rem 0 0 1rem;
                    padding: 0;
                }
            </style>
        `;
    }

    // Modal sections initialization
    initializeModalSections() {
        const sections = [
            { id: 'profile-credentials-list', method: 'addCredentialRow' },
            { id: 'profile-customsettings-list', method: 'addCustomSettingRow' }
        ];

        sections.forEach(({ id, method }) => {
            const container = this.domUtils.getElement(id);
            if (container) {
                container.innerHTML = '';
                this[method](container, '', '');
            }
        });

        this.attachButtonHandlers();
        this.updatePaginationVisibility();
    }

    // Button handler attachment
    attachButtonHandlers() {
        const handlers = [
            { id: 'add-credential-btn', method: 'addCredentialRow' },
            { id: 'add-customsetting-btn', method: 'addCustomSettingRow' }
        ];

        handlers.forEach(({ id, method }) => {
            const btn = this.domUtils.getElement(id);
            if (btn && !btn._handlerAttached) {
                btn.onclick = () => this[method]();
                btn._handlerAttached = true;
            }
        });
    }

    // Apply template to form fields
    applyTemplate() {
        const templateSelect = this.domUtils.getElement('profile-template');
        if (!templateSelect) return;

        const templateKey = templateSelect.value;
        if (!templateKey || !this.templates[templateKey]) return;

        const template = this.templates[templateKey];
        console.log('🎨 Applying template:', templateKey, template);

        // Apply basic fields
        const fieldMappings = [
            { templateKey: 'name', elementId: 'profile-name' },
            { templateKey: 'baseUrl', elementId: 'profile-baseurl' },
            { templateKey: 'description', elementId: 'profile-description' },
            { templateKey: 'authType', elementId: 'profile-authtype' },
            { templateKey: 'paginationType', elementId: 'profile-pagination' }
        ];

        fieldMappings.forEach(({ templateKey, elementId }) => {
            const element = this.domUtils.getElement(elementId);
            if (element && template[templateKey]) {
                element.value = template[templateKey];
            }
        });

        // Apply headers
        if (template.headers) {
            const headersField = this.domUtils.getElement('profile-headers');
            if (headersField) {
                headersField.value = JSON.stringify(template.headers, null, 2);
            }
        }

        this.toggleAuthFields();
        this.updatePaginationVisibility();

        showNotification(`Template "${template.name}" applied`, 'success');
    }

    // Toggle authentication fields based on auth type
    toggleAuthFields() {
        const authType = this.domUtils.getElement('profile-authtype');
        const authFields = this.domUtils.getElement('auth-fields');
        
        if (!authType || !authFields) return;
        
        const authTypeValue = authType.value;
        
        const authFieldsConfig = {
            'Bearer': `
                <div class="auth-help">
                    <p><strong>💡 Bearer Token Authentication</strong></p>
                    <p>Add your bearer token in the <strong>Credentials</strong> section below using the key "token".</p>
                </div>
            `,
            'Basic': `
                <div class="auth-help">
                    <p><strong>💡 Basic Authentication</strong></p>
                    <p>Add your credentials in the <strong>Credentials</strong> section below:</p>
                    <ul>
                        <li><strong>username</strong> - Your username</li>
                        <li><strong>password</strong> - Your password</li>
                    </ul>
                </div>
            `,
            'ApiKey': `
                <div class="auth-help">
                    <p><strong>💡 API Key Authentication</strong></p>
                    <p>Add your API key details in the <strong>Credentials</strong> section below:</p>
                    <ul>
                        <li><strong>apiKey</strong> - Your API key value</li>
                        <li><strong>headerName</strong> - Header name (default: X-API-Key)</li>
                    </ul>
                </div>
            `,
            'CustomScript': `
                <div class="form-group">
                    <label for="auth-script" class="form-label">Custom Authentication Script:</label>
                    <textarea id="auth-script" class="form-control code-input" rows="8" 
                              placeholder="# PowerShell script to generate auth headers&#10;# Example:&#10;param($RequestContext, $Profile)&#10;$RequestContext.Headers['Authorization'] = 'Bearer ' + $token"></textarea>
                    <small class="form-help">PowerShell script that sets authentication headers. Access credentials from the Credentials section using $RequestContext.GetPlainTextSecret.Invoke('credentialName')</small>
                </div>
            `
        };
        
        authFields.innerHTML = authFieldsConfig[authTypeValue] || 
            '<p class="form-help" style="font-style: italic; color: var(--text-muted);">No authentication required for this profile.</p>';
    }

    // Toggle pagination details field visibility
    togglePaginationDetailsField() {
        const checkbox = this.domUtils.getElement('show-pagination-details');
        const detailsGroup = this.domUtils.getElement('pagination-details-group');
        
        if (checkbox && detailsGroup) {
            detailsGroup.style.display = checkbox.checked ? 'block' : 'none';
        }
    }

    // Update pagination visibility
    updatePaginationVisibility() {
        const paginationSelect = this.domUtils.getElement('profile-pagination');
        const checkbox = this.domUtils.getElement('show-pagination-details');
        const detailsGroup = this.domUtils.getElement('pagination-details-group');
        
        if (!paginationSelect || !checkbox || !detailsGroup) return;
        
        const paginationType = paginationSelect.value;
        const shouldAutoShow = ['Custom', 'PageNumber'].includes(paginationType);
        
        if (shouldAutoShow) {
            checkbox.checked = true;
            detailsGroup.style.display = 'block';
        }
    }

    // Row addition methods - show actual values with toggle buttons for sensitive fields
    addCredentialRow(container, key = '', value = '', label = '', inputType = 'text') {
        const targetContainer = typeof container === 'string' 
            ? this.domUtils.getElement(container) 
            : (container || this.domUtils.getElement('profile-credentials-list'));
        
        if (!targetContainer) return;

        const row = this.domUtils.createElement('div', {
            className: 'dynamic-row credential-row'
        });

        // Check if this is a sensitive field
        const isSensitive = this.textUtils.isSensitive(key);
        const actualInputType = isSensitive ? 'password' : 'text';
        const toggleButton = isSensitive ? `
            <button type="button" class="btn-toggle-visibility" onclick="window.profileEditModal.toggleCredentialVisibility(this)" title="Toggle visibility">
                👁️
            </button>
        ` : '';
        
        row.innerHTML = `
            <input type="text" class="form-control credential-key" 
                   placeholder="${label || 'Credential Key'}" 
                   value="${this.textUtils.safeEscape(key)}" 
                   ${key ? 'readonly' : ''}>
            <input type="${actualInputType}" class="form-control credential-value" 
                   placeholder="${label || 'Credential Value'}" 
                   value="${this.textUtils.safeEscape(value)}">
            <div class="credential-actions">
                ${toggleButton}
                <button type="button" class="btn-remove" onclick="this.parentElement.parentElement.remove()" title="Remove">
                    🗑️
                </button>
            </div>
        `;

        targetContainer.appendChild(row);
        return row;
    }

    // Toggle credential visibility function
    toggleCredentialVisibility(button) {
        const row = button.closest('.credential-row');
        const input = row.querySelector('.credential-value');
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        button.textContent = isPassword ? '🙈' : '👁️';
        button.title = isPassword ? 'Hide value' : 'Show value';
    }

    addCustomSettingRow(container, key = '', value = '') {
        const targetContainer = typeof container === 'string' 
            ? this.domUtils.getElement(container) 
            : (container || this.domUtils.getElement('profile-customsettings-list'));
        
        if (!targetContainer) return;

        const row = this.domUtils.createElement('div', {
            className: 'dynamic-row customsetting-row'
        });

        row.innerHTML = `
            <input type="text" class="form-control customsetting-key" 
                   placeholder="Setting Key" 
                   value="${this.textUtils.safeEscape(key)}">
            <input type="text" class="form-control customsetting-value" 
                   placeholder="Setting Value" 
                   value="${this.textUtils.safeEscape(value)}">
            <button type="button" class="btn-remove" onclick="this.parentElement.remove()" title="Remove">
                🗑️
            </button>
        `;

        targetContainer.appendChild(row);
        return row;
    }

    // Populate all edit fields
    populateAllEditFields(profile) {
        console.log('🔧 Populating all edit fields for:', profile.name);
        
        try {
            // Basic fields
            const fieldMappings = [
                { id: 'profile-name', value: profile.name },
                { id: 'profile-baseurl', value: profile.baseUrl },
                { id: 'profile-description', value: profile.description }
            ];

            fieldMappings.forEach(({ id, value }) => {
                const element = this.domUtils.getElement(id);
                if (element) element.value = value || '';
            });

            // Auth type normalization
            const authTypeField = this.domUtils.getElement('profile-authtype');
            if (authTypeField) {
                let authTypeValue = this.normalizeAuthType(profile.authType);
                authTypeField.value = authTypeValue;
            }

            // Pagination type normalization
            const paginationField = this.domUtils.getElement('profile-pagination');
            if (paginationField) {
                let selectedPaginationType = this.normalizePaginationType(profile.paginationType);
                paginationField.value = selectedPaginationType;
            }

            // Headers, pagination details, session only
            this.populateHeaders(profile.headers);
            this.populatePaginationDetails(profile.paginationDetails);
            this.populateSessionOnly(profile.isSessionOnly);

            // Auth fields
            this.toggleAuthFields();
            
            // Custom auth script
            setTimeout(() => {
                if (profile.authType === 'CustomScript' && profile.customAuthScript) {
                    const scriptField = this.domUtils.getElement('auth-script');
                    if (scriptField) {
                        scriptField.value = profile.customAuthScript;
                    }
                }
            }, 200);
            
            // Credentials and custom settings
            this.populateCredentials(profile.credentials || {});
            this.populateCustomSettings(profile.customSettings || {});

        } catch (error) {
            console.error('🚨 Error populating edit fields:', error);
        }
    }

    // Helper methods for field normalization and population
    normalizeAuthType(authType) {
        switch ((authType || '').toLowerCase()) {
            case 'bearer':
            case 'bearertoken':
                return 'Bearer';
            case 'basic':
                return 'Basic';
            case 'apikey':
            case 'api_key':
                return 'ApiKey';
            case 'custom':
            case 'customscript':
            case 'custom_script':
                return 'CustomScript';
            default:
                return 'None';
        }
    }

    normalizePaginationType(paginationType) {
        if (!paginationType) return 'Auto';
        
        const lowerType = String(paginationType).toLowerCase();
        switch (lowerType) {
            case 'pagebased':
            case 'pagenumber':
                return 'PageNumber';
            case 'linkheader':
                return 'LinkHeader';
            case 'nextlink':
                return 'NextLink';
            case 'cursor':
            case 'cursorbased':
                return 'Cursor';
            case 'none':
                return 'None';
            case 'custom':
                return 'Custom';
            default:
                return paginationType;
        }
    }

    populateHeaders(headers) {
        const headersField = this.domUtils.getElement('profile-headers');
        if (headersField && headers) {
            headersField.value = JSON.stringify(headers, null, 2);
        }
    }

    populatePaginationDetails(paginationDetails) {
        if (paginationDetails) {
            const paginationDetailsField = this.domUtils.getElement('profile-pagination-details');
            const checkbox = this.domUtils.getElement('show-pagination-details');
            if (paginationDetailsField && checkbox) {
                paginationDetailsField.value = JSON.stringify(paginationDetails, null, 2);
                checkbox.checked = true;
                this.togglePaginationDetailsField();
            }
        }
    }

    populateSessionOnly(isSessionOnly) {
        const sessionOnlyField = this.domUtils.getElement('profile-session-only');
        if (sessionOnlyField) {
            sessionOnlyField.checked = Boolean(isSessionOnly);
        }
    }

    populateCredentials(credentials) {
        const container = this.domUtils.getElement('profile-credentials-list');
        if (!container) return;

        container.innerHTML = '';
        
        Object.entries(credentials).forEach(([key, value]) => {
            // Show actual values without any masking
            this.addCredentialRow(container, key, value, key, 'text');
        });

        // Add empty row for new credentials
        this.addCredentialRow(container, '', '');
    }

    populateCustomSettings(customSettings) {
        const container = this.domUtils.getElement('profile-customsettings-list');
        if (!container) return;

        container.innerHTML = '';
        
        Object.entries(customSettings).forEach(([key, value]) => {
            this.addCustomSettingRow(container, key, value);
        });

        // Add empty row
        this.addCustomSettingRow(container, '', '');
    }

    // Form data collection - delegate to profile manager
    collectFormData() {
        return this.profileManager.collectFormData();
    }

    // Profile operations
    async handleCreateProfile() {
        await this.profileManager.handleAsync(async () => {
            const profileData = this.collectFormData();
            
            // Validate required fields
            if (!profileData.name || !profileData.name.trim()) {
                throw new Error('Profile name is required');
            }
            if (!profileData.baseUrl || !profileData.baseUrl.trim()) {
                throw new Error('Base URL is required');
            }
            
            // Validate URL format
            try {
                new URL(profileData.baseUrl);
            } catch {
                throw new Error('Base URL must be a valid URL');
            }
            
            const errors = this.profileManager.validateProfile(profileData);
            if (errors.length > 0) {
                throw new Error(`Validation failed: ${errors.join(', ')}`);
            }

            console.log('📤 Creating profile with data:', profileData);
            const response = await apiClient.createProfile(profileData);
            if (!response.success) {
                throw new Error(response.error || 'Failed to create profile');
            }

            showNotification('Profile created successfully', 'success');
            this.closeModal();
            await this.profileManager.loadProfiles();
        }, 'Failed to create profile');
    }

    async handleEditProfile() {
        await this.profileManager.handleAsync(async () => {
            if (!this.currentEditProfile) {
                throw new Error('No profile selected for editing');
            }

            const profileData = this.collectFormData();
            
            // Validate required fields
            if (!profileData.name || !profileData.name.trim()) {
                throw new Error('Profile name is required');
            }
            if (!profileData.baseUrl || !profileData.baseUrl.trim()) {
                throw new Error('Base URL is required');
            }
            
            // Validate URL format
            try {
                new URL(profileData.baseUrl);
            } catch {
                throw new Error('Base URL must be a valid URL');
            }
            
            const errors = this.profileManager.validateProfile(profileData);
            if (errors.length > 0) {
                throw new Error(`Validation failed: ${errors.join(', ')}`);
            }

            console.log('📤 Updating profile with data:', profileData);
            console.log('📝 Original profile name:', this.currentEditProfile.name);
            
            const originalName = this.currentEditProfile.name;
            if (!originalName || originalName.trim() === '') {
                throw new Error('Original profile name is missing');
            }

            const response = await apiClient.updateProfile(originalName, profileData);
            if (!response.success) {
                throw new Error(response.error || 'Failed to update profile');
            }

            showNotification('Profile updated successfully', 'success');
            this.closeModal();
            await this.profileManager.loadProfiles();
        }, 'Failed to update profile');
    }

    // Modal utilities
    removeExistingModal() {
        const existing = this.domUtils.getElement('profile-modal');
        existing?.remove();
    }

    modalSave() {
        this.modalSaveHandler?.();
    }

    closeModal() {
        this.removeExistingModal();
        this.isEditing = false;
        this.currentEditProfile = null;
        this.modalSaveHandler = null;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.ProfileEditModal = ProfileEditModal;
}