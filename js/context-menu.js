/**
 * TATA Panel - Context Menu Module
 * Contains: startContextMenu, updateItemColor
 * @version 4.2
 */
(function () {
    'use strict';

    window.TATA = window.TATA || {};

    // Context Menu State
    var contextMenuEl = null;
    var currentContextScriptId = null;

    // Quick Color Palette
    var COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#ec4899'];

    // ==========================================
    // Start Context Menu
    // ==========================================
    function startContextMenu() {
        contextMenuEl = document.getElementById('context_menu');
        var btnEdit = document.getElementById('ctx_edit');
        var btnDelete = document.getElementById('ctx_delete');
        var ctxColors = document.getElementById('ctx_colors');

        // Quick Colors Init
        if (ctxColors && ctxColors.children.length === 0) {
            ctxColors.innerHTML = '';
            COLORS.forEach(function (c) {
                var sw = document.createElement('div');
                sw.style.cssText = 'width: 20px; height: 20px; border-radius: 50%; background: ' + c + '; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); transition: transform 0.1s;';
                sw.onmouseover = function () { this.style.transform = 'scale(1.2)'; };
                sw.onmouseout = function () { this.style.transform = 'scale(1)'; };
                sw.onclick = function (e) {
                    e.stopPropagation();
                    var targetId = window.currentContextScriptId || currentContextScriptId;
                    if (targetId) {
                        updateItemColor(targetId, c);
                        if (contextMenuEl) contextMenuEl.style.display = 'none';
                    }
                };
                ctxColors.appendChild(sw);
            });
        }

        // Global Hide
        window.onclick = function (e) {
            if (contextMenuEl) contextMenuEl.style.display = 'none';
        };

        // Edit Action
        if (btnEdit) {
            btnEdit.onclick = function () {
                var targetId = window.currentContextScriptId || currentContextScriptId;

                if (targetId && targetId.indexOf('btn_') === 0) {
                    TATA.showToast && TATA.showToast("Default scripts cannot be edited.", "error");
                    if (contextMenuEl) contextMenuEl.style.display = 'none';
                    return;
                }

                if (targetId && typeof TATA.openEditScriptModal === 'function') {
                    TATA.openEditScriptModal(targetId);
                }
            };
        }

        // Delete Action
        if (btnDelete) {
            btnDelete.onclick = function (e) {
                e.stopPropagation();
                var targetId = currentContextScriptId || window.currentContextScriptId;

                if (targetId && targetId.indexOf('btn_') === 0) {
                    TATA.showToast && TATA.showToast("Default scripts cannot be deleted.", "error");
                    if (contextMenuEl) contextMenuEl.style.display = 'none';
                    return;
                }

                if (contextMenuEl) contextMenuEl.style.display = 'none';

                if (targetId) {
                    TATA.showConfirmModal && TATA.showConfirmModal("Delete this script?", "This action cannot be undone.", function (confirmed) {
                        if (confirmed) {
                            TATA.deleteUserScript && TATA.deleteUserScript(targetId);
                            currentContextScriptId = null;
                            window.currentContextScriptId = null;
                        }
                    });
                }
            };
        }
    }

    // ==========================================
    // Update Item Color
    // ==========================================
    function updateItemColor(targetId, newColor) {
        var v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
        var userScripts = TATA.getUserScripts ? TATA.getUserScripts() : {};
        var hotkeys = TATA.getHotkeys ? TATA.getHotkeys() : [];
        var found = false;

        // Update In-Memory Layout
        ['tab_button'].forEach(function (tab) {
            if (v2Layout[tab]) {
                v2Layout[tab].forEach(function (item) {
                    if (item.id === targetId) {
                        item.color = newColor;
                        found = true;
                    }
                });
            }
        });

        // Update User Scripts
        if (userScripts[targetId]) {
            userScripts[targetId].color = newColor;
            TATA.setUserScripts && TATA.setUserScripts(userScripts);
            localStorage.setItem('tata_user_scripts', JSON.stringify(userScripts));
        }

        // Update Hotkeys
        var hotkeyUpdated = false;
        hotkeys.forEach(function (hk) {
            if (hk && hk.id === targetId) {
                hk.color = newColor;
                hotkeyUpdated = true;
            }
        });

        if (hotkeyUpdated) {
            TATA.setHotkeys && TATA.setHotkeys(hotkeys);
            TATA.saveHotkeys && TATA.saveHotkeys();
            TATA.renderHotkeys && TATA.renderHotkeys();
        }

        if (found) {
            TATA.setV2Layout && TATA.setV2Layout(v2Layout);
            TATA.saveV2Layout && TATA.saveV2Layout();
            TATA.renderGrid && TATA.renderGrid();
            TATA.showToast && TATA.showToast("Color Updated!", "success");
        } else {
            TATA.showToast && TATA.showToast("Item not found in layout.", "error");
        }
    }

    // ==========================================
    // Set Context ID (called from grid buttons)
    // ==========================================
    function setCurrentContextId(id) {
        currentContextScriptId = id;
        window.currentContextScriptId = id;
    }

    function getCurrentContextId() {
        return currentContextScriptId || window.currentContextScriptId;
    }

    // ==========================================
    // Export to TATA Namespace
    // ==========================================
    TATA.startContextMenu = startContextMenu;
    TATA.updateItemColor = updateItemColor;
    TATA.setCurrentContextId = setCurrentContextId;
    TATA.getCurrentContextId = getCurrentContextId;
    TATA.QUICK_COLORS = COLORS;

})();
