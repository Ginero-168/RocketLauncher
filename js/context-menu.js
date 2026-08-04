/**
 * TATA Panel - Context Menu Module
 * Contains: startContextMenu, updateItemColor
 * @version 4.2
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    // Context Menu State
    let contextMenuEl = null;
    let currentContextScriptId = null;

    // Quick Color Palette
    const COLORS = ['', '#e61919', '#ff8709', '#ffe500', '#b8f55f', '#9d95ff', '#ff9ecd', '#0ae448', '#00bae2', '#171717', '#687174', '#ded9cc', '#f5f2e9'];

    // ==========================================
    // Start Context Menu
    // ==========================================
    function startContextMenu() {
        contextMenuEl = document.getElementById('context_menu');
        const btnEdit = document.getElementById('ctx_edit');
        const btnDelete = document.getElementById('ctx_delete');
        const ctxColors = document.getElementById('ctx_colors');

        // Quick Colors Init
        if (ctxColors && ctxColors.children.length === 0) {
            ctxColors.innerHTML = '';
            COLORS.forEach(c => {
                const sw = document.createElement('div');
                if (c === '') {
                    sw.style.cssText = 'width: 20px; height: 20px; border-radius: 50%; background: transparent; cursor: pointer; border: 1px dashed rgba(23,23,23,0.28); display: flex; align-items: center; justify-content: center; transition: transform 0.1s;';
                    sw.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" style="width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round;"><path d="M6 6l12 12M18 6 6 18"/></svg>';
                    sw.title = "No Color";
                } else {
                    sw.style.cssText = `width: 20px; height: 20px; border-radius: 50%; background: ${c}; cursor: pointer; border: 1px solid rgba(23,23,23,0.28); transition: transform 0.1s;`;
                }

                sw.onmouseover = function () { this.style.transform = 'scale(1.2)'; };
                sw.onmouseout = function () { this.style.transform = 'scale(1)'; };
                sw.onclick = e => {
                    e.stopPropagation();
                    const targetId = window.currentContextScriptId || currentContextScriptId;
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
            document.addEventListener('click', e => {
                if (contextMenuEl) contextMenuEl.style.display = 'none';
            });
        }

        // Copy / Duplicate Action
        const btnCopy = document.getElementById('ctx_copy');
        if (btnCopy) {
            btnCopy.onclick = e => {
                e.stopPropagation();
                const targetId = window.currentContextScriptId || currentContextScriptId;
                if (!targetId) return;

                if (contextMenuEl) contextMenuEl.style.display = 'none';

                // Find the existing script (could be default or user)
                let originalScript = null;
                const isDefault = targetId.indexOf('btn_') === 0;

                if (isDefault) {
                    const v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : (TATA.v2Defaults || {});
                    let defaults = [];
                    // Flatten all layout arrays (in case defaults are mixed in different tabs)
                    if (v2Layout['tab_button']) defaults = defaults.concat(v2Layout['tab_button']);

                    for (let i = 0; i < defaults.length; i++) {
                        if (defaults[i].id === targetId) {
                            originalScript = Object.assign({}, defaults[i]); // Create a shallow copy
                            break;
                        }
                    }
                } else {
                    const userScripts = TATA.getUserScripts();
                    originalScript = userScripts[targetId];
                }

                if (!originalScript) {
                    TATA.showToast && TATA.showToast("Script not found.", "error");
                    return;
                }

                // Create a duplicate payload
                const namePrefix = isDefault ? originalScript.label : originalScript.name;
                const newName = `${namePrefix} (Copy)`;
                const newId = `copy_${Date.now()}`;
                const newIcon = originalScript.icon || "★";
                const newColor = originalScript.color || "#b8f55f";
                let newCode = isDefault ? (originalScript.code || "") : (originalScript.code || "");

                // If it's a default script with a .jsx file, read the actual file content
                if (isDefault && originalScript.script && originalScript.script.endsWith('.jsx')) {
                    try {
                        const fs = require('fs');
                        const path = require('path');
                        const extensionPath = TATA.getExtensionPath ? TATA.getExtensionPath() : '';
                        const jsxPath = path.join(extensionPath, 'jsx', originalScript.script);
                        newCode = fs.readFileSync(jsxPath, 'utf8');
                    } catch (readErr) {
                        console.error('[TATA] Failed to read JSX file:', readErr);
                        newCode = `// Could not read ${originalScript.script} - file may not exist`;
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

        // Share to Chat Action
        const btnShareChat = document.getElementById('ctx_share_chat');
        if (btnShareChat) {
            btnShareChat.onclick = e => {
                e.stopPropagation();
                const targetId = window.currentContextScriptId || currentContextScriptId;
                if (!targetId) return;
                if (contextMenuEl) contextMenuEl.style.display = 'none';

                if (TATA.chat && typeof TATA.chat.shareButton === 'function') {
                    TATA.chat.shareButton(targetId);
                } else {
                    TATA.showToast && TATA.showToast('Chat module not loaded', 'error');
                }
            };
        }

        // Edit Action
        if (btnEdit) {
            btnEdit.onclick = () => {
                const targetId = window.currentContextScriptId || currentContextScriptId;

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
            btnDelete.onclick = e => {
                e.stopPropagation();
                const targetId = currentContextScriptId || window.currentContextScriptId;

                if (targetId && targetId.indexOf('btn_') === 0) {
                    TATA.showToast && TATA.showToast("Default scripts cannot be deleted.", "error");
                    if (contextMenuEl) contextMenuEl.style.display = 'none';
                    return;
                }

                if (contextMenuEl) contextMenuEl.style.display = 'none';

                if (targetId) {
                    TATA.showConfirmModal && TATA.showConfirmModal("Delete this script?", "This action cannot be undone.", confirmed => {
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
        const v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
        const userScripts = TATA.getUserScripts ? TATA.getUserScripts() : {};
        const hotkeys = TATA.getHotkeys ? TATA.getHotkeys() : [];
        let found = false;

        // Update In-Memory Layout
        ['tab_button'].forEach(tab => {
            if (v2Layout[tab]) {
                v2Layout[tab].forEach(item => {
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
        let hotkeyUpdated = false;
        hotkeys.forEach(hk => {
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
            const renderFn = TATA.renderGridDebounced || TATA.renderGrid;
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

    // ==========================================
    // Export to TATA Namespace
    // ==========================================
    TATA.startContextMenu = startContextMenu;
    TATA.updateItemColor = updateItemColor;
    TATA.setCurrentContextId = setCurrentContextId;

})();
