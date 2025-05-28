// Enhanced notification system with modern styling
function showNotification(message, type = 'info', duration = 5000) {
    const notifications = document.getElementById('notifications') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Add icon based on type
    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
    };
    
    notification.innerHTML = `
        <div style="display: flex; align-items: start; gap: 12px;">
            <i data-feather="${icons[type]}" style="flex-shrink: 0; margin-top: 2px;"></i>
            <div style="flex: 1;">
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="this.closest('.notification').remove()">
                <i data-feather="x" style="width: 16px; height: 16px;"></i>
            </button>
        </div>
    `;
    
    notifications.appendChild(notification);
    
    // Replace feather icons
    feather.replace();
    
    // Animate in
    requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    });
    
    // Auto remove
    if (duration > 0) {
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

// Navigation initialization and management
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Get section from data attribute
            const section = item.dataset.section;
            if (section && typeof app !== 'undefined' && app.showSection) {
                app.showSection(section);
            }
        });
    });
    
    console.log('✅ Navigation initialized with modern UI integration');
}

// Update connection status indicator
function updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;
    
    const icon = statusElement.querySelector('i');
    const text = statusElement.querySelector('span');
    
    if (isConnected) {
        statusElement.className = 'connection-status connected';
        if (icon) icon.setAttribute('data-feather', 'wifi');
        if (text) text.textContent = 'Connected';
    } else {
        statusElement.className = 'connection-status disconnected';
        if (icon) icon.setAttribute('data-feather', 'wifi-off');
        if (text) text.textContent = 'Disconnected';
    }
    
    // Refresh feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// Enhanced sidebar management
function initializeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    
    // Add collapse/expand functionality
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'sidebar-toggle';
    toggleBtn.innerHTML = '<i data-feather="menu"></i>';
    toggleBtn.onclick = toggleSidebar;
    
    // Add to header if it doesn't exist
    const header = document.querySelector('.app-header .header-left');
    if (header && !header.querySelector('.sidebar-toggle')) {
        header.insertBefore(toggleBtn, header.firstChild);
    }
    
    console.log('✅ Sidebar initialized');
}

// Toggle sidebar visibility (for mobile/responsive)
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const appBody = document.querySelector('.app-body');
    
    if (sidebar && appBody) {
        sidebar.classList.toggle('collapsed');
        appBody.classList.toggle('sidebar-collapsed');
    }
}

// Create notification container if it doesn't exist
function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notifications';
    container.className = 'notifications';
    document.body.appendChild(container);
    return container;
}

// Enhanced modal animations
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    }
}

// Enhanced form styling for better UX
function enhanceFormElements() {
    // Add floating labels effect
    document.querySelectorAll('.form-control').forEach(input => {
        if (input.value) {
            input.classList.add('has-value');
        }
        
        input.addEventListener('focus', () => {
            input.classList.add('focused');
        });
        
        input.addEventListener('blur', () => {
            input.classList.remove('focused');
            if (input.value) {
                input.classList.add('has-value');
            } else {
                input.classList.remove('has-value');
            }
        });
    });
}

// Modern loading states
function setButtonLoading(button, isLoading, loadingText = 'Loading...') {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `
            <div class="loading-spinner" style="width: 16px; height: 16px; border-width: 2px; margin-right: 8px;"></div>
            ${loadingText}
        `;
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
}

// Enhanced tooltips
function initTooltips() {
    document.querySelectorAll('[title]').forEach(element => {
        const title = element.getAttribute('title');
        element.removeAttribute('title');
        element.dataset.tooltip = title;
        
        element.addEventListener('mouseenter', (e) => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = title;
            document.body.appendChild(tooltip);
            
            const rect = element.getBoundingClientRect();
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
            
            element.addEventListener('mouseleave', () => {
                tooltip.remove();
            }, { once: true });
        });
    });
}

// Modern context menus for profile items
function addProfileContextMenu(profileElement, profileName) {
    profileElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        
        // Remove any existing context menus
        document.querySelectorAll('.context-menu').forEach(menu => menu.remove());
        
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.innerHTML = `
            <button class="context-menu-item" onclick="profileManager.editProfile('${profileName}')">
                <i data-feather="edit-2"></i>
                Edit Profile
            </button>
            <button class="context-menu-item" onclick="profileManager.duplicateProfile('${profileName}')">
                <i data-feather="copy"></i>
                Duplicate
            </button>
            <button class="context-menu-item" onclick="profileManager.exportProfile('${profileName}')">
                <i data-feather="download"></i>
                Export
            </button>
            <div class="context-menu-divider"></div>
            <button class="context-menu-item danger" onclick="profileManager.deleteProfile('${profileName}')">
                <i data-feather="trash-2"></i>
                Delete
            </button>
        `;
        
        document.body.appendChild(contextMenu);
        feather.replace();
        
        // Position the menu
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';
        
        // Close on click outside
        setTimeout(() => {
            document.addEventListener('click', () => {
                contextMenu.remove();
            }, { once: true });
        }, 0);
    });
}

// Smooth scroll for navigation
function smoothScrollTo(element) {
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// Enhanced keyboard navigation
function initKeyboardNavigation() {
    // Profile list navigation
    const profileList = document.getElementById('profile-list');
    if (profileList) {
        let selectedIndex = -1;
        
        profileList.addEventListener('keydown', (e) => {
            const items = profileList.querySelectorAll('.profile-item');
            
            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    selectedIndex = Math.max(selectedIndex - 1, 0);
                    break;
                case 'Enter':
                    if (selectedIndex >= 0 && items[selectedIndex]) {
                        items[selectedIndex].click();
                    }
                    break;
            }
            
            // Update visual selection
            items.forEach((item, index) => {
                item.classList.toggle('keyboard-selected', index === selectedIndex);
            });
        });
    }
}

// Add ripple effect to buttons
function addRippleEffect(button) {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        this.appendChild(ripple);
        
        ripple.addEventListener('animationend', () => {
            ripple.remove();
        });
    });
}

// Initialize all modern UI enhancements
function initModernUI() {
    enhanceFormElements();
    initTooltips();
    initKeyboardNavigation();
    initializeNavigation(); // Add navigation initialization
    initializeSidebar(); // Add sidebar initialization
    
    // Add ripple effects to all buttons
    document.querySelectorAll('.btn').forEach(addRippleEffect);
    
    // Initialize smooth transitions
    document.body.classList.add('transitions-ready');
    
    // Listen for connection status changes
    window.addEventListener('connectionStatusChanged', (event) => {
        updateConnectionStatus(event.detail.connected);
    });
    
    console.log('✅ Modern UI fully initialized');
}

// Enhanced collapsible section management
function setupCollapsibleSections() {
    // Restore saved section states with improved defaults
    document.querySelectorAll('.collapsible-section').forEach(section => {
        const sectionId = section.id;
        const savedState = localStorage.getItem(`anyapi_${sectionId}_expanded`);
        
        // Default to expanded for headers and options sections, or use saved state
        const shouldExpand = savedState === 'true' || 
                           (savedState === null && ['headers-section', 'options-section'].includes(sectionId));
        
        if (shouldExpand) {
            section.classList.add('expanded');
            const content = section.querySelector('.collapsible-content');
            if (content) {
                content.style.maxHeight = 'none'; // Allow natural height for better display
            }
            const icon = section.querySelector('.collapse-icon');
            if (icon) {
                icon.style.transform = 'rotate(90deg)';
            }
        }
    });
    
    console.log('✅ Collapsible sections configured with optimized defaults');
}

// Call this after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initModernUI();
    setupCollapsibleSections();
});

/**
 * Modern UI Helper Functions
 * Provides consistent UI patterns across the application
 */

class ModernUI {
    /**
     * Create a modern modal with consistent styling
     */
    static createModal(options = {}) {
        const {
            title = 'Modal',
            content = '',
            size = 'medium', // small, medium, large, xl
            onSave = null,
            saveText = 'Save',
            showCancel = true,
            cancelText = 'Cancel'
        } = options;

        const modal = document.createElement('div');
        modal.className = 'modal modal-overlay';
        modal.id = options.id || `modal-${Date.now()}`;
        
        const sizeClass = {
            small: 'max-width: 400px',
            medium: 'max-width: 600px',
            large: 'max-width: 800px',
            xl: 'max-width: 1200px'
        }[size];

        modal.innerHTML = `
            <div class="modal-dialog" style="${sizeClass}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${escapeHtml(title)}</h3>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">
                            <i data-feather="x"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    <div class="modal-footer">
                        ${showCancel ? `<button class="btn btn-outline modal-cancel">${cancelText}</button>` : ''}
                        ${onSave ? `<button class="btn btn-primary modal-save">${saveText}</button>` : ''}
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        const cancelBtn = modal.querySelector('.modal-cancel');
        const saveBtn = modal.querySelector('.modal-save');
        const closeBtn = modal.querySelector('.modal-close');

        if (cancelBtn) {
            cancelBtn.onclick = () => modal.remove();
        }

        if (saveBtn && onSave) {
            saveBtn.onclick = () => {
                if (onSave(modal)) {
                    modal.remove();
                }
            };
        }

        if (closeBtn) {
            closeBtn.onclick = () => modal.remove();
        }

        // Close on backdrop click
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };

        return modal;
    }

    /**
     * Create modern tabs component
     */
    static createTabs(containerId, tabs = []) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.className = 'modern-tabs-container';
        
        const tabsHtml = `
            <div class="modern-tabs-header">
                ${tabs.map((tab, index) => `
                    <button class="modern-tab ${index === 0 ? 'active' : ''}" 
                            data-tab="${tab.id}" 
                            onclick="ModernUI.switchTab('${containerId}', '${tab.id}')">
                        ${tab.icon ? `<i data-feather="${tab.icon}"></i>` : ''}
                        <span>${escapeHtml(tab.label)}</span>
                        ${tab.badge ? `<span class="tab-badge">${tab.badge}</span>` : ''}
                    </button>
                `).join('')}
            </div>
            <div class="modern-tabs-content">
                ${tabs.map((tab, index) => `
                    <div class="modern-tab-pane ${index === 0 ? 'active' : ''}" id="${tab.id}">
                        ${tab.content || ''}
                    </div>
                `).join('')}
            </div>
        `;

        container.innerHTML = tabsHtml;
        
        // Initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    /**
     * Switch active tab
     */
    static switchTab(containerId, tabId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Update tab buttons
        container.querySelectorAll('.modern-tab').forEach(tab => {
            if (tab.dataset.tab === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update tab content
        container.querySelectorAll('.modern-tab-pane').forEach(pane => {
            if (pane.id === tabId) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
    }

    /**
     * Create modern card component
     */
    static createCard(options = {}) {
        const {
            title = '',
            content = '',
            actions = [],
            className = '',
            icon = null
        } = options;

        const card = document.createElement('div');
        card.className = `modern-card ${className}`;
        
        card.innerHTML = `
            ${title ? `
                <div class="modern-card-header">
                    ${icon ? `<i data-feather="${icon}"></i>` : ''}
                    <h4>${escapeHtml(title)}</h4>
                    ${actions.length > 0 ? `
                        <div class="modern-card-actions">
                            ${actions.map(action => `
                                <button class="btn btn-sm ${action.className || 'btn-outline'}" 
                                        onclick="${action.onclick || ''}">
                                    ${action.icon ? `<i data-feather="${action.icon}"></i>` : ''}
                                    ${action.label}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            <div class="modern-card-body">
                ${content}
            </div>
        `;

        return card;
    }

    /**
     * Create modern notification
     */
    static showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `modern-notification ${type}`;
        
        const icons = {
            success: 'check-circle',
            error: 'alert-circle',
            warning: 'alert-triangle',
            info: 'info'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <i data-feather="${icons[type] || 'info'}"></i>
                <span>${escapeHtml(message)}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i data-feather="x"></i>
            </button>
        `;

        const container = document.getElementById('notifications') || document.body;
        container.appendChild(notification);

        // Initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }

        return notification;
    }

    /**
     * Create collapsible section
     */
    static createCollapsible(title, content, isExpanded = false) {
        const section = document.createElement('div');
        section.className = `modern-collapsible ${isExpanded ? 'expanded' : ''}`;
        
        section.innerHTML = `
            <div class="modern-collapsible-header" onclick="ModernUI.toggleCollapsible(this)">
                <span>${escapeHtml(title)}</span>
                <i data-feather="chevron-right" class="collapse-icon"></i>
            </div>
            <div class="modern-collapsible-content">
                <div class="modern-collapsible-body">
                    ${content}
                </div>
            </div>
        `;

        return section;
    }

    /**
     * Toggle collapsible section
     */
    static toggleCollapsible(header) {
        const section = header.closest('.modern-collapsible');
        if (!section) return;

        section.classList.toggle('expanded');
        
        // Update icon
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }
}

// Helper function for HTML escaping
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

// Make ModernUI globally available
window.ModernUI = ModernUI;

// Additional CSS for modern enhancements
const modernStyles = `
/* Tooltips */
.tooltip {
    position: absolute;
    background: var(--color-gray-800);
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    z-index: var(--z-tooltip);
    pointer-events: none;
    animation: tooltipIn 0.2s ease;
}

@keyframes tooltipIn {
    from {
        opacity: 0;
        transform: translateY(4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Context Menu */
.context-menu {
    position: absolute;
    background: var(--bg-elevated);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    padding: 4px;
    min-width: 160px;
    z-index: var(--z-dropdown);
    animation: contextMenuIn 0.15s ease;
}

.context-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
    color: var(--text-primary);
}

.context-menu-item:hover {
    background: var(--bg-tertiary);
}

.context-menu-item.danger {
    color: var(--color-danger);
}

.context-menu-divider {
    height: 1px;
    background: var(--border-color);
    margin: 4px 8px;
}

@keyframes contextMenuIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

/* Ripple Effect */
.ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    transform: scale(0);
    animation: ripple 0.6s ease-out;
    pointer-events: none;
}

@keyframes ripple {
    to {
        transform: scale(4);
        opacity: 0;
    }
}

/* Keyboard Navigation */
.keyboard-selected {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
}

/* Enhanced notification close button */
.notification-close {
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.15s ease;
    padding: 4px;
    border-radius: 4px;
}

.notification-close:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.1);
}

/* Smooth transitions */
.transitions-ready * {
    transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
    transition-duration: 200ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Enhanced form focus states */
.form-control.focused {
    background: var(--bg-primary);
}

/* Modern scrollbar for profile list */
.profile-list::-webkit-scrollbar {
    width: 6px;
}

.profile-list::-webkit-scrollbar-thumb {
    background: var(--color-gray-400);
    border-radius: 3px;
}

/* Glass morphism effect for modals */
.modal {
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
}

/* Enhanced buttons */
.btn {
    position: relative;
    overflow: hidden;
}

.btn:after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
    transform: translateX(-100%);
    transition: transform 0.6s;
}

.btn:hover:after {
    transform: translateX(100%);
}

/* Modern UI Components */
.modern-tabs-container {
    width: 100%;
    overflow: hidden;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-md);
    background: var(--bg-elevated);
}

.modern-tabs-header {
    display: flex;
    border-bottom: 1px solid var(--border-color);
}

.modern-tab {
    flex: 1;
    padding: 12px;
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
    z-index: 1;
    transition: background 0.3s;
}

.modern-tab.active {
    background: var(--bg-tertiary);
    border-bottom: 3px solid var(--color-primary);
}

.modern-tabs-content {
    padding: 16px;
}

.modern-tab-pane {
    display: none;
}

.modern-tab-pane.active {
    display: block;
}

/* Cards */
.modern-card {
    background: var(--bg-elevated);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-md);
    overflow: hidden;
    transition: transform 0.3s;
}

.modern-card:hover {
    transform: translateY(-2px);
}

.modern-card-header {
    display: flex;
    align-items: center;
    padding: 12px;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
}

.modern-card-actions {
    margin-left: auto;
}

.modern-card-body {
    padding: 12px;
}

/* Notifications */
.modern-notification {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border-radius: 4px;
    margin: 8px 0;
    position: relative;
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Collapsible */
.modern-collapsible {
    border-radius: var(--border-radius);
    overflow: hidden;
    margin: 8px 0;
    transition: max-height 0.3s ease;
}

.modern-collapsible-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background: var(--bg-primary);
    cursor: pointer;
}

.modern-collapsible-content {
    padding: 0 12px 12px;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
}

.modern-collapsible.expanded .modern-collapsible-content {
    max-height: 500px; /* Arbitrary large value for expansion */
}

/* Navigation Integration Styles */
.app-header {
    background: var(--bg-elevated, #ffffff);
    border-bottom: 1px solid var(--border-color, #e9ecef);
    padding: 0 1rem;
    height: 60px;
    display: flex;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.app-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    font-size: 1.25rem;
    color: var(--color-primary, #007bff);
}

.connection-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
}

.connection-status.connected {
    background: rgba(40, 167, 69, 0.1);
    color: #28a745;
}

.connection-status.disconnected {
    background: rgba(220, 53, 69, 0.1);
    color: #dc3545;
}

.sidebar {
    width: 260px;
    background: var(--bg-elevated, #ffffff);
    border-right: 1px solid var(--border-color, #e9ecef);
    height: calc(100vh - 60px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

.sidebar-nav {
    padding: 1rem 0;
}

.nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    color: var(--text-secondary, #6c757d);
    text-decoration: none;
    transition: all 0.2s ease;
    border-left: 3px solid transparent;
}

.nav-item:hover {
    background: var(--bg-secondary, #f8f9fa);
    color: var(--text-primary, inherit);
    text-decoration: none;
}

.nav-item.active {
    background: var(--color-primary-bg, rgba(0, 123, 255, 0.1));
    color: var(--color-primary, #007bff);
    border-left-color: var(--color-primary, #007bff);
    font-weight: 500;
}

.sidebar-footer {
    margin-top: auto;
    padding: 1rem;
    border-top: 1px solid var(--border-color, #e9ecef);
}

.app-body {
    display: flex;
    height: calc(100vh - 60px);
}

.main-panel {
    flex: 1;
    overflow: auto;
    background: var(--bg-primary, #ffffff);
}

.content-section {
    display: none;
    padding: 2rem;
}

.content-section.active {
    display: block;
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color, #e9ecef);
}

.section-header h2 {
    margin: 0;
    color: var(--text-primary, inherit);
}

.section-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

/* Responsive sidebar */
@media (max-width: 768px) {
    .sidebar {
        position: fixed;
        left: -260px;
        z-index: 1000;
        transition: left 0.3s ease;
    }
    
    .sidebar.show {
        left: 0;
    }
    
    .app-body.sidebar-show::before {
        content: '';
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
    }
    
    .main-panel {
        width: 100%;
    }
}

/* Collapsible sections for tester */
.collapsible-section {
    border: 1px solid var(--border-color, #e9ecef);
    border-radius: 6px;
    margin-bottom: 1rem;
    overflow: hidden;
}

.collapsible-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: var(--bg-secondary, #f8f9fa);
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s ease;
}

.collapsible-header:hover {
    background: var(--bg-tertiary, #e9ecef);
}

.collapsible-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
}

.collapsible-section.expanded .collapsible-content {
    padding: 1rem;
    border-top: 1px solid var(--border-color, #e9ecef);
}

.collapse-icon {
    transition: transform 0.3s ease;
}

/* Method selector compact */
.method-selector-compact {
    display: flex;
    gap: 2px;
    background: var(--bg-secondary, #f8f9fa);
    border-radius: 6px;
    padding: 2px;
}

.method-btn-compact {
    padding: 0.5rem 0.75rem;
    border: none;
    background: transparent;
    border-radius: 4px;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--text-secondary, #6c757d);
}

.method-btn-compact.active,
.method-btn-compact:hover {
    background: var(--bg-primary, #ffffff);
    color: var(--color-primary, #007bff);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.request-builder-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
}

.endpoint-input-group {
    flex: 1;
    min-width: 300px;
    max-width: 100%;
    order: 2;
}

/* Better Request Form Layout */
.request-builder-optimized {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 100%;
    overflow: hidden;
}

.request-builder-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
}

.method-selector-compact {
    display: flex;
    gap: 2px;
    background: var(--bg-secondary, #f8f9fa);
    border-radius: 6px;
    padding: 2px;
    width: fit-content;
    align-self: flex-start;
    order: 1;
}

.endpoint-input-group {
    flex: 1;
    min-width: 300px;
    max-width: 100%;
    order: 2;
}

/* Mobile responsive improvements for correct order */
@media (max-width: 768px) {
    .request-builder-header {
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .method-selector-compact {
        align-self: stretch;
        justify-content: center;
        order: 1;
    }
    
    .endpoint-input-group {
        order: 2;
        min-width: auto;
    }
    
    /* General mobile styles */
    .sidebar {
        position: fixed;
        left: -260px;
        z-index: 1000;
        transition: left 0.3s ease;
    }
    
    .sidebar.show {
        left: 0;
    }
    
    .app-body.sidebar-show::before {
        content: '';
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
    }
    
    .main-panel {
        width: 100%;
    }
    
    /* Collapsible sections */
    .collapsible-header {
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
    }
    
    .collapsible-section.expanded .collapsible-content {
        padding: 0.75rem;
    }
}

/* Word wrapping for long content */
.panel-content,
.response-content pre {
    word-wrap: break-word;
    overflow-wrap: break-word;
}

/* Enhanced key-value pairs styling */
.key-value-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: none; /* Remove height restriction for better display */
    overflow: visible; /* Allow natural overflow */
    width: 100%;
    box-sizing: border-box;
}

.key-value-pair,
.key-value-pair-compact {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 0.5rem;
    align-items: center;
    padding: 0.5rem;
    background: var(--bg-secondary, #f8f9fa);
    border: 1px solid var(--border-color, #dee2e6);
    border-radius: 4px;
    transition: all 0.2s ease;
    width: 100%;
    box-sizing: border-box;
    min-width: 0; /* Allow shrinking */
}

.key-value-pair:hover,
.key-value-pair-compact:hover {
    background: var(--bg-hover, #e9ecef);
    border-color: var(--color-primary, #007bff);
}

.key-value-pair input,
.key-value-pair-compact input,
.kv-input-compact {
    padding: 0.5rem;
    border: 1px solid var(--border-color, #dee2e6);
    border-radius: 4px;
    background: var(--bg-primary, white);
    color: var(--text-primary, inherit);
    font-size: 0.875rem;
    transition: all 0.2s ease;
    width: 100%;
    min-width: 0; /* Allow shrinking below content size */
    box-sizing: border-box;
}

.key-value-pair input:focus,
.key-value-pair-compact input:focus,
.kv-input-compact:focus {
    outline: none;
    border-color: var(--color-primary, #007bff);
    box-shadow: 0 0 0 2px var(--color-primary-bg, rgba(0, 123, 255, 0.1));
}

.key-value-remove,
.kv-remove-btn {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-danger, #dc3545);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.2s ease;
    flex-shrink: 0; /* Don't shrink the remove button */
}

.key-value-remove:hover,
.kv-remove-btn:hover {
    background: var(--color-danger-hover, #c82333);
    transform: scale(1.05);
}

/* Better responsive behavior for sections */
@media (max-width: 768px) {
    .collapsible-section {
        margin-bottom: 0.5rem;
    }
    
    .collapsible-header {
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
    }
    
    .collapsible-section.expanded .collapsible-content {
        padding: 0.75rem;
    }
    
    .key-value-pair,
    .key-value-pair-compact {
        grid-template-columns: 1fr 1fr auto;
        gap: 0.375rem;
        padding: 0.5rem;
    }
    
    .key-value-pair input,
    .key-value-pair-compact input {
        padding: 0.375rem;
        font-size: 0.8rem;
    }
    
    .key-value-remove,
    .kv-remove-btn {
        width: 1.75rem;
        height: 1.75rem;
    }
    
    .options-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
    }
}

@media (max-width: 480px) {
    .response-action-btn {
        padding: 0.25rem;
        min-width: 1.75rem;
    }
    
    .response-stats {
        font-size: 0.75rem;
    }
    
    .key-value-pair,
    .key-value-pair-compact {
        grid-template-columns: 1fr;
        gap: 0.25rem;
        padding: 0.375rem;
    }
    
    .key-value-remove,
    .kv-remove-btn {
        justify-self: end;
        width: 1.5rem;
        height: 1.5rem;
        margin-top: 0.25rem;
    }
    
    .key-value-pair input,
    .key-value-pair-compact input {
        padding: 0.375rem;
        font-size: 0.8rem;
    }
}

/* Additional constraint fixes for better containment */
.collapsible-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease, padding 0.3s ease;
    background: var(--bg-primary, white);
    width: 100%;
    box-sizing: border-box;
}

.collapsible-section.expanded .collapsible-content {
    max-height: none;
    padding: 1rem;
    overflow: visible; /* Allow content to flow naturally but constrain width */
}

/* Ensure all collapsible sections respect container boundaries */
.collapsible-section {
    border: 1px solid var(--border-color, #e9ecef);
    border-radius: 6px;
    margin-bottom: 0.75rem;
    overflow: hidden;
    background: var(--bg-primary, white);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
    width: 100%;
    box-sizing: border-box;
}

/* Fix for specific container constraints */
.tester-section .collapsible-section,
.request-panel .collapsible-section {
    max-width: 100%;
}

.section-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    box-sizing: border-box;
}

/* Ensure inputs don't exceed their grid cells */
.key-value-pair input[type="text"],
.key-value-pair-compact input[type="text"] {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
}
`;

// Navigation styles for enhanced UI components
const navigationStyles = `
/* Navigation Integration Styles */
.app-header {
    background: var(--bg-elevated, #ffffff);
    border-bottom: 1px solid var(--border-color, #e9ecef);
    padding: 0 1rem;
    height: 60px;
    display: flex;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.app-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    font-size: 1.25rem;
    color: var(--color-primary, #007bff);
}

.connection-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: var(--color-success-light, #d4edda);
    color: var(--color-success-dark, #155724);
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
}

.sidebar-nav .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    color: var(--text-secondary, #6c757d);
    text-decoration: none;
    border-radius: 0.5rem;
    transition: all 0.2s ease;
    border-left: 3px solid transparent;
}

.sidebar-nav .nav-item:hover {
    background: var(--bg-secondary, #f8f9fa);
    color: var(--text-primary, #212529);
    border-left-color: var(--color-primary, #007bff);
}

.sidebar-nav .nav-item.active {
    background: var(--color-primary-light, #e3f2fd);
    color: var(--color-primary, #007bff);
    border-left-color: var(--color-primary, #007bff);
    font-weight: 500;
}
`;

// Inject modern styles
if (!document.getElementById('modern-ui-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'modern-ui-styles';
    styleSheet.textContent = modernStyles;
    document.head.appendChild(styleSheet);
}

// Inject navigation styles
if (!document.getElementById('navigation-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'navigation-styles';
    styleSheet.textContent = navigationStyles;
    document.head.appendChild(styleSheet);
}

// Simple responsive fixes for container overflow
const containerFixStyles = `
/* Fix container boundaries and overflow */
.tester-container,
.tester-section,
.settings-panel,
.options-panel {
    max-width: 100%;
    overflow: hidden;
    box-sizing: border-box;
}

/* Response viewer constraints */
.response-viewer-container {
    max-height: 70vh;
    overflow: hidden;
    border: 1px solid var(--border-color, #dee2e6);
    border-radius: 6px;
}

.response-tabs {
    overflow-x: auto;
    scrollbar-width: none;
}

.response-tabs::-webkit-scrollbar {
    display: none;
}

.response-content {
    overflow: auto;
    flex: 1;
    min-height: 0;
}

/* Mobile responsive fixes */
@media (max-width: 768px) {
    .response-tab .tab-label {
        display: none;
    }
    
    .key-value-pair {
        grid-template-columns: 1fr;
        gap: 0.25rem;
    }
    
    .request-builder-header {
        flex-direction: column;
    }
}

/* Word wrapping for long content */
.panel-content,
.response-content pre {
    word-wrap: break-word;
    overflow-wrap: break-word;
}
`;

// Inject container fix styles
if (!document.getElementById('container-fix-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'container-fix-styles';
    styleSheet.textContent = containerFixStyles;
    document.head.appendChild(styleSheet);
}

// Export functions for global use
window.showNotification = showNotification;
window.showModal = showModal;
window.hideModal = hideModal;
window.setButtonLoading = setButtonLoading;
window.updateConnectionStatus = updateConnectionStatus;
window.toggleSidebar = toggleSidebar;

// Additional CSS for better container constraints and responsive design
const improvedResponsiveStyles = `
/* Enhanced Response Viewer Container Constraints */
.response-viewer-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 300px;
    max-height: 70vh;
    border: 1px solid var(--border-color, #dee2e6);
    border-radius: 6px;
    overflow: hidden;
    background: var(--bg-primary, white);
}

.response-tabs {
    display: flex;
    background: var(--bg-secondary, #f8f9fa);
    border-bottom: 1px solid var(--border-color, #dee2e6);
    overflow-x: auto;
    flex-shrink: 0;
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.response-tabs::-webkit-scrollbar {
    display: none;
}

.response-tab {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-secondary, #6c757d);
    white-space: nowrap;
    transition: all 0.2s ease;
    border-bottom: 2px solid transparent;
    flex-shrink: 0;
    font-size: 0.875rem;
}

.response-tab:hover {
    background: var(--bg-hover, rgba(0,0,0,0.05));
    color: var(--text-primary, inherit);
}

.response-tab.active {
    background: var(--bg-primary, white);
    color: var(--color-primary, #007bff);
    border-bottom-color: var(--color-primary, #007bff);
}

.response-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--bg-secondary, #f8f9fa);
    border-bottom: 1px solid var(--border-color, #dee2e6);
    font-size: 0.875rem;
    flex-shrink: 0;
    flex-wrap: wrap;
}

.response-toolbar-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
}

.response-search {
    flex: 1;
    max-width: 250px;
    min-width: 120px;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border-color, #dee2e6);
    border-radius: 4px;
    background: var(--bg-primary, white);
    color: var(--text-primary, inherit);
    font-size: 0.875rem;
}

.response-stats {
    color: var(--text-muted, #6c757d);
    font-size: 0.8rem;
    white-space: nowrap;
}

.response-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
}

.response-action-btn {
    padding: 0.25rem 0.5rem;
    background: var(--bg-primary, white);
    border: 1px solid var(--border-color, #dee2e6);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    color: var(--text-secondary, #6c757d);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    min-width: 2rem;
    justify-content: center;
}

.response-action-btn:hover {
    background: var(--bg-hover, #e9ecef);
    color: var(--text-primary, inherit);
}

.response-content {
    flex: 1;
    overflow: auto;
    background: var(--bg-primary, white);
    min-height: 0;
}

/* Improved Collapsible Sections for Better Space Usage */
.collapsible-section {
    border: 1px solid var(--border-color, #e9ecef);
    border-radius: 6px;
    margin-bottom: 0.75rem;
    overflow: hidden;
    background: var(--bg-primary, white);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
    width: 100%;
    box-sizing: border-box;
}

.collapsible-section:hover {
    border-color: var(--color-primary-light, #b3d7ff);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.collapsible-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: var(--bg-secondary, #f8f9fa);
    cursor: pointer;
    user-select: none;
    transition: all 0.2s ease;
    border-bottom: 1px solid transparent;
    font-weight: 500;
    font-size: 0.9rem;
}

.collapsible-header:hover {
    background: var(--bg-tertiary, #e9ecef);
}

.collapsible-section.expanded .collapsible-header {
    border-bottom-color: var(--border-color, #e9ecef);
    background: var(--color-primary-bg, rgba(0, 123, 255, 0.05));
    color: var(--color-primary, #007bff);
}

.collapsible-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease, padding 0.3s ease;
    background: var(--bg-primary, white);
}

.collapsible-section.expanded .collapsible-content {
    max-height: none; /* Changed from fixed height to allow natural flow */
    padding: 1rem;
}

/* Navigation Integration Styles */
.app-header {
    background: var(--bg-elevated, #ffffff);
    border-bottom: 1px solid var(--border-color, #e9ecef);
    padding: 0 1rem;
    height: 60px;
    display: flex;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.app-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    font-size: 1.25rem;
    color: var(--color-primary, #007bff);
}

.connection-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
}

.connection-status.connected {
    background: rgba(40, 167, 69, 0.1);
    color: #28a745;
}

.connection-status.disconnected {
    background: rgba(220, 53, 69, 0.1);
    color: #dc3545;
}

.sidebar {
    width: 260px;
    background: var(--bg-elevated, #ffffff);
    border-right: 1px solid var(--border-color, #e9ecef);
    height: calc(100vh - 60px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

.sidebar-nav {
    padding: 1rem 0;
}

.nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    color: var(--text-secondary, #6c757d);
    text-decoration: none;
    transition: all 0.2s ease;
    border-left: 3px solid transparent;
}

.nav-item:hover {
    background: var(--bg-secondary, #f8f9fa);
    color: var(--text-primary, inherit);
    text-decoration: none;
}

.nav-item.active {
    background: var(--color-primary-bg, rgba(0, 123, 255, 0.1));
    color: var(--color-primary, #007bff);
    border-left-color: var(--color-primary, #007bff);
    font-weight: 500;
}

.sidebar-footer {
    margin-top: auto;
    padding: 1rem;
    border-top: 1px solid var(--border-color, #e9ecef);
}

.app-body {
    display: flex;
    height: calc(100vh - 60px);
}

.main-panel {
    flex: 1;
    overflow: auto;
    background: var(--bg-primary, #ffffff);
}

.content-section {
    display: none;
    padding: 2rem;
}

.content-section.active {
    display: block;
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color, #e9ecef);
}

.section-header h2 {
    margin: 0;
    color: var(--text-primary, inherit);
}

.section-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

/* Responsive sidebar */
@media (max-width: 768px) {
    .sidebar {
        position: fixed;
        left: -260px;
        z-index: 1000;
        transition: left 0.3s ease;
    }
    
    .sidebar.show {
        left: 0;
    }
    
    .app-body.sidebar-show::before {
        content: '';
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
    }
    
    .main-panel {
        width: 100%;
    }
}

/* Collapsible sections for tester */
.collapsible-section {
    border: 1px solid var(--border-color, #e9ecef);
    border-radius: 6px;
    margin-bottom: 1rem;
    overflow: hidden;
}

.collapsible-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: var(--bg-secondary, #f8f9fa);
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s ease;
}

.collapsible-header:hover {
    background: var(--bg-tertiary, #e9ecef);
}

.collapsible-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
}

.collapsible-section.expanded .collapsible-content {
    padding: 1rem;
    border-top: 1px solid var(--border-color, #e9ecef);
}

.collapse-icon {
    transition: transform 0.3s ease;
}

/* Method selector compact */
.method-selector-compact {
    display: flex;
    gap: 2px;
    background: var(--bg-secondary, #f8f9fa);
    border-radius: 6px;
    padding: 2px;
}

.method-btn-compact {
    padding: 0.5rem 0.75rem;
    border: none;
    background: transparent;
    border-radius: 4px;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--text-secondary, #6c757d);
}

.method-btn-compact.active,
.method-btn-compact:hover {
    background: var(--bg-primary, #ffffff);
    color: var(--color-primary, #007bff);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.request-builder-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
}

.endpoint-input-group {
    flex: 1;
    min-width: 300px;
    max-width: 100%;
    order: 2;
}

/* Better Request Form Layout */
.request-builder-optimized {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 100%;
    overflow: hidden;
}

.request-builder-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
}

.method-selector-compact {
    display: flex;
    gap: 2px;
    background: var(--bg-secondary, #f8f9fa);
    border-radius: 6px;
    padding: 2px;
    width: fit-content;
    align-self: flex-start;
    order: 1;
}

.endpoint-input-group {
    flex: 1;
    min-width: 300px;
    max-width: 100%;
    order: 2;
}

/* Mobile responsive improvements for correct order */
@media (max-width: 768px) {
    .request-builder-header {
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .method-selector-compact {
        align-self: stretch;
        justify-content: center;
        order: 1;
    }
    
    .endpoint-input-group {
        order: 2;
        min-width: auto;
    }
    
    /* General mobile styles */
    .sidebar {
        position: fixed;
        left: -260px;
        z-index: 1000;
        transition: left 0.3s ease;
    }
    
    .sidebar.show {
        left: 0;
    }
    
    .app-body.sidebar-show::before {
        content: '';
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
    }
    
    .main-panel {
        width: 100%;
    }
    
    /* Collapsible sections */
    .collapsible-header {
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
    }
    
    .collapsible-section.expanded .collapsible-content {
        padding: 0.75rem;
    }
}

/* Word wrapping for long content */
.panel-content,
.response-content pre {
    word-wrap: break-word;
    overflow-wrap: break-word;
}

/* Enhanced key-value pairs styling */
.key-value-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: none; /* Remove height restriction for better display */
    overflow: visible; /* Allow natural overflow */
    width: 100%;
    box-sizing: border-box;
}

.key-value-pair,
.key-value-pair-compact {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 0.5rem;
    align-items: center;
    padding: 0.5rem;
    background: var(--bg-secondary, #f8f9fa);
    border: 1px solid var(--border-color, #dee2e6);
    border-radius: 4px;
    transition: all 0.2s ease;
    width: 100%;
    box-sizing: border-box;
    min-width: 0; /* Allow shrinking */
}

.key-value-pair:hover,
.key-value-pair-compact:hover {
    background: var(--bg-hover, #e9ecef);
    border-color: var(--color-primary, #007bff);
}

.key-value-pair input,
.key-value-pair-compact input,
.kv-input-compact {
    padding: 0.5rem;
    border: 1px solid var(--border-color, #dee2e6);
    border-radius: 4px;
    background: var(--bg-primary, white);
    color: var(--text-primary, inherit);
    font-size: 0.875rem;
    transition: all 0.2s ease;
    width: 100%;
    min-width: 0; /* Allow shrinking below content size */
    box-sizing: border-box;
}

.key-value-pair input:focus,
.key-value-pair-compact input:focus,
.kv-input-compact:focus {
    outline: none;
    border-color: var(--color-primary, #007bff);
    box-shadow: 0 0 0 2px var(--color-primary-bg, rgba(0, 123, 255, 0.1));
}

.key-value-remove,
.kv-remove-btn {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-danger, #dc3545);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.2s ease;
    flex-shrink: 0; /* Don't shrink the remove button */
}

.key-value-remove:hover,
.kv-remove-btn:hover {
    background: var(--color-danger-hover, #c82333);
    transform: scale(1.05);
}

/* Better responsive behavior for sections */
@media (max-width: 768px) {
    .collapsible-section {
        margin-bottom: 0.5rem;
    }
    
    .collapsible-header {
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
    }
    
    .collapsible-section.expanded .collapsible-content {
        padding: 0.75rem;
    }
    
    .key-value-pair,
    .key-value-pair-compact {
        grid-template-columns: 1fr 1fr auto;
        gap: 0.375rem;
        padding: 0.5rem;
    }
    
    .key-value-pair input,
    .key-value-pair-compact input {
        padding: 0.375rem;
        font-size: 0.8rem;
    }
    
    .key-value-remove,
    .kv-remove-btn {
        width: 1.75rem;
        height: 1.75rem;
    }
    
    .options-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
    }
}

@media (max-width: 480px) {
    .response-action-btn {
        padding: 0.25rem;
        min-width: 1.75rem;
    }
    
    .response-stats {
        font-size: 0.75rem;
    }
    
    .key-value-pair,
    .key-value-pair-compact {
        grid-template-columns: 1fr;
        gap: 0.25rem;
        padding: 0.375rem;
    }
    
    .key-value-remove,
    .kv-remove-btn {
        justify-self: end;
        width: 1.5rem;
        height: 1.5rem;
        margin-top: 0.25rem;
    }
    
    .key-value-pair input,
    .key-value-pair-compact input {
        padding: 0.375rem;
        font-size: 0.8rem;
    }
}

/* Additional constraint fixes for better containment */
.collapsible-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease, padding 0.3s ease;
    background: var(--bg-primary, white);
    width: 100%;
    box-sizing: border-box;
}

.collapsible-section.expanded .collapsible-content {
    max-height: none;
    padding: 1rem;
    overflow: visible; /* Allow content to flow naturally but constrain width */
}

/* Ensure all collapsible sections respect container boundaries */
.collapsible-section {
    border: 1px solid var(--border-color, #e9ecef);
    border-radius: 6px;
    margin-bottom: 0.75rem;
    overflow: hidden;
    background: var(--bg-primary, white);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
    width: 100%;
    box-sizing: border-box;
}

/* Fix for specific container constraints */
.tester-section .collapsible-section,
.request-panel .collapsible-section {
    max-width: 100%;
}

.section-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    box-sizing: border-box;
}

/* Ensure inputs don't exceed their grid cells */
.key-value-pair input[type="text"],
.key-value-pair-compact input[type="text"] {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
}
`;

// Inject the improved responsive styles
if (!document.getElementById('improved-responsive-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'improved-responsive-styles';
    styleSheet.textContent = improvedResponsiveStyles;
    document.head.appendChild(styleSheet);
}