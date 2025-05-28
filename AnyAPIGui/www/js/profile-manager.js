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
                this.updateTestProfileDropdown();
                this.initializeSharedProfileManagement();
            });
        }, 'Failed to load profiles');
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

        // Apply template defaults to credentials
        if (template.templateDefaults) {
            setTimeout(() => {
                Object.entries(template.templateDefaults).forEach(([key, value]) => {
                    this.addCredentialRow(null, key, value);
                });
            }, 100);
        }

        // Trigger auth fields update
        this.toggleAuthFields();
        this.updatePaginationVisibility();

        showNotification(`Template "${template.name}" applied`, 'success');
    }

    // Toggle authentication fields based on auth type
    toggleAuthFields() {
        const authType = this.domUtils.getElement('profile-authtype');
        const authFields = this.domUtils.getElement('auth-fields');
        
        if (!authType || !authFields) {
            console.warn('⚠️ Auth type select or auth fields container not found');
            return;
        }
        
        const authTypeValue = authType.value;
        console.log('🔄 Toggling auth fields for type:', authTypeValue);
        
        const authFieldsConfig = {
            'Bearer': `
                <div class="form-group">
                    <div class="auth-help" style="padding: 0.75rem; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 1rem;">
                        <p><strong>💡 Bearer Token Authentication</strong></p>
                        <p>Add your bearer token in the <strong>Credentials</strong> section below using the key "token".</p>
                    </div>
                </div>
            `,
            'Basic': `
                <div class="form-group">
                    <div class="auth-help" style="padding: 0.75rem; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 1rem;">
                        <p><strong>💡 Basic Authentication</strong></p>
                        <p>Add your credentials in the <strong>Credentials</strong> section below:</p>
                        <ul style="margin: 0.5rem 0 0 1rem;">
                            <li><strong>username</strong> - Your username</li>
                            <li><strong>password</strong> - Your password</li>
                        </ul>
                    </div>
                </div>
            `,
            'ApiKey': `
                <div class="form-group">
                    <div class="auth-help" style="padding: 0.75rem; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 1rem;">
                        <p><strong>💡 API Key Authentication</strong></p>
                        <p>Add your API key details in the <strong>Credentials</strong> section below:</p>
                        <ul style="margin: 0.5rem 0 0 1rem;">
                            <li><strong>apiKey</strong> - Your API key value</li>
                            <li><strong>headerName</strong> - Header name (default: X-API-Key)</li>
                        </ul>
                    </div>
                </div>
            `,
            'CustomScript': `
                <div class="form-group">
                    <label for="auth-script">Custom Authentication Script:</label>
                    <textarea id="auth-script" class="form-control" rows="6" 
                              placeholder="# PowerShell script to generate auth headers&#10;# Example:&#10;param($RequestContext, $Profile)&#10;$RequestContext.Headers['Authorization'] = 'Bearer ' + $token"></textarea>
                    <small class="form-help">PowerShell script that sets authentication headers. Access credentials from the Credentials section using $RequestContext.GetPlainTextSecret.Invoke('credentialName')</small>
                </div>
            `
        };
        
        authFields.innerHTML = authFieldsConfig[authTypeValue] || 
            '<p class="form-help" style="font-style: italic; color: var(--text-muted);">No authentication required for this profile.</p>';
        
        console.log('✅ Auth fields HTML updated for type:', authTypeValue);
    }

    // Toggle pagination details field visibility
    togglePaginationDetailsField() {
        const checkbox = this.domUtils.getElement('show-pagination-details');
        const detailsGroup = this.domUtils.getElement('pagination-details-group');
        
        if (checkbox && detailsGroup) {
            detailsGroup.style.display = checkbox.checked ? 'block' : 'none';
            console.log('🔄 Pagination details field toggled:', checkbox.checked ? 'visible' : 'hidden');
        }
    }

    // Update pagination visibility based on pagination type selection
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
        
        // Update placeholder text
        const textarea = this.domUtils.getElement('profile-pagination-details');
        if (textarea) {
            const placeholders = {
                'PageNumber': '{"PageParameter":"page","PageSizeParameter":"pageSize","DefaultPageSize":100}',
                'Cursor': '{"NextTokenField":"next_cursor","TokenParameter":"cursor","ItemsField":"items"}',
                'NextLink': '{"NextTokenField":"@odata.nextLink","ItemsField":"value"}',
                'LinkHeader': '{"LinkHeaderRel":"next","ItemsField":"items"}',
                'Custom': '{"PageParameter":"page","PageSizeParameter":"limit","NextTokenField":"nextToken"}'
            };
            textarea.placeholder = placeholders[paginationType] || placeholders['PageNumber'];
        }
    }

    // Import profiles from JSON file
    async importProfiles() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const profilesData = JSON.parse(e.target.result);
                        
                        if (!Array.isArray(profilesData)) {
                            throw new Error('Invalid file format - expected array of profiles');
                        }

                        const response = await apiClient.importProfiles(profilesData);
                        if (response.success) {
                            showNotification(`Successfully imported ${response.count} profiles`, 'success');
                            await this.loadProfiles();
                        } else {
                            throw new Error(response.error || 'Import failed');
                        }
                        
                    } catch (error) {
                        console.error('🚨 Error parsing import file:', error);
                        showNotification('Invalid JSON file', 'error');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
            
        } catch (error) {
            console.error('🚨 Error importing profiles:', error);
            showNotification('Import failed', 'error');
        }
    }

    // Export all profiles to JSON file
    async exportProfiles() {
        await this.handleAsync(async () => {
            if (this.profiles.length === 0) {
                showNotification('No profiles to export', 'warning');
                return;
            }

            const response = await apiClient.exportProfiles();
            if (!response.success || !response.data) {
                throw new Error(response.error || 'Export failed');
            }

            const blob = new Blob([JSON.stringify(response.data, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `anyapi-profiles-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification(`Exported ${this.profiles.length} profiles`, 'success');
        }, 'Export failed');
    }

    // Get profile by name (utility method)
    getProfile(profileName) {
        return this.findProfile(profileName);
    }

    // Refresh profiles from server
    async refreshProfiles() {
        console.log('🔄 Refreshing profiles...');
        showNotification('Refreshing profiles...', 'info');
        await this.loadProfiles();
        showNotification('Profiles refreshed', 'success');
    }

    // Populate auth fields with existing profile data
    populateAuthFields(profile) {
        console.log('🔧 Populating auth fields for profile:', profile.name, 'Auth type:', profile.authType);
        
        // First ensure auth fields are rendered
        this.toggleAuthFields();
        
        // Then populate with existing data
        setTimeout(() => {
            try {
                if (!profile.credentials) {
                    console.log('⚠️ No credentials found in profile');
                    return;
                }
                
                switch (profile.authType) {
                    case ProfileManager.AUTH_TYPES.BEARER:
                        const tokenField = this.domUtils.getElement('auth-token');
                        if (tokenField && profile.credentials.token) {
                            tokenField.value = profile.credentials.token;
                            tokenField.placeholder = 'Current token loaded';
                        }
                        break;
                        
                    case ProfileManager.AUTH_TYPES.BASIC:
                        const usernameField = this.domUtils.getElement('auth-username');
                        const passwordField = this.domUtils.getElement('auth-password');
                        
                        if (usernameField && profile.credentials.username) {
                            usernameField.value = profile.credentials.username;
                        }
                        if (passwordField && profile.credentials.password) {
                            passwordField.value = profile.credentials.password;
                            passwordField.placeholder = 'Current password loaded';
                        }
                        break;
                        
                    case ProfileManager.AUTH_TYPES.API_KEY:
                        const apiKeyField = this.domUtils.getElement('auth-apikey');
                        const headerNameField = this.domUtils.getElement('auth-apikey-header');
                        
                        if (apiKeyField && profile.credentials.apiKey) {
                            apiKeyField.value = profile.credentials.apiKey;
                            apiKeyField.placeholder = 'Current API key loaded';
                        }
                        if (headerNameField) {
                            headerNameField.value = profile.credentials.headerName || 'X-API-Key';
                        }
                        break;
                }
                
                // Handle custom auth script
                if (profile.authType === ProfileManager.AUTH_TYPES.CUSTOM_SCRIPT && profile.customAuthScript) {
                    const scriptField = this.domUtils.getElement('auth-script');
                    if (scriptField) {
                        scriptField.value = profile.customAuthScript;
                    }
                }
                
            } catch (error) {
                console.error('🚨 Error populating auth fields:', error);
            }
        }, 100);
    }

    // Sync profile selection manually (sync button)
    syncProfileSelection(targetTab) {
        try {
            const syncBtn = document.querySelector(`#${targetTab}-section .btn-sync`);
            if (syncBtn) {
                syncBtn.classList.add('syncing');
                setTimeout(() => syncBtn.classList.remove('syncing'), 1000);
            }
            
            const currentProfile = this.currentProfile?.name;
            
            if (currentProfile) {
                if (targetTab === 'tester') {
                    const testSelect = this.domUtils.getElement('test-profile');
                    if (testSelect) {
                        testSelect.value = currentProfile;
                        this.handleSharedProfileChange(currentProfile, 'sync');
                        showNotification(`Profile "${currentProfile}" synced to API Tester`, 'success');
                    }
                }
            } else {
                showNotification('No profile selected to sync', 'warning');
            }
            
        } catch (error) {
            console.error('🚨 Error syncing profile selection:', error);
            showNotification('Error syncing profile selection', 'error');
        }
    }

    applyDynamicTextScaling() {
        // Implementation for dynamic text scaling
        const profileItems = this.domUtils.getElements('.profile-item');
        profileItems.forEach(item => {
            const nameElement = item.querySelector('.profile-item-name');
            const urlElement = item.querySelector('.profile-item-url');
            
            [nameElement, urlElement].forEach(element => {
                if (element && element.scrollWidth > element.clientWidth * 0.9) {
                    const ratio = element.scrollWidth / element.clientWidth;
                    element.setAttribute(ratio > 1.3 ? 'data-very-long' : 'data-long', 'true');
                }
            });
        });
    }

    // Shared profile management methods remain similar but with enhanced error handling
    handleSharedProfileChange(profileName, sourceTab) {
        try {
            console.log(`🔄 Shared profile change: ${profileName} from ${sourceTab}`);
            this.currentSharedProfile = profileName;
            this.syncProfileAcrossTabs(profileName, sourceTab);
            this.updateHistoryProfileFilter();
        } catch (error) {
            console.error('🚨 Error handling shared profile change:', error);
        }
    }

    syncProfileAcrossTabs(profileName, sourceTab) {
        const syncTargets = [
            { condition: sourceTab !== 'tester', id: 'test-profile' },
            // Add more sync targets as needed
        ];

        syncTargets.forEach(({ condition, id }) => {
            if (condition) {
                const element = this.domUtils.getElement(id);
                if (element && element.value !== profileName) {
                    element.value = profileName;
                    element.classList.add('profile-selector-synced');
                    setTimeout(() => element.classList.remove('profile-selector-synced'), 2000);
                }
            }
        });

        if (profileName) {
            localStorage.setItem('anyapi_shared_profile', profileName);
        } else {
            localStorage.removeItem('anyapi_shared_profile');
        }
    }

    // Initialize shared profile management
    initializeSharedProfileManagement() {
        try {
            const savedProfile = localStorage.getItem('anyapi_shared_profile');
            if (savedProfile && this.findProfile(savedProfile)) {
                this.currentSharedProfile = savedProfile;
                
                const testSelect = this.domUtils.getElement('test-profile');
                if (testSelect) testSelect.value = savedProfile;
                
                if (typeof endpointTester !== 'undefined') {
                    endpointTester.currentProfile = savedProfile;
                    endpointTester.updateProfileContext?.();
                }
            }
            
            this.updateHistoryProfileFilter();
        } catch (error) {
            console.error('🚨 Error initializing shared profile management:', error);
        }
    }

    updateHistoryProfileFilter() {
        const filterSelect = this.domUtils.getElement('history-profile-filter');
        if (!filterSelect) return;

        const currentValue = filterSelect.value;
        filterSelect.innerHTML = '<option value="">All Profiles</option>';
        
        this.profiles.forEach(profile => {
            if (profile?.name) {
                const option = this.domUtils.createElement('option', {
                    value: profile.name,
                    textContent: profile.name
                });
                filterSelect.appendChild(option);
            }
        });

        if (currentValue && this.findProfile(currentValue)) {
            filterSelect.value = currentValue;
        }
    }

    // Enhanced form data collection
    collectFormData() {
        console.log('📊 Collecting form data...');
        
        const formFields = [
            { id: 'profile-name', key: 'name', required: true },
            { id: 'profile-baseurl', key: 'baseUrl', required: true },
            { id: 'profile-description', key: 'description' },
            { id: 'profile-authtype', key: 'authType', default: 'None' },
            { id: 'profile-pagination', key: 'paginationType', default: 'Auto' },
            { id: 'profile-session-only', key: 'isSessionOnly', type: 'checkbox' }
        ];

        const profileData = formFields.reduce((data, field) => {
            const element = this.domUtils.getElement(field.id);
            if (element) {
                const value = field.type === 'checkbox' 
                    ? element.checked 
                    : (element.value?.trim() || field.default || '');
                data[field.key] = value;
            }
            return data;
        }, {});

        // Parse JSON fields
        profileData.headers = this.parseJSONField('profile-headers', {});
        
        if (this.domUtils.getElement('show-pagination-details')?.checked) {
            profileData.paginationDetails = this.parseJSONField('profile-pagination-details');
        }

        // Collect dynamic sections
        profileData.customSettings = this.collectCustomSettings();
        profileData.credentials = this.collectCredentials();

        // Handle custom auth script
        const authScript = this.domUtils.getElement('auth-script')?.value?.trim();
        if (authScript) {
            profileData.customAuthScript = authScript;
        }

        console.log('✅ Form data collected:', profileData);
        return profileData;
    }

    // JSON field parsing utility
    parseJSONField(fieldId, defaultValue = null) {
        try {
            const text = this.domUtils.getElement(fieldId)?.value?.trim();
            return text ? JSON.parse(text) : defaultValue;
        } catch (error) {
            console.warn(`⚠️ Invalid JSON in ${fieldId}, using default`);
            return defaultValue;
        }
    }

    // Custom settings collection
    collectCustomSettings() {
        const settings = {};
        const rows = this.domUtils.getElements('#profile-customsettings-list .customsetting-row');
        
        rows.forEach(row => {
            const key = row.querySelector('.customsetting-key')?.value?.trim();
            const value = row.querySelector('.customsetting-value')?.value?.trim();
            if (key) settings[key] = value;
        });

        return settings;
    }

    // Simplified credentials collection - no masking logic
    collectCredentials() {
        const credentials = {};
        const rows = this.domUtils.getElements('#profile-credentials-list .credential-row');
        
        rows.forEach(row => {
            const keyInput = row.querySelector('.credential-key');
            const valueInput = row.querySelector('.credential-value');
            
            const key = keyInput?.value?.trim();
            const value = valueInput?.value?.trim();
            
            if (key) {
                // Store the actual value - no special handling for masked values
                credentials[key] = value || '';
            }
        });

        console.log('🔐 Collected credentials:', Object.keys(credentials).reduce((acc, key) => {
            acc[key] = credentials[key] ? '[VALUE SET]' : '[EMPTY]';
            return acc;
        }, {}));

        return credentials;
    }

    // Test profile connection
    async testProfile(profileName) {
        await this.handleAsync(async () => {
            const profile = this.findProfile(profileName);
            if (!profile) {
                throw new Error(`Profile "${profileName}" not found`);
            }

            showNotification('Testing connection...', 'info');
            
            const response = await apiClient.testProfile(profileName);
            if (response.success) {
                showNotification('✅ Connection successful', 'success');
            } else {
                throw new Error(response.error?.message || 'Connection test failed');
            }
        }, 'Test failed');
    }

    // Update test profile dropdown
    updateTestProfileDropdown() {
        const testSelect = this.domUtils.getElement('test-profile');
        if (!testSelect) return;

        const currentValue = testSelect.value;
        testSelect.innerHTML = '<option value="">Select Profile...</option>';
        
        this.profiles.forEach(profile => {
            if (profile?.name) {
                const option = this.domUtils.createElement('option', {
                    value: profile.name,
                    textContent: profile.name
                });
                testSelect.appendChild(option);
            }
        });

        // Restore previous selection if still valid
        if (currentValue && this.findProfile(currentValue)) {
            testSelect.value = currentValue;
        }
    }

    // Render empty profile details
    renderEmptyProfileDetails() {
        const container = this.domUtils.getElement('profile-details');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚙️</div>
                    <h3>Select a Profile</h3>
                    <p>Choose a profile from the sidebar to view its configuration</p>
                </div>
            `;
        }
    }
}

// Initialize and export
console.log('🚀 Initializing Optimized ProfileManager...');
const profileManager = new ProfileManager();

if (typeof window !== 'undefined') {
    window.profileManager = profileManager;
}