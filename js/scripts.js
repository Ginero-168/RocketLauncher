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
        var id = isUpdate ? targetId : 'script_' + Date.now();

        userScripts[id] = {
            name: name,
            icon: icon,
            code: code,
            color: color,
            date: Date.now()
        };

        if (TATA.setUserScripts) TATA.setUserScripts(userScripts);
        localStorage.setItem('tata_user_scripts', JSON.stringify(userScripts));

        // Add to V2 Layout if new
        if (!isUpdate) {
            var v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
            if (!v2Layout['swift']) v2Layout['swift'] = [];
            v2Layout['swift'].push({
                id: id,
                label: name,
                icon: icon,
                code: code,
                type: 'code',
                color: color
            });
            if (TATA.setV2Layout) TATA.setV2Layout(v2Layout);
            if (TATA.saveV2Layout) TATA.saveV2Layout();
        }

        if (!skipRender && TATA.renderGrid) TATA.renderGrid();
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
        ['swift', 'creative', 'organize', 'tools'].forEach(function (t) {
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
            if (TATA.saveV2Layout) TATA.saveV2Layout();
        }

        if (TATA.renderGrid) TATA.renderGrid();
        if (TATA.showToast) TATA.showToast("Script deleted!", "success");
    }

    // ==========================================
    // Create User Button (Legacy support)
    // ==========================================
    function createUserButton(id, script) {
        var userScripts = TATA.getUserScripts ? TATA.getUserScripts() : {};

        if (!script && userScripts[id]) {
            script = userScripts[id];
        }
        if (!script) return null;

        var btn = document.createElement('button');
        btn.id = id;
        btn.className = 'btn-' + (script.color || 'red');
        btn.innerHTML = (script.icon || '★') + ' ' + script.name;
        btn.title = script.name;

        btn.onclick = function () {
            var cs = TATA.getCSInterface ? TATA.getCSInterface() : null;
            if (cs) cs.evalScript(script.code);
        };

        btn.oncontextmenu = function (e) {
            e.preventDefault();
            window.currentContextScriptId = id;
            if (TATA.setCurrentContextId) TATA.setCurrentContextId(id);
            var contextMenuEl = document.getElementById('context_menu');
            if (contextMenuEl) {
                contextMenuEl.style.top = e.clientY + 'px';
                contextMenuEl.style.left = e.clientX + 'px';
                contextMenuEl.style.display = 'block';
            }
        };

        return btn;
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
    TATA.createUserButton = createUserButton;
    TATA.runScript = runScript;

})();
