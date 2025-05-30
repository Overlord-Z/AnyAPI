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

export function validateProfileFields(fields) {
    // Basic validation for required fields
    const errors = {};
    if (!fields.name || !fields.name.trim()) errors.name = 'Profile name is required.';
    if (!fields.baseUrl || !/^https?:\/\//.test(fields.baseUrl)) errors.baseUrl = 'Valid Base URL required.';
    if (!fields.authType) errors.authType = 'Authentication type required.';
    // Add more as needed
    return errors;
}

export function buildProfileObject(fields) {
    // Normalize and build the profile object for backend
    const profile = {
        ProfileName: fields.name,
        BaseUrl: fields.baseUrl,
        AuthenticationDetails: {},
        DefaultHeaders: fields.defaultHeaders || {},
        PaginationDetails: fields.pagination || {},
        CustomSettings: fields.customSettings || {},
        IsSessionOnly: !!fields.isSessionOnly,
        Description: fields.description || '',
    };
    // Auth details
    switch (fields.authType) {
        case AUTH_TYPES.API_KEY:
            profile.AuthenticationDetails = {
                AuthType: 'ApiKey',
                ApiKeyHeader: fields.apiKeyHeader || 'X-API-Key',
                ApiKeyValue: fields.apiKeyValue,
            };
            break;
        case AUTH_TYPES.BEARER:
            profile.AuthenticationDetails = {
                AuthType: 'BearerToken',
                TokenValue: fields.tokenValue,
            };
            break;
        case AUTH_TYPES.CUSTOM_SCRIPT:
            profile.AuthenticationDetails = {
                AuthType: 'CustomScript',
                ScriptBlock: fields.customScript,
            };
            break;
        case AUTH_TYPES.MERAKI:
            // Use selected Meraki style
            if (fields.merakiStyle === 'bearer') {
                profile.AuthenticationDetails = {
                    AuthType: 'BearerToken',
                    TokenValue: fields.apiKeyValue,
                };
                profile.DefaultHeaders = HEADER_TEMPLATES.MerakiBearer;
            } else {
                profile.AuthenticationDetails = {
                    AuthType: 'ApiKey',
                    ApiKeyHeader: 'X-Cisco-Meraki-API-Key',
                    ApiKeyValue: fields.apiKeyValue,
                };
                profile.DefaultHeaders = HEADER_TEMPLATES.MerakiApiKey;
            }
            break;
        default:
            break;
    }
    return profile;
}
