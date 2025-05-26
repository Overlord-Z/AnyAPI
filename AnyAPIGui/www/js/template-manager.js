/**
 * AnyAPI GUI - Template Manager
 * Handles API templates, quick-start configurations, and template application
 */

class TemplateManager {
    constructor() {
        this.templates = [];
        this.selectedTemplate = null;
        this.customTemplates = JSON.parse(localStorage.getItem('anyapi_custom_templates') || '[]');
        
        // Initialize template manager
        this.init();
    }

    /**
     * Initialize template manager
     */
    async init() {
        try {
            await this.loadTemplates();
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize template manager:', error);
            showNotification('Failed to load templates', 'error');
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for connection status changes
        window.addEventListener('connectionStatusChanged', (event) => {
            if (event.detail.connected) {
                this.loadTemplates();
            }
        });
    }

    /**
     * Load templates from backend and merge with custom templates
     */
    async loadTemplates() {
        try {
            // Load built-in templates from backend
            const builtInTemplates = await apiClient.getTemplates();
            
            // Merge with custom templates
            this.templates = [
                ...builtInTemplates.map(t => ({ ...t, isBuiltIn: true })),
                ...this.customTemplates.map(t => ({ ...t, isCustom: true }))
            ];
            
            this.renderTemplates();
            console.log('Loaded templates:', this.templates.length);
        } catch (error) {
            console.error('Failed to load templates:', error);
            
            // Fall back to custom templates only
            this.templates = this.customTemplates.map(t => ({ ...t, isCustom: true }));
            this.renderTemplates();
            
            if (apiClient.isConnected) {
                showNotification('Failed to load built-in templates', 'warning');
            }
        }
    }

    /**
     * Render templates grid
     */
    renderTemplates() {
        const container = document.getElementById('templates-grid');
        if (!container) return;

        if (this.templates.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-icon">📋</div>
                    <h3>No Templates Available</h3>
                    <p>Templates help you quickly set up common API configurations</p>
                    <button class="btn btn-primary" onclick="templateManager.showCreateTemplateModal()">
                        ➕ Create Custom Template
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.templates.map(template => `
            <div class="template-card" onclick="templateManager.selectTemplate('${template.id}')">
                <div class="template-icon">${template.icon || '🔧'}</div>
                <div class="template-name">${escapeHtml(template.name)}</div>
                <div class="template-description">${escapeHtml(template.description)}</div>
                <div class="template-details">
                    <div style="margin-top: 1rem;">
                        <span class="badge ${template.isBuiltIn ? 'badge-primary' : 'badge-secondary'}">
                            ${template.isBuiltIn ? 'Built-in' : 'Custom'}
                        </span>
                        <span class="badge badge-outline">${template.authType}</span>
                    </div>
                    ${template.sampleEndpoints ? `
                        <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">
                            ${template.sampleEndpoints.length} sample endpoints
                        </div>
                    ` : ''}
                </div>
                ${template.isCustom ? `
                    <div class="template-actions" onclick="event.stopPropagation();">
                        <button class="btn btn-sm btn-outline" onclick="templateManager.editTemplate('${template.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="templateManager.deleteTemplate('${template.id}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    /**
     * Select and show template details
     */
    selectTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        this.selectedTemplate = template;
        this.showTemplateModal(template);
    }

    /**
     * Show template details modal
     */
    showTemplateModal(template) {
        const modal = this.createTemplateModal(template);
        document.body.appendChild(modal);
        
        // Show modal
        setTimeout(() => {
            modal.style.display = 'block';
            modal.classList.add('show');
        }, 10);
    }

    /**
     * Create template details modal
     */
    createTemplateModal(template) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'template-details-modal';
        
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>${template.icon} ${escapeHtml(template.name)}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="template-info">
                        <p><strong>Description:</strong> ${escapeHtml(template.description)}</p>
                        
                        <div class="config-section">
                            <h4>Configuration</h4>
                            <div class="config-item">
                                <span class="config-label">Base URL:</span>
                                <span class="config-value">${escapeHtml(template.baseUrl)}</span>
                            </div>
                            <div class="config-item">
                                <span class="config-label">Authentication:</span>
                                <span class="config-value">${escapeHtml(template.authType)}</span>
                            </div>
                            ${template.paginationType ? `
                                <div class="config-item">
                                    <span class="config-label">Pagination:</span>
                                    <span class="config-value">${escapeHtml(template.paginationType)}</span>
                                </div>
                            ` : ''}
                        </div>

                        ${this.renderTemplateHeaders(template)}
                        ${this.renderTemplateCustomSettings(template)}
                        ${this.renderTemplateRequiredSecrets(template)}
                        ${this.renderTemplateSampleEndpoints(template)}
                        ${this.renderTemplateCustomScript(template)}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Close
                    </button>
                    <button type="button" class="btn btn-primary" onclick="templateManager.applyTemplate('${template.id}'); this.closest('.modal').remove();">
                        🚀 Use This Template
                    </button>
                </div>
            </div>
        `;
        
        return modal;
    }

    /**
     * Render template headers
     */
    renderTemplateHeaders(template) {
        if (!template.defaultHeaders || Object.keys(template.defaultHeaders).length === 0) {
            return '';
        }

        const headerItems = Object.entries(template.defaultHeaders).map(([key, value]) => `
            <div class="config-item">
                <span class="config-label">${escapeHtml(key)}:</span>
                <span class="config-value">${escapeHtml(value)}</span>
            </div>
        `).join('');

        return `
            <div class="config-section">
                <h4>Default Headers</h4>
                ${headerItems}
            </div>
        `;
    }

    /**
     * Render template custom settings
     */
    renderTemplateCustomSettings(template) {
        if (!template.customSettings || Object.keys(template.customSettings).length === 0) {
            return '';
        }

        const settingItems = Object.entries(template.customSettings).map(([key, value]) => `
            <div class="config-item">
                <span class="config-label">${escapeHtml(key)}:</span>
                <span class="config-value">${escapeHtml(String(value))}</span>
            </div>
        `).join('');

        return `
            <div class="config-section">
                <h4>Custom Settings</h4>
                ${settingItems}
            </div>
        `;
    }

    /**
     * Render required secrets
     */
    renderTemplateRequiredSecrets(template) {
        if (!template.requiredSecrets || template.requiredSecrets.length === 0) {
            return '';
        }

        const secretItems = template.requiredSecrets.map(secret => `
            <li>${escapeHtml(secret)}</li>
        `).join('');

        return `
            <div class="config-section">
                <h4>Required Secrets</h4>
                <p>This template requires the following secrets to be configured:</p>
                <ul style="margin: 1rem 0; padding-left: 2rem;">
                    ${secretItems}
                </ul>
                <p style="font-size: 0.875rem; color: var(--text-muted);">
                    These secrets will be stored securely using your configured secret storage provider.
                </p>
            </div>
        `;
    }

    /**
     * Render sample endpoints
     */
    renderTemplateSampleEndpoints(template) {
        if (!template.sampleEndpoints || template.sampleEndpoints.length === 0) {
            return '';
        }

        const endpointItems = template.sampleEndpoints.map(endpoint => `
            <div class="sample-endpoint">
                <span class="method-badge ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                <code>${escapeHtml(endpoint.endpoint)}</code>
                <p>${escapeHtml(endpoint.description)}</p>
            </div>
        `).join('');

        return `
            <div class="config-section">
                <h4>Sample Endpoints</h4>
                <div class="sample-endpoints">
                    ${endpointItems}
                </div>
            </div>
        `;
    }

    /**
     * Render custom authentication script
     */
    renderTemplateCustomScript(template) {
        if (template.authType !== 'CustomScript' || !template.customAuthScript) {
            return '';
        }

        return `
            <div class="config-section">
                <h4>Custom Authentication Script</h4>
                <div class="code-block" style="max-height: 300px; overflow-y: auto;">
                    <pre>${escapeHtml(template.customAuthScript)}</pre>
                </div>
                <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 1rem;">
                    This script will be used for authentication. Make sure to configure the required secrets.
                </p>
            </div>
        `;
    }

    /**
     * Apply template to create new profile
     */
    async applyTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        try {
            // Check SecretStore access if needed
            await secretManager.ensureSecretStoreAccess();

            // Generate unique profile name
            const profileName = await this.generateUniqueProfileName(template.name);
            
            // Pre-fill profile form
            this.fillProfileFormFromTemplate(template, profileName);
            
            // Switch to profiles section and show modal
            app.showSection('profiles');
            profileManager.showCreateModal();
            
            showNotification(`Template "${template.name}" applied to new profile`, 'success');
        } catch (error) {
            console.error('Failed to apply template:', error);
            showNotification(`Failed to apply template: ${error.message}`, 'error');
        }
    }

    /**
     * Generate unique profile name based on template
     */
    async generateUniqueProfileName(baseName) {
        // Get current profiles
        await profileManager.loadProfiles();
        const existingNames = profileManager.profiles.map(p => p.name);
        
        let counter = 1;
        let candidateName = baseName;
        
        while (existingNames.includes(candidateName)) {
            candidateName = `${baseName} (${counter})`;
            counter++;
        }
        
        return candidateName;
    }

    /**
     * Fill profile form with template data
     */
    fillProfileFormFromTemplate(template, profileName) {
        // Basic fields
        profileManager.setFormValue('profile-name', profileName);
        profileManager.setFormValue('profile-baseurl', template.baseUrl);
        profileManager.setFormValue('profile-authtype', template.authType);
        profileManager.setFormValue('profile-pagination', template.paginationType || '');
        
        // Update auth fields
        profileManager.updateAuthFields();
        
        // Fill auth-specific fields
        if (template.authType === 'CustomScript' && template.customAuthScript) {
            const scriptElement = document.getElementById('auth-custom-script');
            if (scriptElement) {
                scriptElement.value = template.customAuthScript;
            }
            
            if (template.requiredSecrets) {
                const secretsElement = document.getElementById('auth-required-secrets');
                if (secretsElement) {
                    secretsElement.value = template.requiredSecrets.join(', ');
                }
            }
        }
        
        // Note: For security reasons, we don't pre-fill actual secret values
        // Users will need to enter their own API keys, tokens, etc.
    }

    /**
     * Refresh templates from backend
     */
    async refreshTemplates() {
        try {
            showNotification('Refreshing templates...', 'info');
            await this.loadTemplates();
            showNotification('Templates refreshed successfully', 'success');
        } catch (error) {
            console.error('Failed to refresh templates:', error);
            showNotification('Failed to refresh templates', 'error');
        }
    }

    /**
     * Show create custom template modal
     */
    showCreateTemplateModal() {
        const modal = this.createCustomTemplateModal();
        document.body.appendChild(modal);
        
        setTimeout(() => {
            modal.style.display = 'block';
            modal.classList.add('show');
        }, 10);
    }

    /**
     * Create custom template modal
     */
    createCustomTemplateModal(template = null) {
        const isEditing = !!template;
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'custom-template-modal';
        
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>${isEditing ? 'Edit' : 'Create'} Custom Template</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="custom-template-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Template Name:</label>
                                <input type="text" id="template-name" class="form-control" 
                                       value="${template ? escapeHtml(template.name) : ''}" required>
                            </div>
                            <div class="form-group">
                                <label>Icon (emoji):</label>
                                <input type="text" id="template-icon" class="form-control" 
                                       value="${template ? escapeHtml(template.icon || '') : '🔧'}" 
                                       placeholder="🔧" maxlength="2">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Description:</label>
                            <textarea id="template-description" class="form-control" rows="3" 
                                      placeholder="Describe what this template is for..." required>${template ? escapeHtml(template.description) : ''}</textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Base URL:</label>
                                <input type="url" id="template-baseurl" class="form-control" 
                                       value="${template ? escapeHtml(template.baseUrl) : ''}" 
                                       placeholder="https://api.example.com" required>
                            </div>
                            <div class="form-group">
                                <label>Authentication Type:</label>
                                <select id="template-authtype" class="form-control" required>
                                    <option value="ApiKey" ${template?.authType === 'ApiKey' ? 'selected' : ''}>API Key</option>
                                    <option value="BearerToken" ${template?.authType === 'BearerToken' ? 'selected' : ''}>Bearer Token</option>
                                    <option value="CustomScript" ${template?.authType === 'CustomScript' ? 'selected' : ''}>Custom Script</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Pagination Type:</label>
                            <select id="template-pagination" class="form-control">
                                <option value="">Auto-detect</option>
                                <option value="LinkHeader" ${template?.paginationType === 'LinkHeader' ? 'selected' : ''}>Link Header</option>
                                <option value="Cursor" ${template?.paginationType === 'Cursor' ? 'selected' : ''}>Cursor-based</option>
                                <option value="PageBased" ${template?.paginationType === 'PageBased' ? 'selected' : ''}>Page-based</option>
                                <option value="OffsetLimit" ${template?.paginationType === 'OffsetLimit' ? 'selected' : ''}>Offset/Limit</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Default Headers (JSON format):</label>
                            <textarea id="template-headers" class="form-control code-editor" rows="4" 
                                      placeholder='{"Accept": "application/json", "User-Agent": "MyApp/1.0"}'>${template && template.defaultHeaders ? formatJson(template.defaultHeaders) : ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>Custom Settings (JSON format):</label>
                            <textarea id="template-settings" class="form-control code-editor" rows="4" 
                                      placeholder='{"timeout": 30, "retries": 3}'>${template && template.customSettings ? formatJson(template.customSettings) : ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Cancel
                    </button>
                    <button type="button" class="btn btn-primary" onclick="templateManager.saveCustomTemplate(${isEditing ? `'${template.id}'` : 'null'}); this.closest('.modal').remove();">
                        ${isEditing ? 'Update' : 'Create'} Template
                    </button>
                </div>
            </div>
        `;
        
        return modal;
    }

    /**
     * Save custom template
     */
    saveCustomTemplate(templateId = null) {
        try {
            const formData = this.collectTemplateFormData();
            
            if (!this.validateTemplateForm(formData)) {
                return;
            }

            const template = {
                id: templateId || `custom_${Date.now()}`,
                name: formData.name,
                icon: formData.icon || '🔧',
                description: formData.description,
                baseUrl: formData.baseUrl,
                authType: formData.authType,
                paginationType: formData.paginationType || null,
                defaultHeaders: formData.defaultHeaders,
                customSettings: formData.customSettings,
                isCustom: true,
                createdAt: templateId ? undefined : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (templateId) {
                // Update existing template
                const index = this.customTemplates.findIndex(t => t.id === templateId);
                if (index !== -1) {
                    this.customTemplates[index] = { ...this.customTemplates[index], ...template };
                }
            } else {
                // Add new template
                this.customTemplates.push(template);
            }

            // Save to localStorage
            localStorage.setItem('anyapi_custom_templates', JSON.stringify(this.customTemplates));
            
            // Refresh display
            this.loadTemplates();
            
            showNotification(
                templateId ? 'Template updated successfully' : 'Template created successfully',
                'success'
            );
        } catch (error) {
            console.error('Failed to save template:', error);
            showNotification(`Failed to save template: ${error.message}`, 'error');
        }
    }

    /**
     * Collect template form data
     */
    collectTemplateFormData() {
        const formData = {
            name: document.getElementById('template-name')?.value?.trim(),
            icon: document.getElementById('template-icon')?.value?.trim(),
            description: document.getElementById('template-description')?.value?.trim(),
            baseUrl: document.getElementById('template-baseurl')?.value?.trim(),
            authType: document.getElementById('template-authtype')?.value,
            paginationType: document.getElementById('template-pagination')?.value
        };

        // Parse JSON fields
        const headersText = document.getElementById('template-headers')?.value?.trim();
        if (headersText) {
            try {
                formData.defaultHeaders = JSON.parse(headersText);
            } catch {
                formData.defaultHeaders = {};
                showNotification('Invalid JSON in Default Headers field', 'warning');
            }
        } else {
            formData.defaultHeaders = {};
        }

        const settingsText = document.getElementById('template-settings')?.value?.trim();
        if (settingsText) {
            try {
                formData.customSettings = JSON.parse(settingsText);
            } catch {
                formData.customSettings = {};
                showNotification('Invalid JSON in Custom Settings field', 'warning');
            }
        } else {
            formData.customSettings = {};
        }

        return formData;
    }

    /**
     * Validate template form
     */
    validateTemplateForm(formData) {
        if (!formData.name) {
            showNotification('Template name is required', 'error');
            return false;
        }

        if (!formData.description) {
            showNotification('Template description is required', 'error');
            return false;
        }

        if (!formData.baseUrl) {
            showNotification('Base URL is required', 'error');
            return false;
        }

        if (!isValidUrl(formData.baseUrl)) {
            showNotification('Base URL must be a valid URL', 'error');
            return false;
        }

        if (!formData.authType) {
            showNotification('Authentication type is required', 'error');
            return false;
        }

        return true;
    }

    /**
     * Edit custom template
     */
    editTemplate(templateId) {
        const template = this.customTemplates.find(t => t.id === templateId);
        if (!template) return;

        const modal = this.createCustomTemplateModal(template);
        document.body.appendChild(modal);
        
        setTimeout(() => {
            modal.style.display = 'block';
            modal.classList.add('show');
        }, 10);
    }

    /**
     * Delete custom template
     */
    deleteTemplate(templateId) {
        const template = this.customTemplates.find(t => t.id === templateId);
        if (!template) return;

        if (!confirm(`Are you sure you want to delete the template "${template.name}"?\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            this.customTemplates = this.customTemplates.filter(t => t.id !== templateId);
            localStorage.setItem('anyapi_custom_templates', JSON.stringify(this.customTemplates));
            
            this.loadTemplates();
            showNotification('Template deleted successfully', 'success');
        } catch (error) {
            console.error('Failed to delete template:', error);
            showNotification('Failed to delete template', 'error');
        }
    }

    /**
     * Export custom templates
     */
    exportTemplates() {
        if (this.customTemplates.length === 0) {
            showNotification('No custom templates to export', 'warning');
            return;
        }

        const data = {
            exported: new Date().toISOString(),
            version: '1.0',
            templates: this.customTemplates
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `anyapi-templates-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        showNotification('Templates exported successfully', 'success');
    }

    /**
     * Import custom templates
     */
    importTemplates() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                if (data.templates && Array.isArray(data.templates)) {
                    // Check for conflicts
                    const conflicts = data.templates.filter(importTemplate => 
                        this.customTemplates.some(existing => existing.id === importTemplate.id)
                    );

                    let proceed = true;
                    if (conflicts.length > 0) {
                        proceed = confirm(`${conflicts.length} template(s) already exist and will be overwritten. Continue?`);
                    }

                    if (proceed) {
                        // Merge templates
                        data.templates.forEach(importTemplate => {
                            const existingIndex = this.customTemplates.findIndex(t => t.id === importTemplate.id);
                            if (existingIndex !== -1) {
                                this.customTemplates[existingIndex] = { ...importTemplate, isCustom: true };
                            } else {
                                this.customTemplates.push({ ...importTemplate, isCustom: true });
                            }
                        });

                        localStorage.setItem('anyapi_custom_templates', JSON.stringify(this.customTemplates));
                        this.loadTemplates();
                        
                        showNotification(`Imported ${data.templates.length} template(s)`, 'success');
                    }
                } else {
                    showNotification('Invalid template file format', 'error');
                }
            } catch (error) {
                console.error('Failed to import templates:', error);
                showNotification('Failed to import template file', 'error');
            }
        };
        
        input.click();
    }

    /**
     * Get template recommendations based on URL
     */
    getTemplateRecommendations(url) {
        if (!url) return [];

        const recommendations = [];
        const lowercaseUrl = url.toLowerCase();

        // Check against known patterns
        if (lowercaseUrl.includes('github.com') || lowercaseUrl.includes('api.github.com')) {
            const github = this.templates.find(t => t.id === 'github');
            if (github) recommendations.push(github);
        }

        if (lowercaseUrl.includes('graph.microsoft.com')) {
            const msgraph = this.templates.find(t => t.id === 'msgraph');
            if (msgraph) recommendations.push(msgraph);
        }

        if (lowercaseUrl.includes('slack.com')) {
            const slack = this.templates.find(t => t.id === 'slack');
            if (slack) recommendations.push(slack);
        }

        if (lowercaseUrl.includes('atlassian.net') || lowercaseUrl.includes('jira')) {
            const jira = this.templates.find(t => t.id === 'jira');
            if (jira) recommendations.push(jira);
        }

        if (lowercaseUrl.includes('api.stripe.com')) {
            const stripe = this.templates.find(t => t.id === 'stripe');
            if (stripe) recommendations.push(stripe);
        }

        if (lowercaseUrl.includes('api.openai.com')) {
            const openai = this.templates.find(t => t.id === 'openai');
            if (openai) recommendations.push(openai);
        }

        return recommendations;
    }

    /**
     * Show template recommendations
     */
    showTemplateRecommendations(url, targetElement) {
        const recommendations = this.getTemplateRecommendations(url);
        
        if (recommendations.length === 0 || !targetElement) {
            return;
        }

        const container = document.createElement('div');
        container.className = 'template-recommendations';
        container.innerHTML = `
            <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 6px;">
                <h5 style="margin: 0 0 0.5rem; color: var(--color-primary);">💡 Template Suggestions</h5>
                <p style="font-size: 0.875rem; color: var(--text-muted); margin: 0 0 1rem;">
                    Based on your URL, these templates might be helpful:
                </p>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${recommendations.map(template => `
                        <button class="btn btn-sm btn-outline" onclick="templateManager.applyTemplate('${template.id}')">
                            ${template.icon} ${escapeHtml(template.name)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        targetElement.appendChild(container);
    }
}

// CSS for template-specific styles (add to styles.css)
const templateStyles = `
.badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: 0.25rem;
    margin-right: 0.5rem;
}

.badge-primary {
    background: var(--color-primary);
    color: white;
}

.badge-secondary {
    background: var(--color-gray-600);
    color: white;
}

.badge-outline {
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border-color);
}

.template-actions {
    position: absolute;
    top: 1rem;
    right: 1rem;
    opacity: 0;
    transition: var(--transition-fast);
    display: flex;
    gap: 0.25rem;
}

.template-card:hover .template-actions {
    opacity: 1;
}

.sample-endpoints {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.sample-endpoint {
    padding: 1rem;
    background: var(--bg-tertiary);
    border-radius: 6px;
    border-left: 3px solid var(--color-primary);
}

.sample-endpoint .method-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 0.25rem;
    margin-right: 0.5rem;
    color: white;
}

.sample-endpoint .method-badge.get { background: var(--color-info); }
.sample-endpoint .method-badge.post { background: var(--color-success); }
.sample-endpoint .method-badge.put { background: var(--color-warning); }
.sample-endpoint .method-badge.patch { background: var(--color-warning); }
.sample-endpoint .method-badge.delete { background: var(--color-danger); }

.sample-endpoint code {
    background: var(--color-gray-900);
    color: var(--color-gray-100);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 0.875rem;
}

.sample-endpoint p {
    margin: 0.5rem 0 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.template-recommendations {
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
`;

// Inject template styles
if (!document.getElementById('template-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'template-styles';
    styleSheet.textContent = templateStyles;
    document.head.appendChild(styleSheet);
}

// Initialize global template manager
const templateManager = new TemplateManager();