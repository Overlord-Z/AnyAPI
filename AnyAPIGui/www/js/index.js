import { showNotification } from './ui/notifications.js';
import { initEndpointUI } from './ui/endpoint-ui.js';
import { initResponseUI } from './ui/response-ui.js';
import EndpointTester from './core/endpoint-tester.js';

// Make showNotification globally available for core modules
window.showNotification = showNotification;

console.log('🚀 Index.js loaded, setting up dynamic initialization...');

/**
 * Wait for a global object to be available
 */
function waitForGlobal(globalName, timeout = 2000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        function check() {
            if (window[globalName] !== undefined) {
                console.log(`✅ ${globalName} is now available`);
                resolve(window[globalName]);
            } else if (Date.now() - startTime > timeout) {
                console.warn(`⚠️ Timeout waiting for ${globalName}`);
                reject(new Error(`Timeout waiting for ${globalName}`));
            } else {
                setTimeout(check, 25); // Check every 25ms for faster detection
            }
        }
        
        check();
    });
}

/**
 * Wait for multiple global objects to be available
 */
async function waitForDependencies() {
    const dependencies = [
        { name: 'apiClient', required: false },
        { name: 'profileManager', required: false },
        { name: 'templateManager', required: false },
        { name: 'secretManager', required: false }
    ];
    
    console.log('🔍 Checking for dependencies...');
    
    // Check all dependencies in parallel for faster loading
    const promises = dependencies.map(async (dep) => {
        try {
            await waitForGlobal(dep.name, 800); // Very short timeout for optional deps
            return { name: dep.name, success: true };
        } catch (error) {
            if (dep.required) {
                throw error;
            } else {
                console.warn(`⚠️ Optional dependency ${dep.name} not available: ${error.message}`);
                return { name: dep.name, success: false };
            }
        }
    });
    
    // Wait for all checks to complete (but don't block on failures)
    await Promise.allSettled(promises);
    
    console.log('✅ All dependencies checked');
}

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        console.log('🔧 Starting AnyAPI initialization...');
        
        // Add a maximum wait time for the entire initialization
        const initTimeout = setTimeout(() => {
            console.warn('⚠️ Initialization taking too long, proceeding without optional dependencies...');
        }, 2000);
        
        // Wait for all dependencies to be loaded (with timeout)
        await Promise.race([
            waitForDependencies(),
            new Promise(resolve => setTimeout(resolve, 1500)) // Max 1.5 seconds total wait
        ]);
        
        clearTimeout(initTimeout);
        
        // Ensure global objects are available on window
        if (typeof apiClient !== 'undefined') {
            window.apiClient = apiClient;
            console.log('✅ ApiClient available globally');
        }
        
        // Initialize core endpoint tester
        console.log('🔌 Creating EndpointTester instance...');
        window.endpointTester = new EndpointTester();
        console.log('✅ EndpointTester created');
        
        // Initialize UI modules
        console.log('🎨 Initializing UI modules...');
        initEndpointUI();
        initResponseUI();
        console.log('✅ UI modules initialized');
        
        // Hide loading screen and show the app
        console.log('🎭 Showing application...');
        showApplication();
        
        showNotification('AnyAPI initialized successfully', 'success', 3000);
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
    console.log('📋 DOM Content Loaded, starting dynamic initialization...');
    
    // Initialize dark mode from localStorage
    const savedDarkMode = localStorage.getItem('anyapi_dark_mode') === 'true';
    if (savedDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
      initializeApp();
});

// Provide minimal global app object for legacy HTML handlers (only if not already set)
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
                }
                showNotification('Copied to clipboard', 'success', 2000);
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                showNotification('Failed to copy to clipboard', 'error');
            }
        },        toggleDarkMode: () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const newTheme = !isDark;
            
            if (newTheme) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            
            // Save preference
            localStorage.setItem('anyapi_dark_mode', newTheme.toString());
            
            showNotification(
                `Switched to ${newTheme ? 'dark' : 'light'} mode`,
                'info',
                2000
            );
        },
        showAppInfo: () => {
            // Simple modal for app info
            const modal = document.createElement('div');
            modal.className = 'modal show';
            modal.id = 'app-info-modal';
            modal.innerHTML = `<div class="modal-content large"><div class="modal-header"><h3>About AnyAPI</h3><button class="modal-close" onclick="app.closeModal('app-info-modal')">&times;</button></div><div class="modal-body"><p>AnyAPI GUI - Modern API testing and management tool.</p></div></div>`;
            document.body.appendChild(modal);
        },
        exportProfiles: () => {
            if (window.profileManager && typeof window.profileManager.exportProfiles === 'function') {
                window.profileManager.exportProfiles();
            } else {
                showNotification('Profile export not available', 'warning');
            }
        },
        importProfiles: () => {
            if (window.profileManager && typeof window.profileManager.importProfiles === 'function') {
                window.profileManager.importProfiles();
            } else {
                showNotification('Profile import not available', 'warning');
            }
        },
        showSection: (sectionName) => {
            // Simple section switcher for legacy handlers
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            const target = document.getElementById(`${sectionName}-section`);
            if (target) target.classList.add('active');
        },        filterHistory: () => {
            const searchTerm = document.getElementById('history-search')?.value?.toLowerCase() || '';
            const selectedProfile = document.getElementById('history-profile-filter')?.value || '';
            const historyItems = document.querySelectorAll('.history-item');
            
            historyItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                const itemProfile = app.extractProfileFromHistoryItem(item);
                
                // Check both search term and profile filter
                const matchesSearch = !searchTerm || text.includes(searchTerm);
                const matchesProfile = !selectedProfile || itemProfile === selectedProfile;
                
                if (matchesSearch && matchesProfile) {
                    item.style.display = 'block';
                    item.classList.remove('filtered-out');
                } else {
                    item.style.display = 'none';
                    item.classList.add('filtered-out');
                }
            });
        },
        filterHistoryByProfile: () => {
            // Delegate to the main filter function which handles both search and profile filtering
            app.filterHistory();
        },
        extractProfileFromHistoryItem: (historyItem) => {
            try {
                // Look for "Profile: [name]" pattern in the text
                const text = historyItem.textContent;
                const match = text.match(/Profile:\s*([^•]+)/);
                return match ? match[1].trim() : '';
            } catch (error) {
                console.warn('Error extracting profile from history item:', error);
                return '';
            }
        },        clearHistory: () => {
            if (window.endpointTester && typeof window.endpointTester.clearHistory === 'function') {
                if (confirm('Are you sure you want to clear all request history?')) {
                    window.endpointTester.clearHistory();
                    showNotification('Request history cleared', 'success');
                }
            } else {
                showNotification('History functionality not available', 'warning');
            }
        }
    };
}
