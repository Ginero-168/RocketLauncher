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
    function saveUserScript(name, icon, code, color, isUpdate, targetId, skipRender) {
        const userScripts = TATA.getUserScripts ? TATA.getUserScripts() : {};

        // Use targetId if provided, otherwise generate a new script_ ID
        const id = targetId ? targetId : `script_${Date.now()}`;

        const isScriptFile = (typeof code === 'string' && code.endsWith('.jsx'));
        const filePath = isScriptFile ? code.trim() : null;

        userScripts[id] = {
            name,
            icon,
            code: isScriptFile ? '' : code,
            script: filePath, // Store the .jsx path if applicable
            color,
            date: Date.now()
        };

        if (TATA.setUserScripts) TATA.setUserScripts(userScripts);
        localStorage.setItem('tata_user_scripts', JSON.stringify(userScripts));

        // Add to V2 Layout if new
        if (!isUpdate) {
            const v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
            if (!v2Layout['tab_button']) v2Layout['tab_button'] = [];

            const newButtonSettings = {
                id,
                label: name,
                icon,
                type: isScriptFile ? 'script' : 'code',
                color
            };

            if (isScriptFile) {
                newButtonSettings.script = filePath;
            } else {
                newButtonSettings.code = code;
            }

            v2Layout['tab_button'].push(newButtonSettings);
            if (TATA.setV2Layout) TATA.setV2Layout(v2Layout);
            if (TATA.saveV2Layout) {
                TATA.saveV2Layout(true);
            } else {
                localStorage.setItem('tata_v2_layout', JSON.stringify(v2Layout));
            }
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
