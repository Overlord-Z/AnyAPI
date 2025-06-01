/**
 * AnyAPI GUI - Main Application
 * Central application controller and initialization
 * Coordinated with Enhanced ProfileManager
 */

class AnyApiApp {
    constructor() {
        this.currentSection = 'profiles';
        this.isInitialized = false;
        this.initStartTime = Date.now();
        this.isDarkMode = localStorage.getItem('anyapi_dark_mode') === 'true';
        
        // Application state
        this.state = {
            isConnected: false,
            secretStoreUnlocked: false,
            profilesLoaded: false,
            templatesLoaded: false
        };

        // Bind methods
        this.init = this.init.bind(this);
        this.showSection = this.showSection.bind(this);
        this.handleConnectionChange = this.handleConnectionChange.bind(this);
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('🚀 Initializing AnyAPI GUI...');
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Set up global error handling
            this.setupErrorHandling();
            
            // Initialize dark mode
            this.initializeDarkMode();
            
            // Initialize connection status
            this.initializeConnectionStatus();
            
            // Initialize sidebar state
            this.initializeSidebar();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize navigation
            this.setupNavigation();
            
            // Wait for API client to check connection
            console.log('🔍 Checking server connection...');
            const connected = await this.waitForConnection();
            
            if (connected) {
                console.log('✅ Server connection established');
                this.setConnectionStatus('connected', 'Connected', 'wifi');
                
                // Initialize all managers in parallel for better performance
                await this.initializeManagers();
                
                console.log('✅ All managers initialized');
            } else {
                console.log('⚠️ Server connection failed - running in offline mode');
                this.setConnectionStatus('disconnected', 'Disconnected', 'wifi-off');
                this.showOfflineMode();
            }
            
            // Hide loading screen and show app
            this.hideLoadingScreen();
            
            // Show initial section
            this.showSection(this.currentSection);
            
            // Mark as initialized
            this.isInitialized = true;
            
            const initTime = Date.now() - this.initStartTime;
            console.log(`🎉 AnyAPI GUI initialized in ${initTime}ms`);
            
            // Show welcome message for first-time users
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.setConnectionStatus('disconnected', 'Error', 'alert-circle');
            this.showInitializationError(error);
        }
    }

    /**
     * Initialize dark mode
     */
    initializeDarkMode() {
        this.applyDarkMode(this.isDarkMode);
        this.updateDarkModeToggle();
    }    /**
     * Toggle dark mode
     */
    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('anyapi_dark_mode', this.isDarkMode.toString());
        this.applyDarkMode(this.isDarkMode);
        this.updateDarkModeToggle();
        
        showNotification(
            `Switched to ${this.isDarkMode ? 'dark' : 'light'} mode`,
            'info',
            2000
        );
    }    /**
     * Toggle sidebar collapsed state
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleIcon = document.querySelector('.sidebar-toggle i');
        
        if (!sidebar) {
            console.warn('Sidebar element not found');
            return;
        }
        
        sidebar.classList.toggle('collapsed');
        
        // Update toggle icon
        if (toggleIcon) {
            if (sidebar.classList.contains('collapsed')) {
                toggleIcon.setAttribute('data-feather', 'chevron-right');
            } else {
                toggleIcon.setAttribute('data-feather', 'menu');
            }
            
            // Re-render feather icons
            if (window.feather) {
                feather.replace();
            }
        }
        
        // Save state to localStorage
        localStorage.setItem('anyapi_sidebar_collapsed', sidebar.classList.contains('collapsed'));
    }/**
     * Initialize sidebar state from localStorage
     */
    initializeSidebar() {
        const isCollapsed = localStorage.getItem('anyapi_sidebar_collapsed') === 'true';
        const sidebar = document.getElementById('sidebar');
        
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            const toggleIcon = document.querySelector('.sidebar-toggle i');
            if (toggleIcon) {
                toggleIcon.setAttribute('data-feather', 'chevron-right');
            }
        }
        
        // Re-render feather icons
        if (window.feather) {
            feather.replace();
        }
    }

    /**
     * Apply dark mode theme
     */
    applyDarkMode(isDark) {
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    /**
     * Update dark mode toggle button
     */
    // In your app.js or relevant component's method
updateDarkModeToggle() {
    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) {
        let newIconName = '';
        let buttonText = ''; // Renamed from 'text' to avoid conflict if 'text' is a global

        if (this.isDarkMode) {
            newIconName = 'sun'; // Feather icon name
            toggle.title = 'Switch to light mode';
        } else {
            newIconName = 'moon'; // Feather icon name
            toggle.title = 'Switch to dark mode';
        }

        // Update the innerHTML to use a Feather icon and a span for the text
        // The MutationObserver in your index.html should automatically call feather.replace()
        // to render the new SVG icon.
        toggle.innerHTML = `<i data-feather="${newIconName}"></i> <span class="dmt-text">${buttonText}</span>`;

        // OPTIONAL: If the MutationObserver doesn't catch this specific update reliably,
        // you can explicitly call feather.replace() here for the specific icon attributes.
        // However, your existing observer is likely sufficient.
        // Example explicit call (usually not needed with your current observer):
        // feather.replace({ 'width': 18, 'height': 18, 'stroke-width': 2 });
    }
}

    /**
     * Set up global error handling
     */
    setupErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            showNotification('An unexpected error occurred', 'error');
            event.preventDefault();
        });

        // Handle general errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            showNotification('An unexpected error occurred', 'error');
        });
    }

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Listen for connection status changes - improved with debouncing
        let connectionChangeTimeout;
        window.addEventListener('connectionStatusChanged', (event) => {
            clearTimeout(connectionChangeTimeout);
            connectionChangeTimeout = setTimeout(() => {
                this.handleConnectionChange(event);
            }, 100); // Short debounce to prevent rapid successive calls
        });
        
        // Listen for connection restoration (only when actually restored)
        window.addEventListener('connectionRestored', (event) => {
            console.log('🔄 Connection restored, refreshing data...');
            this.refreshData();
        });
        
        // Listen for SecretStore events
        window.addEventListener('secretStoreUnlocked', () => {
            this.state.secretStoreUnlocked = true;
            showNotification('SecretStore unlocked - enhanced security available', 'success');
        });

        window.addEventListener('secretStoreSkipped', () => {
            showNotification('Continuing with session-only secret storage', 'info');
        });

        // Listen for keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Listen for visibility changes (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isInitialized) {
                // Refresh data when tab becomes visible
                this.refreshData();
            }
        });

        // Listen for online/offline events
        window.addEventListener('online', () => {
            showNotification('Connection restored', 'success');
            if (typeof apiClient !== 'undefined' && apiClient.checkConnection) {
                apiClient.checkConnection();
            }
        });

        window.addEventListener('offline', () => {
            showNotification('Connection lost - some features may be limited', 'warning');
        });
    }

    /**
     * Set up navigation
     */
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                if (section) {
                    this.showSection(section);
                }
            });
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    this.showSection('profiles');
                    break;
                case '2':
                    e.preventDefault();
                    this.showSection('tester');
                    break;
                case '3':
                    e.preventDefault();
                    this.showSection('templates');
                    break;
                case '4':
                    e.preventDefault();
                    this.showSection('history');
                    break;
                case 'n':
                    e.preventDefault();
                    if (this.currentSection === 'profiles' && window.profileManager) {
                        profileManager.showCreateModal();
                    }
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.currentSection === 'tester' && window.endpointTester) {
                        endpointTester.sendRequest();
                    }
                    break;
            }
        }

        // Escape key to close modals
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal-overlay, .modal.show');
            modals.forEach(modal => {
                if (modal.style.display !== 'none') {
                    modal.style.display = 'none';
                    modal.classList?.remove('show');
                    modal.remove?.(); // Remove if it's a dynamic modal
                }
            });
        }
    }

    /**
     * Wait for connection with timeout
     */
    async waitForConnection(timeout = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (typeof apiClient !== 'undefined' && apiClient.isConnected) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return false;
    }

    /**
     * Initialize all managers - ENHANCED COORDINATION
     */
    async initializeManagers() {
        const initPromises = [];
        
        console.log('🔧 Initializing managers...');
        
        // Initialize ProfileManager
        if (typeof profileManager !== 'undefined' && profileManager.loadProfiles) {
            console.log('📋 Initializing ProfileManager...');
            initPromises.push(
                profileManager.loadProfiles().then(() => {
                    this.state.profilesLoaded = true;
                    console.log('✅ ProfileManager initialized');
                }).catch(error => {
                    console.warn('⚠️ ProfileManager initialization failed:', error);
                })
            );
        } else {
            console.warn('⚠️ ProfileManager not available');
        }
        
        // Initialize TemplateManager
        if (typeof templateManager !== 'undefined' && templateManager.loadTemplates) {
            console.log('📋 Initializing TemplateManager...');
            initPromises.push(
                templateManager.loadTemplates().then(() => {
                    this.state.templatesLoaded = true;
                    console.log('✅ TemplateManager initialized');
                }).catch(error => {
                    console.warn('⚠️ TemplateManager initialization failed:', error);
                })
            );        } else {
            console.warn('⚠️ TemplateManager not available');
        }
        
        // Initialize HistoryManager
        if (typeof window.HistoryManager !== 'undefined') {
            console.log('📋 Initializing HistoryManager...');
            initPromises.push(
                Promise.resolve().then(() => {
                    // Create global HistoryManager instance
                    window.historyManager = new window.HistoryManager();
                    console.log('✅ HistoryManager initialized');
                }).catch(error => {
                    console.warn('⚠️ HistoryManager initialization failed:', error);
                })
            );
        } else {
            console.warn('⚠️ HistoryManager not available');
        }
          // Initialize EndpointTester
        if (typeof window.initializeEndpointTester === 'function') {
            console.log('🧪 Initializing EndpointTester...');
            initPromises.push(
                Promise.resolve().then(() => {
                    const endpointTester = window.initializeEndpointTester();
                    if (endpointTester && endpointTester.updateHistoryDisplay) {
                        endpointTester.updateHistoryDisplay();
                    }
                    console.log('✅ EndpointTester initialized');
                }).catch(error => {
                    console.warn('⚠️ EndpointTester initialization failed:', error);
                })
            );
        } else {
            console.warn('⚠️ EndpointTester initialization function not available');
        }
        
        // Wait for all managers to initialize
        await Promise.allSettled(initPromises);
    }

    /**
     * Handle connection status changes - ENHANCED WITH PROPER STATES
     */
    handleConnectionChange(event) {
        const wasConnected = this.state.isConnected;
        const newConnectionState = event.detail.connected;
        const connectionStatus = document.getElementById('connection-status');
        
        // Don't log unless there's an actual state change
        if (wasConnected !== newConnectionState) {
            console.log(`🔄 Connection status changed: ${wasConnected} → ${newConnectionState}`);
        }
        
        if (!connectionStatus) {
            console.warn('Connection status element not found');
            return;
        }
        
        // Update internal state
        this.state.isConnected = newConnectionState;
        
        // Handle state transitions
        if (newConnectionState === 'connecting') {
            // Show connecting state with pulse
            this.setConnectionStatus('connecting', 'Connecting...', 'loader');
            
        } else if (newConnectionState === true || newConnectionState === 'connected') {
            // Connection established
            if (!wasConnected) {
                // Connection restored - refresh will be handled by connectionRestored event
                showNotification('Connected to PowerShell backend', 'success');
            }
            this.setConnectionStatus('connected', 'Connected', 'wifi');
            
        } else {
            // Connection lost or failed
            if (wasConnected) {
                showNotification('Lost connection to PowerShell backend', 'warning');
            }
            this.setConnectionStatus('disconnected', 'Disconnected', 'wifi-off');
        }
    }

    /**
     * Set connection status with proper styling and icon
     */
    setConnectionStatus(state, text, iconName) {
        const connectionStatus = document.getElementById('connection-status');
        if (!connectionStatus) return;
        
        // Remove all state classes
        connectionStatus.classList.remove('connected', 'disconnected', 'connecting');
        
        // Add new state class
        connectionStatus.classList.add(state);
        
        // Update content with icon and text
        connectionStatus.innerHTML = `
            <i data-feather="${iconName}" class="connection-icon"></i>
            <span>${text}</span>
        `;
        
        // Re-render feather icons
        if (window.feather) {
            feather.replace();
        }
    }

    /**
     * Initialize connection status on app start
     */
    initializeConnectionStatus() {
        // Start with connecting state
        this.setConnectionStatus('connecting', 'Connecting...', 'loader');
    }

    /**
     * Refresh all data - ENHANCED WITH BETTER ERROR HANDLING AND CACHING
     */
    async refreshData() {
        if (!this.state.isConnected) {
            console.log('⚠️ Skipping data refresh - not connected');
            return;
        }
        
        console.log('🔄 Refreshing application data...');
        const refreshPromises = [];
        
        // Refresh ProfileManager - only if not already loading
        if (typeof profileManager !== 'undefined' && profileManager.loadProfiles) {
            if (!profileManager.isLoading) {
                refreshPromises.push(
                    profileManager.loadProfiles().then(() => {
                        console.log('✅ Profiles refreshed');
                    }).catch(error => {
                        console.warn('⚠️ Failed to refresh profiles:', error);
                    })
                );
            } else {
                console.log('⏳ Profiles already loading, skipping refresh');
            }
        }
        
        // Refresh TemplateManager - only if not already loading
        if (typeof templateManager !== 'undefined' && templateManager.loadTemplates) {
            if (!templateManager.isLoading) {
                refreshPromises.push(
                    templateManager.loadTemplates().then(() => {
                        console.log('✅ Templates refreshed');
                    }).catch(error => {
                        console.warn('⚠️ Failed to refresh templates:', error);
                    })
                );
            } else {
                console.log('⏳ Templates already loading, skipping refresh');
            }
        }
        
        await Promise.allSettled(refreshPromises);
        console.log('✅ Data refresh completed');
    }

    /**
     * Show loading screen
     */
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    /**
     * Hide loading screen and show app
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const appContainer = document.getElementById('app');
        
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500); // Small delay for better UX
        }
        
        if (appContainer) {
            appContainer.style.display = 'block';
        }
    }

    /**
     * Show offline mode message
     */
    showOfflineMode() {
        showNotification(
            'Unable to connect to PowerShell backend. Some features may be limited.',
            'warning',
            10000
        );
    }

    /**
     * Show initialization error
     */
    showInitializationError(error) {
        this.hideLoadingScreen();
        
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem;">
                    <div style="text-align: center; max-width: 500px;">
                        <div style="font-size: 4rem; margin-bottom: 2rem;">⚠️</div>
                        <h2 style="color: var(--color-danger); margin-bottom: 1rem;">Initialization Failed</h2>
                        <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                            The application failed to initialize properly. Please check your connection and try again.
                        </p>
                        <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; margin-bottom: 2rem;">
                            <strong>Error:</strong> ${this.escapeHtml(error.message)}
                        </div>
                        <button class="btn btn-primary" onclick="location.reload()">
                            🔄 Reload Application
                        </button>
                    </div>
                </div>
            `;
            appContainer.style.display = 'block';
        }
    }

    /**
     * Show welcome message for new users - ENHANCED WITH PROFILE MANAGER CHECK
     */
    showWelcomeMessage() {
        // Check if this is the first visit
        const hasVisited = localStorage.getItem('anyapi_has_visited');
        
        if (!hasVisited && this.state.profilesLoaded && 
            typeof profileManager !== 'undefined' && 
            profileManager.profiles && 
            profileManager.profiles.length === 0) {
            
            localStorage.setItem('anyapi_has_visited', 'true');
            
            setTimeout(() => {
                showNotification(
                    'Welcome to AnyAPI! Start by creating your first API profile or using a template.',
                    'info',
                    8000
                );
                
                // Optionally auto-open the create modal for first-time users
                setTimeout(() => {
                    if (this.currentSection === 'profiles' && typeof profileManager !== 'undefined') {
                        const shouldAutoCreate = confirm('Would you like to create your first API profile now?');
                        if (shouldAutoCreate) {
                            profileManager.showCreateModal();
                        }
                    }
                }, 2000);
            }, 1000);
        }
    }

    /**
     * Show section and update navigation
     */
    showSection(sectionName) {
        console.log(`🎯 Switching to section: ${sectionName}`);
        
        // Update current section
        this.currentSection = sectionName;
        
        // Update navigation active state
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (item.dataset.section === sectionName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Show/hide content sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            if (section.id === `${sectionName}-section`) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
        
        // Trigger section-specific actions
        this.onSectionShow(sectionName);
        
        // Update browser history
        if (history.pushState) {
            history.pushState(null, null, `#${sectionName}`);
        }
    }

    /**
     * Handle section-specific actions when showing - ENHANCED WITH MANAGER CHECKS AND DEBOUNCING
     */
    onSectionShow(sectionName) {
        // Clear any existing section timeout
        if (this.sectionTimeout) {
            clearTimeout(this.sectionTimeout);
        }
        
        // Debounce section-specific actions
        this.sectionTimeout = setTimeout(() => {
            this.performSectionActions(sectionName);
        }, 100);
    }

    /**
     * Perform section-specific actions (debounced)
     */
    performSectionActions(sectionName) {
        switch (sectionName) {
            case 'profiles':
                console.log('📋 Activating Profiles section');
                // Only refresh if connected and not already loading
                if (this.state.isConnected && 
                    typeof profileManager !== 'undefined' && 
                    profileManager.loadProfiles && 
                    !profileManager.isLoading) {
                    
                    // Check if profiles are already loaded and fresh
                    const needsRefresh = !this.state.profilesLoaded || 
                                       (profileManager.profiles && profileManager.profiles.length === 0);
                    
                    if (needsRefresh) {
                        console.log('📊 Loading profiles for section');
                        profileManager.loadProfiles().catch(error => {
                            console.warn('Failed to load profiles on section show:', error);
                        });
                    } else {
                        console.log('📊 Profiles already loaded and fresh');
                    }
                } else if (profileManager && profileManager.isLoading) {
                    console.log('⏳ Profiles already loading');
                }
                break;
                
            case 'templates':
                console.log('📋 Activating Templates section');
                // Only refresh if connected and not already loading
                if (this.state.isConnected && 
                    typeof templateManager !== 'undefined' && 
                    templateManager.loadTemplates &&
                    !templateManager.isLoading) {
                    
                    // Check if templates are already loaded and fresh
                    const needsRefresh = !this.state.templatesLoaded || 
                                       (templateManager.templates && templateManager.templates.length === 0);
                    
                    if (needsRefresh) {
                        console.log('📊 Loading templates for section');
                        templateManager.loadTemplates().catch(error => {
                            console.warn('Failed to load templates on section show:', error);
                        });
                    } else {
                        console.log('📊 Templates already loaded and fresh');
                    }
                } else if (templateManager && templateManager.isLoading) {
                    console.log('⏳ Templates already loading');
                }
                break;

            // ...existing code for other sections...
        }
    }

    /**
     * Export profiles - DELEGATE TO PROFILE MANAGER
     */
    async exportProfiles() {
        try {
            if (!this.state.isConnected) {
                showNotification('Export requires connection to PowerShell backend', 'warning');
                return;
            }

            if (typeof profileManager !== 'undefined' && profileManager.exportProfiles) {
                console.log('📤 Delegating export to ProfileManager');
                await profileManager.exportProfiles();
            } else {
                console.warn('⚠️ ProfileManager export not available, using fallback');
                await this.fallbackExportProfiles();
            }
        } catch (error) {
            console.error('Export failed:', error);
            showNotification(`Export failed: ${error.message}`, 'error');
        }
    }

    /**
     * Fallback export method
     */
    async fallbackExportProfiles() {
        const includeSecrets = confirm(
            'Do you want to include secrets in the export?\n\n' +
            'WARNING: Including secrets will export them as plain text. ' +
            'Only do this if you trust the security of the export file.'
        );

        showNotification('Exporting profiles...', 'info');
        
        if (typeof apiClient !== 'undefined' && apiClient.exportProfiles) {
            const response = await apiClient.exportProfiles(includeSecrets);
            
            if (response.success) {
                // Create and download file
                const blob = new Blob([response.content], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `anyapi-profiles-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                
                URL.revokeObjectURL(url);
                
                showNotification('Profiles exported successfully', 'success');
                
                if (includeSecrets) {
                    showNotification('Remember to secure your export file - it contains sensitive data!', 'warning', 10000);
                }
            }
        } else {
            throw new Error('Export functionality not available');
        }
    }

    /**
     * Import profiles - DELEGATE TO PROFILE MANAGER
     */
    async importProfiles() {
        try {
            if (!this.state.isConnected) {
                showNotification('Import requires connection to PowerShell backend', 'warning');
                return;
            }

            if (typeof profileManager !== 'undefined' && profileManager.importProfiles) {
                console.log('📥 Delegating import to ProfileManager');
                await profileManager.importProfiles();
            } else {
                console.warn('⚠️ ProfileManager import not available, using fallback');
                await this.fallbackImportProfiles();
            }
        } catch (error) {
            console.error('Import failed:', error);
            showNotification(`Import failed: ${error.message}`, 'error');
        }
    }

    /**
     * Fallback import method
     */
    async fallbackImportProfiles() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                const content = await file.text();
                
                // Validate JSON
                try {
                    JSON.parse(content);
                } catch {
                    showNotification('Invalid JSON file', 'error');
                    return;
                }

                // Ask for merge strategy
                const mergeStrategy = await this.promptMergeStrategy();
                if (!mergeStrategy) return;

                showNotification('Importing profiles...', 'info');
                
                if (typeof apiClient !== 'undefined' && apiClient.importProfiles) {
                    const response = await apiClient.importProfiles(content, mergeStrategy);
                    
                    if (response.success) {
                        showNotification('Profiles imported successfully', 'success');
                        
                        // Refresh data
                        await this.refreshData();
                        
                        // Switch to profiles section
                        this.showSection('profiles');
                    }
                } else {
                    throw new Error('Import functionality not available');
                }
            } catch (error) {
                console.error('Import failed:', error);
                showNotification(`Import failed: ${error.message}`, 'error');
            }
        };
        
        input.click();
    }

    /**
     * Prompt for merge strategy
     */
    async promptMergeStrategy() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
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
                <div class="modal-dialog" style="width: 400px; max-width: 90vw; background: var(--bg-primary); border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <div class="modal-header" style="padding: 1rem; border-bottom: 1px solid var(--border-color);">
                        <h3 style="margin: 0;">Import Strategy</h3>
                    </div>
                    <div class="modal-body" style="padding: 1rem;">
                        <p>How should existing profiles be handled?</p>
                        <div style="margin: 1rem 0;">
                            <label class="checkbox-label">
                                <input type="radio" name="merge-strategy" value="Skip" checked>
                                Skip existing profiles (recommended)
                            </label>
                            <label class="checkbox-label">
                                <input type="radio" name="merge-strategy" value="Overwrite">
                                Overwrite existing profiles
                            </label>
                            <label class="checkbox-label">
                                <input type="radio" name="merge-strategy" value="Merge">
                                Merge with existing profiles
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer" style="padding: 1rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 0.5rem;">
                        <button type="button" class="btn btn-outline">Cancel</button>
                        <button type="button" class="btn btn-primary">Import</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const cancelBtn = modal.querySelector('.btn-outline');
            const importBtn = modal.querySelector('.btn-primary');
            
            cancelBtn.onclick = () => {
                modal.remove();
                resolve(null);
            };
            
            importBtn.onclick = () => {
                const strategy = modal.querySelector('input[name="merge-strategy"]:checked').value;
                modal.remove();
                resolve(strategy);
            };
        });
    }    /**
     * Filter history - ENHANCED WITH MANAGER CHECK AND PROFILE FILTERING
     */
    filterHistory() {
        if (typeof endpointTester !== 'undefined' && endpointTester.updateHistoryDisplay) {
            const searchTerm = document.getElementById('history-search')?.value?.toLowerCase() || '';
            const selectedProfile = document.getElementById('history-profile-filter')?.value || '';
            
            const historyItems = document.querySelectorAll('.history-item');
            historyItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                const itemProfile = this.extractProfileFromHistoryItem(item);
                
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
            
            // Update filter status
            this.updateHistoryFilterStatus();
        }
    }

    /**
     * Filter history by profile only
     */
    filterHistoryByProfile() {
        this.filterHistory(); // Use the enhanced filter method
    }

    /**
     * Extract profile name from history item
     */
    extractProfileFromHistoryItem(historyItem) {
        try {
            // Look for "Profile: [name]" pattern in the text
            const text = historyItem.textContent;
            const match = text.match(/Profile:\s*([^•]+)/);
            return match ? match[1].trim() : '';
        } catch (error) {
            console.warn('Error extracting profile from history item:', error);
            return '';
        }
    }

    /**
     * Update history filter status display
     */
    updateHistoryFilterStatus() {
        try {
            const visibleItems = document.querySelectorAll('.history-item:not(.filtered-out)').length;
            const totalItems = document.querySelectorAll('.history-item').length;
            const searchTerm = document.getElementById('history-search')?.value || '';
            const selectedProfile = document.getElementById('history-profile-filter')?.value || '';
            
            // Create or update status element
            let statusEl = document.getElementById('history-filter-status');
            if (!statusEl) {
                statusEl = document.createElement('div');
                statusEl.id = 'history-filter-status';
                statusEl.className = 'history-filter-status';
                
                const historyList = document.getElementById('history-list');
                if (historyList && historyList.parentNode) {
                    historyList.parentNode.insertBefore(statusEl, historyList);
                }
            }
            
            // Update status text
            if (searchTerm || selectedProfile) {
                const filters = [];
                if (searchTerm) filters.push(`search: "${searchTerm}"`);
                if (selectedProfile) filters.push(`profile: "${selectedProfile}"`);
                
                statusEl.innerHTML = `
                    <div class="filter-status-text">
                        Showing ${visibleItems} of ${totalItems} requests 
                        (filtered by ${filters.join(', ')})
                        <button class="btn-clear-filters" onclick="app.clearHistoryFilters()">
                            Clear filters
                        </button>
                    </div>
                `;
                statusEl.style.display = 'block';
            } else {
                statusEl.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Error updating history filter status:', error);
        }
    }

    /**
     * Clear all history filters
     */
    clearHistoryFilters() {
        try {
            const searchInput = document.getElementById('history-search');
            const profileFilter = document.getElementById('history-profile-filter');
            
            if (searchInput) searchInput.value = '';
            if (profileFilter) profileFilter.value = '';
            
            this.filterHistory();
            showNotification('History filters cleared', 'success');
            
        } catch (error) {
            console.error('Error clearing history filters:', error);
        }
    }

    /**
     * Clear all history - ENHANCED WITH MANAGER CHECK
     */
    clearHistory() {
        if (typeof endpointTester !== 'undefined' && endpointTester.clearHistory) {
            if (confirm('Are you sure you want to clear all request history?')) {
                endpointTester.clearHistory();
                showNotification('Request history cleared', 'success');
            }
        } else {
            showNotification('History functionality not available', 'warning');
        }
    }

    /**
     * Close modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const text = element.textContent;
        
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers or non-secure contexts
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
    }

    /**
     * Show application info - ENHANCED WITH BETTER STATS
     */
    showAppInfo() {
        const modal = document.createElement('div');
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
        
        // Get current stats
        const stats = this.getAppStats();
        
        modal.innerHTML = `
            <div class="modal-dialog" style="width: 500px; max-width: 90vw; background: var(--bg-primary); border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div class="modal-header" style="padding: 1rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">🚀 About AnyAPI</h3>
                    <button class="modal-close" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; padding: 0.25rem;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 1rem;">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🚀</div>
                        <h2>AnyAPI GUI v2.0</h2>
                        <p style="color: var(--text-secondary);">Modern Web Interface for PowerShell API Management</p>
                    </div>
                    
                    <div class="config-section">
                        <h4>Features</h4>
                        <ul style="margin: 1rem 0; padding-left: 2rem;">
                            <li>Visual API profile management</li>
                            <li>Interactive endpoint testing</li>
                            <li>Secure credential storage</li>
                            <li>Built-in API templates</li>
                            <li>Request history and debugging</li>
                            <li>PowerShell code generation</li>
                        </ul>
                    </div>
                    
                    <div class="config-section">
                        <h4>Keyboard Shortcuts</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.875rem;">
                            <div><kbd>Ctrl+1</kbd> Profiles</div>
                            <div><kbd>Ctrl+2</kbd> Tester</div>
                            <div><kbd>Ctrl+3</kbd> Templates</div>
                            <div><kbd>Ctrl+4</kbd> History</div>
                            <div><kbd>Ctrl+N</kbd> New Profile</div>
                            <div><kbd>Ctrl+Enter</kbd> Send Request</div>
                            <div><kbd>Esc</kbd> Close Modal</div>
                        </div>
                    </div>
                    
                    <div class="config-section">
                        <h4>System Information</h4>
                        <div class="config-item">
                            <span class="config-label">Connection:</span>
                            <span class="config-value">${stats.isConnected ? '✅ Connected' : '❌ Disconnected'}</span>
                        </div>
                        <div class="config-item">
                            <span class="config-label">Profiles:</span>
                            <span class="config-value">${stats.profileCount} configured</span>
                        </div>
                        <div class="config-item">
                            <span class="config-label">Templates:</span>
                            <span class="config-value">${stats.templateCount} available</span>
                        </div>
                        <div class="config-item">
                            <span class="config-label">History:</span>
                            <span class="config-value">${stats.historyCount} requests</span>
                        </div>
                        <div class="config-item">
                            <span class="config-label">Init Time:</span>
                            <span class="config-value">${stats.initTime}ms</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 1rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end;">
                    <button type="button" class="btn btn-primary">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const closeBtn = modal.querySelector('.modal-close');
        const footerBtn = modal.querySelector('.btn-primary');
        
        const closeModal = () => modal.remove();
        
        closeBtn.onclick = closeModal;
        footerBtn.onclick = closeModal;
        
        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
    }

    /**
     * Handle browser back/forward
     */
    handlePopState() {
        const hash = window.location.hash.substring(1);
        if (hash && ['profiles', 'tester', 'templates', 'history'].includes(hash)) {
            this.showSection(hash);
        }
    }

    /**
     * Get application statistics - ENHANCED
     */
    getAppStats() {
        return {
            isConnected: this.state.isConnected,
            secretStoreUnlocked: this.state.secretStoreUnlocked,
            profileCount: (typeof profileManager !== 'undefined' && profileManager.profiles) ? profileManager.profiles.length : 0,
            templateCount: (typeof templateManager !== 'undefined' && templateManager.templates) ? templateManager.templates.length : 0,
            historyCount: (typeof endpointTester !== 'undefined' && endpointTester.requestHistory) ? endpointTester.requestHistory.length : 0,
            currentSection: this.currentSection,
            initTime: Date.now() - this.initStartTime
        };
    }

    /**
     * Safe HTML escaping
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    /**
     * Initialize application - NEW METHOD FOR BETTER COORDINATION
     */
    async initializeApp() {
        try {
            console.log('[App] Initializing application...');
            
            // Initialize core components first
            await this.initializeApiClient();
            
            // Initialize managers in the right order
            await this.initializeSecretManager();
            await this.initializeProfileManager();
            
            // Initialize template manager after modal class is available
            if (window.templateManager) {
                await window.templateManager.init();
            }
            
            // Initialize UI components
            this.initializeUI();
            
            console.log('[App] Application initialized successfully');
        } catch (error) {
            console.error('[App] Failed to initialize application:', error);
            this.showError('Failed to initialize application');
        }
    }
}

// Additional CSS for modals and UI elements
const appStyles = `
kbd {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    padding: 2px 6px;
    font-family: monospace;
    font-size: 0.75rem;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    cursor: pointer;
    padding: 0.25rem;
}

.checkbox-label:hover {
    background-color: var(--bg-secondary);
    border-radius: 4px;
}

.checkbox-label input[type="radio"],
.checkbox-label input[type="checkbox"] {
    width: auto;
    margin: 0;
}

.modal-overlay {
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
}

.modal-dialog {
    background: var(--bg-primary);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
}

.config-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-color);
}

.config-item:last-child {
    border-bottom: none;
}

.config-label {
    font-weight: 500;
    color: var(--text-primary);
}

.config-value {
    color: var(--text-secondary);
    font-family: monospace;
    font-size: 0.875rem;
}
`;

// Inject app styles
if (!document.getElementById('app-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'app-styles';
    styleSheet.textContent = appStyles;
    document.head.appendChild(styleSheet);
}

// Initialize global app instance
console.log('🚀 Creating AnyApiApp instance...');
const app = new AnyApiApp();

// Handle browser navigation
window.addEventListener('popstate', () => app.handlePopState());

// Set initial hash based on current section
if (!window.location.hash) {
    window.location.hash = '#profiles';
} else {
    const section = window.location.hash.substring(1);
    if (['profiles', 'tester', 'templates', 'history'].includes(section)) {
        app.currentSection = section;
    }
}

// Export app instance for global access
window.app = app;

// Global wrapper function for sidebar toggle to handle timing issues
window.toggleSidebarGlobal = function() {
    if (window.app && typeof window.app.toggleSidebar === 'function') {
        window.app.toggleSidebar();
    } else {
        console.warn('App not ready, using fallback sidebar toggle');
        // Fallback to direct DOM manipulation
        const sidebar = document.getElementById('sidebar');
        const toggleIcon = document.querySelector('.sidebar-toggle i');
        
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
            
            // Update toggle icon if available
            if (toggleIcon) {
                if (sidebar.classList.contains('collapsed')) {
                    toggleIcon.setAttribute('data-feather', 'chevron-right');
                } else {
                    toggleIcon.setAttribute('data-feather', 'menu');
                }
                
                // Re-render feather icons if available
                if (window.feather) {
                    feather.replace();
                }
            }
            
            // Save state
            localStorage.setItem('anyapi_sidebar_collapsed', sidebar.classList.contains('collapsed'));
        }
    }
};

console.log('✅ App.js loaded and configured');

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📋 DOM ready, initializing AnyApiApp...');
        app.init().catch(error => {
            console.error('Failed to initialize AnyApiApp:', error);
        });
    });
} else {
    // DOM is already ready
    console.log('📋 DOM already ready, initializing AnyApiApp...');
    app.init().catch(error => {
        console.error('Failed to initialize AnyApiApp:', error);
    });
}