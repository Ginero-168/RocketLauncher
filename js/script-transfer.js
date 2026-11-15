(() => {
    'use strict';

    window.TATA = window.TATA || {};

    // ==================== IMPORT / EXPORT ====================

    const fs = window.require('fs');

    function trackedSource(source) {
        return source === 'ai' || source === 'auto-fix' ? source : '';
    }

    function exportScript() {
        const v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
        let hasExportable = false;
        const allTabs = ['tab_button'];
        allTabs.forEach(t => {
            if (!v2Layout[t]) return;
            v2Layout[t].forEach(item => {
                if (item.script || item.code) hasExportable = true;
            });
        });

        if (!hasExportable) {
            TATA.showToast && TATA.showToast("No scripts to export.", "error");
            return;
        }

        const btns = document.querySelectorAll('.grid-btn');
        let exitMode = null;

        function endExportMode() {
            btns.forEach(b => { b.removeEventListener('click', handler, true); });
            if (exitMode) {
                const exit = exitMode;
                exitMode = null;
                exit();
            }
            document.body.classList.remove('export-mode');
        }

        const handler = function (e) {
            e.preventDefault();
            e.stopPropagation();

            const item = TATA.getItemDataFromElement(this);
            const result = window.cep.fs.showSaveDialogEx('Export Script', '', ['json'], item.label);
            if (result.data) {
                const payload = {
                    tata_version: '2.0',
                    name: item.label,
                    icon: item.icon,
                    script: item.script,
                    code: item.code,
                    type: item.type,
                    color: item.color
                };
                const origin = trackedSource(item.source);
                if (origin) payload.source = origin;
                let finalPath = result.data;
                if (!finalPath.toLowerCase().endsWith('.json')) finalPath += '.json';

                fs.writeFileSync(finalPath, JSON.stringify(payload, null, 2));
                TATA.showToast && TATA.showToast('Exported', 'success');
            }
            endExportMode();
        };

        btns.forEach(b => { b.addEventListener('click', handler, true); });
        if (typeof TATA.enterPickMode === 'function') {
            exitMode = TATA.enterPickMode({
                bodyClass: 'export-mode',
                message: 'Click a script to export it',
                cancelId: 'btn_cancel_export',
                onCancel: endExportMode
            });
        } else {
            document.body.classList.add('export-mode');
        }
    }

    function runnableImport(data) {
        if (!data || typeof data !== 'object') return null;
        const code = typeof data.code === 'string' ? data.code : '';
        const scriptName = typeof data.script === 'string' ? data.script.trim() : '';
        const codeOk = code.trim().length > 0;
        const scriptOk = /^[^/\\]+\.jsx$/i.test(scriptName) && scriptName.indexOf('..') === -1;
        if (!codeOk && !scriptOk) return null;
        return { code: codeOk ? code : '', script: scriptOk ? scriptName : '' };
    }

    function importScript() {
        const result = window.cep.fs.showOpenDialogEx(false, false, "Import Script", "", ["json"]);
        if (result.data && result.data.length > 0) {
            const filePath = result.data[0];
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                const runnable = runnableImport(data);
                if (!runnable) {
                    TATA.showToast && TATA.showToast('Import Failed: no code or JSX script', 'error');
                    return;
                }
                const v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
                const activeTab = 'tab_button';
                if (!v2Layout[activeTab]) v2Layout[activeTab] = [];

                const newItem = {
                    id: `imported_${new Date().getTime()}`,
                    label: data.name || "Imported",
                    icon: importedIcon(data.icon),
                    script: runnable.script,
                    code: runnable.code,
                    type: data.type,
                    color: data.color
                };
                const origin = trackedSource(data.source);
                if (origin) newItem.source = origin;

                v2Layout[activeTab].push(newItem);
                TATA.setV2Layout && TATA.setV2Layout(v2Layout);
                TATA.saveV2Layout && TATA.saveV2Layout();
                TATA.renderGrid && TATA.renderGrid();
                TATA.showToast && TATA.showToast(`Imported ${data.name}`, "success");
            } catch (e) {
                TATA.showToast && TATA.showToast(`Import Failed: ${e}`, "error");
            }
        }
    }

    function importedIcon(icon) {
        if (typeof TATA.sanitizeSvg === 'function') {
            const safe = TATA.sanitizeSvg(icon);
            if (safe) return safe;
        }
        if (typeof TATA.plainIconText === 'function') {
            const plain = TATA.plainIconText(icon);
            if (plain) return plain;
        }
        return (TATA.ICONS && TATA.ICONS.stars) || '';
    }

    function initScriptTransfer() {
        const importButton = document.getElementById('btn_import_script');
        if (importButton && !importButton._scriptTransferBound) {
            importButton._scriptTransferBound = true;
            importButton.addEventListener('click', importScript);
        }

        const exportButton = document.getElementById('btn_export_script');
        if (exportButton && !exportButton._scriptTransferBound) {
            exportButton._scriptTransferBound = true;
            exportButton.addEventListener('click', exportScript);
        }
    }

    TATA.initScriptTransfer = initScriptTransfer;

})();
