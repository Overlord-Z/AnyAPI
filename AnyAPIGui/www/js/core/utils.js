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
