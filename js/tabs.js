/**
 * Rocket Launcher - Tabs Module
 * Contains: Tab switching
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    // ==========================================
    // Tab Switching
    // ==========================================
    function switchTab(tabBtn) {
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        if (tabBtn) {
            tabBtn.classList.add('active');
            const targetId = tabBtn.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');

            // Show tab-actions only on Button tab
            const tabActions = document.querySelector('.tab-actions');
            if (tabActions) tabActions.style.display = (targetId === 'tab_button') ? 'flex' : 'none';
        }
    }

    // ==========================================
    // Export to TATA Namespace
    // ==========================================
    TATA.switchTab = switchTab;

})();
