// profile-wizard-utils.js
// Shared utilities for the Profile Create Wizard (ES6, DRY)
// Place in www/js/core/profile-wizard-utils.js

export const AUTH_TYPES = {
    NONE: 'None',
    BEARER: 'BearerToken',
    BASIC: 'Basic',
    API_KEY: 'ApiKey',
    CUSTOM_SCRIPT: 'CustomScript',
    MERAKI: 'Meraki', // for UI toggle, maps to API_KEY or BEARER
};

export const HEADER_TEMPLATES = {
    MerakiApiKey: {
        'X-Cisco-Meraki-API-Key': '<API_KEY>',
        'Content-Type': 'application/json',
    },
    MerakiBearer: {
        'Authorization': 'Bearer <API_KEY>',
        'Content-Type': 'application/json',
    },
};

export function getMerakiHeaderOptions(apiKey) {
    return {
        apiKey: {
            'X-Cisco-Meraki-API-Key': apiKey,
            'Content-Type': 'application/json',
        },
        bearer: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
    };
}

export function maskSecret(value) {
    if (!value) return '';
    return '•'.repeat(Math.max(8, value.length));
}

export function validateProfileFields(fields, step = 1) {
    // Basic validation for required fields
    const errors = {};
    
    if (step === 1) {
        if (!fields.name || !fields.name.trim()) errors.name = 'Profile name is required.';
        if (!fields.baseUrl || !/^https?:\/\//.test(fields.baseUrl)) errors.baseUrl = 'Valid Base URL required.';
        if (!fields.authType) errors.authType = 'Authentication type required.';
    }
    
    if (step === 2 && fields.authType !== 'None') {
        // Auth-specific validation only if not "None"
        switch (fields.authType) {
            case 'ApiKey':
                if (!fields.apiKeyValue) errors.apiKeyValue = 'API Key is required.';
                if (!fields.apiKeyHeader) errors.apiKeyHeader = 'Header name is required.';
                break;
            case 'BearerToken':
                if (!fields.tokenValue) errors.tokenValue = 'Bearer token is required.';
                break;
            case 'CustomScript':
                if (!fields.customScript) errors.customScript = 'Custom script is required.';
                break;
            case 'Meraki':
                if (!fields.apiKeyValue) errors.apiKeyValue = 'API Key is required.';
                break;
        }
    }
    
    return errors;
}

export function buildProfileObject(fields) {
    // Build the profile object for backend - matching Handle-CreateProfile expectations
    const profile = {
        name: fields.name,
        baseUrl: fields.baseUrl,
        authType: fields.authType || "None",
        credentials: {},
        headers: fields.defaultHeaders || {},
        paginationDetails: fields.pagination || {},
        customSettings: fields.customSettings || {},
        isSessionOnly: !!fields.isSessionOnly,
        description: fields.description || '',
    };
    
    // Map auth details to credentials object
    switch (fields.authType) {
        case AUTH_TYPES.API_KEY:
            profile.credentials.apiKey = fields.apiKeyValue;
            profile.credentials.headerName = fields.apiKeyHeader || 'X-API-Key';
            break;
        case AUTH_TYPES.BEARER:
            profile.credentials.token = fields.tokenValue;
            break;
        case AUTH_TYPES.BASIC:
            profile.credentials.username = fields.username;
            profile.credentials.password = fields.password;
            break;
        case AUTH_TYPES.CUSTOM_SCRIPT:
            profile.customAuthScript = fields.customScript;
            // Add any template secrets that might be needed for custom script
            if (fields.templateSecrets) {
                profile.templateSecrets = fields.templateSecrets;
            }
            break;
        case AUTH_TYPES.MERAKI:
            // Use selected Meraki style
            if (fields.merakiStyle === 'bearer') {
                profile.authType = 'BearerToken';
                profile.credentials.token = fields.apiKeyValue;
                profile.headers = { ...profile.headers, ...HEADER_TEMPLATES.MerakiBearer };
            } else {
                profile.authType = 'ApiKey';
                profile.credentials.apiKey = fields.apiKeyValue;
                profile.credentials.headerName = 'X-Cisco-Meraki-API-Key';
                profile.headers = { ...profile.headers, ...HEADER_TEMPLATES.MerakiApiKey };
            }
            break;
        default:
            break;
    }

    // Add UI customization if provided (from template)
    if (fields.ui) {
        profile.ui = fields.ui;
    }

    // Add template reference if provided
    if (fields.templateId) {
        profile.templateId = fields.templateId;
        profile.templateVersion = fields.templateVersion;
    }

    return profile;
}
