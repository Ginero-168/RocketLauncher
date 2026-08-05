/**
 * TATA Panel - Grid Module
 * Contains: V2 Layout, Icons, Defaults, renderGrid, createGridButton, Event Delegation
 * @version 5.0 - Optimized with debounce, batched saves, event delegation
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    // ==========================================
    // Icons SVG Definitions
    // ==========================================
    const ICONS = {
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
    const v2Defaults = {
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
    let v2Layout = {};
    let layoutLoaded = false;

    function cloneDefaults() {
        return JSON.parse(JSON.stringify(v2Defaults));
    }

    function normalizeLayout(layout) {
        const isLayoutObject = layout && typeof layout === 'object' && !Array.isArray(layout);
        const normalized = isLayoutObject ? layout : {};
        let changed = !isLayoutObject;
        const allLayoutIds = {};

        ['tab_button'].forEach(tabName => {
            if (!Array.isArray(normalized[tabName])) {
                normalized[tabName] = [];
                changed = true;
            }
            normalized[tabName].forEach(item => {
                if (item && item.id) allLayoutIds[item.id] = true;
            });
        });

        Object.keys(v2Defaults).forEach(tabName => {
            if (!Array.isArray(normalized[tabName])) {
                normalized[tabName] = [];
                changed = true;
            }
            v2Defaults[tabName].forEach(def => {
                if (!allLayoutIds[def.id]) {
                    normalized[tabName].push(JSON.parse(JSON.stringify(def)));
                    allLayoutIds[def.id] = true;
                    changed = true;
                }
            });
        });

        return { layout: normalized, changed };
    }

    function loadV2Layout(forceReload) {
        if (layoutLoaded && !forceReload) return false;

        const safeParse = TATA.safeParse || JSON.parse;
        const saved = localStorage.getItem('tata_v2_layout');
        const parsed = saved ? safeParse(saved, null) : cloneDefaults();
        const result = normalizeLayout(parsed);
        v2Layout = result.layout;
        layoutLoaded = true;

        if (!saved || result.changed) saveV2Layout();
        return true;
    }

    // Drag state (shared across delegation handlers)
    let _draggedItem = null;

    // ==========================================
    // Debounced/Batched Variants
    // ==========================================
    const renderGridDebounced = TATA.debounce(renderGrid, 80);
    const saveV2LayoutBatched = TATA.debounce(saveV2Layout, 150);

    // ==========================================
    // Render Grid (incremental: reuse DOM instead of wiping)
    // ==========================================
    function renderGrid() {
        loadV2Layout();

        ['tab_button'].forEach(tabName => {
            const container = document.getElementById(tabName);
            if (!container) return;

            const items = v2Layout[tabName] || [];
            const userItems = [];
            const defaultItems = [];

            items.forEach(item => {
                if (item.id && item.id.indexOf('btn_') === 0) {
                    defaultItems.push(item);
                } else {
                    userItems.push(item);
                }
            });

            function getOrCreateSection(title) {
                const gridId = `grid_${title.replace(/\s+/g, '_').toLowerCase()}`;
                let sectionWrap = container.querySelector(`:scope > .script-section:has(#${gridId})`);
                if (!sectionWrap) {
                    sectionWrap = document.createElement('div');
                    sectionWrap.className = 'script-section';

                    const header = document.createElement('div');
                    header.className = 'section-label';

                    const titleEl = document.createElement('h3');
                    titleEl.className = 'section-title';
                    titleEl.innerText = title;
                    header.appendChild(titleEl);

                    const grid = document.createElement('div');
                    grid.className = 'section-grid';
                    grid.id = gridId;

                    sectionWrap.appendChild(header);
                    sectionWrap.appendChild(grid);
                    container.appendChild(sectionWrap);
                }
                return sectionWrap.querySelector(`#${gridId}`);
            }

            function renderSection(title, sectionItems) {
                const grid = getOrCreateSection(title);
                if (!grid) return;

                // Hide empty sections, show non-empty
                const sectionWrap = grid.parentElement;
                if (sectionItems.length === 0) {
                    if (sectionWrap) sectionWrap.style.display = 'none';
                    return;
                }
                if (sectionWrap) sectionWrap.style.display = '';

                // Track which buttons should remain
                const activeIds = new Set();

                sectionItems.forEach(item => {
                    const originalIndex = items.indexOf(item);
                    let btn = document.getElementById(item.id);
                    if (btn && !btn.classList.contains('grid-btn')) {
                        btn = null;
                    }
                    if (!btn) {
                        btn = createGridButton(item, tabName, originalIndex);
                    } else {
                        updateGridButton(btn, item, tabName, originalIndex);
                    }
                    grid.appendChild(btn);
                    activeIds.add(item.id);
                });

                // Remove buttons that are no longer in this section
                Array.from(grid.children).forEach(child => {
                    if (child.classList.contains('grid-btn') && !activeIds.has(child.id)) {
                        child.remove();
                    }
                });
            }

            renderSection('User Script', userItems);
            renderSection('Default Script', defaultItems);
        });

        // Setup event delegation (once only)
        setupDelegation();
    }

    // ==========================================
    // Create Grid Button (no per-element listeners)
    // ==========================================
    function getButtonTextColor(color) {
        const match = String(color || '').replace('#', '').match(/^[0-9a-f]{6}$/i);
        if (!match) return '#f5f2e9';

        const hex = match[0];
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return ((r * 299 + g * 587 + b * 114) / 1000) > 155 ? '#171717' : '#f5f2e9';
    }

    function createGridButton(item, tabName, index) {
        const btn = document.createElement('div');
        btn.className = 'grid-btn';
        btn.id = item.id;
        btn.draggable = true;
        btn.dataset.index = index;
        btn.dataset.tab = tabName;
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');
        btn.setAttribute('aria-label', item.label);

        // Use CSS custom property for hover color (handled by CSS, no JS listeners needed)
        const resolvedColor = TATA.resolveColor ? TATA.resolveColor(item.color) : item.color;
        if (resolvedColor) {
            btn.classList.add('has-custom-color');
            btn.style.borderColor = '#171717';
            btn.style.backgroundColor = resolvedColor;
            btn.style.color = getButtonTextColor(resolvedColor);
            btn.style.setProperty('--btn-color', resolvedColor);
        }

        if (item.id && item.id.indexOf('btn_') === 0) {
            btn.classList.add('default-script');
        }

        const iconDiv = document.createElement('div');
        iconDiv.innerHTML = item.icon || ICONS.stars;
        const svg = iconDiv.querySelector('svg');
        if (svg) {
            svg.setAttribute('width', '24');
            svg.setAttribute('height', '24');
        }
        btn.appendChild(iconDiv);

        const lbl = document.createElement('span');
        lbl.innerText = item.label;
        btn.appendChild(lbl);

        return btn;
    }

    function updateGridButton(btn, item, tabName, index) {
        btn.dataset.index = index;
        btn.dataset.tab = tabName;
        btn.setAttribute('aria-label', item.label);

        const resolvedColor = TATA.resolveColor ? TATA.resolveColor(item.color) : item.color;
        if (resolvedColor) {
            btn.classList.add('has-custom-color');
            btn.style.borderColor = '#171717';
            btn.style.backgroundColor = resolvedColor;
            btn.style.color = getButtonTextColor(resolvedColor);
            btn.style.setProperty('--btn-color', resolvedColor);
        } else {
            btn.classList.remove('has-custom-color');
            btn.style.borderColor = '';
            btn.style.backgroundColor = '';
            btn.style.color = '';
            btn.style.removeProperty('--btn-color');
        }

        if (item.id && item.id.indexOf('btn_') === 0) {
            btn.classList.add('default-script');
        } else {
            btn.classList.remove('default-script');
        }

        // Update icon
        const iconDiv = btn.querySelector('div') || document.createElement('div');
        iconDiv.innerHTML = item.icon || ICONS.stars;
        const svg = iconDiv.querySelector('svg');
        if (svg) {
            svg.setAttribute('width', '24');
            svg.setAttribute('height', '24');
        }
        if (!iconDiv.parentNode) btn.appendChild(iconDiv);

        // Update label
        let lbl = iconDiv.nextElementSibling;
        if (!lbl || lbl.tagName !== 'SPAN') {
            lbl = document.createElement('span');
            btn.appendChild(lbl);
        }
        lbl.innerText = item.label;

        return btn;
    }

    // ==========================================
    // Event Delegation (bound once, survives re-renders)
    // ==========================================
    function setupDelegation() {
        if (TATA._gridDelegated) return;
        TATA._gridDelegated = true;

        const containers = document.querySelectorAll('[id="tab_button"]');
        containers.forEach(container => {

            // Click delegation
            container.addEventListener('click', e => {
                const btn = e.target.closest('.grid-btn');
                if (!btn) return;

                const tab = btn.dataset.tab;
                const idx = parseInt(btn.dataset.index, 10);
                const item = v2Layout[tab] && v2Layout[tab][idx];
                if (!item) return;

                btn.classList.remove('is-launching');
                void btn.offsetWidth;
                btn.classList.add('is-launching');
                setTimeout(() => btn.classList.remove('is-launching'), 460);

                if (item.type === 'subpanel') {
                    CSInterface.prototype.requestOpenExtension(item.target, '');
                } else if (item.script) {
                    if (typeof TATA.runScript === 'function') TATA.runScript(item.script);
                } else if (item.code) {
                    TATA.host.evalCode(item.code);
                }
            });

            container.addEventListener('keydown', e => {
                const btn = e.target.closest('.grid-btn');
                if (!btn || (e.key !== 'Enter' && e.key !== ' ')) return;
                e.preventDefault();
                btn.click();
            });

            // Context menu delegation
            container.addEventListener('contextmenu', e => {
                const btn = e.target.closest('.grid-btn');
                if (!btn) return;
                e.preventDefault();
                e.stopPropagation();

                const tab = btn.dataset.tab;
                const idx = parseInt(btn.dataset.index, 10);
                const item = v2Layout[tab] && v2Layout[tab][idx];
                if (!item) return;

                window.currentContextScriptId = item.id;
                TATA.setCurrentContextId && TATA.setCurrentContextId(item.id);

                const menu = document.getElementById('context_menu');
                if (menu) {
                    const isDefault = (item.id.indexOf('btn_') === 0);
                    const editBtn = document.getElementById('ctx_edit');
                    const delBtn = document.getElementById('ctx_delete');
                    const colorRow = document.getElementById('ctx_colors');
                    if (editBtn) editBtn.style.display = isDefault ? 'none' : 'block';
                    if (delBtn) delBtn.style.display = isDefault ? 'none' : 'block';
                    if (colorRow) colorRow.style.display = 'flex';
                    menu.style.display = 'block';
                    const menuWidth = 140;
                    let x = e.clientX;
                    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
                    menu.style.left = `${x}px`;
                    menu.style.top = `${e.clientY}px`;
                }
            });

            // Drag delegation
            container.addEventListener('dragstart', e => {
                const btn = e.target.closest('.grid-btn');
                if (!btn) return;
                _draggedItem = btn;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', btn.innerHTML);
                const itemData = getItemDataFromElement(btn);
                e.dataTransfer.setData('text/plain', JSON.stringify(itemData));
            });

            container.addEventListener('dragend', () => {
                _draggedItem = null;
            });

            container.addEventListener('dragover', e => {
                e.preventDefault();
            });

            container.addEventListener('drop', e => {
                const btn = e.target.closest('.grid-btn');
                if (btn && _draggedItem && _draggedItem !== btn) {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        var srcTab = _draggedItem.dataset.tab;
                        var srcIdx = parseInt(_draggedItem.dataset.index, 10);
                        const destTab = btn.dataset.tab;
                        const destIdx = parseInt(btn.dataset.index, 10);

                        if (srcTab === destTab) {
                            const list = v2Layout[srcTab];
                            const temp = list[srcIdx];
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
                        if (TATA.showToast) TATA.showToast(`Drag failed: ${err.message}`, 'error');
                    }
                    return;
                }

                // Drop on section-grid (empty area)
                const sectionGrid = e.target.closest('.section-grid');
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
        const tab = el.dataset.tab;
        const idx = el.dataset.index;
        return v2Layout[tab][idx];
    }

    function saveV2Layout() {
        if (TATA.backupBeforeSave) TATA.backupBeforeSave('tata_v2_layout');
        localStorage.setItem('tata_v2_layout', JSON.stringify(v2Layout));
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
        get() { return v2Layout; },
        set(val) { v2Layout = val; }
    });

    // ==========================================
    // Export to TATA Namespace
    // ==========================================
    TATA.ICONS = ICONS;
    TATA.v2Defaults = v2Defaults;
    TATA.renderGrid = renderGrid;
    TATA.renderGridDebounced = renderGridDebounced;
    TATA.saveV2Layout = saveV2Layout;
    TATA.getV2Layout = getV2Layout;
    TATA.setV2Layout = setV2Layout;
    TATA.reloadV2Layout = reloadV2Layout;
    TATA.getItemDataFromElement = getItemDataFromElement;

})();
