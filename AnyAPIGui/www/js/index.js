// Note: showNotification, initEndpointUI, and initResponseUI should be loaded via script tags
// They will be available globally when their respective scripts load

console.log('🚀 Index.js loaded, setting up dynamic initialization...');

// Import the response UI module
import { initResponseUI, displayResponseData, clearResponseData } from './ui/response-ui.js';

// Make response functions globally available
window.displayResponseData = displayResponseData;
window.clearResponseData = clearResponseData;
window.initResponseUI = initResponseUI;

/**
 * Wait for dependencies to be available
 */
async function waitForDependencies() {
    console.log('🔍 Checking for dependencies...');
    
    // Give scripts time to load and create global instances
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check what's available without waiting
    const available = [];
    if (window.apiClient) available.push('apiClient');
    if (window.templateManager) available.push('templateManager');
    if (window.secretManager) available.push('secretManager');
    if (window.profileManager) available.push('profileManager');
    if (window.endpointTester) available.push('endpointTester');
    
    console.log('✅ Available dependencies:', available.join(', ') || 'none');
}

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        console.log('🔧 Starting AnyAPI initialization...');
        
        // Wait for dependencies
        await waitForDependencies();
          // Check for EndpointTester initialization function
        if (typeof window.initializeEndpointTester === 'function') {
            console.log('🔌 Initializing EndpointTester...');
            try {
                const endpointTester = window.initializeEndpointTester();
                if (endpointTester) {
                    console.log('✅ EndpointTester initialized successfully');
                } else {
                    console.warn('⚠️ EndpointTester initialization returned null');
                }
            } catch (error) {
                console.error('❌ EndpointTester initialization failed:', error);
            }
        } else {
            console.warn('⚠️ EndpointTester initialization function not available');
        }
        
        if (typeof initResponseUI === 'function') {
            initResponseUI();
            console.log('✅ Response UI initialized');
        } else {
            console.log('⚠️ initResponseUI not available');
        }
        
        console.log('✅ UI modules initialization complete');
          // Hide loading screen and show the app
        showApplication();
        
        if (typeof showNotification === 'function') {
            showNotification('AnyAPI initialized successfully', 'success', 3000);
        } else {
            console.log('✅ AnyAPI initialized successfully');
        }
        console.log('🎉 AnyAPI initialization complete!');
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showInitializationError(error);
    }
}

/**
 * Show the application and hide loading screen
 */
function showApplication() {
    const loadingScreen = document.getElementById('loading-screen');
    const appContainer = document.getElementById('app');
    
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
        console.log('✅ Loading screen hidden');
    }
    
    if (appContainer) {
        appContainer.style.display = 'block';
        console.log('✅ App container shown');
    }
}

/**
 * Show initialization error
 */
function showInitializationError(error) {
    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
    
    // Show error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
        background: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px; 
        border: 1px solid #f5c6cb; max-width: 500px; z-index: 9999;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    errorDiv.innerHTML = `
        <h3 style="margin-top: 0;">Initialization Error</h3>
        <p>Failed to initialize AnyAPI: ${error.message}</p>
        <p><small>Check the browser console for more details.</small></p>
        <button onclick="location.reload()" style="background: #721c24; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px;">
            Reload Page
        </button>
    `;
    
    document.body.appendChild(errorDiv);
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOM Content Loaded, starting initialization...');
    
    // Initialize dark mode from localStorage
    const savedDarkMode = localStorage.getItem('anyapi_dark_mode') === 'true';
    if (savedDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    initializeApp();
});

// Main application initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing AnyAPI application...');
    
    try {
        // Initialize response viewer first
        initResponseUI();
        
        // Initialize other components if they exist
        if (typeof app !== 'undefined' && app.init) {
            await app.init();
        }
        
        console.log('✅ AnyAPI application initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize AnyAPI:', error);
    }
});

// Provide minimal global app object for legacy HTML handlers
if (!window.app) {
    window.app = {
        closeModal: (modalId) => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('show');
            }
        },
        
        copyToClipboard: async (elementId) => {
            const element = document.getElementById(elementId);
            if (!element) return;
            const text = element.textContent;
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(text);
                } else {
                    const textArea = document.createElement('textarea');
                    textArea.value = text;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                }                if (typeof showNotification === 'function') {
                    showNotification('Copied to clipboard', 'success', 2000);
                } else {
                    console.log('✅ Copied to clipboard');
                }
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                if (typeof showNotification === 'function') {
                    showNotification('Failed to copy to clipboard', 'error');
                } else {
                    console.error('❌ Failed to copy to clipboard');
                }
            }
        },
          toggleDarkMode: () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const newTheme = !isDark;
            
            if (newTheme) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            
            localStorage.setItem('anyapi_dark_mode', newTheme.toString());
            if (typeof showNotification === 'function') {
                showNotification(`Switched to ${newTheme ? 'dark' : 'light'} mode`, 'info', 2000);
            } else {
                console.log(`✅ Switched to ${newTheme ? 'dark' : 'light'} mode`);
            }
        },
          clearHistory: () => {
            if (window.endpointTester && typeof window.endpointTester.clearHistory === 'function') {
                if (confirm('Are you sure you want to clear all request history?')) {
                    window.endpointTester.clearHistory();
                    if (typeof showNotification === 'function') {
                        showNotification('Request history cleared', 'success');
                    } else {
                        console.log('✅ Request history cleared');
                    }
                }
            } else {
                if (typeof showNotification === 'function') {
                    showNotification('History functionality not available', 'warning');
                } else {
                    console.warn('⚠️ History functionality not available');
                }
            }
        }
    };
}
