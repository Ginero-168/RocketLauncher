/**
 * TATA Panel - Script context menu
 * Right-click on a script button: recolour, edit, copy, upload or delete.
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    let menuEl = null;
    let currentContextScriptId = null;

    const NO_COLOR_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

    function targetId() {
        return currentContextScriptId || window.currentContextScriptId || null;
    }

    function setCurrentContextId(id) {
        currentContextScriptId = id;
        window.currentContextScriptId = id;
    }

    // ==========================================
    // Open / close
    // ==========================================
    function closeContextMenu() {
        if (menuEl) menuEl.hidden = true;
    }

    function openContextMenu(x, y, options) {
        menuEl = menuEl || document.getElementById('context_menu');
        if (!menuEl) return;
        const isDefault = !!(options && options.isDefault);
        ['ctx_edit', 'ctx_delete'].forEach(id => {
            const item = document.getElementById(id);
            if (item) item.hidden = isDefault;
        });
        menuEl.hidden = false;
        // Measure, then keep the whole menu inside the panel.
        const width = menuEl.offsetWidth || 196;
        const height = menuEl.offsetHeight || 200;
        const left = Math.max(4, Math.min(x, window.innerWidth - width - 4));
        const top = Math.max(4, Math.min(y, window.innerHeight - height - 4));
        menuEl.style.left = `${left}px`;
        menuEl.style.top = `${top}px`;
        const first = menuEl.querySelector('.swatch-btn');
        if (first && typeof first.focus === 'function') first.focus();
    }

    // ==========================================
    // Actions
    // ==========================================
    function findItem(id) {
        const layout = TATA.getV2Layout ? TATA.getV2Layout() : (TATA.v2Layout || {});
        const list = layout.tab_button || [];
        for (let i = 0; i < list.length; i++) {
            if (list[i] && list[i].id === id) return list[i];
        }
        const stored = TATA.getUserScripts ? TATA.getUserScripts() : {};
        return stored[id] || null;
    }

    // Default tools keep their code in jsx/; the editor needs the text.
    function bundledCode(scriptName) {
        if (!scriptName || !/\.jsx$/i.test(scriptName)) return '';
        try {
            const fs = window.require('fs');
            const path = window.require('path');
            const root = TATA.getExtensionPath ? TATA.getExtensionPath() : (TATA.extensionPath || '');
            const local = path.join(root, 'jsx', scriptName);
            if (fs.existsSync(local)) return fs.readFileSync(local, 'utf8');
            if (fs.existsSync(scriptName)) return fs.readFileSync(scriptName, 'utf8');
        } catch (err) {
            console.error('[TATA] Could not read', scriptName, err);
        }
        return '';
    }

    function editScript() {
        const id = targetId();
        closeContextMenu();
        if (!id) return;
        if (id.indexOf('btn_') === 0) {
            if (TATA.showToast) TATA.showToast('Built-in tools cannot be edited', 'error');
            return;
        }
        const found = findItem(id);
        if (!found || (!found.code && !found.script)) {
            if (TATA.showToast) TATA.showToast('This button has no code to edit', 'error');
            return;
        }
        const item = Object.assign({}, found);
        if (!item.code && item.script) item.code = bundledCode(item.script);
        if (typeof TATA.openEditorForItem === 'function') TATA.openEditorForItem(item);
        else if (TATA.showToast) TATA.showToast('The editor is not available', 'error');
    }

    function copyScript() {
        const id = targetId();
        closeContextMenu();
        if (!id) return;
        const isDefault = id.indexOf('btn_') === 0;
        const original = isDefault ? findItem(id) : (TATA.getUserScripts ? TATA.getUserScripts()[id] : null);
        if (!original) {
            if (TATA.showToast) TATA.showToast('Script not found', 'error');
            return;
        }
        const baseName = isDefault ? original.label : (original.name || original.label);
        let code = original.code || '';
        if (isDefault && original.script) {
            code = bundledCode(original.script) || `// Could not read ${original.script}`;
        }
        if (typeof TATA.saveUserScript !== 'function') {
            if (TATA.showToast) TATA.showToast('Could not create a copy', 'error');
            return;
        }
        // saveUserScript(name, icon, code, color, isUpdate, targetId, skipRender, source)
        TATA.saveUserScript(`${baseName} (Copy)`, original.icon || '★', code, original.color || '',
            false, `copy_${Date.now()}`, false, original.source);
        if (TATA.showToast) TATA.showToast('Copy created', 'success');
    }

    function deleteScript() {
        const id = targetId();
        closeContextMenu();
        if (!id) return;
        if (id.indexOf('btn_') === 0) {
            if (TATA.showToast) TATA.showToast('Built-in tools cannot be deleted', 'error');
            return;
        }
        const item = findItem(id);
        const name = item ? (item.label || item.name || 'this script') : 'this script';
        const remove = () => {
            if (TATA.deleteUserScript) TATA.deleteUserScript(id);
            setCurrentContextId(null);
        };
        if (typeof TATA.askConfirm !== 'function') return;
        TATA.askConfirm({
            title: 'Delete script',
            message: `Delete "${name}"? This cannot be undone.`,
            confirmLabel: 'Delete',
            danger: true
        }).then(ok => { if (ok) remove(); });
    }

    // ==========================================
    // Build once
    // ==========================================
    function buildSwatches(row) {
        if (!row || row.children.length) return;
        const colors = TATA.BUTTON_COLORS || ['', '#e61919', '#ff8709', '#ffe500', '#b8f55f', '#9d95ff', '#ff9ecd', '#0ae448', '#00bae2'];
        colors.forEach(color => {
            const swatch = document.createElement('button');
            swatch.type = 'button';
            swatch.className = color ? 'swatch-btn' : 'swatch-btn swatch-btn--none';
            swatch.setAttribute('role', 'menuitem');
            if (color) {
                swatch.style.setProperty('--swatch', color);
                swatch.title = color;
                swatch.setAttribute('aria-label', `Color ${color}`);
            } else {
                swatch.innerHTML = NO_COLOR_ICON;
                swatch.title = 'No color';
                swatch.setAttribute('aria-label', 'No color');
            }
            swatch.addEventListener('click', event => {
                event.stopPropagation();
                const id = targetId();
                closeContextMenu();
                if (id) updateItemColor(id, color);
            });
            row.appendChild(swatch);
        });
    }

    function startContextMenu() {
        menuEl = document.getElementById('context_menu');
        if (!menuEl || menuEl.dataset.bound === '1') return;
        menuEl.dataset.bound = '1';
        buildSwatches(document.getElementById('ctx_colors'));

        const bind = (id, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', event => {
                event.stopPropagation();
                handler();
            });
        };
        bind('ctx_edit', editScript);
        bind('ctx_copy', copyScript);
        bind('ctx_delete', deleteScript);
        // #ctx_market is bound by market.js (it owns uploads).

        menuEl.addEventListener('contextmenu', event => event.preventDefault());
        document.addEventListener('click', event => {
            if (menuEl && !menuEl.contains(event.target)) closeContextMenu();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && menuEl && !menuEl.hidden) closeContextMenu();
        });
        window.addEventListener('blur', closeContextMenu);
        window.addEventListener('resize', closeContextMenu);
        document.addEventListener('scroll', closeContextMenu, true);
    }

    // ==========================================
    // Update Item Color
    // ==========================================
    function updateItemColor(id, newColor) {
        const v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
        const userScripts = TATA.getUserScripts ? TATA.getUserScripts() : {};
        const hotkeys = TATA.getHotkeys ? TATA.getHotkeys() : [];
        let found = false;

        ['tab_button'].forEach(tab => {
            (v2Layout[tab] || []).forEach(item => {
                if (item.id === id) {
                    item.color = newColor;
                    found = true;
                }
            });
        });

        if (userScripts[id]) {
            userScripts[id].color = newColor;
            if (TATA.setUserScripts) TATA.setUserScripts(userScripts);
        }

        let hotkeyUpdated = false;
        hotkeys.forEach(hk => {
            if (hk && hk.id === id) {
                hk.color = newColor;
                hotkeyUpdated = true;
            }
        });
        if (hotkeyUpdated && TATA.setHotkeys) TATA.setHotkeys(hotkeys);

        if (found) {
            if (TATA.setV2Layout) TATA.setV2Layout(v2Layout);
            if (TATA.saveV2Layout) TATA.saveV2Layout(true);
            else localStorage.setItem('tata_v2_layout', JSON.stringify(v2Layout));
        }
        if (userScripts[id]) localStorage.setItem('tata_user_scripts', JSON.stringify(userScripts));
        if (hotkeyUpdated) {
            if (TATA.saveHotkeys) TATA.saveHotkeys(true);
            if (TATA.renderHotkeys) TATA.renderHotkeys();
        }
        if (found) {
            const renderFn = TATA.renderGridDebounced || TATA.renderGrid;
            if (renderFn) renderFn();
            if (TATA.showToast) TATA.showToast('Color updated', 'success');
        } else if (TATA.showToast) {
            TATA.showToast('Item not found in layout', 'error');
        }
    }

    // ==========================================
    // Export to TATA Namespace
    // ==========================================
    TATA.startContextMenu = startContextMenu;
    TATA.openContextMenu = openContextMenu;
    TATA.closeContextMenu = closeContextMenu;
    TATA.updateItemColor = updateItemColor;
    TATA.setCurrentContextId = setCurrentContextId;

})();
