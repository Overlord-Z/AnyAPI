// Utility functions (formatJson, escapeHtml, isValidJson, formatDuration, etc.)
// All utility functions defined globally

function formatJson(data) {
    return JSON.stringify(data, null, 2);
}

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, function (tag) {
        const charsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        };
        return charsToReplace[tag] || tag;
    });
}

function isValidJson(str) {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}

function formatDuration(ms) {
    if (ms < 1000) return ms + ' ms';
    return (ms / 1000).toFixed(2) + ' s';
}

/**
 * Animation Utilities
 */

/**
 * Enable breathing animation on an element
 * @param {HTMLElement} element - The element to animate
 * @param {Object} options - Animation options
 */
function enableBreathingAnimation(element, options = {}) {
    if (!element) return;
    
    const defaults = {
        duration: '3s',
        intensity: 0.02,
        color: 'var(--color-secondary)',
        opacity: { min: 0.5, max: 1 }
    };
    
    const config = { ...defaults, ...options };
    
    // Create breathing animation style
    const animationName = `breathing-${Math.random().toString(36).substr(2, 9)}`;
    const keyframes = `
        @keyframes ${animationName} {
            0%, 100% {
                opacity: ${config.opacity.min};
                transform: scale(1);
            }
            50% {
                opacity: ${config.opacity.max};
                transform: scale(${1 + config.intensity});
            }
        }
    `;
    
    // Inject keyframes
    let styleSheet = document.getElementById('dynamic-animations');
    if (!styleSheet) {
        styleSheet = document.createElement('style');
        styleSheet.id = 'dynamic-animations';
        document.head.appendChild(styleSheet);
    }
    styleSheet.textContent += keyframes;
    
    // Apply animation
    element.style.animation = `${animationName} ${config.duration} ease-in-out infinite`;
    element.style.position = element.style.position || 'relative';
    
    return animationName;
}

/**
 * Disable breathing animation on an element
 * @param {HTMLElement} element - The element to stop animating
 */
function disableBreathingAnimation(element) {
    if (!element) return;
    element.style.animation = '';
}

/**
 * Create a pulsing effect on an element
 * @param {HTMLElement} element - The element to pulse
 * @param {string} color - The pulse color
 * @param {number} duration - Pulse duration in ms
 */
function createPulseEffect(element, color = 'var(--color-secondary)', duration = 600) {
    if (!element) return;
    
    const originalBoxShadow = element.style.boxShadow;
    
    element.style.transition = `box-shadow ${duration}ms ease-out`;
    element.style.boxShadow = `0 0 0 0 ${color}40`;
    
    requestAnimationFrame(() => {
        element.style.boxShadow = `0 0 0 10px ${color}00`;
    });
    
    setTimeout(() => {
        element.style.boxShadow = originalBoxShadow;
        element.style.transition = '';
    }, duration);
}

/**
 * Animate element appearance with slide and fade
 * @param {HTMLElement} element - The element to animate
 * @param {Object} options - Animation options
 */
function animateAppearance(element, options = {}) {
    if (!element) return;
    
    const defaults = {
        direction: 'up', // 'up', 'down', 'left', 'right'
        distance: '20px',
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    };
    
    const config = { ...defaults, ...options };
    
    // Set initial state
    const transforms = {
        up: `translateY(${config.distance})`,
        down: `translateY(-${config.distance})`,
        left: `translateX(${config.distance})`,
        right: `translateX(-${config.distance})`
    };
    
    element.style.opacity = '0';
    element.style.transform = transforms[config.direction] || transforms.up;
    element.style.transition = `opacity ${config.duration}ms ${config.easing}, transform ${config.duration}ms ${config.easing}`;
    
    // Trigger animation
    requestAnimationFrame(() => {
        element.style.opacity = '1';
        element.style.transform = 'translate(0, 0)';
    });
    
    // Clean up after animation
    setTimeout(() => {
        element.style.transition = '';
    }, config.duration);
}

/**
 * Create a shimmer loading effect
 * @param {HTMLElement} element - The element to add shimmer to
 */
function addShimmerEffect(element) {
    if (!element) return;
    
    element.classList.add('shimmer-loading');
    
    // Add shimmer CSS if not already present
    if (!document.getElementById('shimmer-styles')) {
        const shimmerStyles = document.createElement('style');
        shimmer.id = 'shimmer-styles';
        shimmerStyles.textContent = `
            .shimmer-loading {
                background: linear-gradient(90deg, 
                    var(--bg-secondary) 25%, 
                    var(--bg-tertiary) 50%, 
                    var(--bg-secondary) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
            }
            
            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
        `;
        document.head.appendChild(shimmerStyles);
    }
}

/**
 * Remove shimmer loading effect
 * @param {HTMLElement} element - The element to remove shimmer from
 */
function removeShimmerEffect(element) {
    if (!element) return;
    element.classList.remove('shimmer-loading');
}

/**
 * Check if API client is ready
 * @returns {boolean} True if API client is ready
 */
function isApiClientReady() {
    return window.apiClient && 
           typeof window.apiClient.testEndpoint === 'function' &&
           typeof window.apiClient.checkConnection === 'function' &&
           window.apiClient.isConnected === true;
}

/**
 * Wait for API client to be ready
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} True if ready, false if timeout
 */
async function waitForApiClient(timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        if (isApiClientReady()) {
            console.log('✅ API client is ready for requests');
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.warn('⚠️ API client readiness timeout');
    return false;
}

/**
 * Make API request - Consolidated function for all API calls
 * @param {Object} requestData - Request configuration
 * @returns {Promise} Response from API
 */
async function makeRequest(requestData) {
    console.log('🚀 Making API request with data:', requestData);
    
    // Check if API client is available
    if (!window.apiClient) {
        throw new Error('API Client not initialized. Please refresh the page and try again.');
    }
    
    if (typeof window.apiClient.testEndpoint !== 'function') {
        throw new Error('API Client testEndpoint function not available. Please refresh the page and try again.');
    }
    
    // Check if connected (but don't fail if not - let the backend handle it)
    if (!window.apiClient.isConnected) {
        console.warn('⚠️ API client not connected, attempting request anyway...');
    }
    
    // Use the API client's testEndpoint method
    return await window.apiClient.testEndpoint(requestData);
}

/**
 * Simple global notification function - bypasses module issues
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, info, warning)
 * @param {number} duration - Duration in milliseconds
 */
function showNotification(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notifications') || createNotificationsContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<span class="notification-message">${escapeHtml(message)}</span>`;
    
    // Set initial hidden state
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(10px)';
    
    container.appendChild(notification);
    
    // Force reflow and show
    notification.offsetHeight;
    notification.style.transition = 'all 0.2s ease-out';
    notification.style.opacity = '0.95';
    notification.style.transform = 'translateY(0)';
    
    // Remove after duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 200);
        }
    }, duration);
}

function createNotificationsContainer() {
    const container = document.createElement('div');
    container.id = 'notifications';
    container.className = 'notifications';
    document.body.appendChild(container);
    return container;
}

// Make showNotification globally available
window.showNotification = showNotification;
