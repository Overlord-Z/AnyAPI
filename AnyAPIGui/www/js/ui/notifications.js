// Notification helpers (showNotification, etc.)
// Exported as ES6 module

export function showNotification(message, type = 'info', duration = 4000) {
    const notificationsContainer = document.getElementById('notifications') || createNotificationsContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i data-feather="x"></i>
            </button>
        </div>
    `;
    
    notificationsContainer.appendChild(notification);
    
    // Auto-remove after duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
    
    // Refresh feather icons if available
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

function createNotificationsContainer() {
    const container = document.createElement('div');
    container.id = 'notifications';
    container.className = 'notifications';
    document.body.appendChild(container);
    return container;
}
