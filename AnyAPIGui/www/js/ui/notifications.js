// Notification helpers (showNotification, etc.)
// Exported as ES6 module

export function showNotification(message, type = 'info', duration = 3000) {
    const notificationsContainer = document.getElementById('notifications') || createNotificationsContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
    `;
    
    notificationsContainer.appendChild(notification);
    
    // Trigger slide-up animation immediately
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Auto-remove after duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
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
