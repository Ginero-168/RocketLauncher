/**
 * TATA Panel - Tabs Module
 * Contains: Tab switching, renaming, button movement
 * @version 4.2
 */
(function () {
    'use strict';

    window.TATA = window.TATA || {};

    // ==========================================
    // Tab Setup (Legacy)
    // ==========================================
    function setupTabs() {
        var tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                switchTab(this);
            });
        });
    }

    // ==========================================
    // Tab Renaming
    // ==========================================
    function initTabRenaming() {
        var tabs = document.querySelectorAll('.tab-btn');

        // Load Saved Names
        var savedNames = localStorage.getItem('tata_tab_names');
        if (savedNames) {
            try {
                var names = JSON.parse(savedNames);
                tabs.forEach(function (tab) {
                    var key = tab.dataset.tab;
                    if (names[key]) tab.innerText = names[key];
                });
            } catch (e) { }
        }

        tabs.forEach(function (tab) {
            tab.addEventListener('dblclick', function () {
                var currentName = this.innerText;
                var input = document.createElement('input');
                input.type = 'text';
                input.className = 'tab-rename-input';
                input.value = currentName;

                var self = this;
                var saved = false; // Prevent double save

                function save() {
                    if (saved) return; // Already saved
                    saved = true;

                    var newName = input.value.trim() || currentName;

                    // Remove input if still present
                    if (input.parentNode === self) {
                        self.removeChild(input);
                    }

                    // Set text directly
                    self.textContent = newName;

                    // Save to localStorage
                    var names = {};
                    var storedNames = localStorage.getItem('tata_tab_names');
                    if (storedNames) try { names = JSON.parse(storedNames); } catch (e) { }
                    names[self.dataset.tab] = newName;
                    localStorage.setItem('tata_tab_names', JSON.stringify(names));
                }

                input.addEventListener('blur', save);
                input.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') {
                        input.blur(); // Trigger blur which calls save
                    }
                });

                this.innerHTML = '';
                this.appendChild(input);
                input.focus();
                input.select();
            });
        });
    }

    // ==========================================
    // Tab Switching
    // ==========================================
    function switchTab(tabBtn) {
        var allTabs = document.querySelectorAll('.tab-btn');
        var allContents = document.querySelectorAll('.tab-content');

        for (var i = 0; i < allTabs.length; i++) {
            allTabs[i].classList.remove('active');
        }
        for (var i = 0; i < allContents.length; i++) {
            allContents[i].classList.remove('active');
        }

        if (tabBtn) {
            tabBtn.classList.add('active');
            var targetId = tabBtn.getAttribute('data-tab');
            var targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        }
    }

    // ==========================================
    // Move Button to Tab (uses TATA.state)
    // ==========================================
    function moveButtonToTab(btnId, targetTabId) {
        var layoutState = TATA.state.layoutState || {};
        var foundSourceTab = null;
        var oldRowIndex = -1;
        var oldColIndex = -1;

        Object.keys(layoutState).forEach(function (tId) {
            var rows = layoutState[tId];
            rows.forEach(function (r, rIdx) {
                var cIdx = r.indexOf(btnId);
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
    TATA.initTabRenaming = initTabRenaming;
    TATA.switchTab = switchTab;
    TATA.moveButtonToTab = moveButtonToTab;

})();
