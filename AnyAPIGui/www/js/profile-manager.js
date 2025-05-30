/**
 * AnyAPI GUI - Optimized Profile Manager
 * Enhanced with ES6 features and DRY principles
 */

class ProfileManager {
    // Static constants
    static AUTH_TYPES = {
        NONE: 'None',
        BEARER: 'Bearer',
        BASIC: 'Basic',
        API_KEY: 'ApiKey',
        CUSTOM_SCRIPT: 'CustomScript'
    };

    static PAGINATION_TYPES = {
        AUTO: 'Auto',
        LINK_HEADER: 'LinkHeader',
        NEXT_LINK: 'NextLink',
        CURSOR: 'Cursor',
        PAGE_NUMBER: 'PageNumber',
        NONE: 'None',
        CUSTOM: 'Custom'
    };

    static SENSITIVE_KEYS = new Set([
        'privatekey', 'secret', 'password', 'token', 'apikey'
    ]);

    static MASKED_VALUES = new Set([
        '********', '••••••••', '***MASKED***', '***HIDDEN***'
    ]);

    constructor() {
        this.profiles = [];
        this.currentProfile = null;
        this.isEditing = false;
        this.searchTerm = '';
        this.templates = this.getProfileTemplates();
        this.currentSharedProfile = null;
        
        // Initialize the edit modal component
        this.editModal = null;
        
        this.init();
    }

    // Enhanced error handling with consistent patterns
    async handleAsync(operation, errorMessage = 'Operation failed') {
        try {
            return await operation();
        } catch (error) {
            console.error(`🚨 ${errorMessage}:`, error);
            showNotification(`${errorMessage}: ${error.message}`, 'error');
            throw error;
        }
    }

    // Centralized DOM utilities
    get domUtils() {
        return {
            getElement: (id) => document.getElementById(id),
            getElements: (selector) => document.querySelectorAll(selector),
            createElement: (tag, props = {}, children = []) => {
                const element = document.createElement(tag);
                Object.assign(element, props);
                children.forEach(child => {
                    if (typeof child === 'string') {
                        element.innerHTML += child;
                    } else {
                        element.appendChild(child);
                    }
                });
                return element;
            }
        };
    }

    // Centralized text utilities
    get textUtils() {
        return {
            safeEscape: (value) => {
                if (value == null) return '';
                return String(value)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            },
            safeJsEscape: (value) => {
                if (value == null) return '';
                return String(value)
                    .replace(/\\/g, '\\\\')
                    .replace(/'/g, "\\'")
                    .replace(/"/g, '\\"')
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '\\r');
            },
            isSensitive: (key) => {
                if (!key) return false;
                return ProfileManager.SENSITIVE_KEYS.has(key.toLowerCase()) ||
                       key.toLowerCase().includes('key') ||
                       key.toLowerCase().includes('token');
            },
            isMaskedValue: (value) => {
                return ProfileManager.MASKED_VALUES.has(value) ||
                       (value && /^[•*]{6,}$/.test(value));
            }
        };
    }

    // Profile templates with enhanced structure
    getProfileTemplates() {
        const baseTemplate = {
            headers: { "Content-Type": "application/json" },
            paginationType: "Auto",
            description: "",
            requiredSecrets: [],
            customSettings: {}
        };

        return {
            github: {
                ...baseTemplate,
                name: "GitHub API",
                baseUrl: "https://api.github.com",
                authType: ProfileManager.AUTH_TYPES.API_KEY,
                headers: {
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "AnyAPI-PowerShell"
                },
                paginationType: ProfileManager.PAGINATION_TYPES.LINK_HEADER,
                description: "GitHub REST API v3",
                requiredSecrets: ["apiKey"],
                authFieldMapping: {
                    apiKey: { field: "apiKey", label: "GitHub Personal Access Token", type: "password" },
                    headerName: { field: "headerName", label: "Header Name", type: "text", defaultValue: "Authorization" },
                    tokenPrefix: { field: "tokenPrefix", label: "Token Prefix", type: "text", defaultValue: "token " }
                },
                templateDefaults: { headerName: "Authorization", tokenPrefix: "token " }
            },
            microsoft_graph: {
                ...baseTemplate,
                name: "Microsoft Graph",
                baseUrl: "https://graph.microsoft.com/v1.0",
                authType: ProfileManager.AUTH_TYPES.BEARER,
                paginationType: ProfileManager.PAGINATION_TYPES.NEXT_LINK,
                paginationDetails: { "NextTokenField": "@odata.nextLink", "ItemsField": "value" },
                description: "Microsoft Graph API",
                requiredSecrets: ["token"],
                authFieldMapping: {
                    token: { field: "token", label: "Access Token", type: "password" }
                },
                customSettings: {
                    "ConsistencyLevel": "eventual",
                    "ApiVersion": "v1.0"
                }
            },
            slack: {
                ...baseTemplate,
                name: "Slack API",
                baseUrl: "https://slack.com/api",
                authType: ProfileManager.AUTH_TYPES.BEARER,
                paginationType: ProfileManager.PAGINATION_TYPES.CURSOR,
                paginationDetails: {
                    "NextTokenField": "response_metadata.next_cursor",
                    "TokenParameter": "cursor"
                },
                description: "Slack Web API",
                requiredSecrets: ["token"],
                authFieldMapping: {
                    token: { field: "token", label: "Bot User OAuth Token", type: "password" }
                }
            },
            connectwise: {
                ...baseTemplate,
                name: "ConnectWise Manage",
                baseUrl: "https://your-domain.com/v4_6_release/apis/3.0",
                authType: ProfileManager.AUTH_TYPES.CUSTOM_SCRIPT,
                paginationType: ProfileManager.PAGINATION_TYPES.PAGE_NUMBER,
                paginationDetails: {
                    "PageParameter": "page",
                    "PageSizeParameter": "pageSize",
                    "DefaultPageSize": 100
                },
                description: "ConnectWise PSA REST API with custom authentication",
                customSettings: {
                    "Company": "your-company-id",
                    "Environment": "production"
                },
                requiredSecrets: ["PublicKey", "PrivateKey", "ClientId"],
                authFieldMapping: {
                    PublicKey: { field: "PublicKey", label: "Public Key", type: "text" },
                    PrivateKey: { field: "PrivateKey", label: "Private Key", type: "password" },
                    ClientId: { field: "ClientId", label: "Client ID", type: "text" }
                },
                customAuthScript: `param($RequestContext, $Profile)

# ConnectWise authentication
$company = $Profile.CustomSettings.Company
$publicKey = $Profile.AuthenticationDetails.PublicKey
$privateKey = $RequestContext.GetPlainTextSecret.Invoke('PrivateKey')
$clientId = $Profile.AuthenticationDetails.ClientId

if (-not $company -or -not $publicKey -or -not $privateKey -or -not $clientId) {
    throw "Missing required ConnectWise credentials"
}

$authString = "$company+$publicKey\`:$privateKey"
$encodedAuth = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($authString))

$RequestContext.Headers["Authorization"] = "Basic $encodedAuth"
$RequestContext.Headers["clientId"] = $clientId
$RequestContext.Headers["Accept"] = "application/json"`
            },
            jira: {
                ...baseTemplate,
                name: "Jira Cloud",
                baseUrl: "https://your-domain.atlassian.net/rest/api/3",
                authType: ProfileManager.AUTH_TYPES.BEARER,
                paginationType: ProfileManager.PAGINATION_TYPES.PAGE_NUMBER,
                paginationDetails: {
                    "PageParameter": "startAt",
                    "PageSizeParameter": "maxResults",
                    "DefaultPageSize": 50,
                    "TotalField": "total"
                },
                description: "Atlassian Jira REST API v3",
                customSettings: {
                    "CloudId": "your-cloud-id",
                    "Expand": "names,renderedFields"
                },
                requiredSecrets: ["token"],
                authFieldMapping: {
                    token: { field: "token", label: "API Token", type: "password" }
                }
            },
            stripe: {
                ...baseTemplate,
                name: "Stripe API",
                baseUrl: "https://api.stripe.com/v1",
                authType: ProfileManager.AUTH_TYPES.BEARER,
                headers: { "Stripe-Version": "2023-10-16" },
                paginationType: ProfileManager.PAGINATION_TYPES.CURSOR,
                paginationDetails: {
                    "NextTokenField": "has_more",
                    "TokenParameter": "starting_after",
                    "DefaultPageSize": 100
                },
                description: "Stripe Payment API",
                customSettings: {
                    "ApiVersion": "2023-10-16",
                    "IdempotencyKey": "auto-generate"
                },
                requiredSecrets: ["token"],
                authFieldMapping: {
                    token: { field: "token", label: "Secret Key", type: "password" }
                }
            },
            basic_auth_example: {
                ...baseTemplate,
                name: "Basic Auth API",
                baseUrl: "https://api.example.com",
                authType: ProfileManager.AUTH_TYPES.BASIC,
                description: "Example API using Basic Authentication",
                requiredSecrets: ["username", "password"],
                authFieldMapping: {
                    username: { field: "username", label: "Username", type: "text" },
                    password: { field: "password", label: "Password", type: "password" }
                }
            },
            api_key_example: {
                ...baseTemplate,
                name: "API Key Example",
                baseUrl: "https://api.example.com",
                authType: ProfileManager.AUTH_TYPES.API_KEY,
                description: "Example API using API Key authentication",
                requiredSecrets: ["apiKey"],
                authFieldMapping: {
                    apiKey: { field: "apiKey", label: "API Key", type: "password" },
                    headerName: { field: "headerName", label: "Header Name", type: "text", defaultValue: "X-API-Key" }
                }
            },
            custom: {
                ...baseTemplate,
                name: "",
                baseUrl: "",
                authType: ProfileManager.AUTH_TYPES.NONE,
                description: "Custom API configuration"
            }
        };
    }

    // Unified initialization
    async init() {
        await this.handleAsync(
            async () => {
                console.log('🔍 Initializing Profile Manager...');
                await this.loadProfiles();
                this.setupEventListeners();
                
                // Initialize edit modal component
                this.editModal = new ProfileEditModal(this);
                
                // Make modal globally accessible for onclick handlers
                if (typeof window !== 'undefined') {
                    window.profileEditModal = this.editModal;
                }
                
                console.log('✅ Profile Manager initialized successfully');
            },
            'Failed to initialize profile manager'
        );
    }

    // Enhanced event listener setup
    setupEventListeners() {
        const eventHandlers = [
            ['connectionStatusChanged', ({ detail }) => {
                if (detail.connected) {
                    console.log('🔄 Connection restored, reloading profiles...');
                    this.loadProfiles();
                }
            }]
        ];

        eventHandlers.forEach(([event, handler]) => {
            window.addEventListener(event, handler);
        });
    }

    // Optimized profile loading
    async loadProfiles() {
        await this.handleAsync(async () => {
            console.log('📡 Loading profiles from backend...');
            
            const profilesData = await apiClient.getProfiles();
            this.profiles = Array.isArray(profilesData) ? profilesData : [];
            
            console.log(`✅ Loaded ${this.profiles.length} profiles`);
            
            // Batch DOM updates
            this.batchDOMUpdates(() => {
                this.renderProfileList();
                // Removed: this.updateTestProfileDropdown();
                this.updateGlobalProfileSelector();
                this.initializeSharedProfileManagement();
            });
        }, 'Failed to load profiles');    }

    // Initialize shared profile management across components
    initializeSharedProfileManagement() {
        try {
            // Make profileManager globally available
            window.profileManager = this;
            
            // Emit profile loaded event
            window.dispatchEvent(new CustomEvent('profilesLoaded', {
                detail: { 
                    profiles: this.profiles,
                    count: this.profiles.length 
                }
            }));
            
            // Set up cross-component synchronization
            this.setupProfileSynchronization();
            
            console.log('✅ Shared profile management initialized');
        } catch (error) {
            console.error('❌ Error initializing shared profile management:', error);
        }
    }

    // Set up profile synchronization across components
    setupProfileSynchronization() {
        // Listen for profile changes from other components
        window.addEventListener('profileSelected', (e) => {
            const profileName = e.detail.profileName;
            this.setCurrentProfile(profileName);
        });

        // Listen for profile updates
        window.addEventListener('profileUpdated', (e) => {
            this.loadProfiles();
        });
    }

    // Batch DOM updates for better performance
    batchDOMUpdates(updateFn) {
        requestAnimationFrame(() => {
            updateFn();
        });
    }

    // Enhanced profile list rendering with better structure
    renderProfileList() {
        const container = this.domUtils.getElement('profile-list');
        if (!container) {
            console.error('❌ Profile list container not found');
            return;
        }

        const filteredProfiles = this.getFilteredProfiles();
        
        if (filteredProfiles.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        const profileItems = filteredProfiles.map(profile => this.renderProfileItem(profile));
        container.innerHTML = profileItems.join('');
        
        // Apply enhancements after DOM insertion
        setTimeout(() => this.applyDynamicTextScaling(), 50);
    }

    // Filtered profiles with better logic
    getFilteredProfiles() {
        if (!this.searchTerm) return this.profiles;
        
        const searchLower = this.searchTerm.toLowerCase();
        return this.profiles.filter(profile => {
            if (!profile) return false;
            
            const searchableFields = [
                profile.name, 
                profile.baseUrl, 
                profile.authType, 
                profile.description
            ];
            
            return searchableFields.some(field => 
                String(field || '').toLowerCase().includes(searchLower)
            );
        });
    }

    // Individual profile item rendering
    renderProfileItem(profile) {
        const { safeEscape, safeJsEscape } = this.textUtils;
        const isActive = this.currentProfile?.name === profile.name;
        
        const profileData = {
            name: safeEscape(profile.name || 'Unknown Profile'),
            url: safeEscape(profile.baseUrl || 'No URL configured'),
            description: safeEscape(profile.description || ''),
            jsName: safeJsEscape(profile.name || ''),
            authChip: this.renderAuthChip(profile.authType),
            actions: this.renderProfileActions(profile.name)
        };

        return `
            <div class="profile-card ${isActive ? 'active' : ''}" 
                 onclick="profileManager.selectProfile('${profileData.jsName}')">
                <div class="profile-card-header">
                    <div class="profile-card-title">
                        <h4 class="profile-name">${profileData.name}</h4>
                        ${profileData.authChip}
                    </div>
                    ${profileData.actions}
                </div>
                <div class="profile-card-body">
                    <div class="profile-url" title="${profileData.url}">${profileData.url}</div>
                    ${profileData.description ? `<div class="profile-description">${profileData.description}</div>` : ''}
                </div>
            </div>
        `;
    }

    // Auth chip rendering with mapping
    renderAuthChip(authType) {
        const authConfig = {
            [ProfileManager.AUTH_TYPES.BEARER]: { class: 'auth-bearer', text: 'Bearer', icon: '🔑' },
            [ProfileManager.AUTH_TYPES.BASIC]: { class: 'auth-basic', text: 'Basic', icon: '👤' },
            [ProfileManager.AUTH_TYPES.API_KEY]: { class: 'auth-apikey', text: 'API Key', icon: '🗝️' },
            [ProfileManager.AUTH_TYPES.CUSTOM_SCRIPT]: { class: 'auth-customscript', text: 'Script', icon: '📜' },
            [ProfileManager.AUTH_TYPES.NONE]: { class: 'auth-none', text: 'None', icon: '🔓' }
        };

        const config = authConfig[authType] || authConfig[ProfileManager.AUTH_TYPES.NONE];
        return `<span class="auth-chip ${config.class}" title="${config.text} Authentication">
                    <span class="auth-icon">${config.icon}</span>
                    <span class="auth-text">${config.text}</span>
                </span>`;
    }

    // Profile actions rendering
    renderProfileActions(profileName) {
        const { safeJsEscape } = this.textUtils;
        const jsName = safeJsEscape(profileName);
        
        return `
            <div class="profile-actions" onclick="event.stopPropagation();">
                <button class="action-btn edit-btn" 
                        onclick="profileManager.editProfile('${jsName}')" 
                        title="Edit Profile">
                    <span class="btn-icon">✏️</span>
                </button>
                <button class="action-btn test-btn" 
                        onclick="profileManager.testProfile('${jsName}')" 
                        title="Test Connection">
                    <span class="btn-icon">🧪</span>
                </button>
                <button class="action-btn delete-btn" 
                        onclick="profileManager.deleteProfile('${jsName}')" 
                        title="Delete Profile">
                    <span class="btn-icon">🗑️</span>
                </button>
            </div>
        `;
    }

    // Empty state rendering
    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">⚙️</div>
                <div class="empty-state-content">
                    <h3>No Profiles Found</h3>
                    <p>Create your first API profile to get started</p>
                    <button class="btn btn-primary" onclick="profileManager.showCreateModal()">
                        ➕ Create Profile
                    </button>
                </div>
                <div class="empty-state-meta">
                    <small>Profiles loaded: ${this.profiles.length}</small>
                </div>
            </div>
        `;
    }

    // Enhanced profile selection with event dispatch
    async selectProfile(profileName) {
        await this.handleAsync(async () => {
            if (!profileName) return;
            
            const profile = this.findProfile(profileName);
            if (!profile) {
                throw new Error(`Profile "${profileName}" not found`);
            }
            
            this.currentProfile = profile;
            this.renderProfileList();
            this.showBasicProfileDetails(profile);
            
            // Dispatch profile change event
            window.dispatchEvent(new CustomEvent('profileChanged', {
                detail: { 
                    profileName, 
                    profile,
                    source: 'profileManager' 
                }
            }));
            
        }, 'Error selecting profile');
    }

    // Utility method for finding profiles
    findProfile(profileName) {
        return this.profiles.find(p => p?.name === profileName);
    }

    // Alias for compatibility with code expecting getProfile
    getProfile(profileName) {
        return this.findProfile(profileName);
    }

    // Add this method for global selector update
    updateGlobalProfileSelector(selectedName) {
        const select = document.getElementById('global-profile-selector');
        if (!select) return;
        const profiles = this.profiles || [];
        const current = selectedName || this.currentSharedProfile?.name || '';
        select.innerHTML = '<option value="">Select a profile...</option>';
        profiles.forEach(profile => {
            if (profile && profile.name) {
                const opt = document.createElement('option');
                opt.value = profile.name;
                opt.textContent = profile.name;
                select.appendChild(opt);
            }
        });
        if (current && profiles.some(p => p.name === current)) {
            select.value = current;
        }
    }

    /**
     * Update test profile dropdown
     */
    updateTestProfileDropdown() {
        try {
            const select = document.getElementById('test-profile');
            if (!select) {
                console.log('ℹ️ Test profile dropdown not found (may not be on this page)');
                return;
            }

            const currentValue = select.value;
            select.innerHTML = '<option value="">Select a profile...</option>';
            
            this.profiles.forEach(profile => {
                if (profile && profile.name) {
                    const option = document.createElement('option');
                    option.value = profile.name;
                    option.textContent = profile.name;
                    select.appendChild(option);
                }
            });

            // Restore selection if it still exists
            if (currentValue && this.profiles.find(p => p && p.name === currentValue)) {
                select.value = currentValue;
            }
            
            console.log('✅ Test profile dropdown updated with', this.profiles.length, 'profiles');
            
        } catch (error) {
            console.error('🚨 Error updating test profile dropdown:', error);
        }
    }

    /**
     * Apply dynamic text scaling for profile list items
     */
    applyDynamicTextScaling() {
        try {
            const profileItems = document.querySelectorAll('.profile-card, .profile-item');
            profileItems.forEach(item => {
                const nameElement = item.querySelector('.profile-name');
                const urlElement = item.querySelector('.profile-url');
                
                if (nameElement && nameElement.textContent.length > 20) {
                    nameElement.style.fontSize = '0.9em';
                }
                
                if (urlElement && urlElement.textContent.length > 40) {
                    urlElement.style.fontSize = '0.85em';
                    urlElement.title = urlElement.textContent; // Add tooltip for long URLs
                }
            });
            
            console.log('✅ Dynamic text scaling applied to', profileItems.length, 'profile items');
            
        } catch (error) {
            console.error('🚨 Error applying dynamic text scaling:', error);
        }
    }

    // Form creation with better abstraction
    showCreateModal() {
        this.editModal.showCreateModal();
    }

    // Edit existing profile
    async editProfile(profileName) {
        await this.handleAsync(async () => {
            showNotification('Loading profile details...', 'info', 2000);

            const response = await apiClient.getProfileDetails(profileName, true);
            if (!response.success) {
                throw new Error(response.error || 'Failed to load profile');
            }

            const profile = response.profile;
            
            // Map backend fields to frontend profile object
            let customAuthScript = null;
            if (typeof profile.customAuthScript === 'string' && profile.customAuthScript.trim()) {
                customAuthScript = profile.customAuthScript;
            } else if (typeof profile.AuthenticationDetails === 'object' && profile.AuthenticationDetails && profile.AuthenticationDetails.AuthScriptBlock) {
                if (typeof profile.AuthenticationDetails.AuthScriptBlock === 'string') {
                    customAuthScript = profile.AuthenticationDetails.AuthScriptBlock;
                } else if (typeof profile.AuthenticationDetails.AuthScriptBlock.ToString === 'function') {
                    customAuthScript = profile.AuthenticationDetails.AuthScriptBlock.ToString();
                }
            }

            // Compose the profile object for editing
            const editProfile = {
                name: profile.name || profile.ProfileName || '',
                baseUrl: profile.baseUrl || profile.BaseUrl || '',
                description: profile.description || profile.Description || '',
                authType: profile.authType || profile.AuthType || '',
                paginationType: profile.paginationType || profile.PaginationType || '',
                headers: profile.headers || profile.DefaultHeaders || {},
                isSessionOnly: profile.isSessionOnly ?? profile.IsSessionOnly ?? false,
                credentials: profile.credentials || {},
                customAuthScript: customAuthScript,
                customSettings: profile.customSettings || {},
                paginationDetails: profile.paginationDetails || profile.PaginationDetails || {}
            };

            console.log('🛠️ Edit modal profile object:', editProfile);
            
            await this.editModal.showEditModal(editProfile);
        }, 'Error editing profile');
    }

    // Profile operations with enhanced error handling
    async createProfile() {
        // Delegate to edit modal
        await this.editModal.handleCreateProfile();
    }

    async updateProfile() {
        // Delegate to edit modal
        await this.editModal.handleEditProfile();
    }

    async deleteProfile(profileName) {
        if (!confirm(`Delete profile "${profileName}"?`)) return;
        
        await this.handleAsync(async () => {
            const response = await apiClient.deleteProfile(profileName);
            if (!response.success) {
                throw new Error(response.error || 'Failed to delete profile');
            }

            showNotification('Profile deleted successfully', 'success');
            await this.loadProfiles();
            
            if (this.currentProfile?.name === profileName) {
                this.currentProfile = null;
                this.renderEmptyProfileDetails();
            }
        }, 'Failed to delete profile');
    }

    // Profile validation with comprehensive rules
    validateProfile(profileData) {
        const rules = [
            { field: 'name', message: 'Profile name is required' },
            { field: 'baseUrl', message: 'Base URL is required' },
            { 
                field: 'baseUrl', 
                message: 'Base URL must be valid',
                validator: (value) => {
                    try { new URL(value); return true; } catch { return false; }
                }
            }
        ];

        const authRules = {
            [ProfileManager.AUTH_TYPES.BEARER]: { field: 'credentials.token', message: 'Bearer token is required' },
            [ProfileManager.AUTH_TYPES.BASIC]: { 
                validator: (data) => data.credentials?.username && data.credentials?.password,
                message: 'Username and password are required for Basic authentication'
            },
            [ProfileManager.AUTH_TYPES.API_KEY]: { field: 'credentials.apiKey', message: 'API key is required' },
            [ProfileManager.AUTH_TYPES.CUSTOM_SCRIPT]: { field: 'customAuthScript', message: 'Custom authentication script is required' }
        };

        const errors = [];

        // Basic validation
        rules.forEach(rule => {
            const value = this.getNestedValue(profileData, rule.field);
            if (!value || (rule.validator && !rule.validator(value))) {
                errors.push(rule.message);
            }
        });

        // Auth-specific validation
        const authRule = authRules[profileData.authType];
        if (authRule) {
            if (authRule.validator) {
                if (!authRule.validator(profileData)) {
                    errors.push(authRule.message);
                }
            } else if (authRule.field) {
                const value = this.getNestedValue(profileData, authRule.field);
                if (!value) {
                    errors.push(authRule.message);
                }
            }
        }

        return errors;
    }

    // Utility for nested object property access
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    // Show basic profile details (safe fallback)
    showBasicProfileDetails(profile) {
        console.log('📄 Showing basic profile details for:', profile?.name);
        
        const container = this.domUtils.getElement('profile-details');
        if (!container) {
            console.error('❌ Profile details container not found');
            return;
        }

        try {
            const { safeEscape, safeJsEscape } = this.textUtils;
            const profileData = {
                name: safeEscape(profile.name || 'Unknown Profile'),
                url: safeEscape(profile.baseUrl || 'Not configured'),
                auth: safeEscape(profile.authType || 'Unknown'),
                pagination: safeEscape(profile.paginationType || 'Auto-detect'),
                description: safeEscape(profile.description || 'No description'),
                jsName: safeJsEscape(profile.name || '')
            };

            // Display headers safely
            const headersDisplay = profile.headers && Object.keys(profile.headers).length > 0
                ? Object.entries(profile.headers)
                    .map(([key, value]) => `${safeEscape(key)}: ${safeEscape(value)}`)
                    .join('<br>')
                : 'None configured';

            // Display auth info safely (mask sensitive data)
            let authDetails = profileData.auth;
            if (profile.credentials) {
                switch (profile.authType) {
                    case 'Bearer':
                        authDetails += ' (Token: ••••••••)';
                        break;
                    case 'Basic':
                        authDetails += ` (User: ${safeEscape(profile.credentials.username || 'Not set')})`;
                        break;
                    case 'ApiKey':
                        authDetails += ` (Header: ${safeEscape(profile.credentials.headerName || 'X-API-Key')})`;
                        break;
                }
            }

            // Add custom settings display
            let customSettingsHtml = '';
            if (profile.customSettings && typeof profile.customSettings === 'object' && Object.keys(profile.customSettings).length > 0) {
                customSettingsHtml = `
                    <div class="detail-section">
                        <h5 class="detail-label">Custom Settings</h5>
                        <div class="detail-content code-block">
                            ${Object.entries(profile.customSettings).map(([k, v]) =>
                                `<div class="setting-item"><strong>${safeEscape(k)}</strong>: ${safeEscape(v)}</div>`
                            ).join('')}
                        </div>
                    </div>
                `;
            }
            
            // Display pagination details if present
            let paginationDetailsHtml = '';
            if (profile.paginationDetails && typeof profile.paginationDetails === 'object') {
                const pd = profile.paginationDetails;
                const pdEntries = Object.entries(pd)
                    .filter(([k, v]) => k !== 'Type' && v !== undefined && v !== null && v !== '')
                    .map(([k, v]) => `<div class="setting-item"><strong>${safeEscape(k)}</strong>: ${safeEscape(v)}</div>`)
                    .join('');
                if (pdEntries) {
                    paginationDetailsHtml = `
                        <div class="detail-section">
                            <h5 class="detail-label">Pagination Details</h5>
                            <div class="detail-content code-block">
                                ${pdEntries}
                            </div>
                        </div>
                    `;
                }
            }

            container.innerHTML = `
                <div class="profile-details-container">
                    <div class="profile-details-header">
                        <div class="profile-title-section">
                            <h3 class="profile-title">📋 ${profileData.name}</h3>
                            <div class="profile-meta">
                                <span class="profile-status ${profile.isSessionOnly ? 'session-only' : 'persistent'}">
                                    ${profile.isSessionOnly ? '🔄 Session Only' : '💾 Persistent'}
                                </span>
                            </div>
                        </div>
                        <div class="profile-header-actions">
                            <button class="btn btn-outline btn-sm" 
                                    onclick="profileManager.editProfile('${profileData.jsName}')">
                                <span class="btn-icon">✏️</span>
                                <span class="btn-text">Edit</span>
                            </button>
                            <button class="btn btn-primary btn-sm" 
                                    onclick="profileManager.testProfile('${profileData.jsName}')">
                                <span class="btn-icon">🧪</span>
                                <span class="btn-text">Test</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="profile-details-grid">
                        <div class="detail-card">
                            <h5 class="detail-label">Base URL</h5>
                            <div class="detail-content url-content" title="${profileData.url}">
                                ${profileData.url}
                            </div>
                        </div>
                        
                        <div class="detail-card">
                            <h5 class="detail-label">Authentication</h5>
                            <div class="detail-content">
                                ${this.renderAuthChip(profile.authType)}
                                <span class="auth-details">${authDetails}</span>
                            </div>
                        </div>
                        
                        <div class="detail-card">
                            <h5 class="detail-label">Pagination</h5>
                            <div class="detail-content">${profileData.pagination}</div>
                        </div>
                        
                        ${profile.description ? `
                        <div class="detail-card full-width">
                            <h5 class="detail-label">Description</h5>
                            <div class="detail-content">${profileData.description}</div>
                        </div>
                        ` : ''}
                    </div>

                    <div class="detail-section">
                        <h5 class="detail-label">Default Headers</h5>
                        <div class="detail-content code-block">
                            ${headersDisplay}
                        </div>
                    </div>
                    
                    ${paginationDetailsHtml}
                    ${customSettingsHtml}
                    
                    ${profile.customAuthScript ? `
                    <div class="detail-section">
                        <h5 class="detail-label">Custom Auth Script</h5>
                        <div class="detail-content code-block script-content">
                            <pre><code>${safeEscape(profile.customAuthScript)}</code></pre>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
            
            console.log('✅ Basic profile details rendered successfully');
            
        } catch (error) {
            console.error('🚨 Error showing profile details:', error);
            container.innerHTML = `
                <div class="profile-details-container error-state">
                    <div class="error-icon">❌</div>
                    <h4>Error Loading Profile</h4>
                    <p>There was an error displaying this profile. Check the browser console for details.</p>
                </div>
            `;
        }
    }    // Apply template to form fields - ENHANCED WITH COORDINATED CREDENTIAL SYSTEM
    applyTemplate() {
        const templateSelect = this.domUtils.getElement('profile-template');
        if (!templateSelect) return;

        const templateKey = templateSelect.value;
        if (!templateKey || !this.templates[templateKey]) return;

        const template = this.templates[templateKey];
        console.log('🎨 Applying template:', templateKey, template);
        console.log('🔧 Template auth field mapping:', template.authFieldMapping);

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

        // Apply pagination details if present
        if (template.paginationDetails) {
            const paginationDetailsField = this.domUtils.getElement('profile-pagination-details');
            if (paginationDetailsField) {
                paginationDetailsField.value = JSON.stringify(template.paginationDetails, null, 2);
                const checkbox = this.domUtils.getElement('show-pagination-details');
                if (checkbox) {
                    checkbox.checked = true;
                    this.togglePaginationDetailsField();
                }
            }
        }

        // ENHANCED: Apply custom settings if present
        if (template.customSettings && typeof template.customSettings === 'object') {
            const customSettingsContainer = this.domUtils.getElement('profile-customsettings-list');
            if (customSettingsContainer) {
                // Clear existing custom settings
                customSettingsContainer.innerHTML = '';
                
                // Add template custom settings
                Object.entries(template.customSettings).forEach(([key, value]) => {
                    this.addCustomSettingRow(customSettingsContainer, key, value);
                });
                
                // Add empty row for manual additions
                this.addCustomSettingRow(customSettingsContainer, '', '');
            }
        }

        // PHASE 1 ENHANCEMENT: Trigger auth fields update first to generate dynamic credential fields
        this.toggleAuthFields();

        // PHASE 1 ENHANCEMENT: Apply template credentials in coordination with auth type
        setTimeout(() => {
            this.applyTemplateCredentials(template);
        }, 150); // Allow time for dynamic fields to render

        // Handle custom auth script if present
        if (template.customAuthScript) {
            setTimeout(() => {
                const scriptField = this.domUtils.getElement('auth-script');
                if (scriptField) {
                    scriptField.value = template.customAuthScript;
                    console.log('✅ Custom auth script applied from template');
                }
            }, 200);
        }

        this.updatePaginationVisibility();        showNotification(`Template "${template.name}" applied with coordinated credentials`, 'success');
    }

    // Toggle authentication fields based on auth type with dynamic credential generation - ENHANCED
    toggleAuthFields() {
        const authType = this.domUtils.getElement('profile-authtype');
        const authFields = this.domUtils.getElement('auth-fields');
        
        if (!authType || !authFields) {
            console.warn('⚠️ Auth type select or auth fields container not found');
            return;
        }
        
        const authTypeValue = authType.value;
        console.log('🔄 Toggling auth fields for type:', authTypeValue);
        
        // Update auth help section
        this.updateAuthHelpSection(authTypeValue, authFields);
        
        // Generate dynamic credential fields
        this.generateAuthSpecificCredentials(authTypeValue);
    }

    /**
     * Update authentication help section
     */
    updateAuthHelpSection(authType, authFields) {
        const authHelpConfig = {
            'Bearer': `
                <div class="auth-help" style="padding: 0.75rem; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 1rem;">
                    <p><strong>💡 Bearer Token Authentication</strong></p>
                    <p>Your bearer token will be automatically added to the Authorization header.</p>
                    <p style="margin: 0.5rem 0; color: var(--text-muted); font-size: 0.875rem;">
                        Required credential fields have been added below.
                    </p>
                </div>
            `,
            'Basic': `
                <div class="auth-help" style="padding: 0.75rem; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 1rem;">
                    <p><strong>💡 Basic Authentication</strong></p>
                    <p>Your credentials will be base64-encoded and sent as an Authorization header.</p>
                    <p style="margin: 0.5rem 0; color: var(--text-muted); font-size: 0.875rem;">
                        Required credential fields have been added below.
                    </p>
                </div>
            `,
            'ApiKey': `
                <div class="auth-help" style="padding: 0.75rem; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 1rem;">
                    <p><strong>💡 API Key Authentication</strong></p>
                    <p>Your API key will be sent as a custom header (default: X-API-Key).</p>
                    <p style="margin: 0.5rem 0; color: var(--text-muted); font-size: 0.875rem;">
                        Required credential fields have been added below.
                    </p>
                </div>
            `,
            'CustomScript': `
                <div class="form-group">
                    <label for="auth-script" class="form-label">Custom Authentication Script:</label>
                    <textarea id="auth-script" class="form-control code-input" rows="8" 
                              placeholder="# PowerShell script to generate auth headers&#10;# Example:&#10;param($RequestContext, $Profile)&#10;$token = $RequestContext.GetPlainTextSecret.Invoke('token')&#10;$RequestContext.Headers['Authorization'] = 'Bearer ' + $token"></textarea>
                    <small class="form-help">
                        PowerShell script that sets authentication headers. Use $RequestContext.GetPlainTextSecret.Invoke('credentialName') to access credential values.
                    </small>
                </div>
            `,
            'None': `
                <p class="form-help" style="font-style: italic; color: var(--text-muted);">
                    No authentication required for this profile.
                </p>
            `
        };

        authFields.innerHTML = authHelpConfig[authType] || authHelpConfig['None'];
    }

    /**
     * Generate authentication-specific credential fields dynamically
     */
    generateAuthSpecificCredentials(authType) {
        const credentialsContainer = document.getElementById('profile-credentials-list');
        if (!credentialsContainer) {
            console.warn('⚠️ Credentials container not found');
            return;
        }

        // Clear any existing auth-generated fields but preserve manually added ones
        const authGeneratedFields = credentialsContainer.querySelectorAll('.auth-generated-field');
        authGeneratedFields.forEach(field => field.remove());

        // Define auth-specific credential requirements
        const authCredentialMapping = {
            'Bearer': [
                { key: 'token', label: 'Bearer Token', type: 'password', required: true }
            ],
            'Basic': [
                { key: 'username', label: 'Username', type: 'text', required: true },
                { key: 'password', label: 'Password', type: 'password', required: true }
            ],
            'ApiKey': [
                { key: 'apiKey', label: 'API Key', type: 'password', required: true },
                { key: 'headerName', label: 'Header Name', type: 'text', required: false, defaultValue: 'X-API-Key' }
            ]
        };

        const requiredFields = authCredentialMapping[authType];
        if (requiredFields) {
            console.log(`🔧 Generating ${requiredFields.length} credential fields for ${authType} auth`);
            
            requiredFields.forEach(field => {
                this.addDynamicCredentialField(
                    field.key, 
                    field.label, 
                    field.type, 
                    field.required, 
                    field.defaultValue || ''
                );
            });
        }
    }

    /**
     * Add a dynamic credential field that's tied to authentication type
     */
    addDynamicCredentialField(key, label, type, required, defaultValue = '') {
        const container = document.getElementById('profile-credentials-list');
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'credential-row auth-generated-field';
        row.style.display = 'flex';
        row.style.gap = '0.5em';
        row.style.marginBottom = '0.5em';

        // Create a more distinctive styling for auth-generated fields
        row.innerHTML = `
            <input type="text" class="form-control credential-key" 
                   value="${this.textUtils.safeEscape(key)}" 
                   readonly
                   style="flex:1; background: var(--bg-secondary); border-color: var(--primary); font-weight: 500;"
                   title="Authentication field: ${this.textUtils.safeEscape(label)}">
            <input type="${type}" class="form-control credential-value" 
                   placeholder="${this.textUtils.safeEscape(label)}${required ? ' (required)' : ''}" 
                   value="${this.textUtils.safeEscape(defaultValue)}" 
                   ${required ? 'required' : ''}
                   style="flex:2;"
                   title="${this.textUtils.safeEscape(label)}">
            <button type="button" class="btn btn-outline btn-sm credential-toggle" 
                    title="${type === 'password' ? 'Show/Hide' : 'Field info'}" 
                    style="flex:0;">
                <span class="credential-eye" style="pointer-events:none;">
                    ${type === 'password' ? '👁️' : 'ℹ️'}
                </span>
            </button>
            <button type="button" class="btn btn-outline btn-sm" 
                    title="Remove" 
                    style="flex:0;" 
                    onclick="this.parentElement.remove()">🗑️</button>
        `;

        // Add authentication field indicator
        const indicator = document.createElement('div');
        indicator.className = 'auth-field-indicator';
        indicator.style.cssText = `
            position: absolute;
            left: -8px;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 20px;
            background: var(--primary);
            border-radius: 2px;
            z-index: 1;
        `;
        row.style.position = 'relative';
        row.appendChild(indicator);

        container.appendChild(row);

        // Add functionality for password fields
        const valueInput = row.querySelector('.credential-value');
        const toggleBtn = row.querySelector('.credential-toggle');
          if (type === 'password' && toggleBtn && valueInput) {
            toggleBtn.onclick = function () {
                if (valueInput.type === 'password') {
                    valueInput.type = 'text';
                    toggleBtn.title = 'Hide';
                    toggleBtn.querySelector('.credential-eye').textContent = '🙈';
                } else {
                    valueInput.type = 'password';
                    toggleBtn.title = 'Show';
                    toggleBtn.querySelector('.credential-eye').textContent = '👁️';
                }            };
        }
        
        console.log(`✅ Added dynamic credential field: ${key} (${label})`);
    }

    /**
     * Apply template credentials in coordination with auth type - PHASE 1 ENHANCEMENT
     * This method works with the dynamic credential system to populate template credentials
     */
    applyTemplateCredentials(template) {
        console.log('🔑 Applying template credentials with coordination...');
        
        const credentialsContainer = this.domUtils.getElement('profile-credentials-list');
        if (!credentialsContainer) {
            console.warn('⚠️ Credentials container not found');
            return;
        }

        // Get existing auth-generated fields (from dynamic system)
        const authGeneratedFields = credentialsContainer.querySelectorAll('.auth-generated-field');
        const existingCredentials = new Set();
        
        authGeneratedFields.forEach(field => {
            const keyInput = field.querySelector('.credential-key');
            if (keyInput && keyInput.value) {
                existingCredentials.add(keyInput.value);
            }
        });

        console.log('🔧 Found existing auth-generated credentials:', Array.from(existingCredentials));

        // Apply template field mapping to enhance existing auth-generated fields
        if (template.authFieldMapping) {
            Object.entries(template.authFieldMapping).forEach(([credKey, mapping]) => {
                if (existingCredentials.has(credKey)) {
                    // Find the existing field and enhance it with template defaults
                    const existingField = Array.from(authGeneratedFields).find(field => {
                        const keyInput = field.querySelector('.credential-key');
                        return keyInput && keyInput.value === credKey;
                    });
                    
                    if (existingField && mapping.defaultValue) {
                        const valueInput = existingField.querySelector('.credential-value');
                        if (valueInput && !valueInput.value) {
                            valueInput.value = mapping.defaultValue;
                            valueInput.placeholder = `${mapping.label} (from template)`;
                            console.log(`✅ Applied template default for ${credKey}: ${mapping.defaultValue}`);
                        }
                    }
                } else if (template.requiredSecrets && template.requiredSecrets.includes(credKey)) {
                    // Add missing required credential from template
                    console.log(`🔑 Adding missing required credential: ${credKey}`);
                    this.addCredentialRow(
                        credentialsContainer, 
                        credKey, 
                        mapping.defaultValue || '', 
                        mapping.label, 
                        mapping.type
                    );
                }
            });
        }

        // Add any additional required secrets not covered by auth field mapping
        if (template.requiredSecrets) {
            template.requiredSecrets.forEach(secretKey => {
                if (!existingCredentials.has(secretKey)) {
                    const mapping = template.authFieldMapping?.[secretKey];
                    const label = mapping?.label || secretKey;
                    const type = mapping?.type || 'password';
                    
                    console.log(`🔑 Adding template required secret: ${secretKey} (${label})`);
                    this.addCredentialRow(credentialsContainer, secretKey, '', label, type);
                }
            });
        }

        // Apply legacy template defaults for backward compatibility
        if (template.templateDefaults) {
            Object.entries(template.templateDefaults).forEach(([key, value]) => {
                if (!existingCredentials.has(key)) {
                    console.log(`🔧 Adding template default: ${key}`);
                    this.addCredentialRow(credentialsContainer, key, value);
                }
            });
        }        console.log('✅ Template credentials applied with coordination');
    }

    /**
     * Handle shared profile changes from dropdowns across different components
     * @param {string} profileName - The name of the selected profile
     * @param {string} source - The source component ('tester', 'main', etc.)
     */
    handleSharedProfileChange(profileName, source = 'unknown') {
        console.log(`🔄 Handling shared profile change: "${profileName}" from ${source}`);
        
        if (!profileName || profileName === '') {
            console.log('⚠️ No profile selected, clearing current profile');
            this.currentSharedProfile = null;
            
            // Notify endpoint tester
            if (window.endpointTester && typeof window.endpointTester.onProfileChange === 'function') {
                window.endpointTester.onProfileChange(null);
            }
            return;
        }

        try {
            // Find the profile by name
            const profile = this.getProfile(profileName);
            if (!profile) {
                console.error(`❌ Profile "${profileName}" not found`);
                if (typeof showNotification === 'function') {
                    showNotification(`Profile "${profileName}" not found`, 'error');
                }
                return;
            }

            // Update the current shared profile
            this.currentSharedProfile = profile;
            
            // Select the profile using existing method
            this.selectProfile(profileName);
            
            // Notify endpoint tester specifically
            if (window.endpointTester && typeof window.endpointTester.onProfileChange === 'function') {
                window.endpointTester.onProfileChange(profileName);
            }
            
            // Notify other components
            this.notifyProfileChange(profile, source);
            
            console.log(`✅ Shared profile "${profileName}" selected from ${source}`);
            
        } catch (error) {
            console.error('❌ Error handling shared profile change:', error);
            if (typeof showNotification === 'function') {
                showNotification(`Error selecting profile: ${error.message}`, 'error');
            }
        }
    }

    /**
     * Notify other components about profile changes
     * @param {Object} profile - The selected profile
     * @param {string} source - The source component that triggered the change
     */
    notifyProfileChange(profile, source) {
        // Notify EndpointTester if it exists and has the method
        if (window.endpointTester && typeof window.endpointTester.onProfileChanged === 'function') {
            try {
                window.endpointTester.onProfileChanged(profile, source);
                console.log('📡 Notified EndpointTester of profile change');
            } catch (error) {
                console.warn('⚠️ Error notifying EndpointTester:', error);
            }
        }

        // Notify API Client if it exists and has the method
        if (window.apiClient && typeof window.apiClient.onProfileChanged === 'function') {
            try {
                window.apiClient.onProfileChanged(profile, source);
                console.log('📡 Notified ApiClient of profile change');
            } catch (error) {
                console.warn('⚠️ Error notifying ApiClient:', error);
            }
        }

        // Update global selector
        this.updateGlobalProfileSelector(profile?.name);
    }
}

// Create global profile manager instance
const profileManager = new ProfileManager();
window.profileManager = profileManager;
// Ensure all key methods are bound to the instance for HTML event compatibility
['getProfile', 'selectProfile', 'loadProfiles', 'handleSharedProfileChange'].forEach(fn => {
    window.profileManager[fn] = profileManager[fn].bind(profileManager);
});

// Export the ProfileManager class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileManager;
}