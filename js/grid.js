/**
 * TATA Panel - Grid Module
 * Contains: V2 Layout, Icons, Defaults, renderGrid, createGridButton, Event Delegation
 * @version 5.0 - Optimized with debounce, batched saves, event delegation
 */
(function () {
    'use strict';

    window.TATA = window.TATA || {};

    // ==========================================
    // Icons SVG Definitions
    // ==========================================
    var ICONS = {
        fit: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 4h4v2H4v4H2V4a2 2 0 0 1 2-2zm16 0h-4v2h4v4h2V4a2 2 0 0 0-2-2zM4 20h4v-2H4v-4H2v4a2 2 0 0 0 2 2zm16 0h-4v-2h4v-4h2v4a2 2 0 0 0-2 2z" /></svg>',
        resize: '<svg class="icon" viewBox="0 0 24 24"><path d="M19 12h-2.26l2.03-2.03l-1.41-1.41L15.31 10.6V8.34h-2v4.66h4.66v-2h-2.66zM7 12h2.26L7.23 14.03l1.41 1.41L10.69 13.4v2.26h2v-4.66H8.03v2H10.69z" /></svg>',
        follow: '<svg class="icon" viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" /></svg>',
        arrange: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z" /></svg>',
        stars: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>',
        palette: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>',
        embed: '<svg class="icon" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z" /></svg>',
        preview: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>',
        dimension: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M21 21l-4.486-4.494M19 10H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM10 3v4M14 3v4M8 5h8" /></svg>',
        clean: '<svg class="icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>',
        colors: '<svg class="icon" viewBox="0 0 24 24" fill="#FFD700"><circle cx="12" cy="12" r="10" /></svg>',
        folder: '<svg class="icon" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" /></svg>',
        explore: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"/></svg>'
    };

    // ==========================================
    // V2 Default Button Configuration
    // ==========================================
    var v2Defaults = {
        tab_button: [
            { id: 'btn_fit', label: 'Fit', icon: ICONS.fit, script: 'Fit.jsx' },
            { id: 'btn_resize', label: 'Resize', icon: ICONS.resize, script: 'ResizeDialog.jsx' },
            { id: 'btn_follow', label: 'Follow', icon: ICONS.follow, script: 'Follow.jsx' },
            { id: 'btn_arrange', label: 'Arrange', icon: ICONS.arrange, script: 'ArrangeDialog.jsx' },
            { id: 'btn_stars', label: 'Stars', icon: ICONS.stars, script: 'Stars.jsx' },
            { id: 'btn_palette', label: 'Palette', icon: ICONS.palette, script: 'PaletteGenerator.jsx' },
            { id: 'btn_embed', label: 'Embed', icon: ICONS.embed, script: 'Embed.jsx' },
            { id: 'btn_dimension', label: 'Dimension', icon: ICONS.dimension, script: 'DimensionDialog.jsx' },
            { id: 'btn_clean', label: 'Smart Clean', icon: ICONS.clean, script: 'SmartClean.jsx' }
        ]
    };

    // In-memory layout state
    var v2Layout = {};
    var layoutLoaded = false;

    function cloneDefaults() {
        return JSON.parse(JSON.stringify(v2Defaults));
    }

    function normalizeLayout(layout) {
        var isLayoutObject = layout && typeof layout === 'object' && !Array.isArray(layout);
        var normalized = isLayoutObject ? layout : {};
        var changed = !isLayoutObject;
        var allLayoutIds = {};

        ['tab_button'].forEach(function (tabName) {
            if (!Array.isArray(normalized[tabName])) {
                normalized[tabName] = [];
                changed = true;
            }
            normalized[tabName].forEach(function (item) {
                if (item && item.id) allLayoutIds[item.id] = true;
            });
        });

        Object.keys(v2Defaults).forEach(function (tabName) {
            if (!Array.isArray(normalized[tabName])) {
                normalized[tabName] = [];
                changed = true;
            }
            v2Defaults[tabName].forEach(function (def) {
                if (!allLayoutIds[def.id]) {
                    normalized[tabName].push(JSON.parse(JSON.stringify(def)));
                    allLayoutIds[def.id] = true;
                    changed = true;
                }
            });
        });

        return { layout: normalized, changed: changed };
    }

    function loadV2Layout(forceReload) {
        if (layoutLoaded && !forceReload) return false;

        var safeParse = TATA.safeParse || JSON.parse;
        var saved = localStorage.getItem('tata_v2_layout');
        var parsed = saved ? safeParse(saved, null) : cloneDefaults();
        var result = normalizeLayout(parsed);
        v2Layout = result.layout;
        layoutLoaded = true;

        if (!saved || result.changed) saveV2Layout();
        return true;
    }

    // Drag state (shared across delegation handlers)
    var _draggedItem = null;

    // ==========================================
    // Debounced/Batched Variants
    // ==========================================
    var renderGridDebounced = TATA.debounce(renderGrid, 80);
    var saveV2LayoutBatched = TATA.debounce(saveV2Layout, 150);

    // ==========================================
    // Render Grid
    // ==========================================
    function renderGrid() {
        loadV2Layout();

        ['tab_button'].forEach(function (tabName) {
            var container = document.getElementById(tabName);
            if (!container) return;
            container.innerHTML = '';

            var items = v2Layout[tabName] || [];
            var userItems = [];
            var defaultItems = [];

            items.forEach(function (item) {
                if (item.id && item.id.indexOf('btn_') === 0) {
                    defaultItems.push(item);
                } else {
                    userItems.push(item);
                }
            });

            function createSection(title, sectionItems) {
                if (sectionItems.length === 0) return;

                var sectionWrap = document.createElement('div');
                sectionWrap.className = 'script-section';

                var header = document.createElement('div');
                header.className = 'section-header';

                var titleEl = document.createElement('h3');
                titleEl.className = 'section-title';
                titleEl.innerText = title;
                header.appendChild(titleEl);

                var arrowSvg = '<svg class="section-arrow" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>';
                var arrowContainer = document.createElement('div');
                arrowContainer.innerHTML = arrowSvg;
                header.appendChild(arrowContainer.firstChild);

                var grid = document.createElement('div');
                grid.className = 'section-grid';
                grid.id = 'grid_' + title.replace(/\s+/g, '_').toLowerCase();

                header.addEventListener('click', function () {
                    header.classList.toggle('collapsed');
                    grid.classList.toggle('collapsed');
                });

                sectionItems.forEach(function (item) {
                    var originalIndex = items.indexOf(item);
                    var btn = createGridButton(item, tabName, originalIndex);
                    grid.appendChild(btn);
                });

                sectionWrap.appendChild(header);
                sectionWrap.appendChild(grid);
                container.appendChild(sectionWrap);
            }

            createSection('User Script', userItems);
            createSection('Default Script', defaultItems);
        });

        // Setup event delegation (once only)
        setupDelegation();
    }

    // ==========================================
    // Create Grid Button (no per-element listeners)
    // ==========================================
    function createGridButton(item, tabName, index) {
        var btn = document.createElement('div');
        btn.className = 'grid-btn';
        btn.id = item.id;
        btn.draggable = true;
        btn.dataset.index = index;
        btn.dataset.tab = tabName;

        // Use CSS custom property for hover color (handled by CSS, no JS listeners needed)
        if (item.color) {
            btn.style.borderColor = item.color;
            btn.style.setProperty('--btn-color', item.color + '60');
        }

        if (item.id && item.id.indexOf('btn_') === 0) {
            btn.classList.add('default-script');
        }

        var iconDiv = document.createElement('div');
        iconDiv.innerHTML = item.icon || ICONS.stars;
        var svg = iconDiv.querySelector('svg');
        if (svg) {
            svg.setAttribute('width', '24');
            svg.setAttribute('height', '24');
        }
        btn.appendChild(iconDiv);

        var lbl = document.createElement('span');
        lbl.innerText = item.label;
        btn.appendChild(lbl);

        return btn;
    }

    // ==========================================
    // Event Delegation (bound once, survives re-renders)
    // ==========================================
    function setupDelegation() {
        if (TATA._gridDelegated) return;
        TATA._gridDelegated = true;

        var containers = document.querySelectorAll('[id="tab_button"]');
        containers.forEach(function (container) {

            // Click delegation
            container.addEventListener('click', function (e) {
                var btn = e.target.closest('.grid-btn');
                if (!btn) return;

                var tab = btn.dataset.tab;
                var idx = parseInt(btn.dataset.index, 10);
                var item = v2Layout[tab] && v2Layout[tab][idx];
                if (!item) return;

                if (item.type === 'subpanel') {
                    CSInterface.prototype.requestOpenExtension(item.target, '');
                } else if (item.script) {
                    if (typeof TATA.runScript === 'function') TATA.runScript(item.script);
                } else if (item.code) {
                    TATA.host.evalCode(item.code);
                }
            });

            // Context menu delegation
            container.addEventListener('contextmenu', function (e) {
                var btn = e.target.closest('.grid-btn');
                if (!btn) return;
                e.preventDefault();
                e.stopPropagation();

                var tab = btn.dataset.tab;
                var idx = parseInt(btn.dataset.index, 10);
                var item = v2Layout[tab] && v2Layout[tab][idx];
                if (!item) return;

                window.currentContextScriptId = item.id;
                TATA.setCurrentContextId && TATA.setCurrentContextId(item.id);

                var menu = document.getElementById('context_menu');
                if (menu) {
                    var isDefault = (item.id.indexOf('btn_') === 0);
                    var editBtn = document.getElementById('ctx_edit');
                    var delBtn = document.getElementById('ctx_delete');
                    var colorRow = document.getElementById('ctx_colors');
                    if (editBtn) editBtn.style.display = isDefault ? 'none' : 'block';
                    if (delBtn) delBtn.style.display = isDefault ? 'none' : 'block';
                    if (colorRow) colorRow.style.display = 'flex';
                    menu.style.display = 'block';
                    var menuWidth = 140;
                    var x = e.clientX;
                    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
                    menu.style.left = x + 'px';
                    menu.style.top = e.clientY + 'px';
                }
            });

            // Drag delegation
            container.addEventListener('dragstart', function (e) {
                var btn = e.target.closest('.grid-btn');
                if (!btn) return;
                _draggedItem = btn;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', btn.innerHTML);
                var itemData = getItemDataFromElement(btn);
                e.dataTransfer.setData('text/plain', JSON.stringify(itemData));
            });

            container.addEventListener('dragend', function () {
                _draggedItem = null;
            });

            container.addEventListener('dragover', function (e) {
                e.preventDefault();
            });

            container.addEventListener('drop', function (e) {
                var btn = e.target.closest('.grid-btn');
                if (btn && _draggedItem && _draggedItem !== btn) {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        var srcTab = _draggedItem.dataset.tab;
                        var srcIdx = parseInt(_draggedItem.dataset.index, 10);
                        var destTab = btn.dataset.tab;
                        var destIdx = parseInt(btn.dataset.index, 10);

                        if (srcTab === destTab) {
                            var list = v2Layout[srcTab];
                            var temp = list[srcIdx];
                            list[srcIdx] = list[destIdx];
                            list[destIdx] = temp;
                        } else {
                            var item = v2Layout[srcTab].splice(srcIdx, 1)[0];
                            v2Layout[destTab].splice(destIdx, 0, item);
                        }

                        saveV2LayoutBatched();
                        renderGridDebounced();
                    } catch (err) {
                        console.error('[TATA] Drop Error:', err);
                        if (TATA.showToast) TATA.showToast('Drag failed: ' + err.message, 'error');
                    }
                    return;
                }

                // Drop on section-grid (empty area)
                var sectionGrid = e.target.closest('.section-grid');
                if (sectionGrid && _draggedItem) {
                    e.preventDefault();
                    var srcTab = _draggedItem.dataset.tab;
                    var srcIdx = parseInt(_draggedItem.dataset.index, 10);

                    var item = v2Layout[srcTab].splice(srcIdx, 1)[0];
                    if (sectionGrid.id === 'grid_default_script') {
                        v2Layout[srcTab].push(item);
                    } else {
                        v2Layout[srcTab].unshift(item);
                    }
                    saveV2LayoutBatched();
                    renderGridDebounced();
                }
            });
        });
    }

    // ==========================================
    // Utility Functions
    // ==========================================
    function getItemDataFromElement(el) {
        var tab = el.dataset.tab;
        var idx = el.dataset.index;
        return v2Layout[tab][idx];
    }

    function saveV2Layout(skipSync) {
        if (TATA.backupBeforeSave) TATA.backupBeforeSave('tata_v2_layout');
        localStorage.setItem('tata_v2_layout', JSON.stringify(v2Layout));
        if (!skipSync && window.TATA && window.TATA.Sync && window.TATA.Sync.autoPush) window.TATA.Sync.autoPush();
    }

    function getV2Layout() {
        loadV2Layout();
        return v2Layout;
    }

    function setV2Layout(layout) {
        v2Layout = layout && typeof layout === 'object' ? layout : cloneDefaults();
        layoutLoaded = true;
    }

    function reloadV2Layout() {
        loadV2Layout(true);
        renderGrid();
    }

    // Direct binding for v2Layout
    Object.defineProperty(TATA, 'v2Layout', {
        get: function () { return v2Layout; },
        set: function (val) { v2Layout = val; }
    });

    // ==========================================
    // Export to TATA Namespace
    // ==========================================
    TATA.ICONS = ICONS;
    TATA.v2Defaults = v2Defaults;
    TATA.renderGrid = renderGrid;
    TATA.renderGridDebounced = renderGridDebounced;
    TATA.createGridButton = createGridButton;
    TATA.saveV2Layout = saveV2Layout;
    TATA.saveV2LayoutBatched = saveV2LayoutBatched;
    TATA.saveLayout = saveV2Layout; // legacy alias for tabs.js
    TATA.getV2Layout = getV2Layout;
    TATA.setV2Layout = setV2Layout;
    TATA.reloadV2Layout = reloadV2Layout;
    TATA.getItemDataFromElement = getItemDataFromElement;

})();
