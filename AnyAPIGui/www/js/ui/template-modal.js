// AnyAPI GUI - DRY Template Modal Component
// Handles viewing, using, and creating templates in a DRY, reusable way

class TemplateModal {
    constructor(templateManager) {
        this.templateManager = templateManager;
        this.modalSaveHandler = null;
        this.currentTemplate = null;
        this.mode = 'view'; // 'view', 'use', 'create', 'edit'
    }

    // Show modal for a template (view, use, or edit)
    show({ template = null, mode = 'view', onSave = null }) {
        this.currentTemplate = template;
        this.mode = mode;
        this.modalSaveHandler = onSave;
        this.renderModal();
    }

    // Show modal for creating a new template
    showCreate(onSave) {
        this.show({ template: null, mode: 'create', onSave });
    }

    // Render the modal
    renderModal() {
        this.removeExistingModal();
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = this.renderModalContent();
        document.body.appendChild(modal);
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select, textarea');
            firstInput?.focus();
        }, 100);
    }

    // Remove any existing modal
    removeExistingModal() {
        const existing = document.querySelector('.modal-overlay');
        if (existing) existing.remove();
    }

    // Render modal content based on mode
    renderModalContent() {
        let title = '';
        let content = '';
        let saveText = '';
        switch (this.mode) {
            case 'view':
                title = 'View Template';
                content = this.renderViewTemplate();
                saveText = 'Use Template';
                break;
            case 'use':
                title = 'Use Template';
                content = this.renderUseTemplate();
                saveText = 'Create Profile';
                break;
            case 'create':
                title = 'Create New Template';
                content = this.renderCreateTemplate();
                saveText = 'Create Template';
                break;
            case 'edit':
                title = 'Edit Template';
                content = this.renderEditTemplate();
                saveText = 'Save Changes';
                break;
        }
        return `
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="window.templateModal.closeModal()">&times;</button>
                </div>
                <div class="modal-body">${content}</div>
                <div class="modal-footer">
                    <button class="btn btn-outline modal-btn" onclick="window.templateModal.closeModal()">Cancel</button>
                    <button class="btn btn-primary modal-btn" onclick="window.templateModal.modalSave()">${saveText}</button>
                </div>
            </div>
        `;
    }

    // Render view template details
    renderViewTemplate() {
        if (!this.currentTemplate) return '<div>No template selected.</div>';
        const template = this.currentTemplate;
        const brandColor = template.ui?.brandColor || '#007acc';
        const accentColor = template.ui?.accentColor || brandColor;
        return `
            <div class="template-viewer">
                <!-- Header Section -->
                <div class="template-header" style="--brand-color: ${brandColor}; --accent-color: ${accentColor};">
                    <div class="template-icon">${template.icon || '📦'}</div>
                    <div class="template-info">
                        <h3>${template.name}</h3>
                        <p>${template.description}</p>
                        <div class="template-meta">
                            <span><strong>Category:</strong> ${template.category || 'Uncategorized'}</span>
                            <span><strong>Version:</strong> ${template.version || '1.0'}</span>
                            <span><strong>Auth:</strong> ${template.authType || 'None'}</span>
                        </div>
                    </div>
                </div>
                <!-- Tags Section -->
                ${template.tags && template.tags.length > 0 ? `
                <div class="template-section">
                    <h4>Tags</h4>
                    <div class="template-tags">
                        ${template.tags.map(tag => `<span class="template-tag">${tag}</span>`).join('')}
                    </div>
                </div>
                ` : ''}
                <!-- Configuration Section -->
                <div class="template-section">
                    <h4>Configuration</h4>
                    <div class="config-list">
                        <div class="config-row" data-type="url">
                            <span class="config-label">Base URL:</span>
                            <span class="config-value">${template.baseUrl || 'Not specified'}</span>
                        </div>
                        <div class="config-row" data-type="auth">
                            <span class="config-label">Authentication:</span>
                            <span class="config-value">${template.authType || 'None'}</span>
                        </div>
                        ${(template.paginationType || template.paginationDetails?.type) ? `
                        <div class="config-row" data-type="pagination">
                            <span class="config-label">Pagination:</span>
                            <span class="config-value">${template.paginationType || template.paginationDetails?.type || 'Not specified'}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
        <!-- Required Secrets Section -->
                ${(Array.isArray(template.requiredSecrets) && template.requiredSecrets.length > 0) ? `
                <div class="template-section">
                    <h4>Required Secrets</h4>
                    <div class="secrets-list">
                        ${template.requiredSecrets.map(secret => {
                            let secretKey, secretDisplayName, secretDescription, secretPlaceholder, isRequired;
                            if (typeof secret === 'object' && secret !== null) {
                                secretKey = secret.key || secret.name || 'Unknown';
                                secretDisplayName = secret.displayName || secret.name || secretKey;
                                secretDescription = (typeof secret.description === 'string' && secret.description.trim()) ? secret.description : 'No description available';
                                secretPlaceholder = (typeof secret.placeholder === 'string' && secret.placeholder.trim()) ? secret.placeholder : secretKey;
                                isRequired = secret.isRequired !== false;
                            } else {
                                secretKey = secret;
                                secretDisplayName = secret;
                                secretDescription = 'No description available';
                                secretPlaceholder = secret;
                                isRequired = false;
                            }
                            return `
                    <div class="secret-item">
                        <div class="secret-label">${secretDisplayName}</div>
                        <div class="secret-description">${secretDescription}</div>
                        <div class="secret-key">${secretKey}:${secretPlaceholder}</div>
                        ${isRequired ? '<div class="secret-required">⚠ Required</div>' : ''}
                    </div>
                    `;
                        }).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Sample Endpoints Section -->
                ${template.sampleEndpoints && template.sampleEndpoints.length > 0 ? `
                <div class="template-section">
                    <h4>Sample Endpoints</h4>
                    <div class="endpoints-list">
                        ${template.sampleEndpoints.map(endpoint => `
                        <div class="endpoint-item">
                            <span class="method-badge" style="background: ${this.getMethodColor(endpoint.method)};">${endpoint.method}</span>
                            <div class="endpoint-info">
                                <div class="endpoint-path">${endpoint.endpoint}</div>
                                <div class="endpoint-description">${endpoint.description}</div>
                            </div>
                            ${endpoint.category ? `<span class="category-badge">${endpoint.category}</span>` : ''}
                        </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Documentation Links -->
                ${template.documentation ? `
                <div class="template-section">
                    <h4>Documentation</h4>
                    <div class="docs-links">
                        ${template.documentation.url ? `<a href="${template.documentation.url}" target="_blank" class="docs-link">📚 Documentation</a>` : ''}
                        ${template.documentation.quickStart ? `<a href="${template.documentation.quickStart}" target="_blank" class="docs-link quickstart">🚀 Quick Start</a>` : ''}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    // Helper method to get color for HTTP methods
    getMethodColor(method) {
        const colors = {
            'GET': '#28a745',
            'POST': '#007bff', 
            'PUT': '#fd7e14',
            'PATCH': '#6c757d',
            'DELETE': '#dc3545'
        };
        return colors[method] || '#6c757d';
    }

    // Render use template form (profile creation form pre-filled from template)
    renderUseTemplate() {
        if (!this.currentTemplate) return '<div>No template selected.</div>';
        
        const template = this.currentTemplate;
        const brandColor = template.ui?.brandColor || '#007acc';
        const accentColor = template.ui?.accentColor || brandColor;
        
        return `
            <div class="template-use-form">
                <div class="template-header" style="--brand-color: ${brandColor}; --accent-color: ${accentColor}; margin-bottom: 1.5rem;">
                    <div class="template-icon">${template.icon || '📦'}</div>
                    <div class="template-info">
                        <h3>${template.name}</h3>
                        <p>${template.description}</p>
                    </div>
                </div>

                <form id="template-use-form" style="display: flex; flex-direction: column; gap: 1rem;">
                    <!-- Profile Name -->
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">Profile Name *</label>
                        <input type="text" id="use-profile-name" 
                               value="${template.name} Profile" 
                               style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem;" 
                               required>
                        <small style="color: var(--text-muted); font-size: 0.8rem;">Name for your new profile</small>
                    </div>

                    <!-- Description -->
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">Description</label>
                        <textarea id="use-profile-description" 
                                  style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem; resize: vertical; min-height: 60px;">${template.description}</textarea>
                    </div>

                    <!-- Base URL (if not fixed in template) -->
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">Base URL *</label>
                        <input type="url" id="use-base-url" 
                               value="${template.baseUrl || ''}" 
                               style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem;" 
                               required>
                    </div>

                    <!-- Required Secrets -->
                    ${(Array.isArray(template.requiredSecrets) && template.requiredSecrets.length > 0) ? `
                    <div class="form-section">
                        <h4 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.1rem; font-weight: 600; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem;">Required Credentials</h4>
                        ${template.requiredSecrets.map(secret => {
                            const secretKey = typeof secret === 'object' ? secret.key || secret.name : secret;
                            const secretDisplayName = typeof secret === 'object' ? secret.displayName || secret.name || secretKey : secret;
                            const secretDescription = typeof secret === 'object' && secret.description ? secret.description : 'Required for API authentication';
                            const placeholder = typeof secret === 'object' && secret.placeholder ? secret.placeholder : `your-${secretKey.toLowerCase()}`;
                            const isRequired = typeof secret === 'object' ? secret.isRequired !== false : true;
                            
                            return `
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">
                                    ${secretDisplayName} ${isRequired ? '*' : ''}
                                </label>
                                <input type="password" 
                                       class="template-secret-input" 
                                       data-secret-key="${secretKey}"
                                       placeholder="${placeholder}"
                                       ${isRequired ? 'required' : ''}
                                       style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem;">
                                <small style="color: var(--text-muted); font-size: 0.8rem;">${secretDescription}</small>
                            </div>
                            `;
                        }).join('')}
                    </div>
                    ` : ''}

                    <!-- Session Only Option -->
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: var(--text-primary); cursor: pointer;">
                            <input type="checkbox" id="use-session-only" style="margin: 0;">
                            Session Only (don't save credentials permanently)
                        </label>
                        <small style="color: var(--text-muted); font-size: 0.8rem;">Check this if you don't want credentials stored on disk</small>
                    </div>

                    <!-- Template Info -->
                    <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 6px; border: 1px solid var(--border-color); margin-top: 1rem;">
                        <h5 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">What will be configured:</h5>
                        <ul style="margin: 0; padding-left: 1.5rem; color: var(--text-muted); font-size: 0.9rem;">
                            <li>Authentication: ${template.authType || 'None'}</li>
                            ${template.paginationType || template.paginationDetails?.type ? `<li>Pagination: ${template.paginationType || template.paginationDetails?.type}</li>` : ''}
                            ${template.sampleEndpoints && template.sampleEndpoints.length > 0 ? `<li>${template.sampleEndpoints.length} sample endpoints for testing</li>` : ''}
                            ${template.ui ? `<li>Custom UI theme (${template.ui.brandColor})</li>` : ''}
                        </ul>
                    </div>
                </form>
            </div>
        `;
    }    // Render create template form
    renderCreateTemplate() {
        return `
            <form id="template-create-form" style="display: flex; flex-direction: column; gap: 1.5rem;">
                <!-- Basic Information -->
                <div class="form-section">
                    <h4 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.1rem; font-weight: 600; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem;">Basic Information</h4>
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">Template ID *</label>
                            <input type="text" id="template-id" placeholder="github" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem;" required>
                            <small style="color: var(--text-muted); font-size: 0.8rem;">Unique identifier (lowercase, no spaces)</small>
                        </div>
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">Name *</label>
                            <input type="text" id="template-name" placeholder="GitHub API" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem;" required>
                        </div>
                    </div>
                    <div class="form-group" style="margin-top: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">Description *</label>
                        <textarea id="template-description" placeholder="REST API for repository management, issues, and user operations" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem; resize: vertical; min-height: 80px;" required></textarea>
                    </div>
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">Category</label>
                            <select id="template-category" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem;">
                                <option value="">Select Category</option>
                                <option value="AI/ML">AI/ML</option>
                                <option value="Business Management">Business Management</option>
                                <option value="Communication">Communication</option>
                                <option value="Development">Development</option>
                                <option value="Finance">Finance</option>
                                <option value="Productivity">Productivity</option>
                                <option value="Social Media">Social Media</option>
                                <option value="Version Control">Version Control</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">Icon</label>
                            <input type="text" id="template-icon" placeholder="🐙" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem; text-align: center;">
                            <small style="color: var(--text-muted); font-size: 0.8rem;">Emoji icon</small>
                        </div>
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">Version</label>
                            <input type="text" id="template-version" value="1.0" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem;">
                        </div>
                    </div>
                    <div class="form-group" style="margin-top: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">Tags</label>
                        <input type="text" id="template-tags" placeholder="git, repository, issues, development" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem;">
                        <small style="color: var(--text-muted); font-size: 0.8rem;">Comma-separated tags</small>
                    </div>
                </div>

                <!-- API Configuration -->
                <div class="form-section">
                    <h4 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.1rem; font-weight: 600; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem;">API Configuration</h4>
                    <div class="form-grid" style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">Base URL *</label>
                            <input type="url" id="template-baseurl" placeholder="https://api.github.com" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem;" required>
                        </div>
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">Auth Type</label>
                            <select id="template-authtype" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem;">
                                <option value="">None</option>
                                <option value="BearerToken">Bearer Token</option>
                                <option value="ApiKey">API Key</option>
                                <option value="BasicAuth">Basic Auth</option>
                                <option value="OAuth2">OAuth 2.0</option>
                                <option value="CustomScript">Custom Script</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- UI Customization -->
                <div class="form-section">
                    <h4 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.1rem; font-weight: 600; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem;">UI Customization</h4>
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">Brand Color</label>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <input type="color" id="template-brandcolor" value="#007acc" style="width: 50px; height: 40px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); cursor: pointer;">
                                <input type="text" id="template-brandcolor-text" value="#007acc" style="flex: 1; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem; font-family: monospace;">
                            </div>
                        </div>
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">Accent Color</label>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <input type="color" id="template-accentcolor" value="#0066cc" style="width: 50px; height: 40px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); cursor: pointer;">
                                <input type="text" id="template-accentcolor-text" value="#0066cc" style="flex: 1; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem; font-family: monospace;">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Required Secrets -->
                <div class="form-section">
                    <h4 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.1rem; font-weight: 600; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem;">Required Secrets</h4>
                    <div id="secrets-container">
                        <!-- Secrets will be added dynamically -->
                    </div>
                    <button type="button" onclick="window.templateModal.addSecret()" style="background: var(--accent-color, #007acc); color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; margin-top: 0.5rem;">+ Add Secret</button>
                </div>

                <!-- Sample Endpoints -->
                <div class="form-section">
                    <h4 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.1rem; font-weight: 600; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem;">Sample Endpoints</h4>
                    <div id="endpoints-container">
                        <!-- Endpoints will be added dynamically -->
                    </div>
                    <button type="button" onclick="window.templateModal.addEndpoint()" style="background: var(--accent-color, #007acc); color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; margin-top: 0.5rem;">+ Add Endpoint</button>
                </div>

                <!-- Documentation -->
                <div class="form-section">
                    <h4 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.1rem; font-weight: 600; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem;">Documentation (Optional)</h4>
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">Documentation URL</label>
                            <input type="url" id="template-docs-url" placeholder="https://docs.example.com" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem;">
                        </div>
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary);">Quick Start URL</label>
                            <input type="url" id="template-quickstart-url" placeholder="https://docs.example.com/quickstart" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem;">
                        </div>
                    </div>
                </div>
            </form>

            <script>
                // Sync color inputs
                document.getElementById('template-brandcolor').addEventListener('change', function() {
                    document.getElementById('template-brandcolor-text').value = this.value;
                });
                document.getElementById('template-brandcolor-text').addEventListener('input', function() {
                    if (/^#[0-9A-F]{6}$/i.test(this.value)) {
                        document.getElementById('template-brandcolor').value = this.value;
                    }
                });
                document.getElementById('template-accentcolor').addEventListener('change', function() {
                    document.getElementById('template-accentcolor-text').value = this.value;
                });
                document.getElementById('template-accentcolor-text').addEventListener('input', function() {
                    if (/^#[0-9A-F]{6}$/i.test(this.value)) {
                        document.getElementById('template-accentcolor').value = this.value;
                    }
                });
            </script>
        `;
    }    // Render edit template form
    renderEditTemplate() {
        if (!this.currentTemplate) return '<div>No template selected for editing.</div>';
        
        // Pre-populate the create form with current template data
        const createContent = this.renderCreateTemplate();
        
        // After inserting the form, populate it with current values
        setTimeout(() => {
            this.populateEditForm(this.currentTemplate);
        }, 100);
        
        return createContent;
    }

    // Populate edit form with template data
    populateEditForm(template) {
        // Basic fields
        const setFieldValue = (id, value) => {
            const field = document.getElementById(id);
            if (field && value !== undefined && value !== null) {
                field.value = value;
            }
        };

        setFieldValue('template-id', template.id);
        setFieldValue('template-name', template.name);
        setFieldValue('template-description', template.description);
        setFieldValue('template-category', template.category);
        setFieldValue('template-icon', template.icon);
        setFieldValue('template-version', template.version);
        setFieldValue('template-tags', template.tags ? template.tags.join(', ') : '');
        setFieldValue('template-baseurl', template.baseUrl);
        setFieldValue('template-authtype', template.authType);
        
        // UI colors
        if (template.ui) {
            setFieldValue('template-brandcolor', template.ui.brandColor);
            setFieldValue('template-brandcolor-text', template.ui.brandColor);
            setFieldValue('template-accentcolor', template.ui.accentColor);
            setFieldValue('template-accentcolor-text', template.ui.accentColor);
        }
        
        // Documentation
        if (template.documentation) {
            setFieldValue('template-docs-url', template.documentation.url);
            setFieldValue('template-quickstart-url', template.documentation.quickStart);
        }
        
        // Populate secrets
        if (template.requiredSecrets && template.requiredSecrets.length > 0) {
            const secretsContainer = document.getElementById('secrets-container');
            if (secretsContainer) {
                secretsContainer.innerHTML = '';
                template.requiredSecrets.forEach(secret => {
                    this.addSecret();
                    const lastSecret = secretsContainer.lastElementChild;
                    if (lastSecret) {
                        lastSecret.querySelector('.secret-key').value = secret.key || '';
                        lastSecret.querySelector('.secret-display-name').value = secret.displayName || '';
                        lastSecret.querySelector('.secret-description').value = secret.description || '';
                        lastSecret.querySelector('.secret-required').checked = secret.isRequired || false;
                    }
                });
            }
        }
        
        // Populate endpoints
        if (template.sampleEndpoints && template.sampleEndpoints.length > 0) {
            const endpointsContainer = document.getElementById('endpoints-container');
            if (endpointsContainer) {
                endpointsContainer.innerHTML = '';
                template.sampleEndpoints.forEach(endpoint => {
                    this.addEndpoint();
                    const lastEndpoint = endpointsContainer.lastElementChild;
                    if (lastEndpoint) {
                        lastEndpoint.querySelector('.endpoint-method').value = endpoint.method || 'GET';
                        lastEndpoint.querySelector('.endpoint-path').value = endpoint.endpoint || '';
                        lastEndpoint.querySelector('.endpoint-category').value = endpoint.category || '';
                        lastEndpoint.querySelector('.endpoint-description').value = endpoint.description || '';
                    }
                });
            }
        }
    }

    // Save handler
    modalSave() {
        if (this.mode === 'create') {
            const templateData = this.collectFormData();
            if (templateData && this.validateTemplateData(templateData)) {
                if (typeof this.modalSaveHandler === 'function') {
                    this.modalSaveHandler(templateData);
                }
                this.closeModal();
            }
        } else if (this.mode === 'edit') {
            const templateData = this.collectFormData();
            if (templateData && this.validateTemplateData(templateData)) {
                if (typeof this.modalSaveHandler === 'function') {
                    this.modalSaveHandler(templateData);
                }
                this.closeModal();
            }
        } else if (this.mode === 'use') {
            this.handleUseTemplate();
        } else if (this.mode === 'view') {
            // From view mode, "Use Template" button should switch to use mode
            this.mode = 'use';
            this.renderModal();
        } else {
            if (typeof this.modalSaveHandler === 'function') {
                this.modalSaveHandler(this.currentTemplate);
            }
            this.closeModal();
        }
    }

    // Handle using a template to create a profile
    async handleUseTemplate() {
        if (!this.currentTemplate) {
            alert('No template selected');
            return;
        }

        // Collect form data
        const profileName = document.getElementById('use-profile-name')?.value.trim();
        const description = document.getElementById('use-profile-description')?.value.trim();
        const baseUrl = document.getElementById('use-base-url')?.value.trim();
        const isSessionOnly = document.getElementById('use-session-only')?.checked || false;

        // Validate required fields
        if (!profileName) {
            alert('Profile name is required');
            return;
        }
        if (!baseUrl) {
            alert('Base URL is required');
            return;
        }

        // Collect secrets
        const secrets = {};
        const secretInputs = document.querySelectorAll('.template-secret-input');
        let hasRequiredSecrets = true;
        
        secretInputs.forEach(input => {
            const secretKey = input.dataset.secretKey;
            const value = input.value.trim();
            const isRequired = input.hasAttribute('required');
            
            if (isRequired && !value) {
                hasRequiredSecrets = false;
                input.style.borderColor = 'var(--danger-color, #dc3545)';
            } else {
                input.style.borderColor = '';
                if (value) {
                    secrets[secretKey] = value;
                }
            }
        });

        if (!hasRequiredSecrets) {
            alert('Please fill in all required credentials');
            return;
        }

        // Check SecretStore if not session only - use existing global function
        if (!isSessionOnly && window.isSecretStoreUnlocked && !window.isSecretStoreUnlocked()) {
            alert('SecretStore must be unlocked for persistent profiles. Please unlock it or choose "Session Only".');
            return;
        }

        try {
            // Use the static method from ProfileCreateWizard to maintain DRY principle
            const profileData = await window.ProfileCreateWizard.createProfileFromTemplate(this.currentTemplate, {
                name: profileName,
                description: description,
                baseUrl: baseUrl,
                isSessionOnly: isSessionOnly,
                secrets: secrets
            });

            console.log('[TemplateModal] Creating profile from template:', profileData);

            // Create the profile using the API
            const response = await window.apiClient.createProfile(profileData);
            
            if (response && response.success) {
                if (window.showNotification) {
                    window.showNotification(`Profile "${profileName}" created successfully from template`, 'success');
                }
                this.closeModal();
                
                // Reload profiles if possible
                if (window.profileManager && typeof window.profileManager.loadProfiles === 'function') {
                    window.profileManager.loadProfiles();
                }
            } else {
                throw new Error(response?.error || 'Failed to create profile');
            }
        } catch (error) {
            console.error('[TemplateModal] Error creating profile from template:', error);
            alert(`Failed to create profile: ${error.message}`);
        }
    }

    // Collect form data for template creation
    collectFormData() {
        const form = document.getElementById('template-create-form');
        if (!form) return null;

        const data = {
            id: document.getElementById('template-id')?.value.trim(),
            name: document.getElementById('template-name')?.value.trim(),
            description: document.getElementById('template-description')?.value.trim(),
            version: document.getElementById('template-version')?.value.trim() || '1.0',
            category: document.getElementById('template-category')?.value.trim(),
            tags: document.getElementById('template-tags')?.value.split(',').map(tag => tag.trim()).filter(tag => tag),
            icon: document.getElementById('template-icon')?.value.trim() || '📦',
            baseUrl: document.getElementById('template-baseurl')?.value.trim(),
            authType: document.getElementById('template-authtype')?.value.trim(),
            ui: {
                brandColor: document.getElementById('template-brandcolor-text')?.value.trim() || '#007acc',
                accentColor: document.getElementById('template-accentcolor-text')?.value.trim() || '#0066cc',
                gradient: `linear-gradient(135deg, ${document.getElementById('template-brandcolor-text')?.value.trim() || '#007acc'} 0%, ${document.getElementById('template-accentcolor-text')?.value.trim() || '#0066cc'} 100%)`,
                textColor: '#ffffff'
            },
            requiredSecrets: this.collectSecrets(),
            sampleEndpoints: this.collectEndpoints(),
            documentation: {
                url: document.getElementById('template-docs-url')?.value.trim(),
                quickStart: document.getElementById('template-quickstart-url')?.value.trim()
            }
        };

        // Remove empty documentation if no URLs provided
        if (!data.documentation.url && !data.documentation.quickStart) {
            delete data.documentation;
        }

        return data;
    }

    // Validate template data
    validateTemplateData(data) {
        if (!data.id) {
            alert('Template ID is required');
            return false;
        }
        if (!data.name) {
            alert('Template name is required');
            return false;
        }
        if (!data.description) {
            alert('Template description is required');
            return false;
        }
        if (!data.baseUrl) {
            alert('Base URL is required');
            return false;
        }
        
        // Check for valid ID format
        if (!/^[a-z0-9-_]+$/.test(data.id)) {
            alert('Template ID must contain only lowercase letters, numbers, hyphens, and underscores');
            return false;
        }

        return true;
    }

    // Collect secrets from the form
    collectSecrets() {
        const secrets = [];
        const secretContainers = document.querySelectorAll('.secret-form-item');
        
        secretContainers.forEach(container => {
            const key = container.querySelector('.secret-key')?.value.trim();
            const displayName = container.querySelector('.secret-display-name')?.value.trim();
            const description = container.querySelector('.secret-description')?.value.trim();
            const isRequired = container.querySelector('.secret-required')?.checked;
            
            if (key && displayName) {
                secrets.push({
                    key,
                    displayName,
                    description: description || displayName,
                    isRequired: isRequired || false,
                    placeholder: `your-${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
                });
            }
        });
        
        return secrets;
    }

    // Collect endpoints from the form
    collectEndpoints() {
        const endpoints = [];
        const endpointContainers = document.querySelectorAll('.endpoint-form-item');
        
        endpointContainers.forEach(container => {
            const method = container.querySelector('.endpoint-method')?.value.trim();
            const endpoint = container.querySelector('.endpoint-path')?.value.trim();
            const description = container.querySelector('.endpoint-description')?.value.trim();
            const category = container.querySelector('.endpoint-category')?.value.trim();
            
            if (method && endpoint && description) {
                endpoints.push({
                    method,
                    endpoint,
                    description,
                    category: category || 'General'
                });
            }
        });
        
        return endpoints;
    }

    // Add a new secret field
    addSecret() {
        const container = document.getElementById('secrets-container');
        const secretDiv = document.createElement('div');
        secretDiv.className = 'secret-form-item';
        secretDiv.style.cssText = 'background: var(--bg-secondary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 0.75rem; position: relative;';
        
        secretDiv.innerHTML = `
            <button type="button" onclick="this.parentElement.remove()" style="position: absolute; top: 0.5rem; right: 0.5rem; background: var(--danger-color, #dc3545); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; justify-content: center;">&times;</button>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">Key *</label>
                    <input type="text" class="secret-key" placeholder="token" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.85rem;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">Display Name *</label>
                    <input type="text" class="secret-display-name" placeholder="API Token" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.85rem;">
                </div>
            </div>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">Description</label>
                <input type="text" class="secret-description" placeholder="API authentication token" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.85rem;">
            </div>
            <div>
                <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: var(--text-primary); font-size: 0.9rem; cursor: pointer;">
                    <input type="checkbox" class="secret-required" checked style="margin: 0;">
                    Required
                </label>
            </div>
        `;
        
        container.appendChild(secretDiv);
    }

    // Add a new endpoint field
    addEndpoint() {
        const container = document.getElementById('endpoints-container');
        const endpointDiv = document.createElement('div');
        endpointDiv.className = 'endpoint-form-item';
        endpointDiv.style.cssText = 'background: var(--bg-secondary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 0.75rem; position: relative;';
        
        endpointDiv.innerHTML = `
            <button type="button" onclick="this.parentElement.remove()" style="position: absolute; top: 0.5rem; right: 0.5rem; background: var(--danger-color, #dc3545); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; justify-content: center;">&times;</button>
            <div style="display: grid; grid-template-columns: 100px 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">Method *</label>
                    <select class="endpoint-method" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.85rem;">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                    </select>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">Endpoint *</label>
                    <input type="text" class="endpoint-path" placeholder="/user" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.85rem; font-family: monospace;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">Category</label>
                    <input type="text" class="endpoint-category" placeholder="User" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.85rem;">
                </div>
            </div>
            <div>
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">Description *</label>
                <input type="text" class="endpoint-description" placeholder="Get the authenticated user" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.85rem;">
            </div>
        `;
        
        container.appendChild(endpointDiv);
    }

    // Close modal
    closeModal() {
        this.removeExistingModal();
    }
}

// Export for use in template manager
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateModal;
}
