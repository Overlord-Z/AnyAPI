/**
 * AnyAPI GUI - Template Manager
 * Handles API templates, quick-start configurations, and template application
 */

class TemplateManager {
    constructor() {
        this.templates = [];
        this.selectedTemplate = null;
        this.customTemplates = JSON.parse(localStorage.getItem('anyapi_custom_templates') || '[]');
        this.templateModal = null;
        this.isLoading = false;
        
        // Add caching properties
        this.templatesCache = null;
        this.cacheExpiry = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        this.initialLoadComplete = false;
        this.wasDisconnected = false;
        
        this.init();
    } 
    
    
    
    /**
     * Initialize template manager
     */
    async init() {
        console.log('[TemplateManager] Initializing...');
        
        // Initialize the TemplateModal first before loading templates
        this.initializeModal();
        
        await this.loadTemplates();
        this.setupEventListeners();
        
        console.log('[TemplateManager] Initialized successfully');
    }

    // Initialize the modal instance
    initializeModal() {
        // Ensure TemplateModal class is available
        if (typeof TemplateModal === 'undefined') {
            console.error('[TemplateManager] TemplateModal class not found. Make sure template-modal.js is loaded first.');
            return;
        }
        
        // Create the modal instance and make it globally available
        this.templateModal = new TemplateModal(this);
        window.templateModal = this.templateModal;
        
        console.log('[TemplateManager] TemplateModal initialized');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for connection status changes with debouncing and caching
        let connectionChangeTimeout;
        window.addEventListener('connectionStatusChanged', (event) => {
            if (!event.detail.connected) {
                // Track that we were disconnected
                this.wasDisconnected = true;
            } else if (this.wasDisconnected && this.initialLoadComplete) {
                // Only reload if we were actually disconnected and initial load is complete
                clearTimeout(connectionChangeTimeout);
                connectionChangeTimeout = setTimeout(() => {
                    if (!this.isLoading && !this.isCacheValid()) {
                        console.log('[TemplateManager] Connection restored after disconnect, reloading templates...');
                        this.loadTemplates();
                    }
                    this.wasDisconnected = false;
                }, 500);
            } else if (event.detail.connected && !this.initialLoadComplete) {
                // First connection, load templates
                clearTimeout(connectionChangeTimeout);
                connectionChangeTimeout = setTimeout(() => {
                    if (!this.isLoading) {
                        this.loadTemplates();
                    }
                }, 500);
            }
        });
    }

    /**
     * Check if template cache is valid
     */
    isCacheValid() {
        return this.templatesCache && 
               this.cacheExpiry && 
               Date.now() < this.cacheExpiry;
    }

    /**
     * Load templates from backend and merge with custom templates
     */
    async loadTemplates() {
        // Prevent duplicate calls
        if (this.isLoading) {
            console.log('[TemplateManager] Already loading templates, skipping...');
            return;
        }

        // Use cache if valid and not forced refresh
        if (this.isCacheValid() && this.initialLoadComplete) {
            console.log('[TemplateManager] Using cached templates');
            this.allTemplates = [...this.templatesCache];
            this.currentSearchQuery = '';
            this.currentFilter = 'all';
            this.templates = [...this.allTemplates];
            this.renderTemplates();
            this.initializeSearchAndFilters();
            return;
        }
        
        this.isLoading = true;
        
        try {
            console.log('[TemplateManager] Loading templates...');
            
            // Load enhanced JSON templates dynamically from manifest
            const jsonTemplates = await this.loadJsonTemplates();

            // Merge with custom templates only
            this.allTemplates = [
                ...jsonTemplates.map(t => ({ ...t, isEnhanced: true })),
                ...this.customTemplates.map(t => ({ ...t, isCustom: true }))
            ];

            // Cache the templates
            this.templatesCache = [...this.allTemplates];
            this.cacheExpiry = Date.now() + this.CACHE_DURATION;
            this.initialLoadComplete = true;

            // Initialize current filter state
            this.currentSearchQuery = '';
            this.currentFilter = 'all';
            this.templates = [...this.allTemplates];

            this.renderTemplates();
            this.initializeSearchAndFilters();

            console.log('Loaded templates:', this.allTemplates.length);
        } catch (error) {
            console.error('Failed to load templates:', error);
            // Fall back to custom templates only
            this.allTemplates = this.customTemplates.map(t => ({ ...t, isCustom: true }));
            this.templates = [...this.allTemplates];
            
            // Cache the fallback
            this.templatesCache = [...this.allTemplates];
            this.cacheExpiry = Date.now() + (this.CACHE_DURATION / 2); // Shorter cache for fallback
            this.initialLoadComplete = true;
            
            this.renderTemplates();
            showNotification('Failed to load templates', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load enhanced JSON templates from templates directory using manifest
     */    async loadJsonTemplates() {
        const templates = [];
        try {
            // Use new backend endpoint to get list of template files
            const listResponse = await fetch('/api/templates/list');
            if (!listResponse.ok) {
                console.warn('Could not load template list from backend');
                return templates;
            }
            
            const listData = await listResponse.json();
            if (!listData.success || !listData.files) {
                console.warn('Invalid response from template list endpoint');
                return templates;
            }
            
            console.log(`Found ${listData.count} template files`);
            
            // Load each template file
            for (const fileInfo of listData.files) {
                try {
                    const response = await fetch(`./${fileInfo.path}`);
                    if (response.ok) {
                        const template = await response.json();
                        templates.push(template);
                    } else {
                        console.warn(`Failed to load template: ${fileInfo.name}`);
                    }
                } catch (error) {
                    console.warn(`Error loading template ${fileInfo.name}:`, error);
                }
            }
        } catch (err) {
            console.warn('Error loading templates from backend:', err);
        }
        
        console.log('Loaded JSON templates:', templates.length);
        return templates;
    }/**
     * Render templates grid
     */
    renderTemplates() {
        const container = document.getElementById('templates-grid');
        if (!container) return;

        if (this.templates.length === 0) {
            container.innerHTML = `
                <div class="templates-empty-state">
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

        container.innerHTML = this.templates.map(template => this.renderTemplateCard(template)).join('');
    }

    /**
     * Render individual template card with enhanced styling
     */
    renderTemplateCard(template) {
        const isEnhanced = template.ui && (template.ui.brandColor || template.ui.logo);
        const brand = template.id.toLowerCase();

        // Calculate statistics
        const endpointCount = template.sampleEndpoints ? template.sampleEndpoints.length : 0;
        const secretCount = template.requiredSecrets ? template.requiredSecrets.length : 0;

        // Build CSS custom properties for enhanced templates
        let customStyles = '';
        if (isEnhanced && template.ui) {
            const ui = template.ui;
            customStyles = `style="
                ${ui.brandColor ? `--card-border-color: ${ui.brandColor}; --card-accent-color: ${ui.brandColor}; --category-color: ${ui.brandColor};` : ''}
                ${ui.accentColor ? `--accent-gradient-start: ${ui.brandColor}; --accent-gradient-end: ${ui.accentColor};` : ''}
                ${ui.textColor ? `--card-text-color: ${ui.textColor};` : ''}
            "`;
        }

        return `
            <div class="template-card ${isEnhanced ? 'enhanced' : ''}" 
                 data-brand="${brand}" 
                 ${customStyles}
                 onclick="templateManager.selectTemplate('${template.id}')">
                <div class="template-card-header">
                    <div class="template-logo">
                        ${template.ui && template.ui.logo ? 
                            `<img src="${template.ui.logo}" alt="${escapeHtml(template.name)} logo" />` :
                            `<div class="template-icon">${template.icon || '🔧'}</div>`
                        }
                    </div>
                    
                    <div class="template-category-badge">${this.getCategoryDisplayName(template)}</div>
                    
                    <h3 class="template-title">${escapeHtml(template.name)}</h3>
                    <p class="template-description">${escapeHtml(template.description)}</p>
                </div>
                <div class="template-card-body">
                    <div class="template-content">
                        ${template.tags && template.tags.length > 0 ? `
                            <div class="template-tags">
                                ${template.tags.slice(0, 3).map(tag => `
                                    <span class="template-tag">${escapeHtml(tag)}</span>
                                `).join('')}
                                ${template.tags.length > 3 ? `<span class="template-tag">+${template.tags.length - 3}</span>` : ''}
                            </div>
                        ` : ''}
                        
                        <div class="template-auth-info">
                            <span class="auth-label">Auth:</span>
                            <span class="auth-value">${escapeHtml(template.authType)}</span>
                        </div>
                    </div>
                    
                    <div class="template-stats">
                        <div class="template-stat">
                            <span class="template-stat-value">${endpointCount}</span>
                            <span class="template-stat-label">Endpoints</span>
                        </div>
                        <div class="template-stat">
                            <span class="template-stat-value">${secretCount}</span>
                            <span class="template-stat-label">Keys</span>
                        </div>
                        ${isEnhanced ? `
                            <div class="template-type-indicator enhanced" title="Enhanced Template">⭐</div>
                        ` : template.isCustom ? `
                            <div class="template-type-indicator custom" title="Custom Template">🔧</div>
                        ` : ''}
                    </div>
                </div>
                
                ${template.isCustom ? `
                    <div class="template-actions" onclick="event.stopPropagation();">
                        <button class="template-action-btn" onclick="templateManager.editTemplate('${template.id}')" title="Edit Template">
                            ✏️
                        </button>
                        <button class="template-action-btn delete" onclick="templateManager.deleteTemplate('${template.id}')" title="Delete Template">
                            🗑️
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Select and show template details
     */
    selectTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        this.selectedTemplate = template;
        this.showTemplateModal(template);
    }    /**
     * Show template details modal (now uses DRY TemplateModal)
     */
    showTemplateModal(template) {
        if (!this.templateModal) {
            console.error('TemplateModal not initialized yet');
            return;
        }
        this.templateModal.show({ template, mode: 'view', onSave: () => this.applyTemplate(template.id) });
    }

    /**
     * Create template details modal
     */
    createTemplateModal(template) {
        // Deprecated: Use TemplateModal instead
        this.showTemplateModal(template);
    }

    /**
     * Apply template to create new profile
     */
    async applyTemplate(templateId) {
        console.log(`[TemplateManager] Applying template: ${templateId}`);
        const template = this.templates.find(t => t.id === templateId);
        if (!template) {
            console.error(`Template ${templateId} not found`);
            if (window.showNotification) {
                window.showNotification(`Template not found: ${templateId}`, 'error');
            }
            return;
        }

        try {
            // Ensure modal is initialized
            if (!this.templateModal || !window.templateModal) {
                console.warn('[TemplateManager] Modal not initialized, creating now...');
                this.initializeModal();
            }
            
            // Use the template modal to show the use template form
            this.templateModal.show({
                template: template,
                mode: 'use',
                onSave: null // The modal handles save internally
            });
            
        } catch (error) {
            console.error('[TemplateManager] Failed to apply template:', error);
            if (window.showNotification) {
                window.showNotification(`Failed to apply template: ${error.message}`, 'error');
            }
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
    }    /**
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
    }    /**
     * Show create custom template modal (now uses DRY TemplateModal)
     */
    showCreateTemplateModal() {
        if (!this.templateModal) {
            console.error('TemplateModal not initialized yet');
            return;
        }
        this.templateModal.showCreate((templateData) => this.saveCustomTemplate(templateData));
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
    }    /**
     * Save custom template (enhanced for TemplateModal)
     */
    saveCustomTemplate(templateData) {
        try {
            // If called from old modal system, collect form data
            if (typeof templateData === 'string' || !templateData) {
                templateData = this.collectTemplateFormData();
                if (!this.validateTemplateForm(templateData)) {
                    return;
                }
            }
            
            // Ensure required fields and structure
            const template = {
                id: templateData.id || `custom_${Date.now()}`,
                name: templateData.name,
                icon: templateData.icon || '📦',
                description: templateData.description,
                version: templateData.version || '1.0',
                category: templateData.category || 'Custom',
                tags: templateData.tags || [],
                baseUrl: templateData.baseUrl,
                authType: templateData.authType || '',
                paginationType: templateData.paginationType || null,
                ui: templateData.ui || {
                    brandColor: '#007acc',
                    accentColor: '#0066cc'
                },
                defaultHeaders: templateData.defaultHeaders || {},
                requiredSecrets: templateData.requiredSecrets || [],
                sampleEndpoints: templateData.sampleEndpoints || [],
                documentation: templateData.documentation || null,
                customSettings: templateData.customSettings || {},
                isCustom: true,
                createdAt: templateData.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Check if updating existing template
            const existingIndex = this.customTemplates.findIndex(t => t.id === template.id);
            
            if (existingIndex !== -1) {
                // Update existing template, preserve createdAt
                template.createdAt = this.customTemplates[existingIndex].createdAt;
                this.customTemplates[existingIndex] = template;
            } else {
                // Add new template
                this.customTemplates.push(template);
            }

            // Save to localStorage
            localStorage.setItem('anyapi_custom_templates', JSON.stringify(this.customTemplates));
            
            // Invalidate cache to force reload
            this.invalidateCache();
            
            // Refresh display
            this.loadTemplates();
            
            showNotification(
                existingIndex !== -1 ? 'Template updated successfully' : 'Template created successfully',
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
    }    /**
     * Edit custom template (now uses DRY TemplateModal)
     */
    editTemplate(templateId) {
        if (!this.templateModal) {
            console.error('TemplateModal not initialized yet');
            return;
        }
        
        const template = this.customTemplates.find(t => t.id === templateId);
        if (!template) return;

        this.templateModal.show({ 
            template, 
            mode: 'edit', 
            onSave: (templateData) => this.saveCustomTemplate({ ...templateData, id: templateId })
        });
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
            
            // Invalidate cache to force reload
            this.invalidateCache();
            
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
                        
                        // Invalidate cache to force reload
                        this.invalidateCache();
                        
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

    /**
     * Add search and filtering capabilities
     */
    initializeSearchAndFilters() {
        const container = document.getElementById('templates-grid');
        if (!container || container.previousElementSibling?.classList.contains('template-search-bar')) {
            return; // Already initialized
        }

        // Create search and filter bar
        const searchBar = document.createElement('div');
        searchBar.className = 'template-search-bar';        searchBar.innerHTML = `
            <input type="text" 
                   class="template-search-input" 
                   placeholder="🔍 Search templates..." 
                   id="template-search-input">
            <div class="template-filter-chips">
                <span class="template-filter-chip active" data-filter="all">All</span>
                <span class="template-filter-chip" data-filter="enhanced">Enhanced</span>
                <span class="template-filter-chip" data-filter="custom">Custom</span>
                <span class="template-filter-chip" data-filter="api">API</span>
                <span class="template-filter-chip" data-filter="database">Database</span>
                <span class="template-filter-chip" data-filter="ai-ml">AI/ML</span>
            </div>
            <button class="btn btn-primary template-create-btn" onclick="templateManager.showCreateTemplateModal()">
                ➕ Create Custom Template
            </button>
        `;

        // Insert before templates grid
        container.parentNode.insertBefore(searchBar, container);

        // Add event listeners
        this.setupSearchAndFilterListeners();
    }

    /**
     * Setup search and filter event listeners
     */
    setupSearchAndFilterListeners() {
        const searchInput = document.getElementById('template-search-input');
        const filterChips = document.querySelectorAll('.template-filter-chip');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentSearchQuery = e.target.value.toLowerCase();
                this.filterTemplates();
            });
        }

        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                // Update active filter
                filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                
                this.currentFilter = chip.dataset.filter;
                this.filterTemplates();
            });
        });
    }

    /**
     * Filter templates based on search query and selected filter
     */
    filterTemplates() {
        const allTemplates = [...this.allTemplates]; // Keep original list
        let filteredTemplates = allTemplates;

        // Apply search filter
        if (this.currentSearchQuery) {
            filteredTemplates = filteredTemplates.filter(template => {
                const searchText = `${template.name} ${template.description} ${template.category || ''} ${(template.tags || []).join(' ')}`.toLowerCase();
                return searchText.includes(this.currentSearchQuery);
            });
        }

        // Apply category filter
        if (this.currentFilter && this.currentFilter !== 'all') {
            filteredTemplates = filteredTemplates.filter(template => {
                switch (this.currentFilter) {
                    case 'enhanced':
                        return template.isEnhanced;
                    case 'custom':
                        return template.isCustom;
                    case 'api':
                        return (template.category || '').toLowerCase().includes('api');
                    case 'database':
                        return (template.category || '').toLowerCase().includes('database');
                    case 'ai-ml':
                        return (template.category || '').toLowerCase().includes('ai') || 
                               (template.category || '').toLowerCase().includes('ml') ||
                               (template.tags || []).some(tag => tag.toLowerCase().includes('ai') || tag.toLowerCase().includes('ml'));
                    default:
                        return true;
                }
            });
        }

        // Update displayed templates
        this.templates = filteredTemplates;
        this.renderTemplates();
        
        // Show/hide empty state
        this.updateEmptyState();
    }

    /**
     * Update empty state based on filters
     */
    updateEmptyState() {
        const container = document.getElementById('templates-grid');
        if (!container) return;

        if (this.templates.length === 0 && (this.currentSearchQuery || this.currentFilter !== 'all')) {
            container.innerHTML = `
                <div class="templates-empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>No Templates Found</h3>
                    <p>Try adjusting your search or filter criteria</p>
                    <button class="btn btn-outline" onclick="templateManager.clearFilters()">
                        Clear Filters
                    </button>
                </div>
            `;
        }
    }

    /**
     * Clear all filters and search
     */
    clearFilters() {
        this.currentSearchQuery = '';
        this.currentFilter = 'all';
        
        const searchInput = document.getElementById('template-search-input');
        const filterChips = document.querySelectorAll('.template-filter-chip');
        
        if (searchInput) searchInput.value = '';
        
        filterChips.forEach(chip => {
            chip.classList.remove('active');
            if (chip.dataset.filter === 'all') {
                chip.classList.add('active');
            }
        });
        
        this.templates = [...this.allTemplates];
        this.renderTemplates();
    }

    /**
     * Validate template JSON schema
     */
    validateTemplate(template) {
        const errors = [];
        
        // Required fields
        if (!template.id) errors.push('Missing required field: id');
        if (!template.name) errors.push('Missing required field: name');
        if (!template.description) errors.push('Missing required field: description');
        if (!template.baseUrl) errors.push('Missing required field: baseUrl');
        if (!template.authType) errors.push('Missing required field: authType');
        
        // Validate URL format
        if (template.baseUrl) {
            try {
                new URL(template.baseUrl);
            } catch {
                errors.push('Invalid baseUrl format');
            }
        }
        
        // Validate UI properties if present
        if (template.ui) {
            if (template.ui.brandColor && !/^#[0-9A-F]{6}$/i.test(template.ui.brandColor)) {
                errors.push('Invalid brandColor format (must be hex color)');
            }
            if (template.ui.accentColor && !/^#[0-9A-F]{6}$/i.test(template.ui.accentColor)) {
                errors.push('Invalid accentColor format (must be hex color)');
            }
        }
        
        // Validate required secrets
        if (template.requiredSecrets) {
            template.requiredSecrets.forEach((secret, index) => {
                if (typeof secret === 'object') {
                    if (!secret.name && !secret.key) {
                        errors.push(`Required secret at index ${index} missing name/key`);
                    }
                }
            });
        }
        
        // Validate sample endpoints
        if (template.sampleEndpoints) {
            template.sampleEndpoints.forEach((endpoint, index) => {
                if (!endpoint.method) errors.push(`Sample endpoint at index ${index} missing method`);
                if (!endpoint.endpoint) errors.push(`Sample endpoint at index ${index} missing endpoint`);
                if (!endpoint.description) errors.push(`Sample endpoint at index ${index} missing description`);
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Add template sharing/export functionality
     */
    exportTemplates(templateIds = null) {
        const templatesToExport = templateIds 
            ? this.allTemplates.filter(t => templateIds.includes(t.id))
            : this.customTemplates;
            
        const exportData = {
            version: '1.0',
            exported: new Date().toISOString(),
            templates: templatesToExport
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `anyapi-templates-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification(`Exported ${templatesToExport.length} template(s)`, 'success');
    }

    /**
     * Get template statistics for dashboard
     */
    getTemplateStats() {
        const stats = {
            total: this.allTemplates.length,
            builtIn: this.allTemplates.filter(t => t.isBuiltIn && !t.isEnhanced).length,
            enhanced: this.allTemplates.filter(t => t.isEnhanced).length,
            custom: this.allTemplates.filter(t => t.isCustom).length,
            categories: {},
            authTypes: {}
        };
        
        // Count by category
        this.allTemplates.forEach(template => {
            const category = template.category || 'Other';
            stats.categories[category] = (stats.categories[category] || 0) + 1;
            
            const authType = template.authType || 'Unknown';
            stats.authTypes[authType] = (stats.authTypes[authType] || 0) + 1;
        });
        
        return stats;
    }

    /**
     * Refresh templates with animation - force reload
     */
    async refreshTemplates() {
        const container = document.getElementById('templates-grid');
        if (container) {
            container.style.opacity = '0.5';
            container.style.pointerEvents = 'none';
        }
        
        try {
            // Invalidate cache to force fresh load
            this.invalidateCache();
            await this.loadTemplates();
            showNotification('Templates refreshed', 'success');
        } catch (error) {
            showNotification('Failed to refresh templates', 'error');
        } finally {
            if (container) {
                container.style.opacity = '1';
                container.style.pointerEvents = 'auto';
            }
        }
    }

    /**
     * Invalidate template cache
     */
    invalidateCache() {
        this.templatesCache = null;
        this.cacheExpiry = null;
        console.log('[TemplateManager] Template cache invalidated');
    }

    /**
     * Categorize template dynamically based on keywords and patterns
     */
    categorizeTemplate(template) {
        if (!template.category && !template.name && !template.description) {
            return 'default';
        }

        // Create a searchable text from template properties
        const searchText = [
            template.category || '',
            template.name || '',
            template.description || '',
            ...(template.tags || [])
        ].join(' ').toLowerCase();

        // Expanded category mapping for more granular color coding
        const categoryMappings = {
            versioncontrol: [
                'version control', 'github', 'git', 'bitbucket', 'repository', 'source control', 'commit', 'pull request', 'merge', 'branch'
            ],
            microsoft: [
                'microsoft', 'msgraph', 'office', 'outlook', 'teams', 'sharepoint', 'onedrive', 'excel', 'word', 'powerpoint', 'azure', 'graph'
            ],
            crm: [
                'crm', 'connectwise', 'salesforce', 'customer relationship', 'customer management', 'business management', 'ticket', 'client', 'workspace', 'enterprise', 'project management'
            ],
            ai: [
                'openai', 'ai', 'artificial intelligence', 'machine learning', 'ml', 'gpt', 'neural', 'chatbot', 'language model', 'nlp', 'computer vision', 'deep learning'
            ],
            finance: [
                'stripe', 'payment', 'billing', 'finance', 'money', 'transaction', 'invoice', 'subscription', 'checkout', 'banking', 'crypto', 'wallet', 'fintech'
            ],
            development: [
                'developer', 'development', 'code', 'sdk', 'programming', 'software', 'build', 'deploy', 'ci/cd'
            ],
            business: [
                'business', 'manage', 'support', 'sales', 'operations', 'erp', 'accounting', 'hr', 'admin'
            ],
            productivity: [
                'productivity', 'calendar', 'email', 'tasks', 'notes', 'reminder', 'workflow'
            ],
            cloud: [
                'cloud', 'infrastructure', 'server', 'hosting', 'storage', 'database', 'compute', 'kubernetes', 'docker', 'container', 'aws', 'gcp'
            ],
            ecommerce: [
                'shopify', 'ecommerce', 'e-commerce', 'retail', 'store', 'product', 'inventory', 'order', 'shipping', 'marketplace', 'amazon', 'ebay', 'woocommerce'
            ],
            security: [
                'auth', 'authentication', 'security', 'oauth', 'jwt', 'login', 'identity', 'access', 'permission', 'encryption', 'ssl', 'certificate', 'firewall'
            ],
            social: [
                'social', 'twitter', 'facebook', 'instagram', 'linkedin', 'communication', 'messaging', 'chat', 'slack', 'discord', 'telegram', 'whatsapp'
            ],
            media: [
                'video', 'audio', 'image', 'media', 'streaming', 'youtube', 'spotify', 'photo', 'graphics', 'content', 'cdn', 'upload', 'download'
            ],
            analytics: [
                'analytics', 'tracking', 'metrics', 'data', 'statistics', 'reporting', 'dashboard', 'insights', 'monitoring', 'performance', 'logs'
            ],
            gaming: [
                'gaming', 'game', 'steam', 'xbox', 'playstation', 'nintendo', 'esports', 'leaderboard', 'achievement', 'player', 'tournament'
            ]
        };

        // Find the first matching category
        for (const [category, keywords] of Object.entries(categoryMappings)) {
            if (keywords.some(keyword => searchText.includes(keyword))) {
                return category;
            }
        }

        return 'default';
    }    /**
     * Get category class name for CSS styling - simplified
     */
    getCategoryClass(template) {
        return 'template-category-badge';
    }

    /**
     * Get display name for category
     */
    getCategoryDisplayName(template) {
        // If template has a specific category name, use it
        if (template.category) {
            return template.category;
        }
        
        // Otherwise use dynamic categorization
        const category = this.categorizeTemplate(template);
        const categoryNames = {
            development: 'Development',
            business: 'Business',
            ai: 'AI/ML',
            finance: 'Finance',
            productivity: 'Productivity', 
            cloud: 'Cloud',
            social: 'Social',
            ecommerce: 'E-commerce',
            security: 'Security',
            media: 'Media',
            analytics: 'Analytics',
            gaming: 'Gaming',
            versioncontrol: 'Version Control',
            microsoft: 'Microsoft',
            crm: 'CRM',
            default: 'General'
        };
        
        return categoryNames[category] || 'General';
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

.template-search-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
}

.template-search-input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 0.875rem;
    color: var(--text-primary);
    background: var(--bg-secondary);
}

.template-filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.template-filter-chip {
    padding: 0.5rem 1rem;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-radius: 16px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
}

.template-filter-chip:hover {
    background: var(--modal-accent-color, var(--color-primary));
    color: white;
}

.template-filter-chip.active {
    background: var(--modal-accent-color, var(--color-primary));
    color: white;
    pointer-events: none;
}

.category-customcolor {
    background: var(--modal-accent-color, var(--color-primary)) !important;
    color: white !important;
    border-color: var(--modal-accent-color, var(--color-primary)) !important;
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