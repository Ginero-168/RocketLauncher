/**
 * TATA Panel - Scripts Module
 * Contains: Script management (save, delete, create button)
 * @version 4.2
 */
(function () {
    'use strict';

    window.TATA = window.TATA || {};

    // ==========================================
    // Initialize User Scripts from Storage
    // ==========================================
    function initUserScripts() {
        var saved = localStorage.getItem('tata_user_scripts');
        if (saved) {
            try {
                var scripts = JSON.parse(saved);
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
        var userScripts = TATA.getUserScripts ? TATA.getUserScripts() : {};

        // Use targetId if provided, otherwise generate a new script_ ID
        var id = targetId ? targetId : 'script_' + Date.now();

        var isScriptFile = (typeof code === 'string' && code.endsWith('.jsx'));
        var filePath = isScriptFile ? code.trim() : null;

        userScripts[id] = {
            name: name,
            icon: icon,
            code: isScriptFile ? '' : code,
            script: filePath, // Store the .jsx path if applicable
            color: color,
            date: Date.now()
        };

        if (TATA.setUserScripts) TATA.setUserScripts(userScripts);
        localStorage.setItem('tata_user_scripts', JSON.stringify(userScripts));

        // Add to V2 Layout if new
        if (!isUpdate) {
            var v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
            if (!v2Layout['tab_button']) v2Layout['tab_button'] = [];

            var newButtonSettings = {
                id: id,
                label: name,
                icon: icon,
                type: isScriptFile ? 'script' : 'code',
                color: color
            };

            if (isScriptFile) {
                newButtonSettings.script = filePath;
            } else {
                newButtonSettings.code = code;
            }

            v2Layout['tab_button'].push(newButtonSettings);
            if (TATA.setV2Layout) TATA.setV2Layout(v2Layout);
            // Save directly to localStorage (avoids split-brain with main.js's saveV2Layout)
            localStorage.setItem('tata_v2_layout', JSON.stringify(v2Layout));
        }

        if (!skipRender) {
            var renderFn = TATA.renderGridDebounced || TATA.renderGrid;
            if (renderFn) renderFn();
        }
        return id;
    }

    // ==========================================
    // Delete User Script
    // ==========================================
    function deleteUserScript(id) {
        var userScripts = TATA.getUserScripts ? TATA.getUserScripts() : {};
        var v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};

        // Remove from userScripts
        if (userScripts[id]) {
            delete userScripts[id];
            if (TATA.setUserScripts) TATA.setUserScripts(userScripts);
            localStorage.setItem('tata_user_scripts', JSON.stringify(userScripts));
        }

        // Remove from V2 Layout
        var v2Dirty = false;
        ['tab_button'].forEach(function (t) {
            var list = v2Layout[t];
            if (!list) return;
            var idx = -1;
            for (var i = 0; i < list.length; i++) {
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
            // Save directly to localStorage (avoids split-brain with main.js's saveV2Layout)
            localStorage.setItem('tata_v2_layout', JSON.stringify(v2Layout));
        }

        var renderFn = TATA.renderGridDebounced || TATA.renderGrid;
        if (renderFn) renderFn();
        if (TATA.showToast) TATA.showToast("Script deleted!", "success");
    }

    // ==========================================
    // Run Script (JSX file)
    // ==========================================
    function runScript(scriptName, params) {
        var cs = TATA.getCSInterface ? TATA.getCSInterface() : null;
        var extensionPath = TATA.getExtensionPath ? TATA.getExtensionPath() : '';

        if (!cs) {
            console.error('[TATA] CSInterface not available');
            return;
        }

        var scriptPath = extensionPath + '/jsx/' + scriptName;
        var code = 'try { ';

        if (params) {
            code += 'var params = ' + JSON.stringify(params) + '; ';
        }

        code += '$.evalFile("' + scriptPath.replace(/\\/g, '/') + '");';
        code += ' } catch(e) { "Error: " + e.message; }';

        cs.evalScript(code, function (result) {
            if (result && result.indexOf('Error:') === 0) {
                console.error('[TATA] Script Error:', result);
                if (TATA.showToast) TATA.showToast(result, 'error');
            }
        });
    }

    // ==========================================
    // Export to TATA Namespace
    // ==========================================
    TATA.initUserScripts = initUserScripts;
    TATA.saveUserScript = saveUserScript;
    TATA.deleteUserScript = deleteUserScript;
    TATA.runScript = runScript;

})();
