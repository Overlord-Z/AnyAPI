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
    requiredSecrets: ["apiKey"],
    authFieldMapping: {
        apiKey: {
            field: "apiKey",
            label: "GitHub Personal Access Token (without 'token ' prefix)", 
            type: "password" 
        },
        headerName: { 
            field: "headerName",
            label: "Header Name", 
            type: "text", 
            defaultValue: "Authorization"  // ✅ GitHub uses Authorization header
        },
        tokenPrefix: { 
            field: "tokenPrefix",
            label: "Token Prefix", 
            type: "text", 
            defaultValue: "token "  // ✅ GitHub needs "token " prefix
        }
    },
    // ✅ ADD THESE TEMPLATE DEFAULTS TO BE APPLIED DIRECTLY
    templateDefaults: {
        headerName: "Authorization",
        tokenPrefix: "token "
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
                token: { 
                    field: "token",  // Backend expects credentials.token for Bearer
                    label: "Access Token", 
                    type: "password" 
                }
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
                token: { 
                    field: "token", 
                    label: "Bot User OAuth Token", 
                    type: "password" 
                }
            }
        },
        connectwise: {
    name: "ConnectWise Manage",
    baseUrl: "https://your-domain.com/v4_6_release/apis/3.0",
    authType: "CustomScript",
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
        PublicKey: { 
            field: "PublicKey", 
            label: "Public Key", 
            type: "text" 
        },
        PrivateKey: { 
            field: "PrivateKey", 
            label: "Private Key", 
            type: "password" 
        },
        ClientId: { 
            field: "ClientId", 
            label: "Client ID", 
            type: "text" 
        }
    },
    customAuthScript: `param($RequestContext, $Profile)

# ConnectWise authentication
$company = $Profile.CustomSettings.Company
$publicKey = $Profile.AuthenticationDetails.PublicKey
$privateKey = $RequestContext.GetPlainTextSecret.Invoke('PrivateKey')
$clientId = $Profile.AuthenticationDetails.ClientId

if (-not $company -or -not $publicKey -or -not $privateKey -or -not $clientId) {
    throw "Missing required ConnectWise credentials. Company: $company, PublicKey: $publicKey, PrivateKey: $(if($privateKey){'[SET]'}else{'[MISSING]'}), ClientId: $clientId"
}

$authString = "$company+$publicKey\`:$privateKey"
$encodedAuth = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($authString))

$RequestContext.Headers["Authorization"] = "Basic $encodedAuth"
$RequestContext.Headers["clientId"] = $clientId
$RequestContext.Headers["Accept"] = "application/json"`
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
                token: { 
                    field: "token", 
                    label: "API Token", 
                    type: "password" 
                }
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
                token: { 
                    field: "token", 
                    label: "Secret Key", 
                    type: "password" 
                }
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
                username: { 
                    field: "username", 
                    label: "Username", 
                    type: "text" 
                },
                password: { 
                    field: "password", 
                    label: "Password", 
                    type: "password" 
                }
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
                apiKey: { 
                    field: "apiKey", 
                    label: "API Key", 
                    type: "password" 
                },
                headerName: { 
                    field: "headerName", 
                    label: "Header Name", 
                    type: "text", 
                    defaultValue: "X-API-Key" 
                }
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
            this.initializeSharedProfileManagement();
            
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

// Enhanced profile rendering with dynamic text scaling and auth chips
renderProfileList() {
    console.log('🎨 Rendering enhanced profile list...');
    
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

        console.log('🔍 Processing profiles for enhanced display:', this.profiles.length);

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

        // Generate enhanced HTML
        const htmlParts = [];
        
        filteredProfiles.forEach((profile, index) => {
            try {
                const safeName = this.safeEscape(profile.name || `Profile ${index + 1}`);
                const safeUrl = this.safeEscape(profile.baseUrl || 'No URL configured');
                const safeDescription = this.safeEscape(profile.description || '');
                const authType = profile.authType || 'None';
                const jsName = this.safeJsEscape(profile.name || '');
                
                const isActive = this.currentProfile?.name === profile.name;
                
                // Determine text scaling based on length
                const nameLength = safeName.length;
                const urlLength = safeUrl.length;
                
                let nameScaling = '';
                let urlScaling = '';
                
                if (nameLength > 25) nameScaling = 'data-very-long="true"';
                else if (nameLength > 15) nameScaling = 'data-long="true"';
                
                if (urlLength > 50) urlScaling = 'data-very-long="true"';
                else if (urlLength > 30) urlScaling = 'data-long="true"';
                
                // Generate auth chip with appropriate styling
                const authChipClass = this.getAuthChipClass(authType);
                const authChipText = this.getAuthChipText(authType);
                
                const itemHtml = `
                    <div class="profile-item ${isActive ? 'active' : ''}" 
                         onclick="profileManager.selectProfile('${jsName}')">
                        
                        <div class="profile-item-header">
                            <div class="profile-item-name-container">
                                <h4 class="profile-item-name" ${nameScaling}>${safeName}</h4>
                            </div>
                            <div class="profile-auth-chip ${authChipClass}">
                                ${authChipText}
                            </div>
                        </div>
                        
                        <div class="profile-item-url" ${urlScaling}>${safeUrl}</div>
                        
                        ${safeDescription ? `
                            <div class="profile-item-description">${safeDescription}</div>
                        ` : ''}
                        
                        <div class="profile-item-actions" onclick="event.stopPropagation();">
                            <button class="btn btn-outline btn-sm" onclick="profileManager.editProfile('${jsName}')" title="Edit Profile">
                                ✏️ Edit
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="profileManager.testProfile('${jsName}')" title="Test Connection">
                                🧪 Test
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="profileManager.deleteProfile('${jsName}')" title="Delete Profile">
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
                        <div class="profile-item-name">Error loading profile</div>
                        <div class="profile-item-url">Check console for details</div>
                    </div>
                `);
            }
        });

        // Set the HTML
        container.innerHTML = htmlParts.join('');
        
        // Apply dynamic text scaling after DOM insertion
        setTimeout(() => this.applyDynamicTextScaling(), 50);
        
        console.log('✅ Enhanced profile list rendered successfully');
        
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
 * Get CSS class for auth chip based on auth type
 */
getAuthChipClass(authType) {
    const type = (authType || 'none').toLowerCase();
    switch (type) {
        case 'bearer':
        case 'bearertoken':
            return 'auth-bearer';
        case 'basic':
            return 'auth-basic';
        case 'apikey':
        case 'api_key':
            return 'auth-apikey';
        case 'custom':
            return 'auth-custom';
        case 'customscript':
        case 'custom_script':
            return 'auth-customscript';
        case 'none':
        default:
            return 'auth-none';
    }
}

/**
 * Get display text for auth chip
 */
getAuthChipText(authType) {
    const type = (authType || 'none').toLowerCase();
    switch (type) {
        case 'bearer':
        case 'bearertoken':
            return 'Bearer';
        case 'basic':
            return 'Basic';
        case 'apikey':
        case 'api_key':
            return 'API Key';
        case 'custom':
            return 'Custom';
        case 'customscript':
        case 'custom_script':
            return 'Script';
        case 'none':
        default:
            return 'None';
    }
}

/**
 * Apply dynamic text scaling based on actual rendered text width
 */
applyDynamicTextScaling() {
    try {
        const profileItems = document.querySelectorAll('.profile-item');
        
        profileItems.forEach(item => {
            const nameElement = item.querySelector('.profile-item-name');
            const urlElement = item.querySelector('.profile-item-url');
            
            if (nameElement) {
                const nameContainer = nameElement.parentElement;
                if (nameElement.scrollWidth > nameContainer.clientWidth * 0.9) {
                    if (nameElement.scrollWidth > nameContainer.clientWidth * 1.3) {
                        nameElement.setAttribute('data-very-long', 'true');
                    } else {
                        nameElement.setAttribute('data-long', 'true');
                    }
                }
            }
            
            if (urlElement) {
                const urlContainer = urlElement.parentElement;
                if (urlElement.scrollWidth > urlContainer.clientWidth * 0.9) {
                    if (urlElement.scrollWidth > urlContainer.clientWidth * 1.3) {
                        urlElement.setAttribute('data-very-long', 'true');
                    } else {
                        urlElement.setAttribute('data-long', 'true');
                    }
                }
            }
        });
        
        console.log('✅ Dynamic text scaling applied');
        
    } catch (error) {
        console.error('🚨 Error applying dynamic text scaling:', error);
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
            
            // Trigger shared profile management
            this.handleSharedProfileChange(profileName, 'profiles');
            
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
            
        case 'CustomScript':
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

                // --- PATCH: Attach Add Credential button handler for edit modal ---
                const addCredBtn = document.getElementById('add-credential-btn');
                if (addCredBtn && !addCredBtn._handlerAttached) {
                    addCredBtn.onclick = () => this.addCredentialRow();
                    addCredBtn._handlerAttached = true;
                    console.log('✅ Add credential button handler attached (edit modal)');
                }
                // --- END PATCH ---

                // --- PATCH: Attach Add Custom Setting button handler for edit modal ---
                const addSettingBtn = document.getElementById('add-customsetting-btn');
                if (addSettingBtn && !addSettingBtn._handlerAttached) {
                    addSettingBtn.onclick = () => this.addCustomSettingRow();
                    addSettingBtn._handlerAttached = true;
                    console.log('✅ Add custom setting button handler attached (edit modal)');
                }
                // --- END PATCH ---
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
        <option value="CustomScript">Custom Script</option>
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
    console.log('🔧 Profile custom settings:', JSON.stringify(profile.customSettings, null, 2));
    
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

            // 3. PAGINATION DETAILS FIELD
            if (paginationDetailsField) {
                console.log('🎯 SETTING PAGINATION DETAILS FIELD');
                
                if (profile.paginationDetails && typeof profile.paginationDetails === 'object' && Object.keys(profile.paginationDetails).length > 0) {
                    const paginationJson = JSON.stringify(profile.paginationDetails, null, 2);
                    paginationDetailsField.value = paginationJson;
                    console.log('✅ PAGINATION DETAILS FIELD SET SUCCESSFULLY');
                } else {
                    paginationDetailsField.value = '';
                }
            }

            // 4. AUTH TYPE HANDLING
            let selectedPaginationType = 'Auto';
            if (paginationField && profile.paginationType) {
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
                paginationField.value = selectedPaginationType;
            }

            // 5. PAGINATION DETAILS HANDLING
            const showPaginationCheckbox = document.getElementById('show-pagination-details');
            const paginationDetailsGroup = document.getElementById('pagination-details-group');
            
            if (showPaginationCheckbox && paginationDetailsGroup) {
                const hasPaginationDetails = profile.paginationDetails && 
                    typeof profile.paginationDetails === 'object' && 
                    Object.keys(profile.paginationDetails).length > 0;
                
                if (hasPaginationDetails) {
                    showPaginationCheckbox.checked = true;
                    paginationDetailsGroup.style.display = 'block';
                } else {
                    const shouldAutoShow = ['Custom', 'PageNumber'].includes(selectedPaginationType);
                    showPaginationCheckbox.checked = shouldAutoShow;
                    paginationDetailsGroup.style.display = shouldAutoShow ? 'block' : 'none';
                }
                
                this.updatePaginationVisibility();
            }

            // 6. SESSION ONLY CHECKBOX
            if (sessionOnlyField) {
                sessionOnlyField.checked = Boolean(profile.isSessionOnly);
                console.log('✅ Session only checkbox set to:', sessionOnlyField.checked);
            }

            // 7. AUTH TYPE AND FIELDS
            if (authTypeField) {
                let authTypeValue = profile.authType || 'None';
                
                // Normalize for selector
                switch ((authTypeValue || '').toLowerCase()) {
                    case 'bearer':
                    case 'bearertoken':
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
                        authTypeValue = 'CustomScript';
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
                    
                    // Handle custom auth script AFTER auth fields are set up
                    if (authTypeValue === 'CustomScript' && profile.customAuthScript) {
                        setTimeout(() => {
                            const scriptField = document.getElementById('auth-script');
                            if (scriptField) {
                                scriptField.value = profile.customAuthScript;
                                console.log('✅ Custom auth script populated (length:', profile.customAuthScript.length, ')');
                            } else {
                                console.error('❌ Script field not found!');
                            }
                        }, 100);
                    }
                }, 200);

                // 8. CUSTOM SETTINGS SECTION - ✅ FIXED VERSION
                const customSettingsContainer = document.getElementById('profile-customsettings-list');
                if (customSettingsContainer) {
                    console.log('🔧 Populating custom settings container');
                    customSettingsContainer.innerHTML = '';
                    
                    // Add rows for existing custom settings
                    if (profile.customSettings && typeof profile.customSettings === 'object' && Object.keys(profile.customSettings).length > 0) {
                        console.log('📝 Adding custom settings rows:', Object.keys(profile.customSettings));
                        Object.entries(profile.customSettings).forEach(([key, value]) => {
                            this.addCustomSettingRow(customSettingsContainer, key, value);
                        });
                        console.log('✅ Custom settings populated:', Object.keys(profile.customSettings));
                    } else {
                        console.log('⚠️ No custom settings found in profile');
                    }
                    
                    // Always add one empty row at the end
                    this.addCustomSettingRow(customSettingsContainer, '', '');
                    console.log('✅ Empty custom setting row added');
                }

                // 9. CREDENTIALS SECTION - ✅ ENHANCED WITH COMPREHENSIVE MASKING SUPPORT
    const credentialsContainer = document.getElementById('profile-credentials-list');
    if (credentialsContainer) {
        console.log('🔧 Populating credentials container');
        credentialsContainer.innerHTML = '';
        
        // Get template info for proper field mapping
        let template = null;
        let authFieldMapping = {};
        let templateDefaults = {};
        if (profile.authType) {
            template = Object.values(this.templates).find(t =>
                t.name === profile.name ||
                (t.authType && t.authType.toLowerCase() === profile.authType.toLowerCase())
            );
            if (template) {
                authFieldMapping = template.authFieldMapping || {};
                templateDefaults = template.templateDefaults || {};
            }
        }
        
        // Collect all keys that should be shown
        let keysToShow = new Set([
            ...Object.keys(authFieldMapping),
            ...Object.keys(templateDefaults),
            ...Object.keys(profile.credentials || {})
        ]);
        
        // For custom auth, also add any keys from AuthenticationDetails
        if ((profile.authType === 'Custom' || profile.authType === 'CustomScript') && profile.AuthenticationDetails) {
            Object.keys(profile.AuthenticationDetails)
                .filter(k => !['AuthType', 'AuthScriptBlock'].includes(k))
                .forEach(k => keysToShow.add(k));
        }
        
        // If no mapping, fallback to all keys in credentials
        if (keysToShow.size === 0 && profile.credentials) {
            Object.keys(profile.credentials).forEach(k => keysToShow.add(k));
        }
        
        keysToShow.forEach(key => {
            if (!key) return;
            
            const mapping = authFieldMapping[key] || {};
            const label = mapping.label || key;
            const inputType = mapping.type || (
                /password|token|key/i.test(key) ? 'password' : 'text'
            );
            
            // ✅ ENHANCED VALUE HANDLING WITH COMPREHENSIVE MASKING FOR EDIT
            let value = '';
            let placeholder = '';
            
            if (profile.credentials && profile.credentials[key] !== undefined) {
                const credValue = profile.credentials[key];
                
                if (this.isSensitiveCredentialKey(key)) {
                    // For sensitive keys, check for any masking pattern
                    const isMaskedValue = credValue === '••••••••' ||
                        credValue === '********' ||
                        credValue === '***MASKED***' ||
                        credValue === '***HIDDEN***' ||  // ← ADD THIS CHECK
                        (credValue && credValue.match(/^[•*]{6,}$/));
                    
                    if (isMaskedValue || (credValue && credValue !== '')) {
                        value = '••••••••'; // Show consistent masked value
                        placeholder = 'Current value loaded (masked)';
                        console.log(`🔒 Masked sensitive credential '${key}' (original: ${credValue})`);
                    } else {
                        value = '';
                        placeholder = 'Enter new value';
                    }
                } else {
                    // For non-sensitive keys, show actual value unless it's a masking pattern
                    const isMaskedValue = credValue === '••••••••' ||
                        credValue === '********' ||
                        credValue === '***MASKED***' ||
                        credValue === '***HIDDEN***';  // ← ADD THIS CHECK
                    
                    if (isMaskedValue) {
                        value = '••••••••';
                        placeholder = 'Current value loaded (masked)';
                        console.log(`🔒 Masked non-sensitive credential '${key}' (original: ${credValue})`);
                    } else {
                        value = credValue || templateDefaults[key] || '';
                        placeholder = label;
                    }
                }
            } else {
                // No existing value, use template defaults
                value = templateDefaults[key] || '';
                placeholder = label;
            }
            
            this.addCredentialRow(credentialsContainer, key, value, label, inputType);
            
            // Set the placeholder after adding the row
            setTimeout(() => {
                const rows = credentialsContainer.querySelectorAll('.credential-row');
                const lastRow = rows[rows.length - 2]; // Get the row we just added (not the empty one)
                if (lastRow) {
                    const valueInput = lastRow.querySelector('.credential-value');
                    if (valueInput && placeholder) {
                        valueInput.placeholder = placeholder;
                    }
                }
            }, 10);
        });
        
        // Always add one empty row for new credentials
        this.addCredentialRow(credentialsContainer, '', '');
        console.log('✅ Credentials populated with comprehensive masking support');
    }
            }
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
                <div class
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
        <option value="CustomScript">Custom Script</option>
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
 * Helper to determine if a credential key is sensitive (should be stored in vault)
 */
isSensitiveCredentialKey(key) {
    if (!key) return false;
    // Lowercase for comparison
    const k = key.toLowerCase();
    // Add more as needed for your environment
    return (
        k.includes('privatekey') ||
        k.includes('secret') ||
        k.includes('password') ||
        k.includes('token') ||
        k.includes('apikey') ||
        k === 'privatekey' ||
        k === 'password' ||
        k === 'token' ||
        k === 'apikey'
    );
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
    const showPaginationDetails = document.getElementById('show-pagination-details')?.checked;
    if (showPaginationDetails) {
        try {
            const paginationDetailsText = document.getElementById('profile-pagination-details')?.value?.trim();
            if (paginationDetailsText) {
                profileData.paginationDetails = JSON.parse(paginationDetailsText);
            }
        } catch (error) {
            console.warn('⚠️ Invalid JSON in pagination details, skipping');
        }
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

    // ✅ FIXED CREDENTIALS COLLECTION - SEND PRESERVE MARKERS INSTEAD OF EXCLUDING
    const credentials = {};
    const credRows = document.querySelectorAll('#profile-credentials-list .credential-row');
    
    console.log('🔍 Found', credRows.length, 'credential rows');
    
    credRows.forEach((row, index) => {
        const keyInput = row.querySelector('.credential-key');
        const valueInput = row.querySelector('.credential-value');
        
        const key = keyInput?.value?.trim();
        const value = valueInput?.value?.trim();
        
        console.log(`🔍 Row ${index}:`, {
            key: key,
            value: value ? `[${value.length} chars]` : 'empty',
            keyElement: !!keyInput,
            valueElement: !!valueInput
        });
        
        if (!key) {
            console.log(`⚠️ Row ${index}: Skipping row without key`);
            return; // Skip rows without keys
        }
        
        // ✅ COMPREHENSIVE MASKING DETECTION
        const isMasked = 
            value === '********' ||
            value === '••••••••' ||
            value === '***MASKED***' ||
            value === '***HIDDEN***' ||
            (value && value.match(/^[•*]{6,}$/)) ||
            valueInput?.placeholder?.includes('masked') ||
            valueInput?.placeholder?.includes('Current value loaded');

        console.log(`🔍 Row ${index} - Key: '${key}', Masked: ${isMasked}, Value: '${value}'`);

        // ✅ NEW LOGIC: ALWAYS INCLUDE THE FIELD - USE PRESERVE MARKER FOR MASKED
        if (this.isEditing && isMasked) {
            // Send preserve marker instead of excluding
            credentials[key] = '***PRESERVE_EXISTING***';
            console.log(`🔒 Row ${index}: Sending PRESERVE marker for masked credential '${key}'`);
        } else if (value) {
            // Send actual value for new/changed credentials
            credentials[key] = value;
            console.log(`🔑 Row ${index}: Including credential '${key}' with actual value`);
        } else if (!this.isEditing && this.isSensitiveCredentialKey(key)) {
            // For new profiles, warn about missing sensitive credentials but still include empty
            credentials[key] = '';
            console.log(`⚠️ Row ${index}: New profile - including empty sensitive credential '${key}'`);
        } else {
            // Include empty non-sensitive fields
            credentials[key] = '';
            console.log(`📝 Row ${index}: Including empty credential '${key}'`);
        }
    });
    
    // Always set credentials (may contain preserve markers)
    profileData.credentials = credentials;
    console.log('🔑 Final credentials to send:', credentials);

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

    /**
     * Shared profile management - handle profile selection across tabs
     */
    handleSharedProfileChange(profileName, sourceTab) {
        try {
            console.log(`🔄 Shared profile change: ${profileName} from ${sourceTab}`);
            
            // Update current profile selection
            this.currentSharedProfile = profileName;
            
            // Update EndpointTester if available
            if (typeof endpointTester !== 'undefined') {
                endpointTester.currentProfile = profileName;
                if (endpointTester.updateProfileContext) {
                    endpointTester.updateProfileContext();
                }
            }
            
            // Sync profile selection across tabs
            this.syncProfileAcrossTabs(profileName, sourceTab);
            
            // Update history filter if we're on the history tab
            if (sourceTab !== 'history') {
                this.updateHistoryProfileFilter();
            }
            
            console.log('✅ Shared profile change completed');
            
        } catch (error) {
            console.error('🚨 Error handling shared profile change:', error);
        }
    }

    /**
     * Synchronize profile selection across all tabs
     */
    syncProfileAcrossTabs(profileName, sourceTab) {
        try {
            // Update test profile dropdown (API Tester tab)
            if (sourceTab !== 'tester') {
                const testSelect = document.getElementById('test-profile');
                if (testSelect && testSelect.value !== profileName) {
                    testSelect.value = profileName;
                    // Add visual sync indicator
                    testSelect.classList.add('profile-selector-synced');
                    setTimeout(() => testSelect.classList.remove('profile-selector-synced'), 2000);
                }
            }
            
            // Update profiles tab selection
            if (sourceTab !== 'profiles' && profileName) {
                this.selectProfile(profileName);
            }
            
            // Store the shared selection for persistence
            if (profileName) {
                localStorage.setItem('anyapi_shared_profile', profileName);
            } else {
                localStorage.removeItem('anyapi_shared_profile');
            }
            
        } catch (error) {
            console.error('🚨 Error syncing profile across tabs:', error);
        }
    }

    /**
     * Sync profile selection manually (sync button)
     */
    syncProfileSelection(targetTab) {
        try {
            const syncBtn = document.querySelector(`#${targetTab}-section .btn-sync`);
            if (syncBtn) {
                syncBtn.classList.add('syncing');
                setTimeout(() => syncBtn.classList.remove('syncing'), 1000);
            }
            
            // Get current profile from Profiles tab
            const currentProfile = this.currentProfile?.name;
            
            if (currentProfile) {
                // Sync to target tab
                if (targetTab === 'tester') {
                    const testSelect = document.getElementById('test-profile');
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

    /**
     * Update history profile filter dropdown
     */
    updateHistoryProfileFilter() {
        try {
            const filterSelect = document.getElementById('history-profile-filter');
            if (!filterSelect) return;
            
            const currentValue = filterSelect.value;
            filterSelect.innerHTML = '<option value="">All Profiles</option>';
            
            // Add all available profiles
            this.profiles.forEach(profile => {
                if (profile && profile.name) {
                    const option = document.createElement('option');
                    option.value = profile.name;
                    option.textContent = profile.name;
                    filterSelect.appendChild(option);
                }
            });
            
            // Restore selection if it still exists
            if (currentValue && this.profiles.find(p => p && p.name === currentValue)) {
                filterSelect.value = currentValue;
            }
            
            console.log('✅ History profile filter updated');
            
        } catch (error) {
            console.error('🚨 Error updating history profile filter:', error);
        }
    }

    /**
     * Initialize shared profile management
     */
    initializeSharedProfileManagement() {
        try {
            // Restore shared profile selection from localStorage
            const savedProfile = localStorage.getItem('anyapi_shared_profile');
            if (savedProfile && this.profiles.find(p => p && p.name === savedProfile)) {
                this.currentSharedProfile = savedProfile;
                
                // Update test profile dropdown
                const testSelect = document.getElementById('test-profile');
                if (testSelect) {
                    testSelect.value = savedProfile;
                }
                
                // Update EndpointTester
                if (typeof endpointTester !== 'undefined') {
                    endpointTester.currentProfile = savedProfile;
                    if (endpointTester.updateProfileContext) {
                        endpointTester.updateProfileContext();
                    }
                }
            }
            
            // Initialize history profile filter
            this.updateHistoryProfileFilter();
            
            console.log('✅ Shared profile management initialized');
            
        } catch (error) {
            console.error('🚨 Error initializing shared profile management:', error);
        }
    }
}

// Initialize global profile manager
console.log('🚀 Initializing Enhanced ProfileManager...');
const profileManager = new ProfileManager();

// Export for global access
if (typeof window !== 'undefined') {
    window.profileManager = profileManager;
}