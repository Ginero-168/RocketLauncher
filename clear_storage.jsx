// Clear TATA localStorage
(function() {
    try {
        if (typeof localStorage !== 'undefined') {
            // Clear layout state
            localStorage.removeItem('tata_layout');
            alert('Storage cleared! Please reload the panel.');
        }
    } catch(e) {
        alert('Error: ' + e.message);
    }
})();
