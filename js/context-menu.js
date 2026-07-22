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
    var COLORS = ['', '#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#ec4899'];

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
                if (c === '') {
                    sw.style.cssText = 'width: 20px; height: 20px; border-radius: 50%; background: transparent; cursor: pointer; border: 1px dashed rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center; transition: transform 0.1s;';
                    sw.innerHTML = '<span style="color: rgba(255,255,255,0.5); font-size: 16px; line-height: 1;">×</span>';
                    sw.title = "No Color";
                } else {
                    sw.style.cssText = 'width: 20px; height: 20px; border-radius: 50%; background: ' + c + '; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); transition: transform 0.1s;';
                }

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

        // Global Hide (use addEventListener with guard to prevent overwriting other handlers)
        if (!TATA._contextMenuGlobalHandler) {
            TATA._contextMenuGlobalHandler = true;
            document.addEventListener('click', function (e) {
                if (contextMenuEl) contextMenuEl.style.display = 'none';
            });
        }

        // Copy / Duplicate Action
        var btnCopy = document.getElementById('ctx_copy');
        if (btnCopy) {
            btnCopy.onclick = function (e) {
                e.stopPropagation();
                var targetId = window.currentContextScriptId || currentContextScriptId;
                if (!targetId) return;

                if (contextMenuEl) contextMenuEl.style.display = 'none';

                // Find the existing script (could be default or user)
                var originalScript = null;
                var isDefault = targetId.indexOf('btn_') === 0;

                if (isDefault) {
                    var v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : (TATA.v2Defaults || {});
                    var defaults = [];
                    // Flatten all layout arrays (in case defaults are mixed in different tabs)
                    if (v2Layout['tab_button']) defaults = defaults.concat(v2Layout['tab_button']);

                    for (var i = 0; i < defaults.length; i++) {
                        if (defaults[i].id === targetId) {
                            originalScript = Object.assign({}, defaults[i]); // Create a shallow copy
                            break;
                        }
                    }
                } else {
                    var userScripts = TATA.getUserScripts();
                    originalScript = userScripts[targetId];
                }

                if (!originalScript) {
                    TATA.showToast && TATA.showToast("Script not found.", "error");
                    return;
                }

                // Create a duplicate payload
                var namePrefix = isDefault ? originalScript.label : originalScript.name;
                var newName = namePrefix + " (Copy)";
                var newId = "copy_" + Date.now();
                var newIcon = originalScript.icon || "★";
                var newColor = originalScript.color || "#60a5fa";
                var newCode = isDefault ? (originalScript.code || "") : (originalScript.code || "");

                // If it's a default script with a .jsx file, read the actual file content
                if (isDefault && originalScript.script && originalScript.script.endsWith('.jsx')) {
                    try {
                        var fs = require('fs');
                        var path = require('path');
                        var extensionPath = TATA.getExtensionPath ? TATA.getExtensionPath() : '';
                        var jsxPath = path.join(extensionPath, 'jsx', originalScript.script);
                        newCode = fs.readFileSync(jsxPath, 'utf8');
                    } catch (readErr) {
                        console.error('[TATA] Failed to read JSX file:', readErr);
                        newCode = "// Could not read " + originalScript.script + " - file may not exist";
                    }
                }

                if (typeof TATA.saveUserScript === 'function') {
                    // saveUserScript(name, icon, code, color, isUpdate, targetId, skipRender)
                    TATA.saveUserScript(newName, newIcon, newCode, newColor, false, newId, false);
                    TATA.showToast && TATA.showToast("Created a copy!", "success");

                    // The saveUserScript automatically renders the grid.
                } else {
                    TATA.showToast && TATA.showToast("Error creating copy.", "error");
                }
            };
        }

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
        }

        // Batch all localStorage writes together (was 3 separate writes)
        if (found) {
            TATA.setV2Layout && TATA.setV2Layout(v2Layout);
            if (TATA.saveV2Layout) TATA.saveV2Layout(true);
            else localStorage.setItem('tata_v2_layout', JSON.stringify(v2Layout));
        }
        if (userScripts[targetId]) {
            localStorage.setItem('tata_user_scripts', JSON.stringify(userScripts));
        }
        if (hotkeyUpdated) {
            TATA.saveHotkeys && TATA.saveHotkeys(true);
            TATA.renderHotkeys && TATA.renderHotkeys();
        }
        // Render & toast
        if (found) {
            var renderFn = TATA.renderGridDebounced || TATA.renderGrid;
            renderFn && renderFn();
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
