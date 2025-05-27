/**
 * AnyAPI GUI - Complete Profile Manager
 * Full implementation with create, edit, and template functionality
 * Enhanced with coordinated authentication and credentials
 */

class ProfileManager {
    constructor() {
        this.profiles = [];
        this.currentProfile = null;
        this.isEditing = false;
        this.searchTerm = '';
        this.templates = this.getProfileTemplates();
        
        // Initialize profile manager
        this.init();
    }

    
    /**
     * Get profile templates for common APIs - ENHANCED WITH AUTH FIELD MAPPING
     */
    getProfileTemplates() {
    return {
github: {
    name: "GitHub API",
    baseUrl: "https://api.github.com",
    authType: "ApiKey",
    headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "AnyAPI-PowerShell"
    },
    paginationType: "LinkHeader",
    description: "GitHub REST API v3",
    requiredSecrets: ["TokenValue"], // ← CHANGED from "apiKey" to "TokenValue"
    authFieldMapping: {
        TokenValue: {  // ← CHANGED from "apiKey" to "TokenValue"
            field: "ApiKeyValue",  // ← This maps to the auth field in the profile
            label: "GitHub Personal Access Token", 
            type: "password" 
        },
        headerName: { 
            field: "ApiKeyName", 
            label: "Header Name", 
            type: "text", 
            defaultValue: "Authorization" 
        },
        tokenPrefix: { 
            field: "TokenPrefix", 
            label: "Token Prefix", 
            type: "text", 
            defaultValue: "token " 
        }
    },
    customSettings: {
        "UserAgent": "AnyAPI-PowerShell",
        "AcceptHeader": "application/vnd.github.v3+json"
    }
},
        microsoft_graph: {
            name: "Microsoft Graph",
            baseUrl: "https://graph.microsoft.com/v1.0",
            authType: "Bearer",
            headers: {
                "Content-Type": "application/json"
            },
            paginationType: "NextLink",
            paginationDetails: {
                "NextTokenField": "@odata.nextLink",
                "ItemsField": "value"
            },
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
            name: "Slack API",
            baseUrl: "https://slack.com/api",
            authType: "Bearer",
            headers: {
                "Content-Type": "application/json"
            },
            paginationType: "Cursor",
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
            name: "ConnectWise Manage",
            baseUrl: "https://your-domain.com/v4_6_release/apis/3.0",
            authType: "Custom",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            paginationType: "PageNumber",
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
$publicKey = $RequestContext.GetPlainTextSecret.Invoke('PublicKey')
$privateKey = $RequestContext.GetPlainTextSecret.Invoke('PrivateKey')
$clientId = $RequestContext.GetPlainTextSecret.Invoke('ClientId')

if (-not $company -or -not $publicKey -or -not $privateKey -or -not $clientId) {
    throw "Missing required ConnectWise credentials"
}

$authString = "$company+$publicKey\`:$privateKey"
$encodedAuth = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($authString))

$RequestContext.Headers["Authorization"] = "Basic $encodedAuth"
$RequestContext.Headers["clientId"] = $clientId
$RequestContext.Headers["Accept"] = "application/json"`
        },
        openai: {
            name: "OpenAI API",
            baseUrl: "https://api.openai.com/v1",
            authType: "Bearer",
            headers: {
                "Content-Type": "application/json"
            },
            paginationType: "None",
            description: "OpenAI REST API with Bearer token authentication",
            customSettings: {
                "Organization": "org-XXXXXXXX",
                "DefaultModel": "gpt-4",
                "MaxTokens": "2000"
            },
            requiredSecrets: ["token"],
            authFieldMapping: {
                token: { field: "token", label: "OpenAI API Key", type: "password" }
            }
        },
        jira: {
            name: "Jira Cloud",
            baseUrl: "https://your-domain.atlassian.net/rest/api/3",
            authType: "Bearer",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            paginationType: "PageNumber",
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
            name: "Stripe API",
            baseUrl: "https://api.stripe.com/v1",
            authType: "Bearer",
            headers: {
                "Stripe-Version": "2023-10-16"
            },
            paginationType: "Cursor",
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
            name: "Basic Auth API",
            baseUrl: "https://api.example.com",
            authType: "Basic",
            headers: {
                "Content-Type": "application/json"
            },
            paginationType: "Auto",
            description: "Example API using Basic Authentication",
            requiredSecrets: ["username", "password"],
            authFieldMapping: {
                username: { field: "username", label: "Username", type: "text" },
                password: { field: "password", label: "Password", type: "password" }
            }
        },
        api_key_example: {
            name: "API Key Example",
            baseUrl: "https://api.example.com",
            authType: "ApiKey",
            headers: {
                "Content-Type": "application/json"
            },
            paginationType: "Auto",
            description: "Example API using API Key authentication",
            requiredSecrets: ["apiKey"],
            authFieldMapping: {
                apiKey: { field: "apiKey", label: "API Key", type: "password" },
                headerName: { field: "headerName", label: "Header Name", type: "text", defaultValue: "X-API-Key" }
            }
        },
        custom: {
            name: "",
            baseUrl: "",
            authType: "None",
            headers: {},
            paginationType: "Auto",
            description: "Custom API configuration",
            customSettings: {},
            requiredSecrets: []
        }
    };
}

    /**
     * Initialize profile manager
     */
    async init() {
        try {
            console.log('🔍 Initializing Profile Manager...');
            await this.loadProfiles();
            this.setupEventListeners();
            console.log('✅ Profile Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize profile manager:', error);
            showNotification('Failed to load profiles', 'error');
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for connection status changes
        window.addEventListener('connectionStatusChanged', (event) => {
            if (event.detail.connected) {
                console.log('🔄 Connection restored, reloading profiles...');
                this.loadProfiles();
            }
        });
    }

    /**
     * Load profiles from backend with detailed debugging
     */
    async loadProfiles() {
        try {
            console.log('📡 Loading profiles from backend...');
            
            // Get profiles using the basic API call
            const profilesData = await apiClient.getProfiles();
            console.log('📊 Raw profiles data:', profilesData);
            
            // Ensure we have an array
            this.profiles = Array.isArray(profilesData) ? profilesData : [];
            
            console.log(`✅ Loaded ${this.profiles.length} profiles:`, this.profiles.map(p => ({
                name: p?.name || 'UNNAMED',
                baseUrl: p?.baseUrl || 'NO_URL',
                authType: p?.authType || 'NO_AUTH'
            })));
            
            this.renderProfileList();
            this.updateTestProfileDropdown();
            
        } catch (error) {
            console.error('❌ Failed to load profiles:', error);
            this.profiles = []; // Ensure we have an empty array
            this.renderProfileList();
            
            if (apiClient.isConnected) {
                showNotification('Failed to load profiles from server', 'error');
            } else {
                showNotification('No connection to server', 'warning');
            }
        }
    }

    /**
     * Safe HTML escaping that handles all edge cases
     */
    safeEscape(value) {
        try {
            // Handle null, undefined, or non-string values
            if (value === null || value === undefined) {
                return '';
            }
            
            // Convert to string safely
            const str = String(value);
            
            // Basic HTML escaping
            return str
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
                
        } catch (error) {
            console.error('🚨 Error in safeEscape:', error, 'Value:', value);
            return String(value || '');
        }
    }

    /**
     * Safe JavaScript escaping for onclick handlers
     */
    safeJsEscape(value) {
        try {
            if (value === null || value === undefined) {
                return '';
            }
            
            return String(value)
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r');
                
        } catch (error) {
            console.error('🚨 Error in safeJsEscape:', error, 'Value:', value);
            return String(value || '');
        }
    }

    /**
     * Render profile list in sidebar with extensive debugging
     */
    renderProfileList() {
        console.log('🎨 Rendering profile list...');
        
        const container = document.getElementById('profile-list');
        if (!container) {
            console.error('❌ Profile list container not found');
            return;
        }

        try {
            if (!Array.isArray(this.profiles) || this.profiles.length === 0) {
                console.log('📝 No profiles to display');
                container.innerHTML = `
                    <div class="empty-state" style="padding: 1rem;">
                        <p style="text-align: center; color: var(--text-muted);">No profiles configured</p>
                        <p style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">
                            Profiles loaded: ${this.profiles.length}
                        </p>
                    </div>
                `;
                return;
            }

            console.log('🔍 Processing profiles for display:', this.profiles.length);

            // Filter profiles safely
            const filteredProfiles = this.profiles.filter(profile => {
                try {
                    if (!profile) return false;
                    
                    const name = String(profile.name || '').toLowerCase();
                    const baseUrl = String(profile.baseUrl || '').toLowerCase();
                    const authType = String(profile.authType || '').toLowerCase();
                    const searchTerm = String(this.searchTerm || '').toLowerCase();
                    
                    return name.includes(searchTerm) || 
                           baseUrl.includes(searchTerm) || 
                           authType.includes(searchTerm);
                } catch (error) {
                    console.error('🚨 Error filtering profile:', error, profile);
                    return false;
                }
            });

            console.log(`📋 Displaying ${filteredProfiles.length} filtered profiles`);

            // Generate HTML safely
            const htmlParts = [];
            
            filteredProfiles.forEach((profile, index) => {
                try {
                    const safeName = this.safeEscape(profile.name || `Profile ${index + 1}`);
                    const safeUrl = this.safeEscape(profile.baseUrl || 'No URL configured');
                    const safeAuth = this.safeEscape(profile.authType || 'Unknown');
                    const jsName = this.safeJsEscape(profile.name || '');
                    
                    const isActive = this.currentProfile?.name === profile.name;
                    
                    const itemHtml = `
                        <div class="profile-item ${isActive ? 'active' : ''}" 
                             onclick="profileManager.selectProfile('${jsName}')">
                            <div class="profile-name">${safeName}</div>
                            <div class="profile-url">${safeUrl}</div>
                            <div class="profile-auth">${safeAuth}</div>
                            <div class="profile-actions" onclick="event.stopPropagation();">
                                <button class="btn btn-sm btn-outline" onclick="profileManager.editProfile('${jsName}')" title="Edit">
                                    ✏️
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="profileManager.deleteProfile('${jsName}')" title="Delete">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    `;
                    
                    htmlParts.push(itemHtml);
                    
                } catch (error) {
                    console.error('🚨 Error rendering profile item:', error, profile);
                    // Add a safe fallback item
                    htmlParts.push(`
                        <div class="profile-item error">
                            <div class="profile-name">Error loading profile</div>
                            <div class="profile-url">Check console for details</div>
                        </div>
                    `);
                }
            });

            // Set the HTML
            container.innerHTML = htmlParts.join('');
            console.log('✅ Profile list rendered successfully');
            
        } catch (error) {
            console.error('🚨 Critical error in renderProfileList:', error);
            container.innerHTML = `
                <div class="empty-state" style="padding: 1rem;">
                    <p style="text-align: center; color: var(--color-danger);">Error loading profiles</p>
                    <p style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">
                        Check browser console for details
                    </p>
                </div>
            `;
        }
    }

    /**
     * Select a profile with detailed debugging
     */
    async selectProfile(profileName) {
        try {
            console.log('🎯 Selecting profile:', profileName);
            
            if (!profileName) {
                console.warn('⚠️ No profile name provided');
                return;
            }
            
            const profile = this.profiles.find(p => p && p.name === profileName);
            if (!profile) {
                console.error('❌ Profile not found:', profileName);
                showNotification(`Profile "${profileName}" not found`, 'error');
                return;
            }
            
            console.log('📋 Found profile:', profile);
            this.currentProfile = profile;
            this.renderProfileList(); // Update active state
            
            // Show basic profile details for now
            this.showBasicProfileDetails(profile);
            
        } catch (error) {
            console.error('🚨 Error selecting profile:', error);
            showNotification('Error selecting profile', 'error');
        }
    }

    /**
     * Show basic profile details (safe fallback)
     */
    showBasicProfileDetails(profile) {
        console.log('📄 Showing basic profile details for:', profile?.name);
        
        const container = document.getElementById('profile-details');
        if (!container) {
            console.error('❌ Profile details container not found');
            return;
        }

        try {
            const safeName = this.safeEscape(profile.name || 'Unknown Profile');
            const safeUrl = this.safeEscape(profile.baseUrl || 'Not configured');
            const safeAuth = this.safeEscape(profile.authType || 'Unknown');
            const safePagination = this.safeEscape(profile.paginationType || 'Auto-detect');
            const safeDescription = this.safeEscape(profile.description || 'No description');
            const jsName = this.safeJsEscape(profile.name || '');
            
            // Display headers safely
            const headersDisplay = profile.headers && Object.keys(profile.headers).length > 0
                ? Object.entries(profile.headers).map(([key, value]) => 
                    `${this.safeEscape(key)}: ${this.safeEscape(value)}`
                  ).join('<br>')
                : 'None configured';
            
            // Display auth info safely (mask sensitive data)
            let authDetails = safeAuth;
            if (profile.credentials) {
                switch (profile.authType) {
                    case 'Bearer':
                        authDetails += ' (Token: ••••••••)';
                        break;
                    case 'Basic':
                        authDetails += ` (User: ${this.safeEscape(profile.credentials.username || 'Not set')})`;
                        break;
                    case 'ApiKey':
                        authDetails += ` (Header: ${this.safeEscape(profile.credentials.headerName || 'X-API-Key')})`;
                        break;
                }
            }
            
            // Add custom settings display
            let customSettingsHtml = '';
            if (profile.customSettings && typeof profile.customSettings === 'object' && Object.keys(profile.customSettings).length > 0) {
                customSettingsHtml = `
                    <div class="config-item" style="margin-top: 1rem;">
                        <span class="config-label">Custom Settings:</span>
                        <div class="config-value" style="font-family: monospace; font-size: 0.85rem; background: var(--bg-secondary); padding: 0.5rem; border-radius: 4px;">
                            ${Object.entries(profile.customSettings).map(([k, v]) =>
                                `<div><strong>${this.safeEscape(k)}</strong>: ${this.safeEscape(v)}</div>`
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
                    .map(([k, v]) => `<div><strong>${this.safeEscape(k)}</strong>: ${this.safeEscape(v)}</div>`)
                    .join('');
                if (pdEntries) {
                    paginationDetailsHtml = `
                        <div class="config-item" style="margin-top: 0.5rem;">
                            <span class="config-label">Pagination Details:</span>
                            <div class="config-value" style="font-family: monospace; font-size: 0.85rem; background: var(--bg-secondary); padding: 0.5rem; border-radius: 4px;">
                                ${pdEntries}
                            </div>
                        </div>
                    `;
                }
            }
            
            container.innerHTML = `
                <div class="profile-config">
                    <div class="config-section">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h4>📋 ${safeName}</h4>
                            <div class="profile-actions">
                                <button class="btn btn-primary" onclick="profileManager.editProfile('${jsName}')" style="margin-right: 0.5rem;">
                                    ✏️ Edit Profile
                                </button>
                                <button class="btn btn-outline" onclick="profileManager.testProfile('${jsName}')">
                                    🧪 Test Connection
                                </button>
                            </div>
                        </div>
                        
                        <div class="config-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                            <div class="config-item">
                                <span class="config-label">Base URL:</span>
                                <span class="config-value" style="word-break: break-all;">${safeUrl}</span>
                            </div>
                            <div class="config-item">
                                <span class="config-label">Authentication:</span>
                                <span class="config-value">${authDetails}</span>
                            </div>
                            <div class="config-item">
                                <span class="config-label">Pagination:</span>
                                <span class="config-value">${safePagination}</span>
                            </div>
                            <div class="config-item">
                                <span class="config-label">Session Only:</span>
                                <span class="config-value">${profile.isSessionOnly ? 'Yes' : 'No'}</span>
                            </div>
                        </div>

                        ${profile.description ? `
                        <div class="config-item" style="margin-bottom: 1rem;">
                            <span class="config-label">Description:</span>
                            <span class="config-value">${safeDescription}</span>
                        </div>
                        ` : ''}

                        <div class="config-item">
                            <span class="config-label">Default Headers:</span>
                            <div class="config-value" style="font-family: monospace; font-size: 0.85rem; background: var(--bg-secondary); padding: 0.5rem; border-radius: 4px;">
                                ${headersDisplay}
                            </div>
                        </div>
                        ${paginationDetailsHtml}
                        ${customSettingsHtml}
                        ${profile.customAuthScript ? `
                        <div class="config-item" style="margin-top: 1rem;">
                            <span class="config-label">Custom Auth Script:</span>
                            <div class="config-value" style="font-family: monospace; font-size: 0.75rem; background: var(--bg-secondary); padding: 0.5rem; border-radius: 4px; max-height: 100px; overflow-y: auto;">
                                ${this.safeEscape(profile.customAuthScript)}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            console.log('✅ Basic profile details rendered successfully');
            
        } catch (error) {
            console.error('🚨 Error showing profile details:', error);
            container.innerHTML = `
                <div class="config-section">
                    <h4>❌ Error Loading Profile</h4>
                    <p style="color: var(--color-danger);">
                        There was an error displaying this profile. Check the browser console for details.
                    </p>
                    <pre style="font-size: 0.75rem; color: var(--text-muted);">
                        Error: ${this.safeEscape(error.message)}
                    </pre>
                </div>
            `;
        }
    }

    /**
     * Update test profile dropdown
     */
    updateTestProfileDropdown() {
        try {
            const select = document.getElementById('test-profile');
            if (!select) return;

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
            
            console.log('✅ Test profile dropdown updated');
            
        } catch (error) {
            console.error('🚨 Error updating test profile dropdown:', error);
        }
    }

    /**
     * Filter profiles based on search term
     */
    filterProfiles() {
        try {
            const searchInput = document.getElementById('profile-search');
            if (searchInput) {
                this.searchTerm = searchInput.value || '';
                console.log('🔍 Filtering profiles with term:', this.searchTerm);
                this.renderProfileList();
            }
        } catch (error) {
            console.error('🚨 Error filtering profiles:', error);
        }
    }

/**
 * Show create profile modal with templates and advanced options
 */
showCreateModal() {
    console.log('➕ Creating new profile modal...');
    
    this.createModal('Create New Profile', this.renderCreateForm(), {
        width: '700px',
        onSave: () => this.handleCreateProfile(),
        saveText: 'Create Profile'
    });

    // Initialize the new sections after modal is created
    setTimeout(() => {
        console.log('🔧 Initializing create modal sections...');
        
        // Initialize credentials section with one empty row
        const credentialsContainer = document.getElementById('profile-credentials-list');
        if (credentialsContainer) {
            credentialsContainer.innerHTML = '';
            this.addCredentialRow(credentialsContainer, '', '');
            console.log('✅ Credentials section initialized');
        }

        // Initialize custom settings section with one empty row
        const customSettingsContainer = document.getElementById('profile-customsettings-list');
        if (customSettingsContainer) {
            customSettingsContainer.innerHTML = '';
            this.addCustomSettingRow(customSettingsContainer, '', '');
            console.log('✅ Custom settings section initialized');
        }

        // Attach event handlers for the add buttons
        const addCredBtn = document.getElementById('add-credential-btn');
        if (addCredBtn && !addCredBtn._handlerAttached) {
            addCredBtn.onclick = () => this.addCredentialRow();
            addCredBtn._handlerAttached = true;
            console.log('✅ Add credential button handler attached');
        }

        const addSettingBtn = document.getElementById('add-customsetting-btn');
        if (addSettingBtn && !addSettingBtn._handlerAttached) {
            addSettingBtn.onclick = () => this.addCustomSettingRow();
            addSettingBtn._handlerAttached = true;
            console.log('✅ Add custom setting button handler attached');
        }

        // Initialize pagination visibility
        const paginationSelect = document.getElementById('profile-pagination');
        if (paginationSelect) {
            // Set initial visibility based on default pagination type
            this.updatePaginationVisibility();
            console.log('✅ Pagination visibility initialized');
        }
    }, 200);
}

    /**
     * Populate auth fields with existing profile data
     */
    populateAuthFields(profile) {
        console.log('🔧 Populating auth fields for profile:', profile.name, 'Auth type:', profile.authType);
        console.log('🔧 Profile credentials:', profile.credentials);
        console.log('🔧 Custom auth script:', profile.customAuthScript);
        
        // First ensure auth fields are rendered
        this.toggleAuthFields();
        
        // Then populate with existing data
        setTimeout(() => {
            try {
                if (profile.credentials) {
                    console.log('📝 Populating credentials for auth type:', profile.authType);
                    
                    switch (profile.authType) {
                        case 'Bearer':
                            const tokenField = document.getElementById('auth-token');
                            if (tokenField && profile.credentials.token) {
                                tokenField.value = profile.credentials.token;
                                tokenField.placeholder = 'Current token loaded';
                                console.log('✅ Bearer token populated');
                            } else {
                                console.log('⚠️ Token field not found or no token in credentials');
                            }
                            break;
                            
                        case 'Basic':
                            const usernameField = document.getElementById('auth-username');
                            const passwordField = document.getElementById('auth-password');
                            
                            if (usernameField && profile.credentials.username) {
                                usernameField.value = profile.credentials.username;
                                console.log('✅ Username populated:', profile.credentials.username);
                            }
                            if (passwordField && profile.credentials.password) {
                                passwordField.value = profile.credentials.password;
                                passwordField.placeholder = 'Current password loaded';
                                console.log('✅ Password populated');
                            }
                            break;
                            
                        case 'ApiKey':
                            const apiKeyField = document.getElementById('auth-apikey');
                            const headerNameField = document.getElementById('auth-apikey-header');
                            
                            if (apiKeyField && profile.credentials.apiKey) {
                                apiKeyField.value = profile.credentials.apiKey;
                                apiKeyField.placeholder = 'Current API key loaded';
                                console.log('✅ API key populated');
                            }
                            if (headerNameField) {
                                headerNameField.value = profile.credentials.headerName || 'X-API-Key';
                                console.log('✅ API key header populated:', profile.credentials.headerName);
                            }
                            break;
                            
                        default:
                            console.log('⚠️ No credential population needed for auth type:', profile.authType);
                    }
                } else {
                    console.log('⚠️ No credentials found in profile');
                }
                
                // Handle custom auth script
                if (profile.authType === 'Custom' && profile.customAuthScript) {
                    const scriptField = document.getElementById('auth-script');
                    if (scriptField) {
                        scriptField.value = profile.customAuthScript;
                        console.log('✅ Custom auth script populated');
                    } else {
                        console.log('⚠️ Auth script field not found');
                    }
                } else if (profile.authType === 'Custom') {
                    console.log('⚠️ Custom auth type but no script found');
                }
                
                console.log('✅ Auth fields population completed');
                
            } catch (error) {
                console.error('🚨 Error populating auth fields:', error);
            }
        }, 100);
    }

    /**
     * Toggle authentication fields based on auth type - ENHANCED WITH COORDINATION
     */
    toggleAuthFields() {
        const authType = document.getElementById('profile-authtype');
        const authFields = document.getElementById('auth-fields');
        
        if (!authType || !authFields) {
            console.warn('⚠️ Auth type select or auth fields container not found');
            return;
        }
        
        const authTypeValue = authType.value;
        console.log('🔄 Toggling auth fields for type:', authTypeValue);
        
        let fieldsHtml = '';
        
        switch (authTypeValue) {
            case 'Bearer':
                fieldsHtml = `
                    <div class="form-group">
                        <div class="auth-help" style="padding: 0.75rem; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 1rem;">
                            <p><strong>💡 Bearer Token Authentication</strong></p>
                            <p>Add your bearer token in the <strong>Credentials</strong> section below using the key "token". The token will be sent as an Authorization header.</p>
                        </div>
                    </div>
                `;
                break;
                
            case 'Basic':
                fieldsHtml = `
                    <div class="form-group">
                        <div class="auth-help" style="padding: 0.75rem; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 1rem;">
                            <p><strong>💡 Basic Authentication</strong></p>
                            <p>Add your credentials in the <strong>Credentials</strong> section below:</p>
                            <ul style="margin: 0.5rem 0 0 1rem;">
                                <li><strong>username</strong> - Your username</li>
                                <li><strong>password</strong> - Your password</li>
                            </ul>
                            <p>They will be base64-encoded and sent as an Authorization header.</p>
                        </div>
                    </div>
                `;
                break;
                
            case 'ApiKey':
                fieldsHtml = `
                    <div class="form-group">
                        <div class="auth-help" style="padding: 0.75rem; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 1rem;">
                            <p><strong>💡 API Key Authentication</strong></p>
                            <p>Add your API key details in the <strong>Credentials</strong> section below:</p>
                            <ul style="margin: 0.5rem 0 0 1rem;">
                                <li><strong>apiKey</strong> - Your API key value</li>
                                <li><strong>headerName</strong> - Header name (default: X-API-Key)</li>
                            </ul>
                            <p>The key will be sent as a custom header.</p>
                        </div>
                    </div>
                `;
                break;
                
            case 'Custom':
                fieldsHtml = `
                    <div class="form-group">
                        <label for="auth-script">Custom Authentication Script:</label>
                        <textarea id="auth-script" class="form-control" rows="6" 
                                  placeholder="# PowerShell script to generate auth headers&#10;# Example:&#10;param($RequestContext, $Profile)&#10;$RequestContext.Headers['Authorization'] = 'Bearer ' + $token"></textarea>
                        <small class="form-help">PowerShell script that sets authentication headers. Access credentials from the Credentials section using $RequestContext.GetPlainTextSecret.Invoke('credentialName')</small>
                    </div>
                `;
                break;
                
            case 'None':
            default:
                fieldsHtml = '<p class="form-help" style="font-style: italic; color: var(--text-muted);">No authentication required for this profile.</p>';
                break;
        }
        
        authFields.innerHTML = fieldsHtml;
        console.log('✅ Auth fields HTML updated for type:', authTypeValue);
    }

    /**
     * Edit existing profile
     */
    async editProfile(profileName) {
        console.log('✏️ Editing profile:', profileName);

        try {
            showNotification('Loading profile details...', 'info', 2000);

            // Get detailed profile information including credentials
            const response = await apiClient.getProfileDetails(profileName, true);

            if (!response.success) {
                showNotification(`Failed to load profile: ${response.error}`, 'error');
                return;
            }

            // --- Map backend fields to frontend profile object, including customAuthScript ---
            const profile = response.profile;
            // Defensive: try to fetch customAuthScript from multiple possible locations
            let customAuthScript = null;
            if (typeof profile.customAuthScript === 'string' && profile.customAuthScript.trim()) {
                customAuthScript = profile.customAuthScript;
            } else if (typeof profile.AuthenticationDetails === 'object' && profile.AuthenticationDetails && profile.AuthenticationDetails.AuthScriptBlock) {
                // If backend ever returns AuthenticationDetails, fallback
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
    paginationDetails: profile.paginationDetails || profile.PaginationDetails || {} // ← ADD THIS LINE
};

            // DEBUG: Log what will be used for the edit modal
            console.log('🛠️ Edit modal profile object:', editProfile);

            this.isEditing = true;
            this.currentEditProfile = JSON.parse(JSON.stringify(editProfile)); // Deep copy for editing
            this.createModal('Edit Profile', this.renderEditForm(this.currentEditProfile), {
                width: '700px',
                onSave: () => this.handleEditProfile(),
                saveText: 'Save Changes'
            });

            setTimeout(() => {
                console.log('🚀 About to populate edit fields with profile:', JSON.stringify(this.currentEditProfile, null, 2));
                const modal = document.getElementById('profile-modal');
                const form = document.getElementById('edit-profile-form');
                if (!modal) {
                    console.error('❌ Modal not found in DOM');
                    return;
                }
                if (!form) {
                    console.error('❌ Edit form not found in modal');
                    return;
                }
                console.log('✅ Modal and form elements confirmed in DOM');
                this.populateAllEditFields(this.currentEditProfile);
            }, 300);
        } catch (error) {
            console.error('🚨 Error editing profile:', error);
            showNotification('Error loading profile for editing', 'error');
        }
    }

/**
 * Toggle pagination details field visibility based on checkbox
 */
togglePaginationDetailsField() {
    const checkbox = document.getElementById('show-pagination-details');
    const detailsGroup = document.getElementById('pagination-details-group');
    
    if (checkbox && detailsGroup) {
        detailsGroup.style.display = checkbox.checked ? 'block' : 'none';
        console.log('🔄 Pagination details field toggled:', checkbox.checked ? 'visible' : 'hidden');
    }
}

/**
 * Update pagination visibility based on pagination type selection
 */
updatePaginationVisibility() {
    const paginationSelect = document.getElementById('profile-pagination');
    const checkbox = document.getElementById('show-pagination-details');
    const detailsGroup = document.getElementById('pagination-details-group');
    
    if (!paginationSelect || !checkbox || !detailsGroup) {
        console.warn('⚠️ Pagination visibility elements not found');
        return;
    }
    
    const paginationType = paginationSelect.value;
    console.log('🔄 Updating pagination visibility for type:', paginationType);
    
    // Determine if we should auto-show the details field
    const shouldAutoShow = ['Custom', 'PageNumber'].includes(paginationType);
    
    if (shouldAutoShow) {
        // For Custom and PageNumber, automatically show the details and check the checkbox
        checkbox.checked = true;
        detailsGroup.style.display = 'block';
        console.log('✅ Auto-showing pagination details for', paginationType);
    } else {
        // For other types, respect the current checkbox state
        // Don't auto-hide if user manually checked it
        console.log('ℹ️ Pagination type', paginationType, 'uses defaults, checkbox state:', checkbox.checked);
    }
    
    // Update the placeholder text based on pagination type
    const textarea = document.getElementById('profile-pagination-details');
    if (textarea) {
        let placeholder = '';
        switch (paginationType) {
            case 'PageNumber':
                placeholder = '{"PageParameter":"page","PageSizeParameter":"pageSize","DefaultPageSize":100}';
                break;
            case 'Cursor':
                placeholder = '{"NextTokenField":"next_cursor","TokenParameter":"cursor","ItemsField":"items"}';
                break;
            case 'NextLink':
                placeholder = '{"NextTokenField":"@odata.nextLink","ItemsField":"value"}';
                break;
            case 'LinkHeader':
                placeholder = '{"LinkHeaderRel":"next","ItemsField":"items"}';
                break;
            case 'Custom':
                placeholder = '{"PageParameter":"page","PageSizeParameter":"limit","NextTokenField":"nextToken"}';
                break;
            default:
                placeholder = '{"PageParameter":"page","PageSizeParameter":"pageSize","DefaultPageSize":100}';
        }
        textarea.placeholder = placeholder;
    }
}

/**
 * Legacy method for backward compatibility - redirects to new method
 */
togglePaginationFields() {
    console.log('⚠️ togglePaginationFields() is deprecated, using updatePaginationVisibility()');
    this.updatePaginationVisibility();
}

/**
 * Render edit profile form - COMPLETE VERSION with pagination checkbox
 */
renderEditForm(profile) {
    console.log('🎨 Rendering edit form for profile:', profile.name);
    
    const customSettingsSection = `
        <div class="form-section">
            <h4>⚙️ Custom Settings</h4>
            <div id="profile-customsettings-list"></div>
            <button type="button" id="add-customsetting-btn" class="btn btn-outline btn-sm">➕ Add Setting</button>
            <small class="form-help">Custom settings are sent with every request and may be required by some APIs.</small>
        </div>
    `;

    const credentialsSection = `
        <div class="form-section">
            <h4>🔑 Credentials</h4>
            <div class="form-help" style="margin-bottom: 1rem; padding: 0.75rem; background: var(--bg-secondary); border-radius: 4px;">
                <strong>💡 Credentials work with your authentication type:</strong>
                <ul style="margin: 0.5rem 0 0 1rem; padding: 0;">
                    <li><strong>Bearer:</strong> Add a "token" credential</li>
                    <li><strong>Basic:</strong> Add "username" and "password" credentials</li>
                    <li><strong>API Key:</strong> Add "apiKey" and optionally "headerName" credentials</li>
                    <li><strong>Custom:</strong> Add any credentials your script needs</li>
                </ul>
            </div>
            <div id="profile-credentials-list"></div>
            <button type="button" id="add-credential-btn" class="btn btn-outline btn-sm">➕ Add Credential</button>
            <small class="form-help">Credentials are stored securely. Sensitive values are hidden by default.</small>
        </div>
    `;

    // Pagination type options - handle PageBased mapping
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

    // Determine which option should be selected
    let selectedPaginationType = 'Auto';
    if (profile && profile.paginationType) {
        const profilePaginationType = String(profile.paginationType).toLowerCase();
        switch (profilePaginationType) {
            case 'pagebased':
            case 'pagenumber':
                selectedPaginationType = 'PageNumber';
                break;
            case 'linkheader':
                selectedPaginationType = 'LinkHeader';
                break;
            case 'nextlink':
                selectedPaginationType = 'NextLink';
                break;
            case 'cursor':
            case 'cursorbased':
                selectedPaginationType = 'Cursor';
                break;
            case 'none':
                selectedPaginationType = 'None';
                break;
            case 'custom':
                selectedPaginationType = 'Custom';
                break;
            default:
                selectedPaginationType = profile.paginationType;
        }
    }

    paginationTypes.forEach(type => {
        const selected = type.value === selectedPaginationType ? ' selected' : '';
        paginationOptions += `<option value="${type.value}"${selected}>${type.label}</option>`;
    });

    return `
        <form id="edit-profile-form" class="profile-form">
            <div class="form-section">
                <h4>⚙️ Basic Configuration</h4>
                <div class="form-group">
                    <label for="profile-name">Profile Name: *</label>
                    <input type="text" id="profile-name" class="form-control" required>
                </div>
                
                <div class="form-group">
                    <label for="profile-baseurl">Base URL: *</label>
                    <input type="url" id="profile-baseurl" class="form-control" required>
                </div>
                
                <div class="form-group">
                    <label for="profile-description">Description:</label>
                    <textarea id="profile-description" class="form-control" rows="2"></textarea>
                </div>
            </div>

            <div class="form-section">
                <h4>🔐 Authentication</h4>
                <div class="form-group">
                    <label for="profile-authtype">Authentication Type:</label>
                    <select id="profile-authtype" class="form-control" onchange="profileManager.toggleAuthFields()">
                        <option value="None">None</option>
                        <option value="Bearer">Bearer Token</option>
                        <option value="Basic">Basic Authentication</option>
                        <option value="ApiKey">API Key</option>
                        <option value="Custom">Custom Script</option>
                    </select>
                </div>
                
                <div id="auth-fields">
                    <!-- Auth fields will be populated by toggleAuthFields -->
                </div>
            </div>

            <div class="form-section">
                <h4>📄 Headers & Pagination</h4>
                <div class="form-group">
                    <label for="profile-headers">Default Headers (JSON):</label>
                    <textarea id="profile-headers" class="form-control" rows="4"></textarea>
                    <small class="form-help">Optional: Default headers to include with requests</small>
                </div>
                
                <div class="form-group">
                    <label for="profile-pagination-type">Pagination Type:</label>
                    <select id="profile-pagination" class="form-control" onchange="profileManager.updatePaginationVisibility()">
                        ${paginationOptions}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="show-pagination-details" onchange="profileManager.togglePaginationDetailsField()"> 
                        Show Advanced Pagination Details
                    </label>
                    <small class="form-help">Check this to customize pagination behavior beyond the default settings</small>
                </div>
                
                <div class="form-group" id="pagination-details-group" style="display: none;">
                    <label for="profile-pagination-details">Pagination Details (JSON):</label>
                    <textarea id="profile-pagination-details" class="form-control" rows="3" placeholder='{"PageParameter":"page","PageSizeParameter":"pageSize","DefaultPageSize":100}'></textarea>
                    <small class="form-help">Advanced pagination configuration as JSON</small>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="profile-session-only"> 
                        Session only (don't save credentials)
                    </label>
                </div>
            </div>

            ${credentialsSection}
            ${customSettingsSection}
        </form>
    `;
}

populateAllEditFields(profile) {
    console.log('🔧 POPULATING ALL EDIT FIELDS');
    console.log('🔧 Profile name:', profile.name);
    console.log('🔧 Profile pagination details:', JSON.stringify(profile.paginationDetails, null, 2));
    
    try {
        const waitForElements = () => {
            // Get all form elements
            const nameField = document.getElementById('profile-name');
            const urlField = document.getElementById('profile-baseurl');
            const descField = document.getElementById('profile-description');
            const authTypeField = document.getElementById('profile-authtype');
            const headersField = document.getElementById('profile-headers');
            const paginationField = document.getElementById('profile-pagination');
            const paginationDetailsField = document.getElementById('profile-pagination-details');
            const sessionOnlyField = document.getElementById('profile-session-only');

            console.log('🔍 Form elements check:', {
                nameField: !!nameField,
                urlField: !!urlField,
                descField: !!descField,
                authTypeField: !!authTypeField,
                headersField: !!headersField,
                paginationField: !!paginationField,
                paginationDetailsField: !!paginationDetailsField,
                sessionOnlyField: !!sessionOnlyField
            });

            // Wait for critical elements
            if (!nameField || !urlField || !authTypeField || !paginationDetailsField) {
                console.warn('⚠️ Critical form elements missing, retrying in 100ms...');
                setTimeout(waitForElements, 100);
                return;
            }

            console.log('✅ All critical elements found, populating fields...');

            // 1. BASIC FIELDS
            nameField.value = profile.name || '';
            urlField.value = profile.baseUrl || '';
            descField.value = profile.description || '';
            console.log('✅ Basic fields populated');

            // 2. HEADERS FIELD
            if (headersField) {
                const headersJson = profile.headers && typeof profile.headers === 'object' && Object.keys(profile.headers).length > 0
                    ? JSON.stringify(profile.headers, null, 2)
                    : '{}';
                headersField.value = headersJson;
                console.log('✅ Headers field populated:', headersJson);
            }

            // 3. PAGINATION DETAILS FIELD - THE MAIN FIX
            if (paginationDetailsField) {
                console.log('🎯 SETTING PAGINATION DETAILS FIELD');
                console.log('🎯 Field element:', paginationDetailsField);
                console.log('🎯 Current field value before setting:', `"${paginationDetailsField.value}"`);
                
                if (profile.paginationDetails && typeof profile.paginationDetails === 'object' && Object.keys(profile.paginationDetails).length > 0) {
                    const paginationJson = JSON.stringify(profile.paginationDetails, null, 2);
                    console.log('🎯 JSON to set:', paginationJson);
                    
                    paginationDetailsField.value = paginationJson;
                    
                    console.log('🎯 Field value AFTER setting:', `"${paginationDetailsField.value}"`);
                    console.log('🎯 Setting successful:', paginationDetailsField.value === paginationJson);
                    console.log('✅ PAGINATION DETAILS FIELD SET SUCCESSFULLY');
                } else {
                    console.log('⚠️ No valid pagination details found in profile');
                    paginationDetailsField.value = '';
                }
            } else {
                console.error('❌ PAGINATION DETAILS FIELD NOT FOUND!');
            }

            // 4. PAGINATION DETAILS HANDLING
            const showPaginationCheckbox = document.getElementById('show-pagination-details');
            const paginationDetailsGroup = document.getElementById('pagination-details-group');
            
            if (paginationDetailsField && showPaginationCheckbox && paginationDetailsGroup) {
                console.log('🎯 SETTING PAGINATION DETAILS AND VISIBILITY');
                
                // Determine if we have pagination details to show
                const hasPaginationDetails = profile.paginationDetails && 
                    typeof profile.paginationDetails === 'object' && 
                    Object.keys(profile.paginationDetails).length > 0;
                
                if (hasPaginationDetails) {
                    const paginationJson = JSON.stringify(profile.paginationDetails, null, 2);
                    console.log('🎯 Setting pagination details JSON:', paginationJson);
                    paginationDetailsField.value = paginationJson;
                    
                    // Check the checkbox and show the field
                    showPaginationCheckbox.checked = true;
                    paginationDetailsGroup.style.display = 'block';
                    console.log('✅ PAGINATION DETAILS SET AND MADE VISIBLE');
                } else {
                    console.log('⚠️ No pagination details found in profile');
                    paginationDetailsField.value = '';
                    
                    // Decide whether to show based on pagination type
                    const shouldAutoShow = ['Custom', 'PageNumber'].includes(selectedPaginationType);
                    showPaginationCheckbox.checked = shouldAutoShow;
                    paginationDetailsGroup.style.display = shouldAutoShow ? 'block' : 'none';
                    console.log('🔧 Pagination visibility set based on type:', shouldAutoShow);
                }
                
                // Update placeholder based on pagination type
                this.updatePaginationVisibility();
            } else {
                console.error('❌ PAGINATION DETAILS ELEMENTS NOT FOUND!');
            }
            
            // 5. SESSION ONLY CHECKBOX
            if (sessionOnlyField) {
                sessionOnlyField.checked = Boolean(profile.isSessionOnly);
                console.log('✅ Session only checkbox set to:', sessionOnlyField.checked);
            }

            // 6. AUTH TYPE AND FIELDS
            if (authTypeField) {
                let authTypeValue = profile.authType || 'None';
                
                // Normalize auth type
                switch ((authTypeValue || '').toLowerCase()) {
                    case 'bearer':
                        authTypeValue = 'Bearer';
                        break;
                    case 'basic':
                        authTypeValue = 'Basic';
                        break;
                    case 'apikey':
                    case 'api_key':
                        authTypeValue = 'ApiKey';
                        break;
                    case 'custom':
                    case 'customscript':
                    case 'custom_script':
                        authTypeValue = 'Custom';
                        break;
                    case 'none':
                    default:
                        authTypeValue = 'None';
                        break;
                }
                
                authTypeField.value = authTypeValue;
                console.log('✅ Auth type set to:', authTypeValue);

                // Generate auth-specific fields
                this.toggleAuthFields();

                // Populate auth fields after they're created
                setTimeout(() => {
                    this.populateAuthFields({
                        ...profile,
                        authType: authTypeValue
                    });
                    
                    // Handle custom auth script
                    if (authTypeValue === 'Custom' && profile.customAuthScript) {
                        const scriptField = document.getElementById('auth-script');
                        if (scriptField) {
                            scriptField.value = profile.customAuthScript;
                            console.log('✅ Custom auth script populated (length:', profile.customAuthScript.length, ')');
                        } else {
                            console.warn('⚠️ Auth script field not found');
                        }
                    }
                }, 200);
            }

            // 6. CREDENTIALS SECTION
            const credentialsContainer = document.getElementById('profile-credentials-list');
            if (credentialsContainer) {
                credentialsContainer.innerHTML = '';
                const creds = profile.credentials && typeof profile.credentials === 'object'
                    ? profile.credentials
                    : {};
                
                let credentialRowsAdded = false;
                Object.entries(creds).forEach(([key, value]) => {
                    this.addCredentialRow(credentialsContainer, key, value);
                    credentialRowsAdded = true;
                });
                
                if (!credentialRowsAdded) {
                    this.addCredentialRow(credentialsContainer, '', '');
                }
                
                console.log('✅ Credentials populated:', Object.keys(creds));
            }

            // Attach credential button handler
            const addCredBtn = document.getElementById('add-credential-btn');
            if (addCredBtn && !addCredBtn._handlerAttached) {
                addCredBtn.onclick = () => this.addCredentialRow();
                addCredBtn._handlerAttached = true;
            }

            // 7. CUSTOM SETTINGS SECTION
            const customSettingsContainer = document.getElementById('profile-customsettings-list');
            if (customSettingsContainer) {
                customSettingsContainer.innerHTML = '';
                const settings = (profile.customSettings && typeof profile.customSettings === 'object')
                    ? profile.customSettings
                    : {};
                
                let settingRowsAdded = false;
                Object.entries(settings).forEach(([key, value]) => {
                    this.addCustomSettingRow(customSettingsContainer, key, value);
                    settingRowsAdded = true;
                });
                
                if (!settingRowsAdded) {
                    this.addCustomSettingRow(customSettingsContainer, '', '');
                }
                
                console.log('✅ Custom settings populated:', Object.keys(settings));
            }

            // Attach custom settings button handler
            const addSettingBtn = document.getElementById('add-customsetting-btn');
            if (addSettingBtn && !addSettingBtn._handlerAttached) {
                addSettingBtn.onclick = () => this.addCustomSettingRow();
                addSettingBtn._handlerAttached = true;
            }

            console.log('🎉 ALL FIELDS POPULATED SUCCESSFULLY!');
        };
        
        waitForElements();
    } catch (error) {
        console.error('🚨 Error populating edit fields:', error);
    }
}

    /**
     * Add a credential row to the credentials container - ENHANCED WITH TEMPLATE SUPPORT
     * Includes show/hide button for value field and template field labeling
     */
    addCredentialRow(container, key = '', value = '', label = '', inputType = 'password') {
        if (!container) {
            container = document.getElementById('profile-credentials-list');
            if (!container) return;
        }
        const row = document.createElement('div');
        row.className = 'credential-row';
        row.style.display = 'flex';
        row.style.gap = '0.5em';
        row.style.marginBottom = '0.5em';

        // Determine input type - use password for sensitive fields, text for others
        let actualInputType = inputType;
        if (!inputType || inputType === 'password') {
            actualInputType = 'password';
        } else {
            actualInputType = 'text';
        }

        // Create placeholder text for key field
        const keyPlaceholder = label ? `${label} (${key})` : (key || 'Key');
        const keyValue = key || '';
        const keyReadonly = key ? 'readonly' : '';
        
        row.innerHTML = `
            <input type="text" class="form-control credential-key" 
                   placeholder="${this.safeEscape(keyPlaceholder)}" 
                   value="${this.safeEscape(keyValue)}" 
                   ${keyReadonly}
                   style="flex:1;">
            <input type="${actualInputType}" class="form-control credential-value" 
                   placeholder="${label ? this.safeEscape(label) : 'Value'}" 
                   value="${this.safeEscape(value)}" 
                   style="flex:2;">
            <button type="button" class="btn btn-outline btn-sm credential-toggle" title="Show/Hide" style="flex:0;">
                <span class="credential-eye" style="pointer-events:none;">${actualInputType === 'password' ? '👁️' : '📝'}</span>
            </button>
            <button type="button" class="btn btn-outline btn-sm" title="Remove" style="flex:0;" onclick="this.parentElement.remove()">🗑️</button>
        `;
        container.appendChild(row);

        // Add show/hide toggle logic for password fields
        const valueInput = row.querySelector('.credential-value');
        const toggleBtn = row.querySelector('.credential-toggle');
        const keyInput = row.querySelector('.credential-key');
        
        if (toggleBtn && valueInput) {
            if (actualInputType === 'password') {
                // Password field - show/hide functionality
                toggleBtn.onclick = function () {
                    if (valueInput.type === 'password') {
                        valueInput.type = 'text';
                        toggleBtn.title = 'Hide';
                        toggleBtn.querySelector('.credential-eye').textContent = '🙈';
                    } else {
                        valueInput.type = 'password';
                        toggleBtn.title = 'Show';
                        toggleBtn.querySelector('.credential-eye').textContent = '👁️';
                    }
                };
            } else {
                // Text field - make toggle button less prominent
                toggleBtn.style.opacity = '0.5';
                toggleBtn.onclick = function () {
                    // Do nothing for text fields
                };
            }
        }

        // If this is a pre-filled key field, make it harder to accidentally change
        if (key && keyInput) {
            keyInput.style.backgroundColor = 'var(--bg-secondary)';
            keyInput.title = `Template field: ${label || key}`;
        }
    }

    /**
     * Add a custom setting row to the custom settings container
     */
    addCustomSettingRow(container, key = '', value = '') {
        if (!container) {
            container = document.getElementById('profile-customsettings-list');
            if (!container) return;
        }
        const row = document.createElement('div');
        row.className = 'customsetting-row';
        row.style.display = 'flex';
        row.style.gap = '0.5em';
        row.style.marginBottom = '0.5em';
        row.innerHTML = `
            <input type="text" class="form-control customsetting-key" placeholder="Key" value="${this.safeEscape(key)}" style="flex:1;">
            <input type="text" class="form-control customsetting-value" placeholder="Value" value="${this.safeEscape(value)}" style="flex:2;">
            <button type="button" class="btn btn-outline btn-sm" title="Remove" style="flex:0;" onclick="this.parentElement.remove()">🗑️</button>
        `;
        container.appendChild(row);
    }

    /**
     * Create modal dialog
     */
    createModal(title, content, options = {}) {
        // Remove existing modal if any
        const existing = document.getElementById('profile-modal');
        if (existing) {
            existing.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'profile-modal';
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        modal.innerHTML = `
            <div class="modal-dialog" style="width: ${options.width || '500px'}; max-width: 90vw; max-height: 90vh; overflow-y: auto; background: var(--bg-primary); border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div class="modal-header" style="padding: 1rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">${this.safeEscape(title)}</h3>
                    <button class="modal-close" onclick="profileManager.closeModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; padding: 0.25rem;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 1rem; max-height: 70vh; overflow-y: auto;">
                    ${content}
                </div>
                <div class="modal-footer" style="padding: 1rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 0.5rem;">
                    <button class="btn btn-outline" onclick="profileManager.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="${options.onSave ? 'profileManager.modalSave()' : 'profileManager.closeModal()'}">
                        ${options.saveText || 'Save'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Store save handler
        this.modalSaveHandler = options.onSave;
        
        // Focus first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    /**
     * Handle modal save button
     */
    modalSave() {
        if (this.modalSaveHandler) {
            this.modalSaveHandler();
        }
    }

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('profile-modal');
        if (modal) {
            modal.remove();
        }
        this.isEditing = false;
        this.currentEditProfile = null;
        this.modalSaveHandler = null;
    }

/**
 * Render create profile form with all advanced options - ENHANCED WITH COORDINATED AUTH
 */
renderCreateForm() {
    const templateOptions = Object.entries(this.templates).map(([key, template]) => 
        `<option value="${key}">${this.safeEscape(template.name || key)}</option>`
    ).join('');

    // Credentials section with enhanced guidance
    const credentialsSection = `
        <div class="form-section">
            <h4>🔑 Credentials</h4>
            <div class="form-help" style="margin-bottom: 1rem; padding: 0.75rem; background: var(--bg-secondary); border-radius: 4px;">
                <strong>💡 Credentials work with your authentication type:</strong>
                <ul style="margin: 0.5rem 0 0 1rem; padding: 0;">
                    <li><strong>Bearer:</strong> Add a "token" credential</li>
                    <li><strong>Basic:</strong> Add "username" and "password" credentials</li>
                    <li><strong>API Key:</strong> Add "apiKey" and optionally "headerName" credentials</li>
                    <li><strong>Custom:</strong> Add any credentials your script needs</li>
                </ul>
            </div>
            <div id="profile-credentials-list"></div>
            <button type="button" id="add-credential-btn" class="btn btn-outline btn-sm">➕ Add Credential</button>
            <small class="form-help">Credentials are stored securely and accessed by your authentication method.</small>
        </div>
    `;

    // Custom settings section (same as before)
    const customSettingsSection = `
        <div class="form-section">
            <h4>⚙️ Custom Settings</h4>
            <div id="profile-customsettings-list"></div>
            <button type="button" id="add-customsetting-btn" class="btn btn-outline btn-sm">➕ Add Setting</button>
            <small class="form-help">Custom settings are sent with every request and may be required by some APIs.</small>
        </div>
    `;

    return `
        <form id="create-profile-form" class="profile-form">
            <div class="form-section">
                <h4>📋 Template Selection</h4>
                <div class="form-group">
                    <label for="profile-template">Choose Template:</label>
                    <select id="profile-template" class="form-control" onchange="profileManager.applyTemplate()">
                        <option value="">Select a template...</option>
                        ${templateOptions}
                    </select>
                    <small class="form-help">Select a template to pre-fill common configurations with coordinated authentication</small>
                </div>
            </div>

            <div class="form-section">
                <h4>⚙️ Basic Configuration</h4>
                <div class="form-group">
                    <label for="profile-name">Profile Name: *</label>
                    <input type="text" id="profile-name" class="form-control" required 
                           placeholder="e.g., My GitHub API">
                </div>
                
                <div class="form-group">
                    <label for="profile-baseurl">Base URL: *</label>
                    <input type="url" id="profile-baseurl" class="form-control" required 
                           placeholder="https://api.example.com">
                </div>
                
                <div class="form-group">
                    <label for="profile-description">Description:</label>
                    <textarea id="profile-description" class="form-control" rows="2" 
                              placeholder="Brief description of this API"></textarea>
                </div>
            </div>

            <div class="form-section">
                <h4>🔐 Authentication</h4>
                <div class="form-group">
                    <label for="profile-authtype">Authentication Type:</label>
                    <select id="profile-authtype" class="form-control" onchange="profileManager.toggleAuthFields()">
                        <option value="None">None</option>
                        <option value="Bearer">Bearer Token</option>
                        <option value="Basic">Basic Authentication</option>
                        <option value="ApiKey">API Key</option>
                        <option value="Custom">Custom Script</option>
                    </select>
                </div>
                
                <div id="auth-fields"></div>
            </div>

            <div class="form-section">
                <h4>📄 Headers & Pagination</h4>
                <div class="form-group">
                    <label for="profile-headers">Default Headers (JSON):</label>
                    <textarea id="profile-headers" class="form-control" rows="3" 
                              placeholder='{"Content-Type": "application/json"}'></textarea>
                    <small class="form-help">Optional: Default headers to include with requests</small>
                </div>
                
                <div class="form-group">
                    <label for="profile-pagination">Pagination Type:</label>
                    <select id="profile-pagination" class="form-control" onchange="profileManager.updatePaginationVisibility()">
                        <option value="Auto">Auto-detect</option>
                        <option value="LinkHeader">Link Header (GitHub style)</option>
                        <option value="NextLink">NextLink (Microsoft style)</option>
                        <option value="Cursor">Cursor-based</option>
                        <option value="PageNumber">Page Number</option>
                        <option value="None">No pagination</option>
                        <option value="Custom">Custom</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="show-pagination-details" onchange="profileManager.togglePaginationDetailsField()"> 
                        Show Advanced Pagination Details
                    </label>
                    <small class="form-help">Check this to customize pagination behavior beyond the default settings</small>
                </div>
                
                <div class="form-group" id="pagination-details-group" style="display: none;">
                    <label for="profile-pagination-details">Pagination Details (JSON):</label>
                    <textarea id="profile-pagination-details" class="form-control" rows="3" 
                              placeholder='{"PageParameter":"page","PageSizeParameter":"pageSize","DefaultPageSize":100}'></textarea>
                    <small class="form-help">Advanced pagination configuration as JSON</small>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="profile-session-only"> 
                        Session only (don't save credentials)
                    </label>
                </div>
            </div>

            ${credentialsSection}
            ${customSettingsSection}
        </form>
    `;
}

/**
 * Apply template to form with coordinated auth and credentials - ENHANCED
 */
applyTemplate() {
    const templateSelect = document.getElementById('profile-template');
    const templateKey = templateSelect.value;
    
    if (!templateKey || !this.templates[templateKey]) return;
    
    const template = this.templates[templateKey];
    
    console.log('🎯 Applying template:', template.name);
    console.log('🎯 Template auth type:', template.authType);
    console.log('🎯 Template required secrets:', template.requiredSecrets);
    console.log('🎯 Template auth field mapping:', template.authFieldMapping);
    
    // Fill basic form fields
    document.getElementById('profile-name').value = template.name || '';
    document.getElementById('profile-baseurl').value = template.baseUrl || '';
    document.getElementById('profile-description').value = template.description || '';
    document.getElementById('profile-authtype').value = template.authType || 'None';
    document.getElementById('profile-pagination').value = template.paginationType || 'Auto';
    
    if (template.headers) {
        document.getElementById('profile-headers').value = JSON.stringify(template.headers, null, 2);
    }

    // Handle pagination details if present
    if (template.paginationDetails) {
        const paginationDetailsField = document.getElementById('profile-pagination-details');
        const showPaginationCheckbox = document.getElementById('show-pagination-details');
        const paginationDetailsGroup = document.getElementById('pagination-details-group');
        
        if (paginationDetailsField && showPaginationCheckbox && paginationDetailsGroup) {
            paginationDetailsField.value = JSON.stringify(template.paginationDetails, null, 2);
            // Show the details when applying a template with pagination details
            showPaginationCheckbox.checked = true;
            paginationDetailsGroup.style.display = 'block';
            console.log('✅ Template pagination details applied and made visible');
        }
    }
    
    // Update pagination visibility after setting type
    setTimeout(() => {
        this.updatePaginationVisibility();
    }, 100);
    
    // Clear existing auth fields and trigger update
    this.toggleAuthFields();
    
    // Handle custom settings from template
    if (template.customSettings && typeof template.customSettings === 'object') {
        const customSettingsContainer = document.getElementById('profile-customsettings-list');
        if (customSettingsContainer) {
            // Clear existing rows first
            customSettingsContainer.innerHTML = '';
            
            // Add rows for each custom setting
            Object.entries(template.customSettings).forEach(([key, value]) => {
                this.addCustomSettingRow(customSettingsContainer, key, value);
            });
            
            // Add one empty row at the end
            this.addCustomSettingRow(customSettingsContainer, '', '');
        }
    }
    
    // Handle coordinated credentials from template - ENHANCED
    this.applyTemplateCredentials(template);
    
    // Handle custom auth script from template
    if (template.customAuthScript) {
        // Wait for auth fields to be rendered
        setTimeout(() => {
            const scriptField = document.getElementById('auth-script');
            if (scriptField) {
                scriptField.value = template.customAuthScript;
                console.log('✅ Custom auth script applied from template');
            } else {
                console.log('⚠️ Auth script field not found, will retry...');
                // Retry after a longer delay
                setTimeout(() => {
                    const retryScriptField = document.getElementById('auth-script');
                    if (retryScriptField) {
                        retryScriptField.value = template.customAuthScript;
                        console.log('✅ Custom auth script applied from template (retry)');
                    }
                }, 300);
            }
        }, 100);
    }
    
    showNotification(`Applied ${template.name} template`, 'success');
}

setFormValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.value = value || '';
        return true;
    }
    console.warn(`Form element '${elementId}' not found`);
    return false;
}

validateTemplateApplication(template) {
    const requiredFields = ['name', 'baseUrl', 'authType'];
    const missingFields = requiredFields.filter(field => !template[field]);
    
    if (missingFields.length > 0) {
        showNotification(`Template missing required fields: ${missingFields.join(', ')}`, 'error');
        return false;
    }
    
    // Validate auth field mapping
    if (template.requiredSecrets && template.requiredSecrets.length > 0) {
        if (!template.authFieldMapping) {
            showNotification('Template requires secrets but no auth field mapping defined', 'warning');
        }
    }
    
    return true;
}

/**
 * Apply template credentials in a coordinated way with auth types - NEW METHOD
 */
applyTemplateCredentials(template) {
    if (template.authFieldMapping && template.requiredSecrets) {
        const credentialsContainer = document.getElementById('profile-credentials-list');
        if (credentialsContainer) {
            // Clear existing credentials
            credentialsContainer.innerHTML = '';
            
            // Add credential rows based on template mapping
            template.requiredSecrets.forEach(secretKey => {
                if (template.authFieldMapping[secretKey]) {
                    const mapping = template.authFieldMapping[secretKey];
                    const inputType = mapping.type || 'password';
                    
                    this.addCredentialRow(
                        credentialsContainer, 
                        mapping.field || secretKey, 
                        mapping.defaultValue || '',
                        mapping.label || secretKey,
                        inputType
                    );
                    
                    // Set the label and make template fields readonly
                    const lastRow = credentialsContainer.lastElementChild;
                    if (lastRow && mapping.label) {
                        const keyInput = lastRow.querySelector('.credential-key');
                        if (keyInput) {
                            keyInput.value = mapping.field || secretKey;
                            keyInput.setAttribute('data-label', mapping.label);
                            keyInput.title = mapping.label;
                            if (mapping.defaultValue) {
                                keyInput.style.backgroundColor = 'var(--bg-secondary)';
                                keyInput.readOnly = true;
                            }
                        }
                    }
                }
            });
            
            // Add one empty row for additional credentials
            this.addCredentialRow(credentialsContainer, '', '');
            console.log('✅ Template credentials applied successfully');
        }
    } else {
        console.log('⚠️ No auth field mapping or required secrets found in template');
    }
}

    /**
     * Handle create profile form submission
     */
    async handleCreateProfile() {
        try {
            console.log('📤 Handling profile creation...');
            
            const form = document.getElementById('create-profile-form');
            if (!form?.checkValidity()) {
                form?.reportValidity();
                return;
            }

            const profileData = this.collectFormData();
            
            // Validate required fields
            if (!profileData.name) {
                showNotification('Profile name is required', 'error');
                return;
            }
            
            if (!profileData.baseUrl) {
                showNotification('Base URL is required', 'error');
                return;
            }

            // Check for duplicate names
            if (this.profiles.find(p => p && p.name === profileData.name)) {
                showNotification('A profile with this name already exists', 'error');
                return;
            }

            console.log('📤 Sending profile creation request:', profileData);
            
            const response = await apiClient.createProfile(profileData);
            console.log('📨 Create profile response:', response);
            
            if (response.success) {
                showNotification('Profile created successfully', 'success');
                this.closeModal();
                await this.loadProfiles();
            } else {
                showNotification(`Failed to create profile: ${response.error}`, 'error');
            }
            
        } catch (error) {
            console.error('🚨 Error creating profile:', error);
            showNotification(`Error creating profile: ${error.message}`, 'error');
        }
    }

    /**
     * Handle edit profile form submission
     */
    async handleEditProfile() {
        try {
            console.log('📝 Handling profile update...');
            
            const form = document.getElementById('edit-profile-form');
            if (!form?.checkValidity()) {
                form?.reportValidity();
                return;
            }

            const profileData = this.collectFormData();
            const originalName = this.currentEditProfile.name;
            
            // Validate required fields
            if (!profileData.name) {
                showNotification('Profile name is required', 'error');
                return;
            }
            
            if (!profileData.baseUrl) {
                showNotification('Base URL is required', 'error');
                return;
            }

            // Check for duplicate names (excluding current profile)
            if (profileData.name !== originalName && 
                this.profiles.find(p => p && p.name === profileData.name)) {
                showNotification('A profile with this name already exists', 'error');
                return;
            }

            console.log('📝 Sending profile update request:', profileData);
            
            const response = await apiClient.updateProfile(originalName, profileData);
            console.log('📨 Update profile response:', response);
            
            if (response.success) {
                showNotification('Profile updated successfully', 'success');
                this.closeModal();
                await this.loadProfiles();
                
                // Update current selection if this was the selected profile
                if (this.currentProfile?.name === originalName) {
                    this.currentProfile = { ...profileData };
                    this.selectProfile(profileData.name);
                }
            } else {
                showNotification(`Failed to update profile: ${response.error}`, 'error');
            }
            
        } catch (error) {
            console.error('🚨 Error updating profile:', error);
            showNotification(`Error updating profile: ${error.message}`, 'error');
        }
    }

/**
 * Fixed collectFormData method for profile-manager.js
 * This replaces the existing collectFormData method
 */
collectFormData() {
    console.log('📊 Collecting form data...');
    
    const profileData = {
        name: document.getElementById('profile-name')?.value?.trim() || '',
        baseUrl: document.getElementById('profile-baseurl')?.value?.trim() || '',
        description: document.getElementById('profile-description')?.value?.trim() || '',
        authType: document.getElementById('profile-authtype')?.value || 'None',
        paginationType: document.getElementById('profile-pagination')?.value || 'Auto',
        isSessionOnly: document.getElementById('profile-session-only')?.checked || false,
        headers: {},
        credentials: {}
    };

    console.log('📋 Basic profile data collected:', profileData);

    // Parse headers JSON
    try {
        const headersText = document.getElementById('profile-headers')?.value?.trim();
        if (headersText) {
            profileData.headers = JSON.parse(headersText);
        }
    } catch (error) {
        console.warn('⚠️ Invalid JSON in headers, using empty object');
        profileData.headers = {};
    }

    // Parse pagination details JSON
    try {
        const paginationDetailsText = document.getElementById('profile-pagination-details')?.value?.trim();
        if (paginationDetailsText) {
            profileData.paginationDetails = JSON.parse(paginationDetailsText);
        }
    } catch (error) {
        console.warn('⚠️ Invalid JSON in pagination details, using empty object');
        profileData.paginationDetails = {};
    }

    // Collect custom settings
    const customSettings = {};
    const customSettingsRows = document.querySelectorAll('#profile-customsettings-list .customsetting-row');
    customSettingsRows.forEach(row => {
        const key = row.querySelector('.customsetting-key')?.value?.trim();
        const value = row.querySelector('.customsetting-value')?.value?.trim();
        if (key) {
            customSettings[key] = value;
        }
    });
    if (Object.keys(customSettings).length > 0) {
        profileData.customSettings = customSettings;
    }

    // FIXED: Collect credentials with proper masking handling
    const credentials = {};
    const credRows = document.querySelectorAll('#profile-credentials-list .credential-row');
    credRows.forEach(row => {
        const key = row.querySelector('.credential-key')?.value?.trim();
        const valueInput = row.querySelector('.credential-value');
        
        if (!key) return; // Skip rows without keys
        
        let value = valueInput?.value?.trim();
        
        // FIXED: Handle masked credentials properly
        if (valueInput && valueInput.type === 'password') {
            // Check if this is a masked placeholder (various possible formats)
            const isMasked = value === '********' || 
                           value === '••••••••' || 
                           value === '***MASKED***' ||
                           value === '' ||
                           (value && value.match(/^[•*]{6,}$/));
            
            if (isMasked && this.isEditing && this.currentEditProfile) {
                // For editing: if field appears masked and user didn't change it, 
                // don't include it in the update (backend will keep existing)
                console.log(`🔒 Credential '${key}' appears masked, excluding from update`);
                return; // Skip this credential - backend will keep existing value
            }
            
            // If we reach here, it's either:
            // 1. A new profile (create mode)
            // 2. An edit where user actually entered a new value
            if (value && !isMasked) {
                credentials[key] = value;
                console.log(`🔑 Including credential '${key}' with new value`);
            } else if (!this.isEditing) {
                // For new profiles, require non-empty values
                console.log(`⚠️ New profile missing required credential '${key}'`);
            }
        } else {
            // Non-password fields (like headerName for API keys)
            if (value) {
                credentials[key] = value;
                console.log(`🔧 Including non-secret credential field '${key}': ${value}`);
            }
        }
    });
    
    // Only set credentials if we have any
    if (Object.keys(credentials).length > 0) {
        profileData.credentials = credentials;
        console.log('🔑 Final credentials keys:', Object.keys(credentials));
    } else {
        console.log('🔑 No credentials to include in request');
    }

    // Handle custom auth script
    const authScript = document.getElementById('auth-script')?.value?.trim();
    if (authScript) {
        profileData.customAuthScript = authScript;
    }

    console.log('✅ Final profile data:', JSON.stringify(profileData, null, 2));
    return profileData;
}

    /**
     * Test profile connection
     */
    async testProfile(profileName) {
        console.log('🧪 Testing profile:', profileName);
        
        try {
            const profile = this.profiles.find(p => p && p.name === profileName);
            if (!profile) {
                showNotification(`Profile "${profileName}" not found`, 'error');
                return;
            }

            showNotification('Testing connection...', 'info');
            
            const response = await apiClient.testProfile(profileName);
            if (response.success) {
                showNotification(`✅ Connection successful`, 'success');
            } else {
                showNotification(`❌ Connection failed: ${response.error?.message || 'Unknown error'}`, 'error');
            }
            
        } catch (error) {
            console.error('🚨 Error testing profile:', error);
            showNotification(`Test failed: ${error.message}`, 'error');
        }
    }

    /**
     * Delete profile with confirmation
     */
    async deleteProfile(profileName) {
        console.log('🗑️ Delete profile requested:', profileName);
        
        if (!confirm(`Delete profile "${profileName}"?`)) {
            return;
        }
        
        try {
            const response = await apiClient.deleteProfile(profileName);
            if (response.success) {
                showNotification('Profile deleted successfully', 'success');
                await this.loadProfiles();
                
                // Clear selection if deleted profile was selected
                if (this.currentProfile?.name === profileName) {
                    this.currentProfile = null;
                    const container = document.getElementById('profile-details');
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
        } catch (error) {
            console.error('🚨 Error deleting profile:', error);
            showNotification(`Failed to delete profile: ${error.message}`, 'error');
        }
    }

    /**
     * Import profiles from JSON file
     */
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
                            showNotification('Invalid file format - expected array of profiles', 'error');
                            return;
                        }

                        console.log('📥 Importing profiles:', profilesData);
                        
                        const response = await apiClient.importProfiles(profilesData);
                        if (response.success) {
                            showNotification(`Successfully imported ${response.count} profiles`, 'success');
                            await this.loadProfiles();
                        } else {
                            showNotification(`Import failed: ${response.error}`, 'error');
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

    /**
     * Export all profiles to JSON file
     */
    async exportProfiles() {
        try {
            console.log('📤 Exporting profiles...');
            
            if (this.profiles.length === 0) {
                showNotification('No profiles to export', 'warning');
                return;
            }

            const response = await apiClient.exportProfiles();
            if (response.success && response.data) {
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
            } else {
                showNotification(`Export failed: ${response.error}`, 'error');
            }
            
        } catch (error) {
            console.error('🚨 Error exporting profiles:', error);
            showNotification('Export failed', 'error');
        }
    }

    /**
     * Get profile by name (utility method)
     */
    getProfile(profileName) {
        return this.profiles.find(p => p && p.name === profileName);
    }

    /**
     * Refresh profiles from server
     */
    async refreshProfiles() {
        console.log('🔄 Refreshing profiles...');
        showNotification('Refreshing profiles...', 'info');
        await this.loadProfiles();
        showNotification('Profiles refreshed', 'success');
    }

    /**
     * Validate profile data before save/update
     */
    validateProfile(profileData) {
        const errors = [];

        // Required fields
        if (!profileData.name || profileData.name.trim() === '') {
            errors.push('Profile name is required');
        }

        if (!profileData.baseUrl || profileData.baseUrl.trim() === '') {
            errors.push('Base URL is required');
        }

        // URL format validation
        try {
            new URL(profileData.baseUrl);
        } catch {
            errors.push('Base URL must be a valid URL');
        }

        // Headers validation
        if (profileData.headers && typeof profileData.headers !== 'object') {
            errors.push('Headers must be a valid JSON object');
        }

        // Auth validation
        if (profileData.authType === 'Bearer' && !profileData.credentials?.token) {
            errors.push('Bearer token is required for Bearer authentication');
        }

        if (profileData.authType === 'Basic' && 
            (!profileData.credentials?.username || !profileData.credentials?.password)) {
            errors.push('Username and password are required for Basic authentication');
        }

        if (profileData.authType === 'ApiKey' && !profileData.credentials?.apiKey) {
            errors.push('API key is required for API Key authentication');
        }

        if (profileData.authType === 'Custom' && !profileData.customAuthScript) {
            errors.push('Custom authentication script is required');
        }

        return errors;
    }
}

// Initialize global profile manager
console.log('🚀 Initializing Enhanced ProfileManager...');
const profileManager = new ProfileManager();

// Export for global access
if (typeof window !== 'undefined') {
    window.profileManager = profileManager;
}