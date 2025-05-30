// Request history management module
// Available globally

class HistoryManager {
    constructor(maxItems = 50) {
        this.maxItems = maxItems;
        this.history = this.load();
    }

    add(item) {
        this.history.unshift(item);
        if (this.history.length > this.maxItems) {
            this.history = this.history.slice(0, this.maxItems);
        }
        this.save();
    }

    load() {
        try {
            const stored = localStorage.getItem('anyapi_request_history');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    save() {
        localStorage.setItem('anyapi_request_history', JSON.stringify(this.history));
    }

    clear() {
        this.history = [];
        this.save();
    }

    export() {
        return {
            exported: new Date().toISOString(),
            version: '1.0',
            history: this.history
        };
    }

    import(data) {
        if (data.history && Array.isArray(data.history)) {
            this.history = [...data.history, ...this.history].slice(0, this.maxItems);
            this.save();
            return true;
        }        return false;
    }

    // Optionally, add a filter method that uses the global selector:
    filterByCurrentProfile() {
        const select = document.getElementById('global-profile-selector');
        const profileName = select ? select.value : '';
        if (!profileName) {
            this.render(); // Show all
            return;
        }
        const filtered = this.history.filter(item => item.profileName === profileName);
        this.render(filtered);
    }
}

// Make HistoryManager globally available
window.HistoryManager = HistoryManager;
