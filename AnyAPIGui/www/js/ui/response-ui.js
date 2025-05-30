// UI for EnhancedResponseViewer
// Exported as ES6 module
import EnhancedResponseViewer from '../core/response-viewer.js';

let enhancedViewer;

export function initResponseUI() {
    enhancedViewer = new EnhancedResponseViewer();
    window.enhancedViewer = enhancedViewer;
    window.responseViewer = enhancedViewer; // Global reference for HTML event handlers
    window.displayResponseData = displayResponseData; // Make the function globally accessible

    // Initialize view mode tabs immediately and make them visible
    createViewModeTabs();
    
    // Initialize search functionality
    initSearchFeatures();
    
    // Initialize keyboard shortcuts
    initKeyboardShortcuts();
    
    // Set default view to raw
    enhancedViewer.setViewMode('raw');
    updateActiveTab('raw');

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
    if (!tabsContainer) {
        const responseContainer = document.querySelector('.response-viewer-optimized');
        if (responseContainer) {
            const tabsDiv = document.createElement('div');
            tabsDiv.className = 'response-tabs';
            tabsDiv.id = 'response-tabs';
            const responseHeader = responseContainer.querySelector('.response-header-enhanced');
            if (responseHeader) {
                responseHeader.insertAdjacentElement('afterend', tabsDiv);
            } else {
                responseContainer.insertBefore(tabsDiv, responseContainer.firstChild);
            }
            tabsContainer = tabsDiv;
        }
    }
    if (tabsContainer && enhancedViewer) {
        // Enhanced tab order: Raw, Formatted, Table, Tree, Schema, Search, Stats
        const tabOrder = [
            { key: 'raw', name: 'Raw JSON', icon: '📝' },
            { key: 'formatted', name: 'Formatted', icon: '🎨' },
            { key: 'table', name: 'Table', icon: '📊' },
            { key: 'tree', name: 'Tree', icon: '🌳' },
            { key: 'schema', name: 'Schema', icon: '📐' },
            { key: 'search', name: 'Search', icon: '🔍' },
            { key: 'stats', name: 'Stats', icon: '📈' }
        ];
        const tabsHtml = tabOrder.map(tab =>
            `<button class="response-tab${tab.key === 'raw' ? ' active' : ''}" data-view="${tab.key}" title="${tab.name}">
                <span class="tab-icon">${tab.icon}</span>
                <span class="tab-label">${tab.name}</span>
            </button>`
        ).join('');
        tabsContainer.innerHTML = tabsHtml;
        tabsContainer.querySelectorAll('.response-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const viewMode = tab.getAttribute('data-view');
                tabsContainer.querySelectorAll('.response-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                if (enhancedViewer) enhancedViewer.setViewMode(viewMode);
            });
        });
        tabsContainer.style.display = 'flex';
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
    
    // Ensure tabs are created and visible
    createViewModeTabs();
    
    // Show the tabs container
    const tabsContainer = document.querySelector('.response-tabs');
    if (tabsContainer) {
        tabsContainer.style.display = 'flex';
    }
    
    // Set default tab to Raw JSON
    setTimeout(() => {
        const tabs = document.querySelectorAll('.response-tab');
        if (tabs.length > 0) {
            tabs.forEach(tab => tab.classList.remove('active'));
            const rawTab = document.querySelector('.response-tab[data-view="raw"]');
            if (rawTab) {
                rawTab.classList.add('active');
                enhancedViewer.setViewMode('raw');
            } else {
                // Fallback to first tab
                tabs[0].classList.add('active');
                const firstView = tabs[0].getAttribute('data-view');
                enhancedViewer.setViewMode(firstView);
            }
        }
    }, 100);
    
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

// Helper function to create properly styled buttons
function createStyledButton(text, icon, onclick, type = 'outline') {
    return `<button class="btn btn-${type}" onclick="${onclick}">
        <i data-feather="${icon}"></i>
        ${text}
    </button>`;
}

// When creating action buttons, ensure they have the correct classes
function createActionButton(text, icon, onclick, type = 'outline') {
    return `<button class="btn btn-${type}" onclick="${onclick}">
        <i data-feather="${icon}"></i>
        ${text}
    </button>`;
}

// In stats view, make sure buttons use the classes
function createStatsView(data) {
    // ...existing code...
    
    const actionsHtml = `
        <div class="stats-actions">
            ${createStyledButton('Export CSV', 'download', 'responseViewer.exportData("csv")', 'outline')}
            ${createStyledButton('Export JSON', 'file-text', 'responseViewer.exportData("json")', 'outline')}
            ${createStyledButton('Copy Stats', 'copy', 'responseViewer.copyStats()', 'outline')}
        </div>
    `;
    
    // ...existing code...
}

// In table view, ensure buttons have classes
function createTableView(data) {
    // ...existing code...
    
    const actionsHtml = `
        <div class="table-actions">
            ${createStyledButton('Export CSV', 'download', 'responseViewer.exportTableData("csv")', 'outline')}
            ${createStyledButton('Export JSON', 'file-text', 'responseViewer.exportTableData("json")', 'outline')}
            ${createStyledButton('Expand All', 'maximize-2', 'responseViewer.expandAllCells()', 'outline')}
            ${createStyledButton('Collapse All', 'minimize-2', 'responseViewer.collapseAllCells()', 'outline')}
        </div>
    `;
    
    // ...existing code...
}

// In tree view, ensure buttons have classes
function createTreeView(data) {
    // ...existing code...
    
    const actionsHtml = `
        <div class="response-actions">
            ${createStyledButton('Expand All', 'chevrons-down', 'responseViewer.expandAllNodes()', 'outline')}
            ${createStyledButton('Collapse All', 'chevrons-up', 'responseViewer.collapseAllNodes()', 'outline')}
            ${createStyledButton('Export', 'download', 'responseViewer.exportTreeData()', 'outline')}
        </div>
    `;
    
    // ...existing code...
}

// Replace all button creation patterns with properly styled buttons
// Look for patterns like: `<button class="copy-formatted-btn">📋 Copy</button>`
// Replace with the createStyledButton helper function

// Update any hardcoded button HTML to use proper classes
// Example: Change from:
// `<button class="copy-formatted-btn">📋 Copy</button>`
// To:
// `${createStyledButton('Copy', 'copy', 'responseViewer.copyFormatted()', 'outline')}`

// Find and replace all instances of buttons without .btn classes
// Common patterns to replace:
// - copy-formatted-btn -> btn btn-outline
// - export-btn -> btn btn-outline  
// - expand-all-btn -> btn btn-outline
// - collapse-all-btn -> btn btn-outline
// - Any other custom button classes

// Example replacements throughout the file:
function updateButtonCreation() {
    // Replace hardcoded buttons with styled versions
    // This is a placeholder - the actual implementation would scan
    // and replace all button creation code
    
    // Stats view buttons
    const statsButtons = `
        <div class="stats-actions">
            ${createStyledButton('Export CSV', 'download', 'responseViewer.exportData("csv")', 'outline')}
            ${createStyledButton('Export JSON', 'file-text', 'responseViewer.exportData("json")', 'outline')}
            ${createStyledButton('Copy Stats', 'copy', 'responseViewer.copyStats()', 'outline')}
        </div>
    `;
    
    // Table view buttons  
    const tableButtons = `
        <div class="table-actions">
            ${createStyledButton('Export CSV', 'download', 'responseViewer.exportTableData("csv")', 'outline')}
            ${createStyledButton('Export JSON', 'file-text', 'responseViewer.exportTableData("json")', 'outline')}
            ${createStyledButton('Expand All', 'maximize-2', 'responseViewer.expandAllCells()', 'outline')}
            ${createStyledButton('Collapse All', 'minimize-2', 'responseViewer.collapseAllCells()', 'outline')}
        </div>
    `;
    
    // Tree view buttons
    const treeButtons = `
        <div class="response-actions">
            ${createStyledButton('Expand All', 'chevrons-down', 'responseViewer.expandAllNodes()', 'outline')}
            ${createStyledButton('Collapse All', 'chevrons-up', 'responseViewer.collapseAllNodes()', 'outline')}
            ${createStyledButton('Export', 'download', 'responseViewer.exportTreeData()', 'outline')}
        </div>
    `;
    
    // Raw/Formatted JSON view buttons
    const jsonButtons = `
        <div class="response-actions">
            ${createStyledButton('Copy', 'copy', 'responseViewer.copyFormatted()', 'outline')}
            ${createStyledButton('Download', 'download', 'responseViewer.downloadJSON()', 'outline')}
            ${createStyledButton('Validate', 'check-circle', 'responseViewer.validateJSON()', 'outline')}
        </div>
    `;
}

// Apply the button class fix globally by scanning for old button patterns
// and replacing them with the new styled button helper
document.addEventListener('DOMContentLoaded', () => {
    // Fix any existing buttons that don't have proper classes
    setTimeout(() => {
        const oldButtons = document.querySelectorAll('button:not(.btn)');
        oldButtons.forEach(button => {
            if (button.closest('.response-viewer-optimized, .stats-container, .table-container')) {
                // Add btn classes to existing buttons
                button.classList.add('btn', 'btn-outline');
            }
        });
    }, 500);
});
