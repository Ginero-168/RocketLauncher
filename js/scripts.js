/**
 * TATA Panel - Scripts Module
 * Contains: Script management (save, delete, create button)
 * @version 4.2
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    // ==========================================
    // Initialize User Scripts from Storage
    // ==========================================
    function initUserScripts() {
        const saved = localStorage.getItem('tata_user_scripts');
        if (saved) {
            try {
                const scripts = JSON.parse(saved);
                if (TATA.setUserScripts) TATA.setUserScripts(scripts);
                return scripts;
            } catch (e) {
                console.error('[TATA] Failed to parse user scripts:', e);
            }
        }
        return {};
    }

    // ==========================================
    // Save User Script
    // ==========================================
    // Code from AI, auto-fix or the Marketplace keeps its source so every run asks first.
    function trackedSource(source) {
        return source === 'ai' || source === 'auto-fix' || source === 'market' ? source : '';
    }

    function applyProvenance(record, origin) {
        if (origin) record.source = origin;
        else delete record.source;
    }

    function writeLayout(v2Layout) {
        if (TATA.setV2Layout) TATA.setV2Layout(v2Layout);
        if (TATA.saveV2Layout) {
            TATA.saveV2Layout(true);
        } else {
            localStorage.setItem('tata_v2_layout', JSON.stringify(v2Layout));
        }
    }

    function saveUserScript(name, icon, code, color, isUpdate, targetId, skipRender, source) {
        const userScripts = TATA.getUserScripts ? TATA.getUserScripts() : {};

        // Use targetId if provided, otherwise generate a new script_ ID
        const id = targetId ? targetId : `script_${Date.now()}`;

        const isScriptFile = (typeof code === 'string' && code.endsWith('.jsx'));
        const filePath = isScriptFile ? code.trim() : null;
        const origin = trackedSource(source);

        const record = {
            name,
            icon,
            code: isScriptFile ? '' : code,
            script: filePath, // Store the .jsx path if applicable
            color,
            date: Date.now()
        };
        applyProvenance(record, origin);
        userScripts[id] = record;

        if (TATA.setUserScripts) TATA.setUserScripts(userScripts);
        localStorage.setItem('tata_user_scripts', JSON.stringify(userScripts));

        const v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
        if (!v2Layout['tab_button']) v2Layout['tab_button'] = [];

        function fillButton(button) {
            button.id = id;
            button.label = name;
            button.icon = icon;
            button.type = isScriptFile ? 'script' : 'code';
            button.color = color;
            if (isScriptFile) {
                button.script = filePath;
                delete button.code;
            } else {
                button.code = code;
                delete button.script;
            }
            applyProvenance(button, origin);
        }

        // New buttons join the grid. Updates keep the same provenance on the existing button.
        if (!isUpdate) {
            const newButtonSettings = {};
            fillButton(newButtonSettings);
            v2Layout['tab_button'].push(newButtonSettings);
            writeLayout(v2Layout);
        } else if (targetId) {
            let layoutDirty = false;
            v2Layout['tab_button'].forEach(item => {
                if (!item || item.id !== id) return;
                fillButton(item);
                layoutDirty = true;
            });
            if (layoutDirty) writeLayout(v2Layout);
        }

        if (!skipRender) {
            const renderFn = TATA.renderGridDebounced || TATA.renderGrid;
            if (renderFn) renderFn();
        }
        return id;
    }

    // ==========================================
    // Delete User Script
    // ==========================================
    function deleteUserScript(id) {
        const userScripts = TATA.getUserScripts ? TATA.getUserScripts() : {};
        const v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};

        let scriptsDirty = false;

        // Remove from userScripts
        if (userScripts[id]) {
            delete userScripts[id];
            if (TATA.setUserScripts) TATA.setUserScripts(userScripts);
            localStorage.setItem('tata_user_scripts', JSON.stringify(userScripts));
            scriptsDirty = true;
        }

        // Remove from V2 Layout
        let v2Dirty = false;
        ['tab_button'].forEach(t => {
            const list = v2Layout[t];
            if (!list) return;
            let idx = -1;
            for (let i = 0; i < list.length; i++) {
                if (list[i].id === id) {
                    idx = i;
                    break;
                }
            }
            if (idx !== -1) {
                list.splice(idx, 1);
                v2Dirty = true;
            }
        });

        if (v2Dirty) {
            if (TATA.setV2Layout) TATA.setV2Layout(v2Layout);
            if (TATA.saveV2Layout) {
                TATA.saveV2Layout(true);
            } else {
                localStorage.setItem('tata_v2_layout', JSON.stringify(v2Layout));
            }
        }

        const hotkeys = TATA.getHotkeys ? TATA.getHotkeys() : null;
        if (Array.isArray(hotkeys)) {
            let hotkeysDirty = false;
            hotkeys.forEach((hotkey, index) => {
                if (!hotkey || hotkey.id !== id) return;
                hotkeys[index] = null;
                hotkeysDirty = true;
            });

            if (hotkeysDirty) {
                if (TATA.saveHotkeys) TATA.saveHotkeys();
                if (TATA.renderHotkeys) TATA.renderHotkeys();
            }
        }

        const renderFn = TATA.renderGridDebounced || TATA.renderGrid;
        if (renderFn) renderFn();
        if (TATA.showToast) TATA.showToast("Script deleted!", "success");
    }

    // ==========================================
    // Run Script (JSX file)
    // ==========================================
    function runScript(scriptName, params) {
        const extensionPath = TATA.getExtensionPath ? TATA.getExtensionPath() : '';
        const scriptPath = `${extensionPath}/jsx/${scriptName}`;

        function handleResult(result) {
            if (result && result.indexOf('Error:') === 0) {
                console.error('[TATA] Script Error:', result);
                if (TATA.showToast) TATA.showToast(result, 'error');
            }
        }

        TATA.host.evalFile(scriptPath, params, handleResult);
    }

    // ==========================================
    // Export to TATA Namespace
    // ==========================================
    TATA.initUserScripts = initUserScripts;
    TATA.saveUserScript = saveUserScript;
    TATA.deleteUserScript = deleteUserScript;
    TATA.runScript = runScript;

})();
