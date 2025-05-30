// Core EnhancedResponseViewer class (logic only, no direct DOM manipulation)
// Using global functions from utils.js (loaded via script tag)

class EnhancedResponseViewer {
    constructor() {
        this.currentData = null;
        this.currentView = 'raw';
        this.searchQuery = '';
        this.selectedPath = [];
        this.expandedNodes = new Set();
        this.dataStats = null;
        this.dataSchema = null;
        this.exportFormats = ['json', 'csv', 'xml'];
        
        // View configurations
        this.viewModes = {
            raw: { name: 'Raw JSON', icon: '📝' },
            formatted: { name: 'Formatted', icon: '✨' },
            table: { name: 'Table', icon: '📊' },
            tree: { name: 'Tree', icon: '🌳' },
            schema: { name: 'Schema', icon: '🏗️' },
            stats: { name: 'Statistics', icon: '📈' },
            search: { name: 'Search', icon: '🔍' }
        };
        
        // Analysis settings
        this.analysisOptions = {
            maxTableRows: 1000,
            maxTreeDepth: 10,
            enableTypeDetection: true,
            enablePatternRecognition: true
        };
    }    /**
     * Display response data in the viewer
     */
    displayResponse(data) {
        this.currentData = data;
        this.analyzeData();
        this.renderCurrentView();
    }

    /**
     * Analyze the response data for statistics and schema
     */
    analyzeData() {
        if (!this.currentData) return;

        this.dataStats = this.generateStatistics(this.currentData);
        this.dataSchema = this.generateSchema(this.currentData);
    }

    /**
     * Generate comprehensive statistics about the data
     */
    generateStatistics(data, path = [], stats = null) {
        if (!stats) {
            stats = {
                totalNodes: 0,
                totalArrays: 0,
                totalObjects: 0,
                totalPrimitives: 0,
                maxDepth: 0,
                dataTypes: {},
                arrayLengths: [],
                objectSizes: [],
                patterns: {
                    emails: 0,
                    urls: 0,
                    dates: 0,
                    ids: 0
                },
                nullValues: 0,
                duplicateValues: new Map()
            };
        }

        stats.totalNodes++;
        stats.maxDepth = Math.max(stats.maxDepth, path.length);

        if (data === null || data === undefined) {
            stats.nullValues++;
            return stats;
        }

        const dataType = Array.isArray(data) ? 'array' : typeof data;
        stats.dataTypes[dataType] = (stats.dataTypes[dataType] || 0) + 1;

        if (Array.isArray(data)) {
            stats.totalArrays++;
            stats.arrayLengths.push(data.length);
            data.forEach((item, index) => 
                this.generateStatistics(item, [...path, index], stats)
            );
        } else if (typeof data === 'object') {
            stats.totalObjects++;
            const keys = Object.keys(data);
            stats.objectSizes.push(keys.length);
            keys.forEach(key => 
                this.generateStatistics(data[key], [...path, key], stats)
            );
        } else {
            stats.totalPrimitives++;
            
            // Pattern recognition for strings
            if (typeof data === 'string') {
                this.detectPatterns(data, stats.patterns);
                
                // Track duplicate values
                const count = stats.duplicateValues.get(data) || 0;
                stats.duplicateValues.set(data, count + 1);
            }
        }

        return stats;
    }

    /**
     * Detect common patterns in string data
     */
    detectPatterns(str, patterns) {
        // Email pattern
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
            patterns.emails++;
        }
        
        // URL pattern
        if (/^https?:\/\//.test(str)) {
            patterns.urls++;
        }
        
        // Date pattern (ISO format)
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
            patterns.dates++;
        }
        
        // ID pattern (UUID or number-like)
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) || 
            /^\d+$/.test(str)) {
            patterns.ids++;
        }
    }

    /**
     * Generate schema information (removes minLength/maxLength from output)
     */
    generateSchema(data, path = []) {
        if (data === null || data === undefined) {
            return { type: 'null', nullable: true };
        }
        if (Array.isArray(data)) {
            const itemSchemas = data.map(item => this.generateSchema(item, path));
            const uniqueSchemas = this.mergeSchemas(itemSchemas);
            return {
                type: 'array',
                items: uniqueSchemas.length === 1 ? uniqueSchemas[0] : { oneOf: uniqueSchemas },
                length: data.length
            };
        }
        if (typeof data === 'object') {
            const properties = {};
            const required = [];
            Object.keys(data).forEach(key => {
                properties[key] = this.generateSchema(data[key], [...path, key]);
                if (data[key] !== null && data[key] !== undefined) {
                    required.push(key);
                }
            });
            return {
                type: 'object',
                properties,
                required,
                additionalProperties: false
            };
        }
        // Primitive types
        const schema = { type: typeof data };
        if (typeof data === 'string') {
            // Add format hints only
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
                schema.format = 'email';
            } else if (/^https?:\/\//.test(data)) {
                schema.format = 'uri';
            } else if (/^\d{4}-\d{2}-\d{2}/.test(data)) {
                schema.format = 'date-time';
            }
        } else if (typeof data === 'number') {
            // Do not add minimum/maximum for schema
        }
        return schema;
    }

    /**
     * Merge multiple schemas into unique ones
     */
    mergeSchemas(schemas) {
        const schemaMap = new Map();
        
        schemas.forEach(schema => {
            const key = JSON.stringify(schema);
            if (!schemaMap.has(key)) {
                schemaMap.set(key, schema);
            }
        });
        
        return Array.from(schemaMap.values());
    }    /**
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
            case 'formatted':
                this.renderFormattedView();
                break;
            case 'table':
                this.renderTableView();
                break;
            case 'tree':
                this.renderTreeView();
                break;
            case 'schema':
                this.renderSchemaView();
                break;
            case 'stats':
                this.renderStatsView();
                break;
            case 'search':
                this.renderSearchView();
                break;
            default:
                this.renderRawView();
        }
    }    /**
     * Render raw JSON view
     */
    renderRawView() {
        const responseViewer = document.getElementById('response-viewer');
        if (responseViewer) {        const rawContent = JSON.stringify(this.currentData, null, 2);
        responseViewer.innerHTML = `
            <div class="view-header">
                <h3>Raw JSON</h3>
                <div class="view-actions">
                    <button class="copy-raw-btn">📋 Copy</button>
                    <button class="export-raw-btn">💾 Export</button>
                </div>
            </div>
            <pre class="raw-json modern-scrollbar">${escapeHtml(rawContent)}</pre>
        `;
            
            // Add event listeners
            const copyBtn = responseViewer.querySelector('.copy-raw-btn');
            const exportBtn = responseViewer.querySelector('.export-raw-btn');
            
            if (copyBtn) {
                copyBtn.addEventListener('click', () => this.copyToClipboard(rawContent));
            }
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportData('json'));
            }
        }
    }    /**
     * Render formatted JSON view with syntax highlighting
     */
    renderFormattedView() {
        const responseViewer = document.getElementById('response-viewer');
        if (responseViewer) {
            const syntaxHighlightedContent = this.syntaxHighlightJson(this.currentData);
            responseViewer.innerHTML = `
                <div class="view-header">
                    <h3>Formatted JSON</h3>
                    <div class="view-actions">
                        <button class="copy-formatted-btn">📋 Copy</button>
                        <button class="export-formatted-btn">💾 Export</button>
                    </div>
                </div>
                <div class="formatted-json modern-scrollbar">${syntaxHighlightedContent}</div>
            `;
            
            // Add event listeners
            const copyBtn = responseViewer.querySelector('.copy-formatted-btn');
            const exportBtn = responseViewer.querySelector('.export-formatted-btn');
            
            if (copyBtn) {
                const rawContent = JSON.stringify(this.currentData, null, 2);
                copyBtn.addEventListener('click', () => this.copyToClipboard(rawContent));
            }
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportData('json'));
            }
        }
    }/**
     * Render enhanced table view with complex object support
     */
    renderTableView() {
        const responseViewer = document.getElementById('response-viewer');
        if (!responseViewer) return;

        // Handle different data types for table view
        let tableData = this.prepareTableData(this.currentData);
        
        if (!tableData || tableData.length === 0) {
            responseViewer.innerHTML = `
                <div class="view-message">
                    <p>Data cannot be displayed in table format. Try Tree or Raw view instead.</p>
                </div>
            `;
            return;
        }

        // Limit rows for performance
        const displayData = tableData.slice(0, this.analysisOptions.maxTableRows);
        const hasMoreRows = tableData.length > this.analysisOptions.maxTableRows;

        const headers = this.extractTableHeaders(displayData);
        
        // Track navigation stack for drill-down
        if (!this.tableNavStack) this.tableNavStack = [];
        let showBack = this.tableNavStack.length > 0;
        let tableHtml = `
            <div class="view-header">
                <h3>Table View</h3>
                <div class="table-info">
                    Showing ${displayData.length} of ${tableData.length} rows
                    ${hasMoreRows ? `(${tableData.length - displayData.length} more)` : ''}
                </div>
                <div class="view-actions">
                    <button class="export-csv-btn">📊 Export CSV</button>
                    <button class="toggle-table-btn">🔄 Toggle Mode</button>
                    ${showBack ? '<button class="table-back-btn">⬅️ Back</button>' : ''}
                </div>
            </div>
            <div class="table-container modern-scrollbar">
                <table class="enhanced-table">
                    <thead>
                        <tr>                            ${headers.map(header => `
                                <th class="sortable-header" data-column="${header}">
                                    ${escapeHtml(header)}
                                    <span class="sort-indicator">⇅</span>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;
          displayData.forEach((item, rowIdx) => {
            tableHtml += '<tr>';
            headers.forEach(header => {
                const value = this.getNestedValue(item, header);
                let cellContent = '';
                if (value && typeof value === 'object') {
                    cellContent = `<span class="${Array.isArray(value) ? 'array-value' : 'object-value'}" data-table-drill="${rowIdx}.${header}">${Array.isArray(value) ? `[${value.length} items]` : '{object}'}</span>`;
                } else {
                    cellContent = this.formatTableCell(value);
                }
                const cellClass = this.getTableCellClass(value);
                tableHtml += `<td class="${cellClass}" title="${escapeHtml(String(value))}">${cellContent}</td>`;
            });
            tableHtml += '</tr>';
        });
        
        tableHtml += '</tbody></table></div>';
          if (hasMoreRows) {
            tableHtml += `
                <div class="table-pagination">
                    <button class="load-more-btn">Load More Rows</button>
                </div>
            `;
        }
        
        responseViewer.innerHTML = tableHtml;
        
        // Add event listeners for table interactions
        const exportCsvBtn = responseViewer.querySelector('.export-csv-btn');
        const toggleTableBtn = responseViewer.querySelector('.toggle-table-btn');
        const loadMoreBtn = responseViewer.querySelector('.load-more-btn');
        const backBtn = responseViewer.querySelector('.table-back-btn');
        
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportData('csv'));
        }
        if (toggleTableBtn) {
            toggleTableBtn.addEventListener('click', () => this.toggleTableMode());
        }
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreTableRows());
        }
        if (backBtn) {
            backBtn.addEventListener('click', () => this.tableBack());
        }
        
        // Drill-down event delegation
        responseViewer.querySelector('.table-container').addEventListener('click', e => {
            const drill = e.target.getAttribute('data-table-drill');
            if (drill) {
                const [rowIdx, ...headerParts] = drill.split('.');
                const header = headerParts.join('.');
                const item = displayData[parseInt(rowIdx, 10)];
                const value = this.getNestedValue(item, header);
                if (value !== undefined) {
                    // Push current data to stack for back navigation
                    this.tableNavStack.push(this.currentData);
                    this.currentData = value;
                    this.analyzeData();
                    this.renderCurrentView();
                }
            }
        });
        
        // Add click listeners for sortable headers
        responseViewer.querySelectorAll('.sortable-header').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-column');
                this.sortTable(column);
            });
        });
    }

    /**
     * Go back to previous table data
     */
    tableBack() {
        if (this.tableNavStack && this.tableNavStack.length > 0) {
            this.currentData = this.tableNavStack.pop();
            this.analyzeData();
            this.renderCurrentView();
        }
    }    /**
     * Prepare data for table display
     */
    prepareTableData(data) {
        if (Array.isArray(data)) {
            return data.filter(item => item && typeof item === 'object');
        } else if (typeof data === 'object' && data !== null) {
            // Convert object to array of key-value pairs
            return Object.entries(data).map(([key, value]) => ({
                key: key,
                value: value,
                type: Array.isArray(value) ? 'array' : typeof value
            }));
        }
        return null;
    }

    /**
     * Extract all possible headers from table data
     */
    extractTableHeaders(data) {
        const headers = new Set();
        
        data.forEach(item => {
            if (typeof item === 'object' && item !== null) {
                Object.keys(item).forEach(key => headers.add(key));
            }
        });
        
        return Array.from(headers);
    }

    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        if (!path || typeof obj !== 'object') return obj;
        
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }    /**
     * Format cell value for table display
     */
    formatTableCell(value, path = '') {
        if (value === null || value === undefined) {
            return '<span class="null-value">null</span>';
        }
        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                return `<span class="array-value" onclick="window.responseViewer?.drillDownToNestedData('${path}', 'array')">[${value.length} items]</span>`;
            }
            return `<span class="object-value" onclick="window.responseViewer?.drillDownToNestedData('${path}', 'object')">{object}</span>`;
        }
        if (typeof value === 'string') {
            if (value.length > 50) {
                return `<span class="truncated-value" title="${escapeHtml(value)}">${escapeHtml(value.substring(0, 47))}...</span>`;
            }
            return escapeHtml(value);
        }
        if (typeof value === 'boolean') {
            return `<span class="boolean-value ${value ? 'true' : 'false'}">${value}</span>`;
        }
        return escapeHtml(String(value));
    }

    /**
     * Get CSS class for table cell based on value type
     */
    getTableCellClass(value) {
        if (value === null || value === undefined) return 'cell-null';
        if (typeof value === 'number') return 'cell-number';
        if (typeof value === 'boolean') return 'cell-boolean';
        if (typeof value === 'string') return 'cell-string';
        if (Array.isArray(value)) return 'cell-array';
        if (typeof value === 'object') return 'cell-object';
        return 'cell-default';
    }    /**
     * Render schema view showing data structure
     */
    renderSchemaView() {
        const responseViewer = document.getElementById('response-viewer');
        if (!responseViewer) return;

        if (!this.dataSchema) {
            responseViewer.innerHTML = '<div class="view-message">Schema analysis not available</div>';
            return;
        }

        // Convert schema to properly formatted JSON
        const schemaJson = JSON.stringify(this.dataSchema, null, 2);
        const syntaxHighlightedSchema = this.syntaxHighlightJson(this.dataSchema);

        // Only one view is visible at a time: default to JSON view
        const schemaHtml = `
            <div class="view-header">
                <h3>Data Schema</h3>
                <div class="view-actions">
                    <button class="export-schema-btn">📋 Export Schema</button>
                    <button class="generate-docs-btn">📖 Generate Docs</button>
                    <button class="toggle-schema-format-btn">🔄 Toggle Format</button>
                </div>
            </div>
            <div class="schema-view">
                <div class="schema-json-view active" style="display:block;">
                    <div class="formatted-json">${syntaxHighlightedSchema}</div>
                </div>
                <div class="schema-tree-view" style="display:none;">
                    ${this.renderSchemaNode(this.dataSchema, 'root', 0)}
                </div>
            </div>
        `;
        responseViewer.innerHTML = schemaHtml;

        // Add event listeners for schema actions
        const exportSchemaBtn = responseViewer.querySelector('.export-schema-btn');
        const generateDocsBtn = responseViewer.querySelector('.generate-docs-btn');
        const toggleFormatBtn = responseViewer.querySelector('.toggle-schema-format-btn');
        
        if (exportSchemaBtn) {
            exportSchemaBtn.addEventListener('click', () => this.exportData('schema'));
        }
        if (generateDocsBtn) {
            generateDocsBtn.addEventListener('click', () => this.generateDocumentation());
        }
        if (toggleFormatBtn) {
            toggleFormatBtn.addEventListener('click', () => this.toggleSchemaFormat());
        }
    }

    /**
     * Render a schema node recursively
     */
    renderSchemaNode(schema, name, depth) {
        const indent = '  '.repeat(depth);
        let html = `<div class="schema-node depth-${depth}">`;
        
        if (schema.type === 'object') {
            html += `
                <div class="schema-header">
                    <span class="schema-name">${escapeHtml(name)}</span>
                    <span class="schema-type">object</span>
                    ${schema.required ? `<span class="schema-required">${schema.required.length} required</span>` : ''}
                </div>
            `;
            
            if (schema.properties) {
                html += '<div class="schema-properties">';
                Object.entries(schema.properties).forEach(([propName, propSchema]) => {
                    const isRequired = schema.required && schema.required.includes(propName);
                    html += `
                        <div class="schema-property ${isRequired ? 'required' : 'optional'}">
                            ${this.renderSchemaNode(propSchema, propName, depth + 1)}
                        </div>
                    `;
                });
                html += '</div>';
            }
        } else if (schema.type === 'array') {
            html += `
                <div class="schema-header">
                    <span class="schema-name">${escapeHtml(name)}</span>
                    <span class="schema-type">array</span>
                    ${schema.length !== undefined ? `<span class="schema-length">${schema.length} items</span>` : ''}
                </div>
            `;
            
            if (schema.items) {
                html += '<div class="schema-items">';
                if (schema.items.oneOf) {
                    schema.items.oneOf.forEach((itemSchema, index) => {
                        html += `<div class="schema-variant">Variant ${index + 1}:`;
                        html += this.renderSchemaNode(itemSchema, 'item', depth + 1);
                        html += '</div>';
                    });
                } else {
                    html += this.renderSchemaNode(schema.items, 'items', depth + 1);
                }
                html += '</div>';
            }
        } else {
            // Primitive type
            html += `
                <div class="schema-primitive">
                    <span class="schema-name">${escapeHtml(name)}</span>
                    <span class="schema-type">${schema.type}</span>
                    ${schema.format ? `<span class="schema-format">${schema.format}</span>` : ''}
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Render statistics view
     */
    renderStatsView() {
        const responseViewer = document.getElementById('response-viewer');
        if (!responseViewer) return;

        if (!this.dataStats) {
            responseViewer.innerHTML = '<div class="view-message">Statistics not available</div>';
            return;
        }

        const stats = this.dataStats;
        const duplicates = Array.from(stats.duplicateValues.entries())
            .filter(([value, count]) => count > 1)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        // Modern compact summary row
        const summaryRow = `
            <div class="stats-summary-row">
                <div class="stats-summary-item" title="Total Nodes"><span>🧩</span> ${stats.totalNodes.toLocaleString()}<div class="stats-summary-label">Nodes</div></div>
                <div class="stats-summary-item" title="Objects"><span>🗂️</span> ${stats.totalObjects.toLocaleString()}<div class="stats-summary-label">Objects</div></div>
                <div class="stats-summary-item" title="Arrays"><span>📚</span> ${stats.totalArrays.toLocaleString()}<div class="stats-summary-label">Arrays</div></div>
                <div class="stats-summary-item" title="Primitives"><span>🔢</span> ${stats.totalPrimitives.toLocaleString()}<div class="stats-summary-label">Primitives</div></div>
                <div class="stats-summary-item" title="Null Values"><span>⛔</span> ${stats.nullValues.toLocaleString()}<div class="stats-summary-label">Nulls</div></div>
                <div class="stats-summary-item" title="Max Depth"><span>🌳</span> ${stats.maxDepth}<div class="stats-summary-label">Max Depth</div></div>
            </div>
        `;

        // Data type distribution with bars
        const typeDist = Object.entries(stats.dataTypes).map(([type, count]) => {
            const percent = ((count / stats.totalNodes) * 100).toFixed(1);
            return `<div class="stats-type-row"><span class="stats-type-label">${type}</span><div class="stats-type-bar"><div class="stats-type-bar-fill" style="width:${percent}%;"></div></div><span class="stats-type-count">${count.toLocaleString()} <span class="stats-type-percent">(${percent}%)</span></span></div>`;
        }).join('');

        // Pattern analysis
        const patterns = [
            { icon: '✉️', label: 'Emails', value: stats.patterns.emails },
            { icon: '🔗', label: 'URLs', value: stats.patterns.urls },
            { icon: '📅', label: 'Dates', value: stats.patterns.dates },
            { icon: '🆔', label: 'IDs', value: stats.patterns.ids }
        ].map(p => `<div class="stats-pattern"><span>${p.icon}</span> <span class="stats-pattern-label">${p.label}</span> <span class="stats-pattern-value">${p.value.toLocaleString()}</span></div>`).join('');

        // Duplicates
        const duplicatesHtml = duplicates.length > 0 ? `
            <div class="stats-card stats-duplicates">
                <div class="stats-card-title">Top Duplicates</div>
                <div class="stats-duplicates-list">
                    <div class="stats-duplicates-header">
                        <span class="stats-duplicate-value-header">Value</span>
                        <span class="stats-duplicate-count-header">Count</span>
                    </div>
                    <div class="stats-duplicates-scroll">
                    ${duplicates.map(([value, count], idx) => `
                        <div class="stats-duplicate-row${idx % 2 === 1 ? ' alt' : ''}" title="${escapeHtml(String(value))}">
                            <span class="stats-duplicate-value">${escapeHtml(String(value)).substring(0, 32)}${String(value).length > 32 ? '…' : ''}</span>
                            <span class="stats-duplicate-count">×${count}</span>
                        </div>
                    `).join('')}
                    </div>
                </div>
            </div>
        ` : '';

        // Main grid layout
        const statsHtml = `
            <div class="stats-modern">
                <div class="view-header compact">
                    <h3>Data Statistics</h3>
                    <div class="view-actions">
                        <button class="export-stats-btn">📊 Export Stats</button>
                        <button class="generate-report-btn">📄 Generate Report</button>
                    </div>
                </div>
                ${summaryRow}
                <div class="stats-grid">
                    <div class="stats-card stats-types">
                        <div class="stats-card-title">Type Distribution</div>
                        <div class="stats-types-list">${typeDist}</div>
                    </div>
                    <div class="stats-card stats-patterns">
                        <div class="stats-card-title">Pattern Analysis</div>
                        <div class="stats-patterns-list">${patterns}</div>
                    </div>
                    ${duplicatesHtml}
                </div>
            </div>
        `;
        responseViewer.innerHTML = statsHtml;

        // Add event listeners for stats actions
        const exportStatsBtn = responseViewer.querySelector('.export-stats-btn');
        const generateReportBtn = responseViewer.querySelector('.generate-report-btn');
        if (exportStatsBtn) {
            exportStatsBtn.addEventListener('click', () => this.exportData('stats'));
        }
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => this.generateStatsReport());
        }
    }/**
     * Render enhanced tree view with better interaction
     */
    renderTreeView() {
        const responseViewer = document.getElementById('response-viewer');
        if (!responseViewer) return;
          const treeHtml = `
            <div class="view-header">
                <h3>Tree View</h3>
                <div class="view-actions">
                    <button class="expand-all-btn">➕ Expand All</button>
                    <button class="collapse-all-btn">➖ Collapse All</button>
                    <button class="export-tree-btn">💾 Export</button>
                </div>
            </div>
            <div class="tree-view enhanced modern-scrollbar">
                ${this.renderTreeNode(this.currentData, [], 'root', 0)}
            </div>
        `;
        
        responseViewer.innerHTML = treeHtml;
        
        // Add event listeners for tree actions
        const expandAllBtn = responseViewer.querySelector('.expand-all-btn');
        const collapseAllBtn = responseViewer.querySelector('.collapse-all-btn');
        const exportTreeBtn = responseViewer.querySelector('.export-tree-btn');
        
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', () => this.expandAll());
        }
        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', () => this.collapseAll());
        }
        if (exportTreeBtn) {
            exportTreeBtn.addEventListener('click', () => this.exportData('json'));
        }
        // Event delegation for expand/collapse (only toggle when clicking .tree-toggle)
        responseViewer.querySelector('.tree-view').addEventListener('click', e => {
            if (e.target.classList.contains('tree-toggle')) {
                const header = e.target.closest('.tree-header');
                if (header) {
                    const nodeId = header.parentElement.getAttribute('data-node-id');
                    const pathStr = header.parentElement.getAttribute('data-path');
                    this.toggleTreeNode(nodeId, pathStr);
                }
            }
        });
    }

    /**
     * Render a tree node recursively with enhanced features
     */
    renderTreeNode(data, path, key, depth = 0) {
        const nodeId = `tree-${path.join('-')}-${key}`;
        const pathStr = [...path, key].join('.');
        const isExpanded = this.expandedNodes.has(nodeId) || depth < 2; // Auto-expand first 2 levels
        const isSelected = this.selectedPath.join('.') === pathStr;
        
        if (data === null || data === undefined) {
            return `
                <div class="tree-leaf null-value" data-path="${pathStr}">
                    <span class="tree-key">${escapeHtml(String(key))}</span>
                    <span class="tree-value null">null</span>
                </div>
            `;
        }
        
        if (typeof data === 'object') {
            const entries = Array.isArray(data) 
                ? data.map((item, index) => [index, item])
                : Object.entries(data);
                
            const toggleIcon = isExpanded ? '▼' : '▶';
            const typeLabel = Array.isArray(data) ? `Array[${data.length}]` : `Object{${entries.length}}`;
            const typeClass = Array.isArray(data) ? 'array' : 'object';
            
            let html = `
                <div class="tree-node ${typeClass} ${isExpanded ? 'expanded' : 'collapsed'} ${isSelected ? 'selected' : ''}" 
                     data-path="${pathStr}" data-node-id="${nodeId}">
                    <div class="tree-header" onclick="window.responseViewer?.toggleTreeNode('${nodeId}', '${pathStr}')">
                        <span class="tree-toggle">${toggleIcon}</span>
                        <span class="tree-key">${escapeHtml(String(key))}</span>
                        <span class="tree-type ${typeClass}">${typeLabel}</span>
                        <span class="tree-actions">
                            <button class="tree-action" onclick="event.stopPropagation(); window.responseViewer?.copyPath('${pathStr}')" title="Copy path">📋</button>
                            <button class="tree-action" onclick="event.stopPropagation(); window.responseViewer?.selectNode('${pathStr}')" title="Select">🎯</button>
                        </span>
                    </div>
            `;
            
            if (isExpanded && depth < this.analysisOptions.maxTreeDepth) {
                html += '<div class="tree-children">';
                entries.forEach(([childKey, childValue]) => {
                    html += this.renderTreeNode(childValue, [...path, key], childKey, depth + 1);
                });
                html += '</div>';
            } else if (depth >= this.analysisOptions.maxTreeDepth) {
                html += '<div class="tree-depth-limit">Maximum depth reached...</div>';
            }
            
            html += '</div>';
            return html;
        } else {
            // Primitive value
            const valueType = typeof data;
            const valueClass = this.getValueClass(data);
            const displayValue = this.formatTreeValue(data);
            
            return `
                <div class="tree-leaf ${valueClass}" data-path="${pathStr}">
                    <span class="tree-key">${escapeHtml(String(key))}</span>
                    <span class="tree-value ${valueType}">${displayValue}</span>
                    <span class="tree-actions">
                        <button class="tree-action" onclick="window.responseViewer?.copyValue('${escapeHtml(String(data))}')" title="Copy value">📋</button>
                    </span>
                </div>
            `;
        }
    }

    /**
     * Get CSS class for value based on its content
     */
    getValueClass(value) {
        if (value === null || value === undefined) return 'null-value';
        if (typeof value === 'boolean') return 'boolean-value';
        if (typeof value === 'number') return 'number-value';
        if (typeof value === 'string') {
            if (/^https?:\/\//.test(value)) return 'url-value';
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email-value';
            if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date-value';
            return 'string-value';
        }
        return 'default-value';
    }

    /**
     * Format value for tree display
     */
    formatTreeValue(value) {
        if (value === null || value === undefined) {
            return '<span class="null">null</span>';
        }
        
        if (typeof value === 'string') {
            // Truncate long strings
            if (value.length > 100) {
                return `<span class="string">"${escapeHtml(value.substring(0, 97))}..."</span>`;
            }
            return `<span class="string">"${escapeHtml(value)}"</span>`;
        }
        
        if (typeof value === 'boolean') {
            return `<span class="boolean ${value ? 'true' : 'false'}">${value}</span>`;
        }
        
        if (typeof value === 'number') {
            return `<span class="number">${value}</span>`;
        }
        
        return `<span class="other">${escapeHtml(String(value))}</span>`;
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
    }    /**
     * Switch view mode
     */
    setViewMode(mode) {
        if (this.viewModes[mode]) {
            this.currentView = mode;
            this.renderCurrentView();
        }
    }

    // Enhanced interaction methods

    /**
     * Toggle tree node expansion
     */
    toggleTreeNode(nodeId, pathStr) {
        if (this.expandedNodes.has(nodeId)) {
            this.expandedNodes.delete(nodeId);
        } else {
            this.expandedNodes.add(nodeId);
        }
        
        // Re-render tree view to update the display
        this.renderTreeView();
    }

    /**
     * Expand all tree nodes
     */
    expandAll() {
        // Add all possible node IDs to expanded set
        this.addAllNodeIds(this.currentData, [], 'root', 0);
        this.renderTreeView();
    }

    /**
     * Collapse all tree nodes
     */
    collapseAll() {
        this.expandedNodes.clear();
        this.renderTreeView();
    }

    /**
     * Recursively add all node IDs for expand all functionality
     */
    addAllNodeIds(data, path, key, depth = 0) {
        const nodeId = `tree-${path.join('-')}-${key}`;
        
        if (typeof data === 'object' && data !== null && depth < this.analysisOptions.maxTreeDepth) {
            this.expandedNodes.add(nodeId);
            
            const entries = Array.isArray(data) 
                ? data.map((item, index) => [index, item])
                : Object.entries(data);
                
            entries.forEach(([childKey, childValue]) => {
                this.addAllNodeIds(childValue, [...path, key], childKey, depth + 1);
            });
        }
    }

    /**
     * Copy path to clipboard
     */
    copyPath(pathStr) {
        this.copyToClipboard(pathStr);
        this.showNotification(`Path copied: ${pathStr}`, 'info');
    }

    /**
     * Copy value to clipboard
     */
    copyValue(value) {
        this.copyToClipboard(value);
        this.showNotification('Value copied to clipboard', 'info');
    }

    /**
     * Select a tree node
     */
    selectNode(pathStr) {
        this.selectedPath = pathStr.split('.');
        this.renderTreeView();
        this.showNotification(`Selected: ${pathStr}`, 'info');
    }

    /**
     * Export data in various formats
     */
    exportData(format) {
        let content = '';
        let filename = `response_data_${Date.now()}`;
        let mimeType = 'text/plain';

        switch (format) {
            case 'json':
                content = JSON.stringify(this.currentData, null, 2);
                filename += '.json';
                mimeType = 'application/json';
                break;
            case 'csv':
                content = this.convertToCSV(this.currentData);
                filename += '.csv';
                mimeType = 'text/csv';
                break;
            case 'xml':
                content = this.convertToXML(this.currentData);
                filename += '.xml';
                mimeType = 'application/xml';
                break;
            case 'schema':
                content = JSON.stringify(this.dataSchema, null, 2);
                filename = `schema_${Date.now()}.json`;
                mimeType = 'application/json';
                break;
            case 'stats':
                content = this.generateStatsReport();
                filename = `stats_${Date.now()}.txt`;
                mimeType = 'text/plain';
                break;
        }

        this.downloadFile(content, filename, mimeType);
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        if (!Array.isArray(data)) {
            // Convert object to key-value CSV
            const entries = Object.entries(data);
            return 'Key,Value,Type\n' + 
                   entries.map(([key, value]) => 
                       `"${key}","${JSON.stringify(value)}","${typeof value}"`
                   ).join('\n');
        }

        // Handle array of objects
        const items = data.filter(item => item && typeof item === 'object');
        if (items.length === 0) return '';

        const headers = new Set();
        items.forEach(item => Object.keys(item).forEach(key => headers.add(key)));
        const headerArray = Array.from(headers);

        let csv = headerArray.map(h => `"${h}"`).join(',') + '\n';
        
        items.forEach(item => {
            const row = headerArray.map(header => {
                const value = item[header];
                if (value === null || value === undefined) return '';
                if (typeof value === 'object') return `"${JSON.stringify(value)}"`;
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            csv += row.join(',') + '\n';
        });

        return csv;
    }

    /**
     * Convert data to XML format
     */
    convertToXML(data, rootName = 'root') {
        const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
        return xmlHeader + this.objectToXML(data, rootName);
    }

    /**
     * Convert object to XML recursively
     */
    objectToXML(obj, tagName) {
        if (obj === null || obj === undefined) {
            return `<${tagName}></${tagName}>`;
        }

        if (Array.isArray(obj)) {
            return obj.map((item, index) => 
                this.objectToXML(item, `${tagName}_${index}`)
            ).join('\n');
        }

        if (typeof obj === 'object') {
            const content = Object.entries(obj)
                .map(([key, value]) => this.objectToXML(value, key))
                .join('\n');
            return `<${tagName}>\n${content}\n</${tagName}>`;
        }

        return `<${tagName}>${escapeHtml(String(obj))}</${tagName}>`;
    }

    /**
     * Generate statistics report
     */
    generateStatsReport() {
        if (!this.dataStats) return 'No statistics available';

        const stats = this.dataStats;
        let report = 'DATA ANALYSIS REPORT\n';
        report += '===================\n\n';
        
        report += 'STRUCTURE OVERVIEW:\n';
        report += `- Total nodes: ${stats.totalNodes.toLocaleString()}\n`;
        report += `- Maximum depth: ${stats.maxDepth}\n`;
        report += `- Objects: ${stats.totalObjects.toLocaleString()}\n`;
        report += `- Arrays: ${stats.totalArrays.toLocaleString()}\n`;
        report += `- Primitive values: ${stats.totalPrimitives.toLocaleString()}\n`;
        report += `- Null values: ${stats.nullValues.toLocaleString()}\n\n`;

        report += 'DATA TYPE DISTRIBUTION:\n';
        Object.entries(stats.dataTypes).forEach(([type, count]) => {
            const percentage = ((count / stats.totalNodes) * 100).toFixed(1);
            report += `- ${type}: ${count.toLocaleString()} (${percentage}%)\n`;
        });

        report += '\nPATTERN ANALYSIS:\n';
        report += `- Email addresses: ${stats.patterns.emails.toLocaleString()}\n`;
        report += `- URLs: ${stats.patterns.urls.toLocaleString()}\n`;
        report += `- Dates: ${stats.patterns.dates.toLocaleString()}\n`;
        report += `- IDs: ${stats.patterns.ids.toLocaleString()}\n`;

        if (stats.arrayLengths.length > 0) {
            const avgLength = stats.arrayLengths.reduce((a, b) => a + b, 0) / stats.arrayLengths.length;
            report += '\nARRAY STATISTICS:\n';
            report += `- Average length: ${avgLength.toFixed(1)}\n`;
            report += `- Min length: ${Math.min(...stats.arrayLengths)}\n`;
            report += `- Max length: ${Math.max(...stats.arrayLengths)}\n`;
        }

        const duplicates = Array.from(stats.duplicateValues.entries())
            .filter(([value, count]) => count > 1)
            .sort((a, b) => b[1] - a[1]);

        if (duplicates.length > 0) {
            report += '\nTOP DUPLICATE VALUES:\n';
            duplicates.slice(0, 10).forEach(([value, count]) => {
                report += `- "${String(value).substring(0, 50)}" appears ${count} times\n`;
            });
        }

        return report;
    }

    /**
     * Generate documentation from schema
     */
    generateDocumentation() {
        if (!this.dataSchema) {
            this.showNotification('No schema available for documentation', 'warning');
            return;
        }
        
        let doc = '# API Response Documentation\n\n';
        doc += 'Generated automatically from response data structure.\n\n';
        doc += '## Data Schema\n\n';
        doc += this.generateMarkdownSchema(this.dataSchema, 'root', 0);
        
        this.downloadFile(doc, `api_documentation_${Date.now()}.md`, 'text/markdown');
        this.showNotification('Documentation generated and downloaded');
    }

    /**
     * Generate markdown documentation from schema
     */
    generateMarkdownSchema(schema, name, depth) {
        const indent = '  '.repeat(depth);
        let markdown = '';
        
        if (schema.type === 'object') {
            markdown += `${indent}- **${name}** (object)\n`;
            if (schema.properties) {
                Object.entries(schema.properties).forEach(([propName, propSchema]) => {
                    markdown += this.generateMarkdownSchema(propSchema, propName, depth + 1);
                });
            }
        } else if (schema.type === 'array') {
            markdown += `${indent}- **${name}** (array)\n`;
            if (schema.items) {
                markdown += this.generateMarkdownSchema(schema.items, 'items', depth + 1);
            }
        } else {
            markdown += `${indent}- **${name}** (${schema.type}`;
            if (schema.format) markdown += `, format: ${schema.format}`;
            markdown += ')\n';
        }
        
        return markdown;
    }

    /**
     * Download file with given content
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.showNotification(`Downloaded ${filename}`);
    }

    /**
     * Show notification to user (simple fallback)
     */
    showNotification(message, type = 'info') {
        // Console notification for now
        console.log(`[${type.toUpperCase()}] ${message}`);
        if (type === 'error') {
            alert(message);
        }
    }
    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            this.showNotification('Copied to clipboard', 'info');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showNotification('Failed to copy to clipboard', 'error');
        }
    }
    /**
     * Set the current view mode
     */
    setViewMode(mode) {
        if (this.viewModes[mode]) {
            this.currentView = mode;
            this.renderCurrentView();
        }
    }

    /**
     * Drill down into nested data from table view
     */
    drillDownToData(path, dataStr) {
        try {
            const data = JSON.parse(dataStr);
            this.currentData = data;
            this.analyzeData();
            this.renderCurrentView();
        } catch (error) {
            console.error('Error drilling down to data:', error);
            this.showNotification('Error accessing nested data', 'error');
        }
    }

    /**
     * Drill down into nested data using path navigation (for table view)
     */
    drillDownToNestedData(path, type) {
        try {
            if (!this.currentData) return;
            const pathParts = path.split('.').filter(Boolean);
            let nestedData = this.currentData;
            for (const part of pathParts) {
                if (nestedData && typeof nestedData === 'object') {
                    nestedData = nestedData[part];
                } else {
                    throw new Error(`Cannot access property ${part} on ${typeof nestedData}`);
                }
            }
            if (nestedData !== undefined) {
                this.currentData = nestedData;
                this.analyzeData();
                this.renderCurrentView();
            } else {
                this.showNotification('No data found at specified path', 'warning');
            }
        } catch (error) {
            console.error('Error drilling down to nested data:', error);
            this.showNotification('Error accessing nested data: ' + error.message, 'error');
        }
    }

    /**
     * Toggle schema format between JSON and tree view
     */
    toggleSchemaFormat() {
        const schemaView = document.querySelector('.schema-view');
        if (!schemaView) return;

        const jsonView = schemaView.querySelector('.schema-json-view');
        const treeView = schemaView.querySelector('.schema-tree-view');
        if (jsonView && treeView) {
            if (jsonView.classList.contains('active')) {
                jsonView.classList.remove('active');
                jsonView.style.display = 'none';
                treeView.classList.add('active');
                treeView.style.display = 'block';
            } else {
                treeView.classList.remove('active');
                treeView.style.display = 'none';
                jsonView.classList.add('active');
                jsonView.style.display = 'block';
            }
        }
    }

    /**
     * Syntax highlight JSON data
     */
    syntaxHighlightJson(obj) {
        const json = JSON.stringify(obj, null, 2);
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        }).replace(/(\{|\}|\[|\]|,)/g, '<span class="json-punctuation">$1</span>');
    }
}

export default EnhancedResponseViewer;
