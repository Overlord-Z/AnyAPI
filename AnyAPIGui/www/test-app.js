// Test script to verify AnyAPI functionality
console.log('🧪 Testing AnyAPI functionality...');

// Test dark mode functionality
setTimeout(() => {
    console.log('Testing dark mode...');
    const isDarkInitially = document.documentElement.getAttribute('data-theme') === 'dark';
    console.log('Initial theme:', isDarkInitially ? 'dark' : 'light');
    
    // Toggle dark mode
    if (window.app && typeof window.app.toggleDarkMode === 'function') {
        window.app.toggleDarkMode();
        console.log('✅ Dark mode toggle works');
        
        // Toggle back
        setTimeout(() => {
            window.app.toggleDarkMode();
            console.log('✅ Dark mode toggle back works');
        }, 1000);
    } else {
        console.error('❌ Dark mode toggle not available');
    }
}, 2000);

// Test endpoint tester
setTimeout(() => {
    console.log('Testing endpoint tester...');
    if (window.endpointTester) {
        console.log('✅ EndpointTester is available');
        
        // Test history methods
        if (typeof window.endpointTester.clearHistory === 'function') {
            console.log('✅ clearHistory method available');
        } else {
            console.error('❌ clearHistory method missing');
        }
        
        if (typeof window.endpointTester.exportHistory === 'function') {
            console.log('✅ exportHistory method available');
        } else {
            console.error('❌ exportHistory method missing');
        }
        
        if (typeof window.endpointTester.importHistory === 'function') {
            console.log('✅ importHistory method available');
        } else {
            console.error('❌ importHistory method missing');
        }
    } else {
        console.error('❌ EndpointTester not available');
    }
}, 3000);

// Test profile manager
setTimeout(() => {
    console.log('Testing profile manager...');
    const profileList = document.getElementById('profile-list');
    if (profileList) {
        console.log('✅ Profile list container found');
    } else {
        console.error('❌ Profile list container not found');
    }
    
    if (window.profileManager) {
        console.log('✅ ProfileManager is available');
    } else {
        console.warn('⚠️ ProfileManager not available (optional)');
    }
}, 4000);

// Test notification system
setTimeout(() => {
    console.log('Testing notifications...');
    if (window.showNotification && typeof window.showNotification === 'function') {
        window.showNotification('Test notification - All systems working!', 'success', 3000);
        console.log('✅ Notification system works');
    } else {
        console.error('❌ Notification system not available');
    }
}, 5000);

console.log('🧪 Test script loaded, will run tests over 5 seconds...');
