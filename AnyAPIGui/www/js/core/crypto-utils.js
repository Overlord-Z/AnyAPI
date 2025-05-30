/**
 * AnyAPI GUI - Crypto Utilities
 * Provides secure cryptographic functions for password encryption and other security operations
 */

/**
 * Generate a secure random salt/IV
 * @param {number} length - Length in bytes (default: 16)
 * @returns {string} Base64 encoded salt/IV
 */
export function generateSalt(length = 16) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array));
}

/**
 * Generate a symmetric encryption key from a password
 * @param {string} password - The password to derive key from
 * @param {string} salt - Base64 encoded salt
 * @returns {Promise<CryptoKey>} Promise resolving to the derived key
 */
async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const saltBuffer = Uint8Array.from(atob(salt), c => c.charCodeAt(0));

    // Import password as raw key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    // Derive AES key
    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt data using AES-GCM
 * @param {string} data - Data to encrypt
 * @param {string} passphrase - Passphrase for encryption
 * @returns {Promise<{encrypted: string, salt: string, iv: string}>} Encrypted data with metadata
 */
export async function encryptData(data, passphrase) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate salt and IV
    const salt = generateSalt(16);
    const iv = generateSalt(12); // 12 bytes for GCM
    
    // Derive key
    const key = await deriveKey(passphrase, salt);
    
    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: Uint8Array.from(atob(iv), c => c.charCodeAt(0))
        },
        key,
        dataBuffer
    );
    
    // Convert to base64
    const encryptedArray = new Uint8Array(encrypted);
    const encryptedBase64 = btoa(String.fromCharCode.apply(null, encryptedArray));
    
    return {
        encrypted: encryptedBase64,
        salt,
        iv
    };
}

/**
 * Decrypt data using AES-GCM
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {string} salt - Base64 encoded salt
 * @param {string} iv - Base64 encoded IV
 * @param {string} passphrase - Passphrase for decryption
 * @returns {Promise<string>} Decrypted data
 */
export async function decryptData(encryptedData, salt, iv, passphrase) {
    // Derive key
    const key = await deriveKey(passphrase, salt);
    
    // Convert from base64
    const encryptedBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const ivBuffer = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: ivBuffer
        },
        key,
        encryptedBuffer
    );
    
    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

/**
 * Simple session-based encryption for SecretStore passwords
 * Uses a session-specific key derived from browser fingerprint + timestamp
 * @param {string} password - Password to encrypt
 * @returns {Promise<{encrypted: string, metadata: string}>} Encrypted password with metadata
 */
export async function encryptSessionPassword(password) {
    // Generate a session-specific encryption key from browser characteristics
    const sessionSeed = [
        navigator.userAgent,
        window.screen.width + 'x' + window.screen.height,
        navigator.language,
        Date.now().toString()
    ].join('|');
    
    // Use the first part of the session seed as passphrase
    const sessionKey = await simpleHash(sessionSeed);
    
    // Encrypt with session key
    const result = await encryptData(password, sessionKey.substring(0, 32));
    
    // Return encrypted data and metadata needed for decryption
    return {
        encrypted: result.encrypted,
        metadata: btoa(JSON.stringify({
            salt: result.salt,
            iv: result.iv,
            sessionFingerprint: await simpleHash(sessionSeed.substring(0, sessionSeed.lastIndexOf('|')))
        }))
    };
}

/**
 * Hash a password using PBKDF2 with SHA-256
 * @param {string} password - The password to hash
 * @param {string} salt - Base64 encoded salt (optional, will generate if not provided)
 * @param {number} iterations - Number of iterations (default: 100000)
 * @returns {Promise<{hash: string, salt: string}>} Promise resolving to hash and salt
 */
export async function hashPassword(password, salt = null, iterations = 100000) {
    // Generate salt if not provided
    if (!salt) {
        salt = generateSalt();
    }

    // Convert password and salt to ArrayBuffer
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const saltBuffer = Uint8Array.from(atob(salt), c => c.charCodeAt(0));

    // Import password as raw key
    const key = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    // Derive key using PBKDF2
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: iterations,
            hash: 'SHA-256'
        },
        key,
        256 // 256 bits = 32 bytes
    );

    // Convert to base64
    const hashArray = new Uint8Array(derivedBits);
    const hash = btoa(String.fromCharCode.apply(null, hashArray));

    return { hash, salt };
}

/**
 * Simple hash function for non-security critical uses (like session tokens)
 * @param {string} input - Input to hash
 * @returns {Promise<string>} Promise resolving to hex hash
 */
export async function simpleHash(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if Web Crypto API is available
 * @returns {boolean} True if crypto is available
 */
export function isCryptoAvailable() {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' && 
           typeof crypto.getRandomValues !== 'undefined';
}
