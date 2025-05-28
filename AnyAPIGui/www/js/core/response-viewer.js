// Core EnhancedResponseViewer class (logic only, no direct DOM manipulation)
// Exported as ES6 module
import { formatJson, escapeHtml } from './utils.js';

class EnhancedResponseViewer {
    constructor() {
        this.currentData = null;
        this.currentView = 'raw';
        this.searchQuery = '';
        this.selectedPath = [];
        this.expandedNodes = new Set();
        
        // View configurations
        this.viewModes = {
            raw: { name: 'Raw JSON', icon: '📝' },
            table: { name: 'Table', icon: '📊' },
            list: { name: 'List', icon: '📋' },
            tree: { name: 'Tree', icon: '🌳' },
            search: { name: 'Search', icon: '🔍' }
        };
    }

    /**
     * Display response data in the viewer
     */
    displayResponse(data) {
        this.currentData = data;
        this.renderCurrentView();
    }

    /**
     * Render the current view mode
     */
    renderCurrentView() {
        if (!this.currentData) return;

        const responseViewer = document.getElementById('response-viewer');
        if (!responseViewer) return;

        switch (this.currentView) {
            case 'raw':
                this.renderRawView();
                break;
            case 'table':
                this.renderTableView();
                break;
            case 'list':
                this.renderListView();
                break;
            case 'tree':
                this.renderTreeView();
                break;
            case 'search':
                this.renderSearchView();
                break;
            default:
                this.renderRawView();
        }
    }

    /**
     * Render raw JSON view
     */
    renderRawView() {
        const responseViewer = document.getElementById('response-viewer');
        if (responseViewer) {
            responseViewer.innerHTML = `<pre>${formatJson(this.currentData)}</pre>`;
        }
    }

    /**
     * Render table view (simplified for arrays of objects)
     */
    renderTableView() {
        const responseViewer = document.getElementById('response-viewer');
        if (!responseViewer) return;

        if (Array.isArray(this.currentData) && this.currentData.length > 0) {
            const firstItem = this.currentData[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
                const headers = Object.keys(firstItem);
                let tableHtml = `
                    <table class="response-table">
                        <thead>
                            <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                `;
                
                this.currentData.forEach(item => {
                    tableHtml += '<tr>';
                    headers.forEach(header => {
                        const value = item[header];
                        const displayValue = typeof value === 'object' 
                            ? JSON.stringify(value) 
                            : String(value);
                        tableHtml += `<td>${escapeHtml(displayValue)}</td>`;
                    });
                    tableHtml += '</tr>';
                });
                
                tableHtml += '</tbody></table>';
                responseViewer.innerHTML = tableHtml;
                return;
            }
        }
        
        // Fallback to raw view if not suitable for table
        this.renderRawView();
    }

    /**
     * Render list view
     */
    renderListView() {
        const responseViewer = document.getElementById('response-viewer');
        if (!responseViewer) return;

        if (Array.isArray(this.currentData)) {
            const listHtml = `
                <div class="response-list">
                    ${this.currentData.map((item, index) => `
                        <div class="list-item">
                            <div class="list-index">${index}</div>
                            <div class="list-content">
                                <pre>${formatJson(item)}</pre>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            responseViewer.innerHTML = listHtml;
        } else {
            // For non-arrays, show object properties as list
            const entries = Object.entries(this.currentData || {});
            const listHtml = `
                <div class="response-list">
                    ${entries.map(([key, value]) => `
                        <div class="list-item">
                            <div class="list-key">${escapeHtml(key)}</div>
                            <div class="list-value">
                                <pre>${formatJson(value)}</pre>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            responseViewer.innerHTML = listHtml;
        }
    }

    /**
     * Render tree view (simplified)
     */
    renderTreeView() {
        const responseViewer = document.getElementById('response-viewer');
        if (responseViewer) {
            responseViewer.innerHTML = `
                <div class="tree-view">
                    ${this.renderTreeNode(this.currentData, [], 'root')}
                </div>
            `;
        }
    }

    /**
     * Render a tree node recursively
     */
    renderTreeNode(data, path, key) {
        const nodeId = `tree-${path.join('-')}-${key}`;
        const isExpanded = this.expandedNodes.has(nodeId);
        
        if (typeof data === 'object' && data !== null) {
            const entries = Array.isArray(data) 
                ? data.map((item, index) => [index, item])
                : Object.entries(data);
                
            const toggleIcon = isExpanded ? '▼' : '▶';
            const typeLabel = Array.isArray(data) ? `Array[${data.length}]` : 'Object';
            
            let html = `
                <div class="tree-node">
                    <div class="tree-header" onclick="this.parentElement.classList.toggle('expanded')">
                        <span class="tree-toggle">${toggleIcon}</span>
                        <span class="tree-key">${escapeHtml(key)}</span>
                        <span class="tree-type">${typeLabel}</span>
                    </div>
            `;
            
            if (isExpanded || entries.length <= 5) {
                html += '<div class="tree-children">';
                entries.forEach(([childKey, childValue]) => {
                    html += this.renderTreeNode(childValue, [...path, key], childKey);
                });
                html += '</div>';
            }
            
            html += '</div>';
            return html;
        } else {
            return `
                <div class="tree-leaf">
                    <span class="tree-key">${escapeHtml(key)}</span>
                    <span class="tree-value">${escapeHtml(String(data))}</span>
                </div>
            `;
        }
    }

    /**
     * Render search view
     */
    renderSearchView() {
        const responseViewer = document.getElementById('response-viewer');
        if (!responseViewer) return;

        if (!this.searchQuery) {
            responseViewer.innerHTML = `
                <div class="search-prompt">
                    <p>Enter a search term to find values in the response data.</p>
                </div>
            `;
            return;
        }

        const results = this.performSearch();
        const resultsHtml = `
            <div class="search-results">
                <div class="search-header">Found ${results.length} matches for "${escapeHtml(this.searchQuery)}"</div>
                ${results.map(result => `
                    <div class="search-result">
                        <div class="search-path">${result.path.join(' → ')}</div>
                        <div class="search-value">${escapeHtml(String(result.value))}</div>
                    </div>
                `).join('')}
            </div>
        `;
        responseViewer.innerHTML = resultsHtml;
    }

    /**
     * Perform search on current data
     */
    performSearch() {
        if (!this.currentData || !this.searchQuery) return [];
        
        const results = [];
        const query = this.searchQuery.toLowerCase();
        
        const searchRecursive = (obj, path = []) => {
            if (typeof obj === 'object' && obj !== null) {
                Object.entries(obj).forEach(([key, value]) => {
                    const currentPath = [...path, key];
                    
                    // Search in key names
                    if (key.toLowerCase().includes(query)) {
                        results.push({ path: currentPath, value, type: 'key' });
                    }
                    
                    // Search in values
                    if (typeof value === 'string' && value.toLowerCase().includes(query)) {
                        results.push({ path: currentPath, value, type: 'value' });
                    } else if (typeof value === 'number' && String(value).includes(query)) {
                        results.push({ path: currentPath, value, type: 'value' });
                    }
                    
                    // Recurse into objects/arrays
                    if (typeof value === 'object' && value !== null) {
                        searchRecursive(value, currentPath);
                    }
                });
            }
        };
        
        searchRecursive(this.currentData);
        return results;
    }

    /**
     * Set search query and re-render if in search view
     */
    setSearchQuery(query) {
        this.searchQuery = query;
        if (this.currentView === 'search') {
            this.renderSearchView();
        }
    }

    /**
     * Switch view mode
     */
    setViewMode(mode) {
        if (this.viewModes[mode]) {
            this.currentView = mode;
            this.renderCurrentView();
        }
    }
}

export default EnhancedResponseViewer;
