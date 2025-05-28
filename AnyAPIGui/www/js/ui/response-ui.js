// UI for EnhancedResponseViewer
// Exported as ES6 module
import EnhancedResponseViewer from '../core/response-viewer.js';

let enhancedViewer;

export function initResponseUI() {
    enhancedViewer = new EnhancedResponseViewer();
    window.enhancedViewer = enhancedViewer;
    window.responseViewer = enhancedViewer; // Global reference for HTML event handlers
    window.displayResponseData = displayResponseData; // Make the function globally accessible

    // Initialize view mode tabs - call this after a brief delay to ensure DOM is ready
    setTimeout(() => {
        createViewModeTabs();
    }, 100);
    
    // Initialize search functionality
    initSearchFeatures();
    
    // Initialize keyboard shortcuts
    initKeyboardShortcuts();
    
    console.log('✅ Enhanced Response Viewer initialized');
}

/**
 * Initialize view mode tabs
 */
function initViewModeTabs() {
    // Tab switching for response viewer
    document.addEventListener('click', (e) => {
        if (e.target.closest('.response-tab')) {
            const tab = e.target.closest('.response-tab');
            const view = tab.dataset.view;
            
            // Update active tab
            document.querySelectorAll('.response-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Switch view
            enhancedViewer.setViewMode(view);
        }
    });

    // Create view mode tabs if they don't exist
    createViewModeTabs();
}

/**
 * Create view mode tabs dynamically
 */
function createViewModeTabs() {
    let tabsContainer = document.querySelector('.response-tabs');
    
    if (!tabsContainer || tabsContainer.children.length === 0) {
        // Find the tabs container in HTML or create it
        tabsContainer = document.getElementById('response-tabs') || 
                       document.querySelector('.response-tabs');
        
        if (!tabsContainer) {
            // Create tabs container if it doesn't exist
            const responseViewer = document.getElementById('response-viewer');
            
            if (responseViewer) {
                const tabsDiv = document.createElement('div');
                tabsDiv.className = 'response-tabs';
                tabsDiv.id = 'response-tabs';
                responseViewer.parentElement.insertBefore(tabsDiv, responseViewer);
                tabsContainer = tabsDiv;
            }
        }
        
        if (tabsContainer && enhancedViewer) {
            // Create tab buttons
            const tabsHtml = Object.entries(enhancedViewer.viewModes).map(([key, config]) => `
                <button class="response-tab ${key === 'raw' ? 'active' : ''}" data-view="${key}">
                    <span class="tab-icon">${config.icon}</span>
                    <span class="tab-label">${config.name}</span>
                </button>
            `).join('');
            
            tabsContainer.innerHTML = tabsHtml;
            
            // Add click event listeners to tabs
            tabsContainer.querySelectorAll('.response-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const viewMode = tab.getAttribute('data-view');
                    
                    // Update active tab
                    tabsContainer.querySelectorAll('.response-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    // Switch view mode
                    if (enhancedViewer) {
                        enhancedViewer.setViewMode(viewMode);
                    }
                });
            });
        }
    }
}

/**
 * Initialize search features
 */
function initSearchFeatures() {
    // Search input for response viewer
    const searchInput = document.querySelector('.response-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            enhancedViewer.setSearchQuery(e.target.value);
        });
        
        // Enter key to switch to search view
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                enhancedViewer.setViewMode('search');
                updateActiveTab('search');
            }
        });
    }

    // Create search input if it doesn't exist
    createSearchInput();
}

/**
 * Create search input dynamically
 */
function createSearchInput() {
    const searchContainer = document.querySelector('.response-search-container');
    if (!searchContainer) {
        const responseContainer = document.querySelector('.response-section') || 
                                document.querySelector('#response-section');
        
        if (responseContainer) {
            const searchHtml = `
                <div class="response-search-container">
                    <div class="search-input-wrapper">
                        <input type="text" class="response-search" placeholder="Search in response data..." />
                        <button class="search-btn" onclick="window.responseViewer?.setViewMode('search')">
                            🔍
                        </button>
                    </div>
                </div>
            `;
            
            const tabsContainer = document.querySelector('.response-tabs');
            if (tabsContainer) {
                tabsContainer.insertAdjacentHTML('afterend', searchHtml);
            }
        }
    }
}

/**
 * Initialize keyboard shortcuts
 */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Only handle shortcuts when response viewer is focused or no input is focused
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && 
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName);
        
        if (isInputFocused && !activeElement.classList.contains('response-search')) {
            return;
        }

        // Ctrl/Cmd + number keys for view switching
        if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '7') {
            e.preventDefault();
            const viewModes = Object.keys(enhancedViewer.viewModes);
            const index = parseInt(e.key) - 1;
            if (viewModes[index]) {
                enhancedViewer.setViewMode(viewModes[index]);
                updateActiveTab(viewModes[index]);
            }
        }

        // Other shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'f':
                    // Focus search
                    e.preventDefault();
                    const searchInput = document.querySelector('.response-search');
                    if (searchInput) {
                        searchInput.focus();
                    }
                    break;
                case 'e':
                    // Export current data
                    e.preventDefault();
                    enhancedViewer.exportData('json');
                    break;
                case 'c':
                    // Copy current data
                    if (e.shiftKey) {
                        e.preventDefault();
                        enhancedViewer.copyToClipboard(JSON.stringify(enhancedViewer.currentData, null, 2));
                    }
                    break;
            }
        }

        // Tree view shortcuts
        if (enhancedViewer.currentView === 'tree') {
            switch (e.key) {
                case '+':
                case '=':
                    e.preventDefault();
                    enhancedViewer.expandAll();
                    break;
                case '-':
                    e.preventDefault();
                    enhancedViewer.collapseAll();
                    break;
            }
        }
    });
}

/**
 * Update active tab visually
 */
function updateActiveTab(viewMode) {
    document.querySelectorAll('.response-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.view === viewMode);
    });
}

/**
 * Display response data in the enhanced viewer
 */
export function displayResponseData(data, metadata = {}) {
    if (!enhancedViewer) {
        initResponseUI();
    }
    
    // Make viewer globally accessible for drill-down functionality
    window.responseViewer = enhancedViewer;
    
    // Add metadata to viewer if provided
    if (metadata.url) enhancedViewer.sourceUrl = metadata.url;
    if (metadata.method) enhancedViewer.sourceMethod = metadata.method;
    if (metadata.timestamp) enhancedViewer.timestamp = metadata.timestamp;
    
    // Display the data
    enhancedViewer.displayResponse(data);
    
    // Ensure tabs are created and visible - add a small delay to ensure DOM is ready
    setTimeout(() => {
        createViewModeTabs();
        
        // Update active tab to show we have data
        const tabs = document.querySelectorAll('.response-tab');
        if (tabs.length > 0) {
            tabs[0].classList.add('active'); // Make first tab active
        }
    }, 50);
    
    // Update UI state
    updateResponseInfo(data, metadata);
}

/**
 * Clear response data
 */
export function clearResponseData() {
    if (enhancedViewer) {
        enhancedViewer.currentData = null;
        const responseViewer = document.getElementById('response-viewer');
        if (responseViewer) {
            responseViewer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i data-feather="radio"></i>
                    </div>
                    <h3>Ready to Test</h3>
                    <p>Send a request to see enhanced response visualization</p>
                    <div class="empty-features">
                        <div class="feature-item">
                            <i data-feather="table"></i>
                            <span>Table View</span>
                        </div>
                        <div class="feature-item">
                            <i data-feather="git-branch"></i>
                            <span>Tree Explorer</span>
                        </div>
                        <div class="feature-item">
                            <i data-feather="bar-chart-2"></i>
                            <span>Data Statistics</span>
                        </div>
                        <div class="feature-item">
                            <i data-feather="file-text"></i>
                            <span>Schema Analysis</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

/**
 * Update response information display
 */
function updateResponseInfo(data, metadata) {
    const infoContainer = document.querySelector('.response-info');
    if (infoContainer && enhancedViewer.dataStats) {
        const stats = enhancedViewer.dataStats;
        const infoHtml = `
            <div class="response-meta">
                <span class="meta-item">
                    <strong>Nodes:</strong> ${stats.totalNodes.toLocaleString()}
                </span>
                <span class="meta-item">
                    <strong>Depth:</strong> ${stats.maxDepth}
                </span>
                <span class="meta-item">
                    <strong>Size:</strong> ${formatFileSize(JSON.stringify(data).length)}
                </span>
                ${metadata.timestamp ? `
                    <span class="meta-item">
                        <strong>Time:</strong> ${new Date(metadata.timestamp).toLocaleTimeString()}
                    </span>
                ` : ''}
            </div>
        `;
        infoContainer.innerHTML = infoHtml;
    }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get current viewer instance
 */
export function getViewer() {
    return enhancedViewer;
}
