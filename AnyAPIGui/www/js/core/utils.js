// Utility functions (formatJson, escapeHtml, isValidJson, formatDuration, etc.)
// Export all utility functions here

export function formatJson(data) {
    return JSON.stringify(data, null, 2);
}

export function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, function (tag) {
        const charsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        };
        return charsToReplace[tag] || tag;
    });
}

export function isValidJson(str) {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}

export function formatDuration(ms) {
    if (ms < 1000) return ms + ' ms';
    return (ms / 1000).toFixed(2) + ' s';
}
