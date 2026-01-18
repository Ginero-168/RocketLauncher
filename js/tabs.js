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

                function save() {
                    var newName = input.value.trim();
                    if (newName) {
                        self.innerText = newName;
                        var names = {};
                        var saved = localStorage.getItem('tata_tab_names');
                        if (saved) try { names = JSON.parse(saved); } catch (e) { }
                        names[self.dataset.tab] = newName;
                        localStorage.setItem('tata_tab_names', JSON.stringify(names));
                    } else {
                        self.innerText = currentName;
                    }
                }

                input.addEventListener('blur', save);
                input.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') {
                        save();
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
