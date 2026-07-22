/**
 * TATA Panel - Tabs Module
 * Contains: Tab switching, renaming, button movement
 * @version 4.2
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    // ==========================================
    // Tab Setup (Legacy)
    // ==========================================
    function setupTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', function () {
                switchTab(this);
            });
        });
    }

    // ==========================================
    // Tab Switching
    // ==========================================
    function switchTab(tabBtn) {
        const allTabs = document.querySelectorAll('.tab-btn');
        const allContents = document.querySelectorAll('.tab-content');

        for (var i = 0; i < allTabs.length; i++) {
            allTabs[i].classList.remove('active');
        }
        for (var i = 0; i < allContents.length; i++) {
            allContents[i].classList.remove('active');
        }

        if (tabBtn) {
            tabBtn.classList.add('active');
            const targetId = tabBtn.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // Show tab-actions only on Button tab
            const tabActions = document.querySelector('.tab-actions');
            if (tabActions) {
                tabActions.style.display = (targetId === 'tab_button') ? 'flex' : 'none';
            }
        }
    }

    // ==========================================
    // Move Button to Tab (uses TATA.state)
    // ==========================================
    function moveButtonToTab(btnId, targetTabId) {
        const layoutState = TATA.state.layoutState || {};
        let foundSourceTab = null;
        let oldRowIndex = -1;
        let oldColIndex = -1;

        Object.keys(layoutState).forEach(tId => {
            const rows = layoutState[tId];
            rows.forEach((r, rIdx) => {
                const cIdx = r.indexOf(btnId);
                if (cIdx !== -1) {
                    foundSourceTab = tId;
                    oldRowIndex = rIdx;
                    oldColIndex = cIdx;
                }
            });
        });

        if (foundSourceTab) {
            layoutState[foundSourceTab][oldRowIndex].splice(oldColIndex, 1);
            if (layoutState[foundSourceTab][oldRowIndex].length === 0) {
                layoutState[foundSourceTab].splice(oldRowIndex, 1);
            }
        }

        if (!layoutState[targetTabId]) layoutState[targetTabId] = [];
        layoutState[targetTabId].push([btnId]);

        TATA.state.layoutState = layoutState;
        if (typeof TATA.saveLayout === 'function') TATA.saveLayout();
        if (typeof TATA.renderGrid === 'function') TATA.renderGrid();
    }

    // ==========================================
    // Export to TATA Namespace
    // ==========================================
    TATA.setupTabs = setupTabs;
    TATA.switchTab = switchTab;
    TATA.moveButtonToTab = moveButtonToTab;

})();
